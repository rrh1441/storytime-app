ts
import { encoding_for_model } from "tiktoken";
export const MAX_TOKENS = 2000 - 200; // leave headroom

export function chunkText(text: string): string[] {
  const enc = encoding_for_model("gpt-4o-mini");
  const tokens = enc.encode(text);
  const chunks: number[][] = [];
  for (let i = 0; i < tokens.length; i += MAX_TOKENS) {
    chunks.push(tokens.slice(i, i + MAX_TOKENS));
  }
  const pieces = chunks.map((c) => enc.decode(c));
  enc.free();
  return pieces;
}