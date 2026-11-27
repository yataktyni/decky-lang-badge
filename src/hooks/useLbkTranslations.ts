// decky-lang-badge/src/hooks/useLbkTranslations.ts
import { useEffect, useState } from "react";
import { call } from "@decky/api";
import { Subject } from "rxjs";
import { logger } from "../logger";

const log = logger.component("useLbkTranslations");

export interface LbkTranslation {
    id: string;
    slug: string;
    name: string;
    team: string;
    version: string | null;
    status: string;
    translation_progress: number;
    voice_progress: number | null;
    has_voice: boolean;
    has_achievements: boolean;
    ai: string | null;
    installed: boolean;
    installed_version: string | null;
    has_update?: boolean;
    deep_link: string;
}

export interface LbkTranslationsResult {
    available: boolean;
    installed_any: boolean;
    has_update_any?: boolean;
    translations: LbkTranslation[];
    error?: string;
}

export interface LbkCatalogEntry {
    installed: boolean;
    has_update: boolean;
    count: number;
}

export interface LbkCatalogMapResult {
    available: boolean;
    games: Record<string, LbkCatalogEntry>;
    error?: string;
}

export interface InstallLbkLauncherResult {
    success: boolean;
    status?: LbkStatus;
    error?: string;
}

export interface LbkStatus {
    installed: boolean;
    db_found: boolean;
    db_path: string | null;
    launch_method: string | null;
    launcher_path: string | null;
}

export interface OpenInLbkResult {
    success: boolean;
    method?: string;
    deep_link?: string;
    error?: string;
}

const EMPTY_RESULT: LbkTranslationsResult = {
    available: false,
    installed_any: false,
    translations: [],
};

const lbkCache: Record<string, LbkTranslationsResult> = {};
export const lbkRefresh$ = new Subject<void>();

export function clearLbkCache(): void {
    for (const key of Object.keys(lbkCache)) {
        delete lbkCache[key];
    }
}

export function triggerLbkRefresh(): void {
    clearLbkCache();
    lbkRefresh$.next();
}

export async function getLbkCatalogMap(): Promise<LbkCatalogMapResult> {
    try {
        const res = await call<[], LbkCatalogMapResult>("get_lbk_catalog_map");
        if (res && res.games && typeof res.games === "object") {
            return res;
        }
    } catch (e) {
        log.warn("get_lbk_catalog_map failed:", e);
    }
    return { available: false, games: {} };
}

export async function installLbkLauncher(): Promise<InstallLbkLauncherResult> {
    try {
        const res = await call<[], InstallLbkLauncherResult>("install_lbk_launcher");
        if (res?.success) {
            triggerLbkRefresh();
        }
        return res ?? { success: false, error: "Empty response" };
    } catch (e) {
        log.error("install_lbk_launcher failed:", e);
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to install LBK Launcher",
        };
    }
}

export async function launchLbkLauncher(): Promise<OpenInLbkResult> {
    try {
        const spec = await call<[string, string], LbkLaunchSpec>("get_lbk_launch_spec", "", "");
        if (spec?.success) {
            const launched = await launchViaSteamShortcut(spec);
            if (launched) {
                return { success: true, method: `steam-shortcut:${spec.method}` };
            }
        }
    } catch (e) {
        log.warn("launchLbkLauncher via shortcut failed:", e);
    }
    return { success: false, error: "Could not launch LBK Launcher in Steam" };
}

let cachedLbkStatus: LbkStatus | null = null;

export function getCachedLbkStatus(): LbkStatus | null {
    return cachedLbkStatus;
}

export async function getLbkStatus(): Promise<LbkStatus> {
    try {
        const res = await call<[], LbkStatus>("get_lbk_status");
        cachedLbkStatus = res;
        return res;
    } catch (e) {
        log.warn("get_lbk_status failed:", e);
        const fallback: LbkStatus = {
            installed: false,
            db_found: false,
            db_path: null,
            launch_method: null,
            launcher_path: null,
        };
        return cachedLbkStatus ?? fallback;
    }
}

