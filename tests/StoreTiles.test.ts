import { afterEach, describe, expect, it, vi } from "vitest";
import { installStoreTiles } from "../src/patches/StoreTiles";

describe("Store tiles", () => {
  afterEach(() => {
    (window as any).__localizationTilesCleanup?.();
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("deduplicates visible game requests and removes badges when disabled", async () => {
    vi.useFakeTimers();
    let observer: FakeIntersectionObserver;
    class FakeIntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) { observer = this; }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      show(target: Element) { this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as any); }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "42": { success: true, data: { supported_languages: "English<strong>*</strong>, Ukrainian" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    document.body.innerHTML = '<a href="https://store.steampowered.com/app/42/"><img></a><a href="https://store.steampowered.com/app/42/"><img></a>';
    installStoreTiles({ flag: "🇺🇦", languages: ["ukrainian"], position: "top-left", catalog: {}, cached: {}, labels: { official: "Official", community: "Community", installed: "Installed" } });
    const tiles = document.querySelectorAll("a");
    observer!.show(tiles[0]);
    observer!.show(tiles[1]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(".decky-localization-tile-badge")).toHaveLength(2);
    expect(tiles[0].textContent).toContain("🇺🇦");
    (window as any).__localizationTilesCleanup();
    expect(document.querySelectorAll(".decky-localization-tile-badge")).toHaveLength(0);
    expect(observer!.disconnect).toHaveBeenCalled();
  });

  it("uses cached community and installed LBK statuses without fetching", () => {
    let observer: FakeIntersectionObserver;
    class FakeIntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) { observer = this; }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      show(target: Element) { this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as any); }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    document.body.innerHTML = '<a href="https://store.steampowered.com/app/42/"><img></a><a href="https://store.steampowered.com/app/43/"><img></a>';
    installStoreTiles({
      flag: "🇺🇦", languages: ["ukrainian"], position: "top-left",
      catalog: { "43": { installed: true, has_update: false } },
      cached: { "42": "COMMUNITY" },
      labels: { official: "Official", community: "Community", installed: "Installed" },
    });
    const tiles = document.querySelectorAll("a");
    observer!.show(tiles[0]);
    observer!.show(tiles[1]);
    expect(tiles[0].textContent).toBe("🇺🇦");
    expect(tiles[1].textContent).toBe("🇺🇦 ✓");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts in-flight requests and ignores their late results on cleanup", async () => {
    let observer: FakeIntersectionObserver;
    class FakeIntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) { observer = this; }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      show(target: Element) { this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as any); }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    let resolveFetch: (value: any) => void = () => {};
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    document.body.innerHTML = '<a href="https://store.steampowered.com/app/42/"><img></a>';
    installStoreTiles({ flag: "🇺🇦", languages: ["ukrainian"], position: "top-left", catalog: {}, cached: {}, labels: { official: "Official", community: "Community", installed: "Installed" } });
    observer!.show(document.querySelector("a")!);
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    (window as any).__localizationTilesCleanup();
    expect(signal.aborted).toBe(true);
    resolveFetch({ ok: true, json: async () => ({ "42": { success: true, data: { supported_languages: "Ukrainian" } } }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(".decky-localization-tile-badge")).toBeNull();
  });
});
