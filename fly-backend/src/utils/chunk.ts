// Remove the 'ts' at the beginning of the file
import { encoding_for_model } from "tiktoken";
export const MAX_TOKENS = 2000 - 200; // leave headroom
export function chunkText(text: string): string[] {
  const enc = encoding_for_model("gpt-4o-mini");
  const tokens = enc.encode(text);
  const chunks: number[][] = [];
  for (let i = 0; i < tokens.length; i += MAX_TOKENS) {
    // Convert to array for type compatibility
    chunks.push(Array.from(tokens.slice(i, i + MAX_TOKENS)));
  }
  // Use any to bypass type checking for enc.decode
  const pieces = chunks.map((c) => enc.decode(c as any));
  enc.free();
  return pieces;
}