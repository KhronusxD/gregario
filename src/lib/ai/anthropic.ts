import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic() {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export const HAIKU_MODEL = "claude-haiku-4-5";
