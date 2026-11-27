import { describe, it, expect, vi, beforeEach } from "vitest";

const navExternalWebMock = vi.fn();

vi.mock("@decky/api", () => ({
  call: vi.fn(),
  fetchNoCors: vi.fn(),
}));

vi.mock("@decky/ui", () => ({
  Navigation: {
    NavigateToExternalWeb: (...args: any[]) => navExternalWebMock(...args),
  },
}));

import {
  cleanNonSteamName,
  isSteamAppId,
  urlifyGameName,
  openInSteamBrowser,
  fetchWithTimeout,
  isValidKuliGamePage,
  getKuliStatusFromHtml,
  parseKuliSearchResults,
} from "../src/utils";

declare global {
  // eslint-disable-next-line no-var
  var SteamClient: any;
}

describe("utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navExternalWebMock.mockReset();
    // @ts-ignore
    global.SteamClient = undefined;
  });

  it("cleanNonSteamName removes non-steam suffixes and versions", () => {
    expect(cleanNonSteamName("Game Name (Non-Steam)")).toBe("Game Name");
    expect(cleanNonSteamName("Game v1.2.3")).toBe("Game");
  });

  it("isSteamAppId distinguishes steam ids", () => {
    expect(isSteamAppId("730")).toBe(true);
    expect(isSteamAppId("12345678901")).toBe(false);
    expect(isSteamAppId(undefined)).toBe(false);
  });

  it("urlifyGameName slugifies correctly", () => {
    expect(urlifyGameName("Tom Clancy's Game: Remastered")).toBe("tom-clancys-game");
  });

  it("openInSteamBrowser prefers Navigation.NavigateToExternalWeb", () => {
    const openSpy = vi.fn();
    // @ts-ignore
    global.SteamClient = { System: { OpenInSystemBrowser: openSpy } };
    openInSteamBrowser("https://kuli.com.ua/hades");
    expect(navExternalWebMock).toHaveBeenCalledWith("https://kuli.com.ua/hades");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("openInSteamBrowser falls back to SteamClient when Navigation fails", () => {
    navExternalWebMock.mockImplementation(() => {
      throw new Error("no focused window");
    });
    const openSpy = vi.fn();
    // @ts-ignore
    global.SteamClient = { System: { OpenInSystemBrowser: openSpy } };
    openInSteamBrowser("https://example.com");
    expect(openSpy).toHaveBeenCalledWith("https://example.com");
  });

  it("openInSteamBrowser falls back to window.open when Navigation and SteamClient are unavailable", () => {
    navExternalWebMock.mockImplementation(() => {
      throw new Error("unavailable");
    });
    const wOpen = vi.spyOn(window, "open").mockImplementation(() => null);
    openInSteamBrowser("https://example.com");
    expect(wOpen).toHaveBeenCalledWith("https://example.com", "_blank");
  });

  it("isValidKuliGamePage accepts valid game pages containing 404 in asset hashes", () => {
    const hadesHtml = `
      <!DOCTYPE html>
      <html class="html-product-details-page">
        <head><title>Hades українською</title></head>
        <body>
          <img src="https://kuli.com.ua/images/B1F48DE404FEFBAA.webp" />
          <div class="item__instruction-main">Instructions</div>
        </body>
      </html>
    `;
    expect(isValidKuliGamePage(hadesHtml)).toBe(true);
    expect(getKuliStatusFromHtml(hadesHtml)).toBe("COMMUNITY");
  });

  it("isValidKuliGamePage rejects real 404 pages", () => {
    expect(isValidKuliGamePage('<html class="page-not-found"><title>404</title></html>')).toBe(false);
    expect(isValidKuliGamePage("<html><body>Сторінку не знайдено</body></html>")).toBe(false);
  });

  it("parseKuliSearchResults extracts titles from nested product-title-wrapper markup", () => {
    const searchHtml = `
      <div class="item-box">
        <a class="product-item product-item-short" href="/hollow-knight-silksong">
          <div class="details">
            <h2 class="product-title">
              <div class="product-title-wrapper">
                <div>Hollow Knight: Silksong</div>
              </div>
            </h2>
          </div>
        </a>
      </div>
      <div class="item-box">
        <a class="product-item product-item-short" href="/hollow-knight">
          <div class="details">
            <h2 class="product-title">
              <div class="product-title-wrapper">
                <div>Hollow Knight</div>
              </div>
            </h2>
          </div>
        </a>
      </div>
    `;

    const results = parseKuliSearchResults(searchHtml, "Hollow Knight");
    expect(results.length).toBe(2);
    expect(results[0].slug).toBe("hollow-knight");
    expect(results[0].title).toBe("Hollow Knight");
    expect(results[0].score).toBe(0);
    expect(results[1].slug).toBe("hollow-knight-silksong");
  });

  it("fetchWithTimeout resolves normal promise", async () => {
    const resp = new Response("ok");
    const out = await fetchWithTimeout(Promise.resolve(resp), 1000);
    expect(out).toBe(resp);
  });
});
