// -----------------------------------------------------------------------------
// chunk.ts  • 2025‑04‑18  (FULL FILE)
// -----------------------------------------------------------------------------
// Generic helper to split Uint8Array into fixed‑size chunks.
// No more string/Uint8Array type mismatch.
// -----------------------------------------------------------------------------

/**
 * Split a Uint8Array into equally sized pieces (last one may be smaller).
 */
export function chunkBuffer(
    buffer: Uint8Array,
    size = 4096,
  ): Uint8Array[] {
    const pieces: Uint8Array[] = [];
    for (let offset = 0; offset < buffer.length; offset += size) {
      pieces.push(buffer.subarray(offset, offset + size));
    }
    return pieces;
  }
  