// src/hooks/useBadgeStatus.ts
import { useState, useEffect } from "react";
import { fetchNoCors } from "@decky/api";
import { SettingsContext } from "./useSettings";
import {
    LanguageConfig,
    isOfficialLanguageInStoreText,
    resolveTargetLanguage,
} from "../languages";
import {
    cleanNonSteamName,
    searchKuli,
    fetchWithTimeout,
    isSteamAppId,
} from "../utils";
import { logger } from "../logger";

const log = logger.component("useBadgeStatus");

export type BadgeStatus = "OFFICIAL" | "COMMUNITY" | "NONE";

interface CachedStatusEntry {
    status: BadgeStatus;
    url: string | null;
    cachedAt: number;
}

const STORAGE_KEY = "decky_lang_badge_status_cache_v2";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_ENTRIES = 500;

const statusCache: Record<string, CachedStatusEntry> = {};

function makeCacheKey(appId: string, langCode: string): string {
    return `${langCode}:${appId}`;
}

function loadPersistedCache(): void {
    try {
        if (typeof window === "undefined" || !window.localStorage) return;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        const now = Date.now();
        for (const [key, entry] of Object.entries(parsed as Record<string, any>)) {
            if (
                entry &&
                (entry.status === "OFFICIAL" || entry.status === "COMMUNITY" || entry.status === "NONE") &&
                typeof entry.cachedAt === "number" &&
                now - entry.cachedAt < CACHE_TTL_MS
            ) {
                statusCache[key] = {
                    status: entry.status,
                    url: typeof entry.url === "string" ? entry.url : null,
                    cachedAt: entry.cachedAt,
                };
            }
        }
    } catch {
        // ignore storage errors
    }
}

function persistCache(): void {
    try {
        if (typeof window === "undefined" || !window.localStorage) return;
        const entries = Object.entries(statusCache);
        if (entries.length > MAX_CACHE_ENTRIES) {
            entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
            const toDrop = entries.length - MAX_CACHE_ENTRIES;
            for (let i = 0; i < toDrop; i++) {
                delete statusCache[entries[i][0]];
            }
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statusCache));
    } catch {
        // ignore quota/storage errors
    }
}

loadPersistedCache();

export function getCachedBadgeStatus(appId: string, langCode?: string): BadgeStatus | null {
    const code = langCode || resolveTargetLanguage(SettingsContext.value.targetLanguage).code;
    const key = makeCacheKey(appId, code);
    const entry = statusCache[key];
    if (!entry) return null;
    if (Date.now() - entry.cachedAt >= CACHE_TTL_MS) {
        delete statusCache[key];
        return null;
    }
    return entry.status;
}

export function getCachedBadgeStatuses(langCode: string): Record<string, BadgeStatus> {
    const prefix = `${langCode}:`;
    const result: Record<string, BadgeStatus> = {};
    for (const key of Object.keys(statusCache)) {
        if (!key.startsWith(prefix)) continue;
        const appId = key.slice(prefix.length);
        const status = getCachedBadgeStatus(appId, langCode);
        if (status) result[appId] = status;
    }
    return result;
}

export function clearBadgeStatusCache(): void {
    for (const key of Object.keys(statusCache)) {
        delete statusCache[key];
    }
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // ignore
    }
}

/**
 * Hook to manage fetching of localization status for the selected target language.
 */
export function useBadgeStatus(
    appId: string | undefined,
    appName: string | undefined,
    targetLang?: LanguageConfig
) {
    const resolvedLang = targetLang ?? resolveTargetLanguage(SettingsContext.value.targetLanguage);
    const langCode = resolvedLang.code;

    const [status, setStatus] = useState<BadgeStatus | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchStatus() {
            if (!appId) {
                setLoading(false);
                return;
            }

            const cacheKey = makeCacheKey(appId, langCode);
            const cachedEntry = statusCache[cacheKey];
            if (cachedEntry && Date.now() - cachedEntry.cachedAt < CACHE_TTL_MS) {
                log.info(`Using cached status for ${cacheKey}:`, cachedEntry);
                setStatus(cachedEntry.status);
                setUrl(cachedEntry.url);
                setLoading(false);
                return;
            }

            try {
                let currentAppName = cleanNonSteamName(appName || "");
                const isSteamId = isSteamAppId(appId);

                let steamStatus: BadgeStatus | null = null;
                let storeName: string | null = null;

                if (!isSteamId) {
                    log.info(`Non-Steam game detected: ${currentAppName} (${appId})`);
                }

                // 1. Steam Store Metadata Check (works for all 29 supported Steam languages)
                if (isSteamId) {
                    try {
                        const steamResp = await fetchWithTimeout(
                            fetchNoCors(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`),
                            10000
                        );
                        const steamData = await steamResp.json();

                        if (steamData && steamData[appId]?.success) {
                            storeName = steamData[appId].data.name;
                            currentAppName = storeName || currentAppName;
                            const languages = steamData[appId].data.supported_languages || "";
                            if (isOfficialLanguageInStoreText(languages, resolvedLang)) {
                                steamStatus = "OFFICIAL";
                            }
                        }
                    } catch (e) {
                        log.warn(`Store metadata fetch failed for ${appId}:`, e);
                    }
                }

                // 2. Community Support (currently Kuli.com.ua for Ukrainian)
                let kuliStatus: BadgeStatus | null = null;
                let kuliUrl: string | null = null;

                const searchName = storeName || currentAppName;

                if (!cancelled && searchName && resolvedLang.hasUkrainianCommunity) {
                    log.info(`Resolving Kuli for: ${searchName} (AppID: ${appId})`);
                    try {
                        const response = await searchKuli(searchName);
                        if (!cancelled && response) {
                            kuliStatus = response.status as BadgeStatus;
                            kuliUrl = `https://kuli.com.ua/${response.slug}`;
                        }
                    } catch (e) {
                        log.error(`Kuli resolution failed for ${searchName}:`, e);
                    }
                }

                // 3. Merge Results
                let finalStatus: BadgeStatus = "NONE";
                if (steamStatus === "OFFICIAL") {
                    finalStatus = "OFFICIAL";
                } else if (kuliStatus) {
                    finalStatus = kuliStatus;
                }

                const finalUrl = kuliUrl;

                if (!cancelled) {
                    statusCache[cacheKey] = { status: finalStatus, url: finalUrl, cachedAt: Date.now() };
                    persistCache();

                    setStatus(finalStatus);
                    setUrl(finalUrl);
                }
            } catch (e) {
                log.error("Status fetch failed:", e);
                if (!cancelled) setStatus("NONE");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        setLoading(true);
        fetchStatus();

        return () => {
            cancelled = true;
        };
    }, [appId, appName, langCode]);

    return { status, url, loading };
}
