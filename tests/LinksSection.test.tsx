import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const callMock = vi.fn();

vi.mock("@decky/api", () => ({
  call: (...args: any[]) => callMock(...args),
}));

vi.mock("@decky/ui", () => ({
  PanelSection: ({ children }: any) => React.createElement("div", {}, children),
  PanelSectionRow: ({ children }: any) => React.createElement("div", {}, children),
  ButtonItem: ({ children, onClick, disabled }: any) =>
    React.createElement("button", { onClick, disabled }, children),
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

vi.mock("../src/translations", () => ({
  t: (k: string) => (k === "version" ? "Version" : k),
}));

import { LinksSection } from "../src/components/LinksSection";
import { resolveTargetLanguage } from "../src/languages";
import { setPluginVersionInfo } from "../src/hooks/usePluginUpdate";

describe("LinksSection info & auto-updater", () => {
  const openUrl = vi.fn();

  beforeEach(() => {
    callMock.mockReset();
    openUrl.mockReset();
    setPluginVersionInfo(null);
    delete (window as any).DeckyBackend;
  });

  it("uses DeckyBackend utilities/install_plugin when available on Steam Deck", async () => {
    const deckyCall = vi.fn().mockResolvedValue(undefined);
    (window as any).DeckyBackend = { call: deckyCall };

    callMock
      .mockResolvedValueOnce("2.0.9")
      .mockResolvedValueOnce({
        current: "2.0.9",
        latest: "2.1.2",
        latest_tag: "v2.1.2",
        update_available: true,
        source_ok: true,
      });

    render(React.createElement(LinksSection, { lang: "en", openUrl }));

    const updateBtn = await screen.findByText(/update_to v2\.1\.2/i);
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(deckyCall).toHaveBeenCalledWith(
        "utilities/install_plugin",
        "https://github.com/yataktyni/decky-lang-badge/releases/download/v2.1.2/release.zip",
        "Decky Localization Badge",
        "2.1.2",
        "",
        2
      );
    });
    expect(callMock).not.toHaveBeenCalledWith("update_plugin");
  });

  it("shows update button with latest version and installs on click", async () => {
    callMock
      .mockResolvedValueOnce("1.0.0")
      .mockResolvedValueOnce({
        current: "1.0.0",
        latest: "1.1.0",
        latest_tag: "v1.1.0",
        update_available: true,
        source_ok: true,
      })
      .mockResolvedValueOnce({
        success: true,
        needs_restart: true,
        version: "1.1.0",
      });

    render(React.createElement(LinksSection, { lang: "en", openUrl }));

    const updateBtn = await screen.findByText(/update_to v1\.1\.0/i);
    expect(screen.getByText(/Version: v1\.0\.0/i)).toBeTruthy();

    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(callMock).toHaveBeenCalledWith("update_plugin");
      expect(screen.getByText(/update_success restart_to_apply/i)).toBeTruthy();
      expect(screen.getByText(/Version: v1\.1\.0/i)).toBeTruthy();
    });
  });

  it("re-checks GitHub and reports already up to date when no newer release exists", async () => {
    callMock
      .mockResolvedValueOnce("2.1.1")
      .mockResolvedValueOnce({
        current: "2.1.1",
        latest: "2.1.0",
        latest_tag: "v2.1.0",
        update_available: false,
        source_ok: true,
      })
      .mockResolvedValueOnce({
        current: "2.1.1",
        latest: "2.1.0",
        latest_tag: "v2.1.0",
        update_available: false,
        source_ok: true,
      });

    render(React.createElement(LinksSection, { lang: "en", openUrl }));

    await waitFor(() => {
      expect(screen.getByText(/Version: v2\.1\.1/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText("update_plugin"));

    await waitFor(() => {
      expect(screen.getByText("already_up_to_date")).toBeTruthy();
    });
    expect(callMock).not.toHaveBeenCalledWith("update_plugin");
  });

  it("surfaces error when update_plugin fails", async () => {
    callMock
      .mockResolvedValueOnce("1.0.0")
      .mockResolvedValueOnce({
        current: "1.0.0",
        latest: "1.2.0",
        latest_tag: "v1.2.0",
        update_available: true,
        source_ok: true,
      })
      .mockResolvedValueOnce({
        success: false,
        error: "Download failed",
      });

    render(React.createElement(LinksSection, { lang: "en", openUrl }));

    const updateBtn = await screen.findByText(/update_to v1\.2\.0/i);
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByText(/update_error: Download failed/i)).toBeTruthy();
    });
  });

  it("still renders version when get_latest_version fails", async () => {
    callMock
      .mockResolvedValueOnce("1.0.0")
      .mockRejectedValueOnce(new Error("GitHub failed"));

    render(React.createElement(LinksSection, { lang: "en", openUrl }));

    await waitFor(() => {
      expect(screen.getByText(/Version: v1\.0\.0/i)).toBeTruthy();
    });
  });

  it("shows the localized guide key and only the selected language's resources", async () => {
    callMock
      .mockResolvedValueOnce("1.0.0")
      .mockResolvedValueOnce({
        current: "1.0.0",
        latest: "1.0.0",
        update_available: false,
        source_ok: true,
      });
    render(React.createElement(LinksSection, { lang: "en", openUrl, targetLang: resolveTargetLanguage("tr") }));

    await waitFor(() => {
      expect(screen.getByText(/Version: v1\.0\.0/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText("translation_guide_en"));
    expect(openUrl).toHaveBeenCalledWith("https://github.com/yataktyni/decky-lang-badge#installing-community-translations-on-steam-deck");
    expect(screen.getByText("Sirius Çeviri")).toBeTruthy();
    expect(screen.getByText("Oyun Çeviri")).toBeTruthy();
    expect(screen.getByText("Steam Deck Türkçe Yama Rehberi")).toBeTruthy();
    expect(screen.queryByText("Tribo Gamer")).toBeNull();
  });
});
