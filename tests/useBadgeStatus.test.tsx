import React from "react";
import { resolveTargetLanguage } from "../src/languages";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchNoCorsMock = vi.fn();
const cleanNonSteamNameMock = vi.fn((s: string) => s);
const searchKuliMock = vi.fn();
const fetchWithTimeoutMock = vi.fn();
const isSteamAppIdMock = vi.fn();
const callBackendMock = vi.fn();
const russianCommunityMock = vi.hoisted(() => vi.fn());

vi.mock("../src/russianCommunity", () => ({ getRussianCommunityUrl: russianCommunityMock }));

vi.mock("@decky/api", () => ({
  fetchNoCors: (...args: any[]) => fetchNoCorsMock(...args),
}));

vi.mock("../src/hooks/useSettings", () => ({
  callBackend: (method: string, ...args: unknown[]) => callBackendMock(method, ...args),
  SettingsContext: { value: { targetLanguage: "uk" } },
}));

vi.mock("../src/utils", () => ({
  cleanNonSteamName: (...args: any[]) => cleanNonSteamNameMock(...args),
  searchKuli: (...args: any[]) => searchKuliMock(...args),
  fetchWithTimeout: (...args: any[]) => fetchWithTimeoutMock(...args),
  isSteamAppId: (...args: any[]) => isSteamAppIdMock(...args),
}));

vi.mock("../src/logger", () => ({
  logger: {
    component: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import {
  clearBadgeStatusCache,
  getCachedBadgeStatus,
  useBadgeStatus,
} from "../src/hooks/useBadgeStatus";

function HookProbe(props: { appId?: string; appName?: string; onState: (s: any) => void }) {
  const state = useBadgeStatus(props.appId, props.appName);
  props.onState(state);
  return React.createElement("div");
}

describe("useBadgeStatus", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    clearBadgeStatusCache();
    fetchNoCorsMock.mockReset();
    cleanNonSteamNameMock.mockReset();
    cleanNonSteamNameMock.mockImplementation((s: string) => s);
    searchKuliMock.mockReset();
    fetchWithTimeoutMock.mockReset();
    isSteamAppIdMock.mockReset();
    callBackendMock.mockReset();
    russianCommunityMock.mockReset();
  });

  it("returns OFFICIAL when Steam metadata includes ukrainian", async () => {
    isSteamAppIdMock.mockReturnValue(true);
    fetchNoCorsMock.mockResolvedValue({});
    fetchWithTimeoutMock.mockResolvedValue({
      json: async () => ({
        "123": {
          success: true,
          data: { name: "GameName", supported_languages: "English, Ukrainian" },
        },
      }),
    });
    searchKuliMock.mockResolvedValue(null);

    let latest: any;
    render(React.createElement(HookProbe, { appId: "123", appName: "Game", onState: (s: any) => (latest = s) }));

    await waitFor(() => {
      expect(latest.loading).toBe(false);
      expect(latest.status).toBe("OFFICIAL");
    });
  });

  it("returns COMMUNITY with kuli url when steam is not official", async () => {
    isSteamAppIdMock.mockReturnValue(true);
    fetchNoCorsMock.mockResolvedValue({});
    fetchWithTimeoutMock.mockResolvedValue({
      json: async () => ({
        "456": {
          success: true,
          data: { name: "Another Game", supported_languages: "English" },
        },
      }),
    });
    searchKuliMock.mockResolvedValue({ status: "COMMUNITY", slug: "another-game" });

    let latest: any;
    render(React.createElement(HookProbe, { appId: "456", appName: "Another", onState: (s: any) => (latest = s) }));

    await waitFor(() => {
      expect(latest.loading).toBe(false);
      expect(latest.status).toBe("COMMUNITY");
      expect(latest.url).toBe("https://kuli.com.ua/another-game");
    });

    expect(getCachedBadgeStatus("456", "uk")).toBe("COMMUNITY");
    const persisted = JSON.parse(window.localStorage.getItem("decky_lang_badge_status_cache_v2") || "{}");
    expect(persisted["uk:456"]?.status).toBe("COMMUNITY");
  });

  it("returns NONE on hard error path", async () => {
    isSteamAppIdMock.mockImplementation(() => {
      throw new Error("boom");
    });

    let latest: any;
    render(React.createElement(HookProbe, { appId: "999", appName: "Broken", onState: (s: any) => (latest = s) }));

    await waitFor(() => {
      expect(latest.loading).toBe(false);
      expect(latest.status).toBe("NONE");
    });
  });

  it("keeps stale results visible and does not overwrite them when refresh fails", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    isSteamAppIdMock.mockReturnValue(true);
    fetchWithTimeoutMock.mockResolvedValue({ json: async () => ({
      "456": { success: true, data: { name: "Game", supported_languages: "English" } },
    }) });
    searchKuliMock.mockResolvedValue({ status: "COMMUNITY", slug: "game" });
    let latest: any;
    const first = render(React.createElement(HookProbe, { appId: "456", appName: "Game", onState: (s: any) => (latest = s) }));
    await waitFor(() => expect(latest.status).toBe("COMMUNITY"));
    first.unmount();

    clock.mockReturnValue(now + 8 * 24 * 60 * 60 * 1000);
    fetchWithTimeoutMock.mockRejectedValue(new Error("offline"));
    searchKuliMock.mockRejectedValue(new Error("offline"));
    render(React.createElement(HookProbe, { appId: "456", appName: "Game", onState: (s: any) => (latest = s) }));
    expect(latest.status).toBe("COMMUNITY");
    expect(latest.loading).toBe(false);
    await waitFor(() => expect(searchKuliMock).toHaveBeenCalledTimes(2));
    expect(latest.url).toBe("https://kuli.com.ua/game");
    expect(JSON.parse(window.localStorage.getItem("decky_lang_badge_status_cache_v2")!)["uk:456"].cachedAt).toBe(now);
  });

  it("does not show a previous game's status while the next game loads", async () => {
    isSteamAppIdMock.mockReturnValue(true);
    fetchWithTimeoutMock.mockResolvedValueOnce({ json: async () => ({
      "123": { success: true, data: { name: "First", supported_languages: "Ukrainian" } },
    }) }).mockReturnValueOnce(new Promise(() => {}));
    searchKuliMock.mockResolvedValue(null);
    let latest: any;
    const probe = (appId: string) => React.createElement(HookProbe, { appId, appName: "Game", onState: (s: any) => (latest = s) });
    const { rerender } = render(probe("123"));
    await waitFor(() => expect(latest.status).toBe("OFFICIAL"));
    rerender(probe("456"));
    expect(latest.loading).toBe(true);
    expect(latest.status).toBeNull();
    expect(latest.url).toBeNull();
  });

  it("shows Russian community status and the source link for a Steam game", async () => {
    isSteamAppIdMock.mockReturnValue(true);
    fetchWithTimeoutMock.mockResolvedValue({ json: async () => ({
      "123": { success: true, data: { name: "Game", supported_languages: "English" } },
    }) });
    russianCommunityMock.mockResolvedValue("https://example.test/guide");
    let latest: any;
    function Probe() { latest = useBadgeStatus("123", "Game", resolveTargetLanguage("ru")); return null; }
    render(React.createElement(Probe));
    await waitFor(() => expect(latest.status).toBe("COMMUNITY"));
    expect(latest.url).toBe("https://example.test/guide");
  });
});
