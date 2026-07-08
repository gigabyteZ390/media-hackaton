import Anthropic from "@anthropic-ai/sdk";

/** Create an Anthropic client (throws a clear error if the key is missing). */
export function getAnthropic(): Anthropic {
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

/** Extract the first JSON object from a string (defensive parse for tool responses). */
export function extractJson<T = any>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}
