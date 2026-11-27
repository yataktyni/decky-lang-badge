// decky-lang-badge/src/patches/StorePatch.ts
import { call, fetchNoCors, routerHook } from "@decky/api";
import { findModuleExport } from "@decky/ui";
import { BehaviorSubject } from "rxjs";
import { SettingsContext } from "../hooks/useSettings";
import { getCachedBadgeStatuses } from "../hooks/useBadgeStatus";
import { LbkTranslationsResult, getLbkCatalogMap, lbkRefresh$ } from "../hooks/useLbkTranslations";
import { SUPPORTED_LANGUAGES, isOfficialLanguageInStoreText, resolveTargetLanguage } from "../languages";
import { installStoreTiles } from "./StoreTiles";
import { t, resolveUiLanguage } from "../translations";
import { urlifyGameName, searchKuli, fetchWithTimeout, isValidKuliGamePage, getKuliStatusFromHtml } from "../utils";
import { logger } from "../logger";

const log = logger.component("StorePatch");

// Store app ID observable - components can subscribe to this
export const storeAppId$ = new BehaviorSubject<string>("");

// Tier colors and shadows matching the library badge
const BADGE_COLORS = {
    OFFICIAL: { bg: "#28a745", text: "#ffffff", shadow: "rgba(40, 167, 69, 0.4)" },
    INSTALLED: { bg: "#10b981", text: "#ffffff", shadow: "rgba(16, 185, 129, 0.45)" },
    COMMUNITY: { bg: "#ffc107", text: "#000000", shadow: "rgba(255, 193, 7, 0.4)" },
    NONE: { bg: "#dc3545", text: "#ffffff", shadow: "rgba(220, 53, 69, 0.4)" },
    PENDING: { bg: "#666666", text: "#ffffff", shadow: "rgba(102, 102, 102, 0.4)" }
};

const ICONS = {
    OFFICIAL: '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.248-16.379-6.248-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.248 16.379 6.248 22.628 0z"/></svg>',
    INSTALLED: '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.248-16.379-6.248-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.248 16.379 6.248 22.628 0z"/></svg>',
    COMMUNITY: '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>',
    NONE: '<svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor" style="display:inline-block;vertical-align:middle;"><path d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm84.426 312.441c4.7 4.7 4.7 12.312 0 17.012l-10.118 10.119c-4.7 4.7-12.312 4.7-17.012 0L256 289.426l-57.296 57.297c-4.7 4.7-12.312 4.7-17.012 0l-10.118-10.119c-4.7-4.7-4.7-12.312 0-17.012L228.872 256l-57.297-57.296c-4.7-4.7-4.7-12.312 0-17.012l10.118-10.119c4.7-4.7 12.312-4.7 17.012 0L256 222.574l57.296-57.297c4.7-4.7 12.312-4.7 17.012 0l10.118 10.119c4.7 4.7 4.7 12.312 0 17.012L283.128 256l57.298 57.441z"/></svg>'
};

// Track if we're currently in the store
let isStoreMounted = false;
let storeWebSocket: WebSocket | null = null;
let currentWsUrl: string | null = null;
let historyUnlisten: (() => void) | null = null;
let tabPollInterval: ReturnType<typeof setInterval> | null = null;
let messageId = 1;
let wsReady = false;
let tilesGeneration = 0;

interface Tab {
    id: string;
    url: string;
    webSocketDebuggerUrl?: string;
}

// Find Steam's internal history object safely (compatible with Steam ESModule updates)
function resolveSteamHistory(): any {
    try {
        const HistoryModule = findModuleExport((exp: any) => exp?.m_history !== undefined);
        if (HistoryModule?.m_history) return HistoryModule.m_history;
    } catch (e) {
        log.warn("Failed to locate HistoryModule via findModuleExport:", e);
    }
    try {
        const win = (window as any)?.SteamUIStore?.GetFocusedWindowInstance?.()
            ?? (window as any)?.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
        return win?.m_history ?? win?.BrowserWindow?.m_history;
    } catch {
        return undefined;
    }
}