interface LbkLaunchSpec {
    success: boolean;
    method?: string;
    bin?: string;
    args?: string;
    workdir?: string;
    deep_link?: string;
    error?: string;
}

declare const SteamClient:
    | {
        Apps?: {
            AddShortcut?: (name: string, exe: string, startDir: string, launchOptions: string) => Promise<number>;
            SetShortcutName?: (appId: number, name: string) => void;
            SetShortcutExe?: (appId: number, exe: string) => void;
            SetShortcutStartDir?: (appId: number, startDir: string) => void;
            SetShortcutLaunchOptions?: (appId: number, launchOptions: string) => void;
            RemoveShortcut?: (appId: number) => void;
            RunGame?: (gameId: string, args: string, eLaunchType: number, timeout: number) => void;
        };
        GameSessions?: {
            RegisterForAppLifetimeNotifications?: (
                cb: (e: { unAppID: number; bRunning: boolean }) => void
            ) => { unregister?: () => void };
        };
    }
    | undefined;

declare const appStore:
    | {
        GetAppOverviewByAppID?: (appId: number) => {
            display_name?: string;
            m_gameid?: string;
            gameid?: string;
        } | null;
    }
    | undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchViaSteamShortcut(spec: LbkLaunchSpec): Promise<boolean> {
    if (
        typeof SteamClient === "undefined" ||
        !SteamClient.Apps?.AddShortcut ||
        !SteamClient.Apps?.RunGame ||
        !SteamClient.Apps?.SetShortcutName ||
        !SteamClient.Apps?.SetShortcutExe ||
        !SteamClient.Apps?.SetShortcutLaunchOptions ||
        !SteamClient.Apps?.SetShortcutStartDir ||
        typeof appStore === "undefined" ||
        !appStore.GetAppOverviewByAppID ||
        !spec.bin
    ) {
        return false;
    }

    const shortcutName = "LBK Launcher";
    const tempId = `lbk-launcher-temp-${Date.now()}`;
    let steamAppId: number | null = null;

    try {
        steamAppId = await SteamClient.Apps.AddShortcut(tempId, tempId, "", "");
        let gameInfo: { display_name?: string; m_gameid?: string; gameid?: string } | null = null;
        const deadline = Date.now() + 2500;

        while (Date.now() < deadline) {
            await sleep(100);
            gameInfo = appStore.GetAppOverviewByAppID(steamAppId);
            if (!gameInfo) continue;
            if (gameInfo.display_name === shortcutName) break;

            SteamClient.Apps.SetShortcutName(steamAppId, shortcutName);
            SteamClient.Apps.SetShortcutLaunchOptions(steamAppId, spec.args || "");
            SteamClient.Apps.SetShortcutExe(steamAppId, spec.bin);
            SteamClient.Apps.SetShortcutStartDir(steamAppId, spec.workdir || "/home/deck");
            await sleep(100);
        }

        const gameId = gameInfo?.m_gameid || gameInfo?.gameid;
        if (!gameInfo || gameInfo.display_name !== shortcutName || !gameId) {
            log.warn("Temporary LBK shortcut timed out, cleaning up:", steamAppId);
            SteamClient.Apps.RemoveShortcut?.(steamAppId);
            return false;
        }

        const createdAppId = steamAppId;
        const cleanupShortcut = () => {
            try {
                SteamClient.Apps?.RemoveShortcut?.(createdAppId);
                log.info("Removed temporary LBK shortcut:", createdAppId);
            } catch (e) {
                log.warn("Failed to remove temporary LBK shortcut:", e);
            }
        };

        let cleaned = false;
        const sub = SteamClient.GameSessions?.RegisterForAppLifetimeNotifications?.((e) => {
            if (e.unAppID === createdAppId && !e.bRunning && !cleaned) {
                cleaned = true;
                sub?.unregister?.();
                cleanupShortcut();
                triggerLbkRefresh();
            }
        });

        SteamClient.Apps.RunGame(gameId, "", -1, 100);
        log.info("Launched LBK Launcher via Steam shortcut:", { createdAppId, gameId, deepLink: spec.deep_link });
        return true;
    } catch (e) {
        log.error("Steam shortcut launch for LBK failed:", e);
        if (steamAppId !== null) {
            try {
                SteamClient.Apps?.RemoveShortcut?.(steamAppId);
            } catch {
                // ignore cleanup errors
            }
        }
        return false;
    }
}

