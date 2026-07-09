import Anthropic from "@anthropic-ai/sdk";

// LLM backend switch. Set LLM_BACKEND=local in .env.local to run every reasoning
// call on a local Ollama model (no API credits). Anything else uses the Anthropic
// cloud API. All call sites go through getAnthropic().messages.create(...), so the
// local path returns an Anthropic-shaped response and needs no call-site changes.
const BACKEND = process.env.LLM_BACKEND === "local" ? "local" : "anthropic";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:14b";

/** True when reasoning runs on the local Ollama model (Axis 2 then searches in code). */
export function isLocalLLM(): boolean {
  return BACKEND === "local";
}

/** Minimal Anthropic-Messages-shaped adapter over Ollama's /api/chat. */
function ollamaClient() {
  return {
    messages: {
      create: async (opts: any) => {
        const messages = (opts?.messages ?? []).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content:
            typeof m.content === "string"
              ? m.content
              : Array.isArray(m.content)
              ? m.content.map((b: any) => b?.text ?? "").join("\n")
              : String(m.content ?? ""),
        }));
        // Anthropic's output_config.format.schema -> Ollama's `format` (JSON schema
        // constrained decoding). No schema -> "json" so extractJson() still works.
        const schema = opts?.output_config?.format?.schema;
        const body: any = {
          model: OLLAMA_MODEL,
          messages,
          stream: false,
          format: schema ?? "json",
          options: {
            // Retries can bump temperature to escape a small model's bad-JSON loop.
            temperature: opts?.temperature ?? 0,
            num_predict: opts?.max_tokens ?? 2048,
          },
        };
        const r = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 300)}`);
        }
        const data: any = await r.json();
        // Shape like an Anthropic Messages response so joinText() is unchanged.
        return { content: [{ type: "text", text: data?.message?.content ?? "" }] };
      },
    },
  };
}

/** Create the reasoning client: local Ollama adapter or the Anthropic cloud client. */
export function getAnthropic(): any {
  if (BACKEND === "local") return ollamaClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set (see .env.local.example)");
  }
  return new Anthropic({ apiKey });
}

/** Concatenate all text blocks of a Messages API response. */
export function joinText(res: any): string {
  return (res?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

/** Salvage as many complete objects as possible from a (possibly runaway/truncated)
 *  JSON array under `key`. Small local models sometimes loop mid-array; this parses
 *  the valid prefix so the pipeline degrades to partial results instead of erroring. */
export function salvageObjects<T = any>(text: string, key: string): T[] {
  const keyIdx = text.indexOf(`"${key}"`);
  const arrStart = text.indexOf("[", keyIdx === -1 ? 0 : keyIdx);
  if (arrStart === -1) return [];
  const out: T[] = [];
  let i = arrStart + 1;
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (i >= text.length || text[i] === "]") break;
    if (text[i] !== "{") break;
    let depth = 0,
      inStr = false,
      esc = false,
      j = i;
    for (; j < text.length; j++) {
      const c = text[j];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = !inStr;
      else if (!inStr) {
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
    }
    if (depth !== 0) break; // unterminated last object
    try {
      out.push(JSON.parse(text.slice(i, j)) as T);
    } catch {
      break;
    }
    i = j;
  }
  return out;
}

/** Extract the first JSON object from a string (defensive parse for tool responses). */
export function extractJson<T = any>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}
