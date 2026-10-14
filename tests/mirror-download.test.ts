import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function freshModule() {
  vi.resetModules();
  return import('../src/utils/osuTokenManager');
}

describe('mirror request coordination', () => {
  it('reserves distinct slots for concurrent downloads while allowing API requests', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const { waitForOsuSlot } = await freshModule();
    const completed: number[] = [];
    const downloads = [0, 1, 2].map(async (index) => {
      await waitForOsuSlot('download');
      completed.push(index);
    });
    await waitForOsuSlot('api');
    expect(completed).toEqual([0]);
    await vi.advanceTimersByTimeAsync(5999);
    expect(completed).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    expect(completed).toEqual([0, 1]);
    await vi.advanceTimersByTimeAsync(6000);
    await Promise.all(downloads);
    expect(completed).toEqual([0, 1, 2]);
  });

  it('falls back after an oversized primary response and cancels that body', async () => {
    const cancel = vi.fn();
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(11)); }, cancel,
      })))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', fetch);
    const { downloadBeatmapsetArchive } = await freshModule();
    const result = await downloadBeatmapsetArchive(123, vi.fn(), vi.fn(), 10);
    expect(result.size).toBe(3);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      'https://catboy.best/d/123', 'https://mirror.nekoha.moe/api/download/123',
    ]);
    for (const [, options] of fetch.mock.calls) expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects invalid ids and size limits before requesting a mirror', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { downloadBeatmapsetArchive } = await freshModule();
    for (const id of [NaN, Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(downloadBeatmapsetArchive(id, vi.fn(), vi.fn(), 10)).rejects.toThrow('Invalid beatmapset');
    }
    await expect(downloadBeatmapsetArchive(1, vi.fn(), vi.fn(), NaN)).rejects.toThrow('Invalid download');
    expect(fetch).not.toHaveBeenCalled();
  });
});
