import { fetchNoCors } from "@decky/api";
import { fetchWithTimeout } from "./utils";

const CATALOG_URL = "https://raw.githubusercontent.com/e24x5-Fox/claude-rus-hub/main/docs/games.js";
const CATALOG_PAGE = "https://e24x5-fox.github.io/claude-rus-hub/";
const TTL_MS = 6 * 60 * 60 * 1000;
let cached: { games: Map<string, string>; timestamp: number } | null = null;
let pending: Promise<Map<string, string>> | null = null;

export function parseRussianCatalog(source: string): Map<string, string> {
    if (source.length > 1024 * 1024) throw new Error("Translation catalog too large");
    const match = source.match(/window\.CATALOG\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    if (!match) throw new Error("Invalid translation catalog");
    const catalog = JSON.parse(match[1]);
    if (!Array.isArray(catalog.games)) throw new Error("Invalid translation catalog");
    const games = new Map<string, string>();
    for (const game of catalog.games) {
        if (game?.status !== "released" || (game.kind && game.kind !== "translation") || typeof game.links?.steam !== "string") continue;
        const steam = game.links.steam.match(/^https:\/\/store\.steampowered\.com\/app\/(\d+)\/?(?:\?.*)?$/);
        if (!steam) continue;
        const guide = game.links.guide;
        const url = typeof guide === "string" && /^https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=\d+$/.test(guide)
            ? guide : CATALOG_PAGE;
        games.set(steam[1], url);
    }
    return games;
}

export async function getRussianCommunityUrl(appId: string): Promise<string | null> {
    if (cached && Date.now() - cached.timestamp < TTL_MS) return cached.games.get(appId) ?? null;
    if (!pending) {
        pending = (async () => {
            const response = await fetchWithTimeout(fetchNoCors(CATALOG_URL), 10000);
            if (!response.ok) throw new Error("Translation catalog unavailable");
            const games = parseRussianCatalog(await response.text());
            cached = { games, timestamp: Date.now() };
            return games;
        })().finally(() => { pending = null; });
    }
    return (await pending).get(appId) ?? null;
}
