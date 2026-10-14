/*
 * RhythmMania - High-Performance Rhythm Game Platform
 * Copyright (C) 2026 Yumo (yumo-ymspace). All rights reserved.
 * Licensed under the PolyForm Perimeter License 1.0.1; see LICENSE.md.
 */

/** Read incrementally so missing or dishonest Content-Length cannot bypass the cap. */
export async function readBoundedResponse(
  response: Response,
  maxBytes: number,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Blob> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError('Response size limit must be a positive safe integer.');
  }
  const declaredSize = Number(response.headers.get('content-length'));
  const total = Number.isSafeInteger(declaredSize) && declaredSize > 0 ? declaredSize : 0;
  if (total > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Response size limit exceeded.');
  }
  const reader = response.body?.getReader();
  if (!reader) return new Blob([]);

  const chunks: ArrayBuffer[] = [];
  let loaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      if (loaded > maxBytes) throw new Error('Response size limit exceeded.');
      chunks.push(new Uint8Array(value).buffer);
      onProgress?.(loaded, total);
    }
    return new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
  } catch (error) {
    // Preserve the original failure even if cancellation also rejects.
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
