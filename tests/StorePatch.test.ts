import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchNoCors: vi.fn(),
  addPatch: vi.fn(),
  removePatch: vi.fn(),
}));

vi.mock("@decky/api", () => ({
  call: vi.fn(),
  fetchNoCors: mocks.fetchNoCors,
  routerHook: { addPatch: mocks.addPatch, removePatch: mocks.removePatch },
}));
vi.mock("@decky/ui", () => ({ findModuleExport: () => undefined }));

import { initStorePatch } from "../src/patches/StorePatch";
import { SettingsContext } from "../src/hooks/useSettings";

describe("Store debugger connection", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps the new connection when the previous socket closes late", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    class FakeSocket {
      static OPEN = 1;
      readyState = 1;
      onopen: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();
      constructor(public url: string) { sockets.push(this); }
    }
    vi.stubGlobal("WebSocket", FakeSocket);
    let debuggerUrl = "ws://first";
    mocks.fetchNoCors.mockImplementation(async () => ({
      json: async () => [{ url: "https://store.steampowered.com/", webSocketDebuggerUrl: debuggerUrl }],
    }));
    let openStore: (() => void) | undefined;
    mocks.addPatch.mockImplementation((route: string, handler: () => void) => {
      if (route === "/steamweb") openStore = handler;
      return handler;
    });

    const cleanup = initStorePatch();
    openStore?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets).toHaveLength(1);
    sockets[0].onopen?.({ target: sockets[0] });
    debuggerUrl = "ws://second";
    await vi.advanceTimersByTimeAsync(1500);
    expect(sockets).toHaveLength(2);
    sockets[1].onopen?.({ target: sockets[1] });
    sockets[0].onclose?.({ target: sockets[0] });
    await vi.advanceTimersByTimeAsync(1500);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].close).not.toHaveBeenCalled();
    cleanup();
  });

  it("does not inject a stale result after the store setting is disabled", async () => {
    vi.useFakeTimers();
    class FakeSocket {
      static OPEN = 1;
      readyState = 1;
      onopen: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onmessage: ((event: any) => void) | null = null;
      send = vi.fn();
      close = vi.fn();
      constructor(public url: string) { socket = this; }
    }
    let socket: FakeSocket;
    let resolveDetails: (value: any) => void = () => {};
    const details = new Promise((resolve) => { resolveDetails = resolve; });
    vi.stubGlobal("WebSocket", FakeSocket);
    mocks.fetchNoCors.mockImplementation((url: string) => url.includes("localhost:8080")
      ? Promise.resolve({ json: async () => [{ url: "https://store.steampowered.com/app/42/", webSocketDebuggerUrl: "ws://store" }] })
      : details);
    let openStore: (() => void) | undefined;
    mocks.addPatch.mockImplementation((route: string, handler: () => void) => {
      if (route === "/steamweb") openStore = handler;
      return handler;
    });
    const original = SettingsContext.value;
    SettingsContext.next({ ...original, targetLanguage: "en", showOnStore: true });
    const cleanup = initStorePatch();
    openStore?.();
    await vi.advanceTimersByTimeAsync(0);
    socket!.onopen?.({ target: socket });
    await vi.advanceTimersByTimeAsync(300);
    SettingsContext.next({ ...SettingsContext.value, showOnStore: false });
    socket!.send.mockClear();
    resolveDetails({ json: async () => ({ "42": { success: true, data: { name: "Game", supported_languages: "English" } } }) });
    await vi.advanceTimersByTimeAsync(0);
    expect(socket!.send).not.toHaveBeenCalled();
    cleanup();
    SettingsContext.next(original);
  });
});
