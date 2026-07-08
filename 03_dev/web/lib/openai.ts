import OpenAI from "openai";

/** Create an OpenAI client (throws a clear error if the key is missing). */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set (see .env.local.example)");
  }
  return new OpenAI({ apiKey });
}

/** Model used for analysis. Swap to a newer model here if you like. */
export const MODEL = "gpt-4o";

/** Extract the first JSON object from a string (defensive parse). */
export function extractJson<T = any>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}