const History = resolveSteamHistory();

// Inject badge into store page via WebSocket debugger
async function injectBadgeIntoStore(appId: string) {
    if (!SettingsContext.value.showOnStore) {
        removeBadgeFromStore();
        return;
    }

    if (!storeWebSocket || storeWebSocket.readyState !== WebSocket.OPEN || !wsReady) {
        return;
    }

    log.info(`Injecting badge for AppID: ${appId}`);
    const socket = storeWebSocket;
    const settings = SettingsContext.value;

    try {
        const targetLang = resolveTargetLanguage(SettingsContext.value.targetLanguage);
        const isUkrainian = Boolean(targetLang.hasUkrainianCommunity);

        // 1. Fetch Steam Store metadata + LBK catalog in parallel (LBK only for Ukrainian)
        const lbkPromise: Promise<LbkTranslationsResult | null> =
            isUkrainian && SettingsContext.value.enableLbkIntegration !== false
                ? call<[string], LbkTranslationsResult>("get_lbk_translations", appId).catch(() => null)
                : Promise.resolve(null);

        const steamResp = await fetchWithTimeout(
            fetchNoCors(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`),
            10000
        );
        const steamData = await steamResp.json();
        const lbkData = await lbkPromise;

        if (!steamData?.[appId]?.success) {
            log.warn(`Steam API failed for ${appId}`, steamData);
            return;
        }

        const gameName = steamData[appId].data.name;
        const languages = steamData[appId].data.supported_languages || "";
        const hasOfficialLang = isOfficialLanguageInStoreText(languages, targetLang);

        let confirmedOnKuli = false;
        let kuliSlug = urlifyGameName(gameName);
        let kuliStatusFromHtml: string | null = null;

        // 2. Check Kuli (Ukrainian community catalog)
        if (isUkrainian) {
            try {
                const headers = {
                    "Accept": "text/html",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                };

                const kuliResp = await fetchWithTimeout(fetchNoCors(`https://kuli.com.ua/${kuliSlug}`, { headers }), 8000);
                const kuliHtml = kuliResp.status !== 404 ? await kuliResp.text() : "";

                if (isValidKuliGamePage(kuliHtml)) {
                    confirmedOnKuli = true;
                    kuliStatusFromHtml = getKuliStatusFromHtml(kuliHtml);
                } else {
                    const searchResult = await searchKuli(gameName);
                    if (searchResult) {
                        kuliStatusFromHtml = searchResult.status;
                        kuliSlug = searchResult.slug;
                        confirmedOnKuli = true;
                    }
                }
            } catch (e) {
                log.warn("Store Patch Kuli Check Failed:", e);
            }
        }

        // 3. Determine Final Status (Steam Official > LBK Installed > LBK/Kuli Community > None)
        const hasLbk = Boolean(isUkrainian && lbkData?.available && lbkData.translations.length > 0);
        const isLbkInstalled = Boolean(hasLbk && lbkData?.installed_any);

        let status: keyof typeof BADGE_COLORS = "NONE";
        if (hasOfficialLang) {
            status = "OFFICIAL";
        } else if (isLbkInstalled) {
            status = "INSTALLED";
        } else if (hasLbk) {
            status = "COMMUNITY";
        } else if (confirmedOnKuli && kuliStatusFromHtml) {
            status = kuliStatusFromHtml === "OFFICIAL" ? "OFFICIAL" : "COMMUNITY";
        }

        const config = BADGE_COLORS[status] || BADGE_COLORS.NONE;
        const uiLang = resolveUiLanguage(SettingsContext.value.targetLanguage, targetLang);
        const labelKey = status === "INSTALLED" ? "lbk_installed" : status.toLowerCase();
        const label = t(labelKey, uiLang);

        const iconSvg = ICONS[status as keyof typeof ICONS] || ICONS.NONE;
        const flag = targetLang.flag;
        const lbkPillHtml = hasLbk
            ? `<span style="font-size:11px;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,0.2);line-height:1.3;">${isLbkInstalled && status === "OFFICIAL" ? "✓ LBK" : "LBK"}</span>`
            : "";

        const isClickable = confirmedOnKuli;
        const safeOffsetX = Number(SettingsContext.value.storeOffsetX) || 0;
        const safeOffsetY = Number(SettingsContext.value.storeOffsetY) || 0;
        const safeKuliUrl = isClickable
            ? `https://kuli.com.ua/${encodeURI(kuliSlug.replace(/^\/+/, ""))}`
            : "";

        // Abort if user navigated to another app while we were fetching
        if (storeAppId$.value !== appId || storeWebSocket !== socket || SettingsContext.value !== settings || !SettingsContext.value.showOnStore) return;

        const injectScript = `
        (function() {
          const existing = document.getElementById('ukr-store-badge');
          if (existing) existing.remove();

          const badge = document.createElement('div');
          badge.id = 'ukr-store-badge';
          badge.title = ${JSON.stringify(`${targetLang.englishName} Localization Status: ${label}`)};

          function updatePosition() {
            const hasProtonDB = !!document.querySelector('[id*="protondb-store-badge"]');
            let finalY = ${safeOffsetY};
            if (finalY === 20 || finalY === 0) {
              finalY = hasProtonDB ? 80 : 20;
            }
            badge.style.bottom = finalY + 'px';
          }

          updatePosition();
          let checks = 0;
          const posInterval = setInterval(() => {
            updatePosition();
            checks++;
            if (checks > 20) clearInterval(posInterval);
          }, 100);

          badge.style.cssText += 'position: fixed; left: calc(50% + ${safeOffsetX}px); transform: translateX(-50%); z-index: 999999; background: ${config.bg}; padding: 6px 12px; border-radius: 8px; color: ${config.text}; cursor: ${isClickable ? "pointer" : "default"}; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px ${config.shadow}; font-family: "Motiva Sans", sans-serif; font-weight: bold; transition: all 0.3s ease;';
          badge.innerHTML = ${JSON.stringify(`<span style="font-size: 20px; line-height: 1;">${flag}</span>${iconSvg}<span style="font-size: 14px;">${label}</span>${lbkPillHtml}`)};

          ${isClickable ? `
          badge.onclick = function() { window.open(${JSON.stringify(safeKuliUrl)}, "_blank"); };
          ` : ""}
          document.body.appendChild(badge);
        })();
      `;

        socket.send(JSON.stringify({
            id: messageId++,
            method: "Runtime.evaluate",
            params: { expression: injectScript }
        }));
    } catch (e) {
        log.error("Store Injection Error", e);
    }
}

