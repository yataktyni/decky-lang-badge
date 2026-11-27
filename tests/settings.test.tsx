import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchNoCors } from "@decky/api";

const useSettingsMock = vi.fn();
const usePluginUpdateMock = vi.fn(() => ({ versionInfo: null, updateAvailable: false, refresh: vi.fn() }));

vi.mock("@decky/api", () => ({ fetchNoCors: vi.fn() }));

vi.mock("../src/hooks/useSettings", () => ({
  useSettings: () => useSettingsMock(),
}));

vi.mock("../src/hooks/usePluginUpdate", () => ({
  usePluginUpdate: () => usePluginUpdateMock(),
}));

vi.mock("../src/hooks/useBadgeStatus", () => ({
  clearBadgeStatusCache: vi.fn(),
}));

vi.mock("../src/hooks/useLbkTranslations", () => ({
  getCachedLbkStatus: vi.fn(() => null),
  getLbkStatus: vi.fn(() => new Promise(() => {})),
  installLbkLauncher: vi.fn().mockResolvedValue({ success: true }),
  launchLbkLauncher: vi.fn().mockResolvedValue({ success: true }),
  triggerLbkRefresh: vi.fn(),
}));

vi.mock("../src/translations", () => ({
  t: (k: string) => k,
  getSupportedLanguage: () => "en",
  resolveUiLanguage: () => "en",
}));

vi.mock("../src/components/Spinner", () => ({
  default: () => React.createElement("div", {}, "spinner"),
}));

vi.mock("../src/components/LinksSection", () => ({
  LinksSection: ({ lang }: { lang: string }) => React.createElement("div", {}, `links-${lang}`),
}));

vi.mock("../src/components/DonateCard", () => ({
  DonateCard: ({ lang }: { lang: string }) => React.createElement("div", {}, `donate-${lang}`),
}));

vi.mock("@decky/ui", () => ({
  ButtonItem: ({ children, onClick }: any) => React.createElement("button", { onClick }, children),
  DialogButton: ({ children, onClick }: any) => React.createElement("button", { onClick }, children),
  Focusable: ({ children }: any) => React.createElement("div", {}, children),
  PanelSection: ({ children, title }: any) => React.createElement("section", { "data-title": title }, children),
  PanelSectionRow: ({ children }: any) => React.createElement("div", {}, children),
  DropdownItem: ({ label, rgOptions }: any) => React.createElement("div", { "data-options": JSON.stringify(rgOptions) }, `dropdown:${label}`),
  SliderField: ({ label }: any) => React.createElement("div", {}, `slider:${label}`),
  ToggleField: ({ label, checked }: any) => React.createElement("div", {}, `toggle:${label}:${checked}`),
  TextField: ({ label, value, onChange }: any) => React.createElement("input", { "aria-label": label, value, onChange }),
  Navigation: { NavigateToExternalWeb: vi.fn() },
}));

import { Settings } from "../src/settings";

const makeSettingsState = (overrides: Record<string, any> = {}, loading = false) => ({
  settings: {
    targetLanguage: "auto",
    badgeType: "full",
    badgePosition: "top-right",
    offsetX: 20,
    offsetY: 90,
    showOnStore: true,
    storeOffsetX: 0,
    storeOffsetY: 20,
    enableLbkIntegration: true,
    showOnThumbnails: true,
    thumbnailPosition: "top-left",
    ...overrides,
  },
  loading,
  setTargetLanguage: vi.fn(),
  setBadgeType: vi.fn(),
  setBadgePosition: vi.fn(),
  setOffsetX: vi.fn(),
  setOffsetY: vi.fn(),
  setShowOnStore: vi.fn(),
  setStoreOffsetX: vi.fn(),
  setStoreOffsetY: vi.fn(),
  setEnableLbkIntegration: vi.fn(),
  setShowOnThumbnails: vi.fn(),
  setThumbnailPosition: vi.fn(),
});