export async function openInLbk(slug: string, team: string): Promise<OpenInLbkResult> {
    try {
        // 1. Prefer Steam Gamescope shortcut launch (visible fullscreen + gamepad focus in Gaming Mode)
        const spec = await call<[string, string], LbkLaunchSpec>("get_lbk_launch_spec", slug, team);
        if (spec?.success) {
            const launchedInSteam = await launchViaSteamShortcut(spec);
            if (launchedInSteam) {
                return {
                    success: true,
                    method: `steam-shortcut:${spec.method}`,
                    deep_link: spec.deep_link,
                };
            }
        }
    } catch (e) {
        log.warn("Steam shortcut launch path failed, falling back to backend spawn:", e);
    }

    // 2. Fallback: direct detached launch (Desktop Mode / non-Gamescope)
    try {
        return await call<[string, string], OpenInLbkResult>("open_in_lbk", slug, team);
    } catch (e) {
        log.error("open_in_lbk failed:", e);
        return {
            success: false,
            error: e instanceof Error ? e.message : "Failed to launch LBK Launcher",
        };
    }
}

export function useLbkTranslations(
    appId: string | undefined,
    enabled: boolean = true
): { data: LbkTranslationsResult; loading: boolean } {
    const [data, setData] = useState<LbkTranslationsResult>(
        appId && enabled && lbkCache[appId] ? lbkCache[appId] : EMPTY_RESULT
    );
    const [loading, setLoading] = useState<boolean>(Boolean(appId && enabled && !lbkCache[appId]));
    const [dataAppId, setDataAppId] = useState(appId);

    useEffect(() => {
        let cancelled = false;
        setDataAppId(appId);

        if (!appId || !enabled) {
            setData(EMPTY_RESULT);
            setLoading(false);
            return undefined;
        }

        const fetchLatest = (showSpinner: boolean) => {
            if (showSpinner) setLoading(true);
            let timer: ReturnType<typeof setTimeout>;
            Promise.race([
                call<[string], LbkTranslationsResult>("get_lbk_translations", appId),
                new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("LBK request timed out")), 5000); }),
            ])
                .then((result) => {
                    if (cancelled) return;
                    const normalized: LbkTranslationsResult = result && Array.isArray(result.translations)
                        ? result
                        : EMPTY_RESULT;
                    lbkCache[appId] = normalized;
                    setData(normalized);
                })
                .catch((e) => {
                    log.warn(`get_lbk_translations failed for ${appId}:`, e);
                    if (!cancelled && showSpinner) setData(EMPTY_RESULT);
                })
                .finally(() => {
                    clearTimeout(timer);
                    if (!cancelled) setLoading(false);
                });
        };

        // Stale-while-revalidate: show cached data immediately, refresh from local SQLite in background
        if (lbkCache[appId]) {
            setData(lbkCache[appId]);
            setLoading(false);
            fetchLatest(false);
        } else {
            setData(EMPTY_RESULT);
            fetchLatest(true);
        }

        const sub = lbkRefresh$.subscribe(() => {
            fetchLatest(false);
        });

        return () => {
            cancelled = true;
            sub.unsubscribe();
        };
    }, [appId, enabled]);

    if (!enabled || !appId) return { data: EMPTY_RESULT, loading: false };
    if (dataAppId !== appId) return { data: lbkCache[appId] ?? EMPTY_RESULT, loading: !lbkCache[appId] };
    return { data, loading };
}