function removeBadgeFromStore() {
    if (!storeWebSocket || storeWebSocket.readyState !== WebSocket.OPEN) {
        return;
    }

    const removeScript = `
    (function() {
      const badge = document.getElementById('ukr-store-badge');
      if (badge) badge.remove();
    })();
  `;

    storeWebSocket.send(JSON.stringify({
        id: messageId++,
        method: "Runtime.evaluate",
        params: { expression: removeScript }
    }));
}

async function refreshStoreTiles(): Promise<void> {
    const generation = ++tilesGeneration;
    const socket = storeWebSocket;
    const settings = SettingsContext.value;
    if (!socket || socket.readyState !== WebSocket.OPEN || !wsReady) return;
    if (!settings.showOnStore || !settings.showOnThumbnails) {
        socket.send(JSON.stringify({ id: messageId++, method: "Runtime.evaluate", params: { expression: "window.__localizationTilesCleanup?.()" } }));
        return;
    }
    const language = resolveTargetLanguage(settings.targetLanguage);
    const catalog = language.hasUkrainianCommunity && settings.enableLbkIntegration
        ? (await getLbkCatalogMap()).games : {};
    if (generation !== tilesGeneration || socket !== storeWebSocket || settings !== SettingsContext.value || !isStoreMounted || !wsReady) return;
    const names = SUPPORTED_LANGUAGES.map((item) => item.englishName.toLowerCase().replace(" (", " - ").replace(")", ""));
    const languages = [...new Set([...names, "spanish", "portuguese", "portuguese - portugal"].filter(language.storeMatch))];
    const uiLang = resolveUiLanguage(settings.targetLanguage, language);
    const labels = { official: t("official", uiLang), community: t("community", uiLang), installed: t("lbk_installed", uiLang) };
    const config = { flag: language.flag, languages, position: settings.thumbnailPosition, catalog, cached: getCachedBadgeStatuses(language.code), labels };
    socket.send(JSON.stringify({
        id: messageId++, method: "Runtime.evaluate",
        params: { expression: `(${installStoreTiles.toString()})(${JSON.stringify(config)})` },
    }));
}

