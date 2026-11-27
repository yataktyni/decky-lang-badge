import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const showModalSpy = vi.fn();

vi.mock("@decky/api", () => ({ call: vi.fn() }));
vi.mock("@decky/ui", () => ({
  DialogButton: (props: any) => {
    const { focusable, noFocusRing, children, ...rest } = props;
    return React.createElement("button", { ...rest, "data-focusable": String(focusable) }, children);
  },
  Focusable: (props: any) => {
    const { onActivate, children, ...rest } = props;
    return React.createElement("button", { ...rest, onClick: onActivate ?? rest.onClick }, children);
  },
  ModalRoot: ({ children }: any) => React.createElement("div", {}, children),
  DialogHeader: ({ children }: any) => React.createElement("div", {}, children),
  DialogBody: ({ children }: any) => React.createElement("div", {}, children),
  showModal: (...args: any[]) => showModalSpy(...args),
}));

const openSpy = vi.fn();

vi.mock("../src/utils", async () => {
  const actual = await vi.importActual<any>("../src/utils");
  return { ...actual, openInSteamBrowser: (...args: any[]) => openSpy(...args) };
});

vi.mock("../src/translations", () => ({
  t: (k: string) => k,
  getSupportedLanguage: () => "en",
  resolveUiLanguage: () => "en",
}));

vi.mock("../src/hooks/useAppId", () => ({
  useAppId: () => ({ appId: "730", appName: "Counter-Strike 2", isLoading: false }),
}));

let settingsMock: any = {
  badgeType: "full",
  badgePosition: "top-right",
  offsetX: 20,
  offsetY: 90,
  showOnStore: true,
  storeOffsetX: 0,
  storeOffsetY: 20,
  enableLbkIntegration: true,
};

vi.mock("../src/hooks/useSettings", () => ({
  useSettings: () => ({ settings: settingsMock, loading: false }),
}));

let statusMock: any = { status: "OFFICIAL", url: "https://kuli.example", loading: false };
vi.mock("../src/hooks/useBadgeStatus", () => ({
  useBadgeStatus: () => statusMock,
}));

let lbkMock: any = { data: { available: false, installed_any: false, translations: [] }, loading: false };
vi.mock("../src/hooks/useLbkTranslations", () => ({
  useLbkTranslations: () => lbkMock,
  openInLbk: vi.fn(),
}));

import Badge from "../src/components/Badge";

describe("Badge component", () => {
  beforeEach(() => {
    openSpy.mockReset();
    showModalSpy.mockReset();
    settingsMock = {
      badgeType: "full",
      badgePosition: "top-right",
      offsetX: 20,
      offsetY: 90,
      showOnStore: true,
      storeOffsetX: 0,
      storeOffsetY: 20,
      enableLbkIntegration: true,
    };
    statusMock = { status: "OFFICIAL", url: "https://kuli.example", loading: false };
    lbkMock = { data: { available: false, installed_any: false, translations: [] }, loading: false };
  });

  it("renders localized status label when badgeType=full", () => {
    render(React.createElement(Badge, { pAppId: "730", pAppName: "CS2" }));
    expect(screen.getByText("official")).toBeInTheDocument();
  });

  it("triggers external open on click when url exists", () => {
    render(React.createElement(Badge, { pAppId: "730", pAppName: "CS2" }));
    fireEvent.click(screen.getByRole("button"));
    expect(openSpy).toHaveBeenCalledWith("https://kuli.example");
  });

  it("does not trigger open when no url", () => {
    statusMock = { status: "NONE", url: "", loading: false };
    render(React.createElement(Badge, { pAppId: "730", pAppName: "CS2" }));
    fireEvent.click(screen.getByRole("button"));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("applies top-left positioning when configured", () => {
    settingsMock.badgePosition = "top-left";
    settingsMock.offsetX = 33;
    settingsMock.offsetY = 44;

    const { container } = render(React.createElement(Badge, { pAppId: "730", pAppName: "CS2" }));
    const positioned = container.firstElementChild as HTMLElement;
    expect(positioned.style.left).toContain("33px");
    expect(positioned.style.top).toContain("44px");
  });

  it("opens LBK modal and shows green INSTALLED badge when LBK translation is installed", () => {
    statusMock = { status: "NONE", url: null, loading: false };
    lbkMock = {
      data: {
        available: true,
        installed_any: true,
        translations: [
          {
            id: "g1",
            slug: "hollow-knight",
            name: "Hollow Knight",
            team: "Team UA",
            version: "1.0",
            status: "released",
            translation_progress: 100,
            voice_progress: null,
            has_voice: false,
            has_achievements: false,
            ai: null,
            installed: true,
            installed_version: "1.0",
            deep_link: "lbk://games/hollow-knight/Team%20UA",
          },
        ],
      },
      loading: false,
    };

    render(React.createElement(Badge, { pAppId: "367520", pAppName: "Hollow Knight" }));
    expect(screen.getByText("lbk_installed")).toBeInTheDocument();
    expect(screen.getByText("LBK")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("shows microphone indicator on LBK pill when voiceover translation is available", () => {
    statusMock = { status: "NONE", url: null, loading: false };
    lbkMock = {
      data: {
        available: true,
        installed_any: false,
        has_update_any: false,
        translations: [
          {
            id: "v1",
            slug: "bioshock",
            name: "BioShock",
            team: "Studio UA",
            version: "2.0",
            status: "released",
            translation_progress: 100,
            voice_progress: 100,
            has_voice: true,
            has_achievements: false,
            ai: null,
            installed: false,
            installed_version: null,
            deep_link: "lbk://games/bioshock/Studio%20UA",
          },
        ],
      },
      loading: false,
    };

    render(React.createElement(Badge, { pAppId: "7670", pAppName: "BioShock" }));
    expect(screen.getByText("🎙 LBK")).toBeInTheDocument();
  });

  it("renders target language flag with UI-language label when non-Ukrainian language is selected", () => {
    settingsMock.targetLanguage = "pl";
    statusMock = { status: "OFFICIAL", url: null, loading: false };
    render(React.createElement(Badge, { pAppId: "292030", pAppName: "The Witcher 3" }));
    expect(screen.getByText("🇵🇱")).toBeInTheDocument();
    expect(screen.getByText("official")).toBeInTheDocument();
  });
});
