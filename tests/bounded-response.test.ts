import { describe, expect, it, vi } from 'vitest';
import { readBoundedResponse } from '../src/utils/boundedResponse';

describe('bounded network responses', () => {
  it('preserves bytes and reports progress when Content-Length is absent', async () => {
    const progress = vi.fn();
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    }));
    const blob = await readBoundedResponse(response, 3, progress);
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(progress.mock.calls).toEqual([[2, 0], [3, 0]]);
    expect(response.body?.locked).toBe(false);
  });

  it.each([undefined, '1'])('cancels an oversized stream with declared size %s', async (length) => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(11)); },
      cancel,
    }), { headers: length ? { 'content-length': length } : {} });
    await expect(readBoundedResponse(response, 10)).rejects.toThrow('size limit');
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('cancels a declared oversized body before consuming it', async () => {
    const pull = vi.fn();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
      headers: { 'content-length': '11' },
    });
    await expect(readBoundedResponse(response, 10)).rejects.toThrow('size limit');
    expect(pull).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('counts UTF-8 bytes rather than characters', async () => {
    await expect(readBoundedResponse(new Response('éé'), 3)).rejects.toThrow('size limit');
    expect(await (await readBoundedResponse(new Response('éé'), 4)).text()).toBe('éé');
  });

  it('cleans up when a progress callback throws, even if cancellation rejects', async () => {
    const failure = new Error('Progress failed');
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array([1])); },
      cancel() { throw new Error('Cancel failed'); },
    }));
    await expect(readBoundedResponse(response, 10, () => { throw failure; })).rejects.toBe(failure);
    expect(response.body?.locked).toBe(false);
  });

  it('accepts an empty response and rejects invalid limits', async () => {
    expect((await readBoundedResponse(new Response(null), 1)).size).toBe(0);
    for (const limit of [NaN, Infinity, 0, -1, 1.5]) {
      await expect(readBoundedResponse(new Response(null), limit)).rejects.toThrow(RangeError);
    }
  });
});
