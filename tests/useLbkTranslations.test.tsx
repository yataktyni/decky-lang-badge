import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const callMock = vi.hoisted(() => vi.fn());
vi.mock("@decky/api", () => ({ call: callMock }));

import { clearLbkCache, useLbkTranslations } from "../src/hooks/useLbkTranslations";

beforeEach(() => {
  clearLbkCache();
  callMock.mockReset();
});

it("does not show the previous game's translations while loading a different game", async () => {
  let finishSecond!: (value: unknown) => void;
  callMock.mockResolvedValueOnce({ available: true, installed_any: false, translations: [{ id: "first" }] });
  callMock.mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve; }));

  const { result, rerender } = renderHook(({ appId }) => useLbkTranslations(appId), {
    initialProps: { appId: "1" },
  });
  await waitFor(() => expect(result.current.data.translations).toHaveLength(1));
  rerender({ appId: "2" });
  expect(result.current.loading).toBe(true);
  expect(result.current.data.translations).toEqual([]);
  await act(async () => finishSecond({ available: true, installed_any: false, translations: [] }));
  expect(result.current.loading).toBe(false);
});

it("stops loading when the LBK backend does not respond", async () => {
  vi.useFakeTimers();
  try {
    callMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLbkTranslations("3"));
    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.loading).toBe(false);
    expect(result.current.data.translations).toEqual([]);
  } finally { vi.useRealTimers(); }
});