export function extractAppIdFromUrl(url: string): string {
    if (!url.includes("store.steampowered.com/app/")) {
        return "";
    }
    const match = url.match(/\/app\/([\d]+)\/?/);
    return match?.[1] ?? "";
}

function updateAppIdFromUrl(url: string, forceReinject = false) {
    const appId = extractAppIdFromUrl(url);
    if (forceReinject || storeAppId$.value !== appId) {
        storeAppId$.next(appId);
        if (appId) {
            void injectBadgeIntoStore(appId);
        } else {
            removeBadgeFromStore();
        }
    }
}

function attachStoreWebSocket(storeTab: Tab): void {
    if (!storeTab.webSocketDebuggerUrl) return;
    if (storeWebSocket && currentWsUrl === storeTab.webSocketDebuggerUrl && storeWebSocket.readyState === WebSocket.OPEN) {
        updateAppIdFromUrl(storeTab.url);
        return;
    }

    if (storeWebSocket) {
        try {
            storeWebSocket.close();
        } catch {
            // ignore
        }
        storeWebSocket = null;
        wsReady = false;
    }

    currentWsUrl = storeTab.webSocketDebuggerUrl;
    storeAppId$.next(extractAppIdFromUrl(storeTab.url));

    storeWebSocket = new WebSocket(storeTab.webSocketDebuggerUrl);

    storeWebSocket.onopen = (event) => {
        const ws = event.target as WebSocket;
        if (ws !== storeWebSocket || !isStoreMounted) return;
        ws.send(JSON.stringify({ id: messageId++, method: "Page.enable" }));
        ws.send(JSON.stringify({ id: messageId++, method: "Runtime.enable" }));

        setTimeout(() => {
            if (ws !== storeWebSocket || !isStoreMounted || ws.readyState !== WebSocket.OPEN) return;
            wsReady = true;
            void refreshStoreTiles();
            const currentAppId = storeAppId$.value;
            if (currentAppId) {
                void injectBadgeIntoStore(currentAppId);
            }
        }, 300);
    };

    storeWebSocket.onmessage = (event) => {
        if (!isStoreMounted || event.target !== storeWebSocket) return;
        try {
            const data = JSON.parse(event.data);
            const navUrl =
                data.method === "Page.frameNavigated"
                    ? data.params?.frame?.url
                    : data.method === "Page.navigatedWithinDocument"
                        ? data.params?.url
                        : null;
            if (navUrl && navUrl.includes("store.steampowered.com")) {
                const ws = storeWebSocket;
                setTimeout(() => {
                    if (ws !== storeWebSocket || !isStoreMounted) return;
                    updateAppIdFromUrl(navUrl, true);
                    void refreshStoreTiles();
                }, 450);
            }
        } catch {
            // ignore
        }
    };

    storeWebSocket.onclose = (event) => {
        if (event.target !== storeWebSocket) return;
        storeWebSocket = null;
        currentWsUrl = null;
        wsReady = false;
    };
}

