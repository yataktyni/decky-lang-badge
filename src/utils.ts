// decky-lang-badge/src/utils.ts
import { fetchNoCors } from "@decky/api";
import { Navigation } from "@decky/ui";
import { logger } from "./logger";

const log = logger.component("utils");

/**
 * Cleans a game name by removing common non-Steam tags and versions.
 */
export function cleanNonSteamName(name: string): string {
    if (!name) return "";
    return name
        .replace(/\s*\((Shortcut|Non-Steam|App|Game)\)$/i, "")
        .replace(/\s*(?:v|version|ver)\.?\s*\d+(?:\.\d+)*/i, "")
        .replace(/\s*(?:Remastered|Definitive Edition|Director's Cut|Enhanced Edition|Game of the Year|GOTY|Special Edition|Legendary Edition|Complete Edition|Deluxe Edition|Ultimate Edition)$/i, "")
        .trim();
}

/**
 * Checks if an AppID is a standard Steam Game ID (as opposed to a non-Steam shortcut).
 */
export function isSteamAppId(appId: string | undefined): boolean {
    if (!appId) return false;
    const id = parseInt(appId, 10);
    // Standard Steam AppIDs are currently < 1,000,000,000.
    // Non-Steam shortcuts typically have much larger IDs or IDs derived from their path/name.
    return !isNaN(id) && id < 1000000000;
}

/**
 * Converts a game name to a URL-friendly format for kuli.com.ua
 */
export function urlifyGameName(name: string): string {
    const cleaned = cleanNonSteamName(name);
    return cleaned
        .toLowerCase()
        .replace(/[':’]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .trim()
        .replace(/^-+|-+$/g, "");
}

/**
 * Opens a URL in Steam's built-in Game Mode browser (Navigation.NavigateToExternalWeb),
 * falling back to SteamClient.System.OpenInSystemBrowser or window.open.
 */
export function openInSteamBrowser(url: string): void {
    if (!url) return;

    try {
        if (Navigation && typeof Navigation.NavigateToExternalWeb === "function") {
            Navigation.NavigateToExternalWeb(url);
            return;
        }
    } catch (e) {
        log.warn("Navigation.NavigateToExternalWeb failed, trying fallback:", e);
    }

    try {
        if (
            typeof SteamClient !== "undefined" &&
            SteamClient.System?.OpenInSystemBrowser
        ) {
            SteamClient.System.OpenInSystemBrowser(url);
            return;
        }
    } catch (e) {
        log.warn("SteamClient.System.OpenInSystemBrowser failed, trying window.open:", e);
    }

    try {
        if (typeof window !== "undefined") {
            window.open(url, "_blank");
        }
    } catch (e) {
        log.error("Error opening URL:", e);
    }
}

// Declare SteamClient for TypeScript
declare const SteamClient:
    | {
        System?: {
            OpenInSystemBrowser?: (url: string) => void;
        };
        Settings?: {
            GetClientSettings?: () => unknown;
        };
    }
    | undefined;

const FETCH_TIMEOUT_MS = 5000;

// Helper function to add timeout to fetch requests (clears timer on settle)
export async function fetchWithTimeout(
    fetchPromise: Promise<Response>,
    timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
    });
    try {
        return await Promise.race([fetchPromise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// Helper for Levenshtein distance
function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#x27;|&apos;|&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&nbsp;/gi, " ")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Detects if HTML response from kuli.com.ua is a valid game page (not 404/not-found).
 * Avoids checking bare "404" substring which can appear in image hashes or asset URLs.
 */
export function isValidKuliGamePage(html: string): boolean {
    if (!html) return false;
    const hLow = html.toLowerCase();
    if (
        hLow.includes("page-not-found") ||
        hLow.includes("сторінку не знайдено") ||
        /<title[^>]*>\s*404\b/.test(hLow)
    ) {
        return false;
    }
    return (
        hLow.includes("product-details-page") ||
        hLow.includes("product-essential") ||
        hLow.includes("item__instruction-main")
    );
}

/**
 * Extracts localization status ("COMMUNITY" or "OFFICIAL") from a Kuli game page HTML.
 */
export function getKuliStatusFromHtml(html: string): "COMMUNITY" | "OFFICIAL" {
    if (html.toLowerCase().includes("item__instruction-main")) return "COMMUNITY";
    return "OFFICIAL";
}

/**
 * Parses search results from kuli.com.ua/games?query=... HTML.
 * Supports nested wrappers inside .product-title (e.g. .product-title-wrapper > div).
 */
export function parseKuliSearchResults(
    html: string,
    query: string
): { slug: string; title: string; score: number }[] {
    const results: { slug: string; title: string; score: number }[] = [];
    if (!html || !query) return results;

    const qLow = query.toLowerCase().trim();
    const productItemRegex =
        /<a\b[^>]*class="[^"]*product-item[^"]*"[^>]*href="\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>|<a\b[^>]*href="\/([a-z0-9-]+)"[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = productItemRegex.exec(html)) !== null) {
        const slug = (match[1] || match[3] || "").trim();
        const body = match[2] || match[4] || "";

        if (!slug || slug === "games" || results.some((r) => r.slug === slug)) continue;

        const titleBlock = body.match(
            /<([a-z0-9]+)\b[^>]*class="[^"]*product-title[^"]*"[^>]*>([\s\S]*?)<\/\1>/i
        );
        if (!titleBlock) continue;

        const rawTitle = titleBlock[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const title = decodeHtmlEntities(rawTitle);
        if (!title) continue;

        const tLow = title.toLowerCase().trim();
        let score = levenshtein(qLow, tLow);
        if (tLow === qLow) score = 0;
        else if (tLow.includes(qLow) || qLow.includes(tLow)) score = Math.min(score, 10);

        results.push({ slug, title, score });
    }

    results.sort((a, b) => a.score - b.score);
    return results;
}

export async function searchKuli(gameName: string): Promise<{ status: string; slug: string } | null> {
    if (!gameName) return null;

    // Internal helper to perform search with a given query
    async function performSearch(query: string): Promise<{ status: string; slug: string } | null> {
        try {
            const headers = {
                "Accept": "text/html",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            };

            // 1. Try DIRECT LINK first
            const directSlug = urlifyGameName(query);
            const directUrl = `https://kuli.com.ua/${directSlug}`;
            log.info(`Trying direct Kuli link for "${query}": ${directUrl}`);

            try {
                const directRes = await fetchWithTimeout(fetchNoCors(directUrl, { headers }), 8000);
                if (directRes.status !== 404) {
                    const directHtml = await directRes.text();

                    if (isValidKuliGamePage(directHtml)) {
                        log.info(`Direct link HIT for "${query}" -> ${directSlug}`);
                        return { status: getKuliStatusFromHtml(directHtml), slug: directSlug };
                    }
                }
            } catch (e) {
                log.warn(`Direct check failed for ${directSlug}:`, e);
            }

            // 2. Fallback to SEARCH
            log.info(`Searching Kuli for: ${query}`);
            const searchUrl = `https://kuli.com.ua/games?query=${encodeURIComponent(query)}`;
            const res = await fetchWithTimeout(fetchNoCors(searchUrl, { headers }), 10000);

            const html = await res.text();
            const results = parseKuliSearchResults(html, query);

            if (results.length === 0) return null;

            const best = results[0];

            if (best.score > 25) {
                log.info(`Rejecting match "${best.title}" (score ${best.score}) for query "${query}"`);
                return null;
            }

            log.info(`Best match for "${query}": "${best.title}" (${best.slug}) score=${best.score}`);

            // Verify game page
            const verifyUrl = `https://kuli.com.ua/${best.slug}`;
            const verifyRes = await fetchWithTimeout(fetchNoCors(verifyUrl, { headers }), 8000);
            if (verifyRes.status === 404) return null;
            const verifyHtml = await verifyRes.text();

            if (isValidKuliGamePage(verifyHtml)) {
                return { status: getKuliStatusFromHtml(verifyHtml), slug: best.slug };
            }

            return null;
        } catch (e) {
            log.error(`performSearch failed for ${query}:`, e);
            return null;
        }
    }

    // Attempt 1: Full cleaned name
    let result = await performSearch(gameName);
    if (result) return result;

    // Attempt 2: If name is long/complex, try first two words
    const words = cleanNonSteamName(gameName).split(/\s+/);
    if (words.length > 2) {
        const shorterQuery = words.slice(0, 2).join(" ");
        log.info(`Retrying with shorter query: "${shorterQuery}"`);
        result = await performSearch(shorterQuery);
        if (result) return result;
    }

    return null;
}
