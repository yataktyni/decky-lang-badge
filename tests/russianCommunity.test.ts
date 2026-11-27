import { describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@decky/api", () => ({ fetchNoCors: fetchMock }));
vi.mock("@decky/ui", () => ({ Navigation: {} }));
import { getRussianCommunityUrl, parseRussianCatalog } from "../src/russianCommunity";

describe("Russian community catalog", () => {
  it("matches only released standard translations with a valid Steam AppID", () => {
    const source = `window.CATALOG = ${JSON.stringify({ games: [
      { status: "released", links: { steam: "https://store.steampowered.com/app/123/", guide: "https://steamcommunity.com/sharedfiles/filedetails/?id=456" } },
      { status: "wip", links: { steam: "https://store.steampowered.com/app/124/" } },
      { status: "released", kind: "furry", links: { steam: "https://store.steampowered.com/app/125/" } },
      { status: "released", kind: "mod", links: { steam: "https://store.steampowered.com/app/123/" } },
      { status: "released", kind: "mod", links: { steam: "https://store.steampowered.com/app/128/" } },
      { status: "released", links: { steam: "https://evil.example/app/126/" } },
      { status: "released", links: { steam: "https://store.steampowered.com/app/127/", guide: "https://evil.example/" } },
    ] })};`;
    const games = parseRussianCatalog(source);
    expect([...games.keys()]).toEqual(["123", "127"]);
    expect(games.get("123")).toBe("https://steamcommunity.com/sharedfiles/filedetails/?id=456");
    expect(games.get("127")).toBe("https://e24x5-fox.github.io/claude-rus-hub/");
  });

  it("rejects executable code rather than running it", () => {
    expect(() => parseRussianCatalog("window.CATALOG = { games: [] }; alert('bad')")).toThrow();
  });

  it("shares a catalog request across concurrent lookups", async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => 'window.CATALOG = {"games":[{"status":"released","links":{"steam":"https://store.steampowered.com/app/123/"}}]};' });
    const [first, second] = await Promise.all([getRussianCommunityUrl("123"), getRussianCommunityUrl("123")]);
    expect(first).toBe("https://e24x5-fox.github.io/claude-rus-hub/");
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