describe("Settings component", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsMock.mockReset();
    usePluginUpdateMock.mockReturnValue({ versionInfo: null, updateAvailable: false, refresh: vi.fn() });
  });

  it("unlocks the trophy language after a successful code activation", async () => {
    useSettingsMock.mockReturnValue(makeSettingsState());
    vi.mocked(fetchNoCors).mockResolvedValue({ ok: true, json: async () => ({ activated: true }) } as Response);
    render(React.createElement(Settings));
    expect(screen.getByText("dropdown:target_language").getAttribute("data-options")).not.toContain("Трофейный");
    fireEvent.click(screen.getByText(/tab_info/));
    fireEvent.change(screen.getByLabelText("promo_code"), { target: { value: "abcdefghijklmnopqrstuvwxyzABCDEF" } });
    fireEvent.click(screen.getByText("promo_activate"));
    await waitFor(() => expect(localStorage.getItem("decky_trophy_unlocked")).toBe("1"));
    fireEvent.click(screen.getByText(/tab_general/));
    expect(screen.getByText("dropdown:target_language").getAttribute("data-options")).toContain("Трофейный");
  });

  it("shows spinner while loading", () => {
    useSettingsMock.mockReturnValue(makeSettingsState({}, true));

    render(React.createElement(Settings));
    expect(screen.getByText("spinner")).toBeInTheDocument();
    expect(screen.queryByText("donate-en")).not.toBeInTheDocument();
  });

  it("renders General tab by default with always-visible DonateCard and switches to Layout/Info tabs", () => {
    useSettingsMock.mockReturnValue(makeSettingsState());

    render(React.createElement(Settings));

    // Default General tab
    expect(screen.getByText("dropdown:target_language")).toBeInTheDocument();
    expect(screen.getByText("dropdown:badge_type")).toBeInTheDocument();
    expect(screen.getByText("toggle:show_on_thumbnails:true")).toBeInTheDocument();
    expect(screen.getByText("toggle:show_on_store:true")).toBeInTheDocument();
    expect(screen.getByText("donate-en")).toBeInTheDocument();
    expect(screen.queryByText("links-en")).not.toBeInTheDocument();

    // Switch to Layout tab
    fireEvent.click(screen.getByText(/tab_layout/));
    expect(screen.getByText("dropdown:badge_position")).toBeInTheDocument();
    expect(screen.getByText("slider:x_offset")).toBeInTheDocument();
    expect(screen.getByText("slider:y_offset")).toBeInTheDocument();
    expect(screen.getByText("slider:store_x_offset")).toBeInTheDocument();
    expect(screen.getByText("slider:store_y_offset")).toBeInTheDocument();
    expect(screen.getByText("donate-en")).toBeInTheDocument();

    // Switch to Info tab
    fireEvent.click(screen.getByText(/tab_info/));
    expect(screen.getByText("links-en")).toBeInTheDocument();
    expect(screen.getByText("donate-en")).toBeInTheDocument();
  });

  it("hides store sliders on Layout tab when showOnStore is false", () => {
    useSettingsMock.mockReturnValue(makeSettingsState({ showOnStore: false }));

    render(React.createElement(Settings));
    fireEvent.click(screen.getByText(/tab_layout/));

    expect(screen.queryByText("slider:store_x_offset")).not.toBeInTheDocument();
    expect(screen.queryByText("slider:store_y_offset")).not.toBeInTheDocument();
    expect(screen.getByText("slider:x_offset")).toBeInTheDocument();
    expect(screen.getByText("slider:y_offset")).toBeInTheDocument();
  });

  it("shows yellow update indicator dot on Info tab only when updateAvailable is true", () => {
    useSettingsMock.mockReturnValue(makeSettingsState());
    usePluginUpdateMock.mockReturnValue({
      versionInfo: { current: "2.1.0", latest: "2.1.1", update_available: true },
      updateAvailable: true,
      refresh: vi.fn(),
    });

    const { rerender } = render(React.createElement(Settings));
    expect(screen.getByTestId("info-tab-update-dot")).toBeInTheDocument();

    usePluginUpdateMock.mockReturnValue({
      versionInfo: { current: "2.1.1", latest: "2.1.1", update_available: false },
      updateAvailable: false,
      refresh: vi.fn(),
    });
    rerender(React.createElement(Settings));
    expect(screen.queryByTestId("info-tab-update-dot")).not.toBeInTheDocument();
  });
});