async function pollStoreTabs(): Promise<boolean> {
    if (!isStoreMounted) return false;
    try {
        const response = await fetchNoCors("http://localhost:8080/json");
        const tabs: Tab[] = await response.json();
        const storeTab =
            tabs.find((tab) => tab.url?.includes("store.steampowered.com/app/")) ||
            tabs.find((tab) => tab.url?.includes("store.steampowered.com"));

        if (!storeTab) return false;
        attachStoreWebSocket(storeTab);
        return true;
    } catch {
        return false;
    }
}

async function connectToStoreDebugger(retries = 10): Promise<void> {
    if (retries <= 0 || !isStoreMounted) return;

    const found = await pollStoreTabs();
    if (!found && isStoreMounted) {
        setTimeout(() => void connectToStoreDebugger(retries - 1), 1000);
    }

    if (isStoreMounted && !tabPollInterval) {
        tabPollInterval = setInterval(() => {
            void pollStoreTabs();
        }, 1500);
    }
}

function disconnectStoreDebugger() {
    tilesGeneration++;
    removeBadgeFromStore();
    if (storeWebSocket?.readyState === WebSocket.OPEN) {
        storeWebSocket.send(JSON.stringify({ id: messageId++, method: "Runtime.evaluate", params: { expression: "window.__localizationTilesCleanup?.()" } }));
    }
    isStoreMounted = false;
    wsReady = false;
    currentWsUrl = null;
    storeAppId$.next("");

    if (tabPollInterval) {
        clearInterval(tabPollInterval);
        tabPollInterval = null;
    }
    if (storeWebSocket) {
        try {
            storeWebSocket.close();
        } catch {
            // ignore
        }
        storeWebSocket = null;
    }
}

function isStorePathname(pathname: string): boolean {
    return (
        pathname === "/steamweb" ||
        pathname.startsWith("/steamweb/") ||
        pathname === "/externalweb" ||
        pathname.startsWith("/externalweb/")
    );
}

function handleLocationChange(pathname: string) {
    if (isStorePathname(pathname)) {
        if (!isStoreMounted) {
            isStoreMounted = true;
            void connectToStoreDebugger(10);
        }
    } else if (isStoreMounted) {
        disconnectStoreDebugger();
    }
}

export function initStorePatch(): () => void {
    try {
        (window as any).__ukrBadgeStoreCleanup?.();
    } catch {
        // ignore
    }

    const storeRoutePatch = routerHook.addPatch("/steamweb", (tree: any) => {
        handleLocationChange("/steamweb");
        return tree;
    });
    const externalRoutePatch = routerHook.addPatch("/externalweb", (tree: any) => {
        handleLocationChange("/externalweb");
        return tree;
    });

    if (History) {
        handleLocationChange(History.location?.pathname || "");
        historyUnlisten = History.listen((info: { pathname: string }) => {
            handleLocationChange(info.pathname || "");
        });
    }

    const settingsSub = SettingsContext.subscribe(() => {
        if (isStoreMounted && wsReady) {
            void refreshStoreTiles();
            if (!SettingsContext.value.showOnStore) {
                removeBadgeFromStore();
            } else if (storeAppId$.value) {
                void injectBadgeIntoStore(storeAppId$.value);
            }
        }
    });
    const lbkSub = lbkRefresh$.subscribe(() => { if (isStoreMounted && wsReady) void refreshStoreTiles(); });

    const cleanup = () => {
        routerHook.removePatch("/steamweb", storeRoutePatch);
        routerHook.removePatch("/externalweb", externalRoutePatch);
        settingsSub.unsubscribe();
        lbkSub.unsubscribe();
        if (historyUnlisten) {
            historyUnlisten();
            historyUnlisten = null;
        }
        disconnectStoreDebugger();
        if ((window as any).__ukrBadgeStoreCleanup === cleanup) {
            delete (window as any).__ukrBadgeStoreCleanup;
        }
    };

    (window as any).__ukrBadgeStoreCleanup = cleanup;
    return cleanup;
}
