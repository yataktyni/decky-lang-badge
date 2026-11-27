// decky-lang-badge/src/patches/ThumbnailPatch.ts
import { routerHook } from "@decky/api";
import { SettingsContext, ThumbnailPosition } from "../hooks/useSettings";
import { getCachedBadgeStatus } from "../hooks/useBadgeStatus";
import { getLbkCatalogMap, LbkCatalogEntry, lbkRefresh$ } from "../hooks/useLbkTranslations";
import {
    LanguageConfig,
    hasOfficialLanguageInAppStore,
    resolveTargetLanguage,
} from "../languages";
import { logger } from "../logger";

const log = logger.component("ThumbnailPatch");

const BADGE_CLASS = "ukr-thumb-badge";

let cachedBigPicWindow: Window | null = null;
let observer: MutationObserver | null = null;
let scanInterval: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let catalogMap: Record<string, LbkCatalogEntry> = {};
let catalogLoaded = false;

export function hasOfficialUkrainianInAppStore(appId: string): boolean {
    return hasOfficialLanguageInAppStore(appId, resolveTargetLanguage("uk"));
}

function getCurrentSteamPathname(): string {
    try {
        return (
            (window as any)?.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.m_history?.location?.pathname || ""
        );
    } catch {
        return "";
    }
}

function getBigPictureWindow(): Window | null {
    if (cachedBigPicWindow && !cachedBigPicWindow.closed) {
        return cachedBigPicWindow;
    }

    try {
        const win: Window | undefined =
            (window as any)?.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow;
        if (win && !win.closed && win.document) {
            cachedBigPicWindow = win;
            return win;
        }
    } catch {
        // fallback below
    }

    try {
        const dfl = (window as any)?.DFL;
        if (typeof dfl?.getGamepadNavigationTrees === "function") {
            const navTrees = dfl.getGamepadNavigationTrees();
            for (const tree of navTrees || []) {
                try {
                    const win: Window | undefined = tree?.m_window;
                    if (!win || win.closed || !win.document) continue;
                    const count =
                        win.document.querySelectorAll('div[role="gridcell"], div[role="listitem"]').length;
                    if (count > 0) {
                        cachedBigPicWindow = win;
                        return win;
                    }
                } catch {
                    continue;
                }
            }
        }
    } catch {
        // ignore
    }

    return null;
}

function isHeroOrLogoImage(src: string): boolean {
    return /library_hero|_hero\.|\/logo\.|logo_\d+|_logo\.|\/icon/i.test(src);
}

function extractAppIdFromImage(img: HTMLImageElement | null): string | null {
    const src = img?.src;
    if (!src || isHeroOrLogoImage(src)) return null;

    let match = src.match(/\/assets\/(\d+)\//);
    if (match) return match[1];

    match = src.match(/\/customimages\/(\d+)p?\.(jpg|jpeg|png|webp)/i);
    if (match) return match[1];

    match = src.match(/rungameid\/(\d+)/i);
    if (match) return match[1];

    match = src.match(/\/(\d{4,})(?:[p._-][a-z]*)?\.(?:jpg|jpeg|png|webp)/i);
    if (match) return match[1];

    return null;
}

function getCoverImage(capsule: Element): HTMLImageElement | null {
    const imgs = Array.from(capsule.querySelectorAll("img"));
    for (const img of imgs) {
        if (img.getAttribute("role") === "presentation") continue;
        if (img.src && !isHeroOrLogoImage(img.src)) {
            return img;
        }
    }
    return imgs.find((i) => i.getAttribute("role") !== "presentation") || null;
}

export function extractCapsuleAppId(capsule: Element): string | null {
    const dataId = capsule.getAttribute("data-id") || capsule.getAttribute("data-appid");
    if (dataId && /^\d+$/.test(dataId)) {
        return dataId;
    }

    // Check React fiber props on capsule and immediate children
    try {
        const elementsToCheck = [capsule, ...Array.from(capsule.querySelectorAll("*")).slice(0, 12)];
        for (const el of elementsToCheck) {
            const fiberKey = Object.keys(el).find(
                (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
            );
            if (!fiberKey) continue;

            let fiber = (el as any)[fiberKey];
            let depth = 0;
            while (fiber && depth < 5) {
                const props = fiber.memoizedProps || fiber.return?.memoizedProps;
                if (props) {
                    const id =
                        props.appid ||
                        props.appId ||
                        props.unAppID ||
                        props.nAppID ||
                        props.m_unAppID ||
                        props.overview?.appid ||
                        props.appOverview?.appid ||
                        props.app?.appid ||
                        props.game?.appid ||
                        props.item?.appid ||
                        props.assetAppId ||
                        props.strAppId;
                    if (id && /^\d+$/.test(String(id))) {
                        return String(id);
                    }
                }
                fiber = fiber.return;
                depth++;
            }
        }
    } catch {
        // ignore
    }

    // Check anchor hrefs
    try {
        const anchor = capsule.tagName.toLowerCase() === "a" ? capsule : capsule.querySelector("a");
        const href = anchor?.getAttribute("href");
        if (href) {
            const match =
                href.match(/\/app\/(\d+)/i) ||
                href.match(/\/details\/(\d+)/i) ||
                href.match(/run\/(\d+)/i);
            if (match) return match[1];
        }
    } catch {
        // ignore
    }

    return extractAppIdFromImage(getCoverImage(capsule));
}

function getPositionStyles(pos: ThumbnailPosition): string {
    switch (pos) {
        case "top-right":
            return "top: 6px; right: 6px;";
        case "bottom-left":
            return "bottom: 6px; left: 6px;";
        case "bottom-right":
            return "bottom: 6px; right: 6px;";
        case "top-left":
        default:
            return "top: 6px; left: 6px;";
    }
}

interface ThumbBadgeSpec {
    key: string;
    bg: string;
    color: string;
    text: string;
}

export function resolveThumbnailBadge(
    appId: string,
    lbkEnabled: boolean,
    map: Record<string, LbkCatalogEntry> = catalogMap,
    targetLang?: LanguageConfig
): ThumbBadgeSpec | null {
    const lang = targetLang ?? resolveTargetLanguage(SettingsContext.value.targetLanguage);
    const useLbk = Boolean(lang.hasUkrainianCommunity && lbkEnabled);
    const lbkEntry = useLbk ? map[appId] : undefined;

    // 1. Installed via LBK Launcher takes highest priority (Ukrainian only)
    if (lbkEntry?.installed) {
        return {
            key: lbkEntry.has_update ? "lbk-update" : "lbk-installed",
            bg: "#10b981",
            color: "#ffffff",
            text: lbkEntry.has_update ? `${lang.flag} ⬆` : `${lang.flag} ✓`,
        };
    }

    // 2. Official Steam support (instant local bitfield for any of 29 languages or cached OFFICIAL)
    const cachedStatus = getCachedBadgeStatus(appId, lang.code);
    if (cachedStatus === "OFFICIAL" || hasOfficialLanguageInAppStore(appId, lang)) {
        return {
            key: "official",
            bg: "#28a745",
            color: "#ffffff",
            text: lang.flag,
        };
    }

    // 3. Community translation available in LBK Launcher (Ukrainian only)
    if (lbkEntry) {
        return {
            key: "lbk-available",
            bg: "#ffc107",
            color: "#000000",
            text: `${lang.flag} LBK`,
        };
    }

    // 4. Cached community localization
    if (cachedStatus === "COMMUNITY") {
        return {
            key: "community",
            bg: "#ffc107",
            color: "#000000",
            text: lang.flag,
        };
    }

    return null;
}

function applyBadgeToTarget(target: HTMLElement, appId: string | null, win: Window): void {
    const settings = SettingsContext.value;
    if (!settings.showOnThumbnails) return;

    const existing = target.querySelector(`:scope > .${BADGE_CLASS}`) as HTMLElement | null;

    if (!appId) {
        existing?.remove();
        return;
    }

    const targetLang = resolveTargetLanguage(settings.targetLanguage);
    const spec = resolveThumbnailBadge(appId, settings.enableLbkIntegration !== false, catalogMap, targetLang);
    if (!spec) {
        existing?.remove();
        return;
    }

    // Skip tiny icons (e.g. 32x32 feed icons) and giant hero banners (> 550px)
    try {
        const rect = target.getBoundingClientRect();
        if (
            (rect.width > 0 && (rect.width < 80 || rect.width > 550)) ||
            (rect.height > 0 && (rect.height < 60 || rect.height > 550))
        ) {
            existing?.remove();
            return;
        }
    } catch {
        // ignore
    }

    const pos = settings.thumbnailPosition || "top-left";
    const signature = `${targetLang.code}:${appId}:${spec.key}:${pos}`;

    if (existing) {
        if (existing.getAttribute("data-ukr-sig") === signature) {
            return;
        }
        existing.remove();
    }

    try {
        const computed = win.getComputedStyle(target);
        if (computed.position === "static") {
            target.style.position = "relative";
        }
    } catch {
        // ignore
    }

    const badge = win.document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.setAttribute("data-ukr-sig", signature);
    badge.style.cssText = [
        "position: absolute",
        getPositionStyles(pos),
        "z-index: 50",
        `background: ${spec.bg}`,
        `color: ${spec.color}`,
        "padding: 2px 6px",
        "border-radius: 6px",
        "font-size: 11px",
        "font-weight: 800",
        "line-height: 1.25",
        "white-space: nowrap",
        'font-family: "Motiva Sans", sans-serif',
        "box-shadow: 0 2px 6px rgba(0,0,0,0.45)",
        "pointer-events: none",
        "user-select: none",
        "display: inline-flex",
        "align-items: center",
        "gap: 3px",
    ].join("; ");
    badge.textContent = spec.text;
    target.appendChild(badge);
}

function cleanupAllThumbBadges(): void {
    const win = getBigPictureWindow();
    if (!win?.document) return;
    win.document.querySelectorAll(`.${BADGE_CLASS}`).forEach((el) => el.remove());
}

function scanCapsules(): void {
    const settings = SettingsContext.value;
    if (!settings.showOnThumbnails) {
        cleanupAllThumbBadges();
        return;
    }

    // Do not overlay thumbnail badges on game detail pages (main Badge is shown there)
    const pathname = getCurrentSteamPathname();
    if (pathname.startsWith("/library/app/")) {
        return;
    }

    const win = getBigPictureWindow();
    if (!win?.document) return;

    const visitedTargets = new Set<HTMLElement>();

    // Pass 1: Direct cover images (works in Home, Gallery Mode, Carousel, Mini Carousel, Deck-Shelves, Library, Search)
    const coverImgs = win.document.querySelectorAll<HTMLImageElement>(
        'img[src*="/assets/"], img[src*="/customimages/"]'
    );
    coverImgs.forEach((img) => {
        if (img.getAttribute("role") === "presentation") return;
        const appId = extractAppIdFromImage(img);
        if (!appId) return;
        const target = img.parentElement;
        if (!target || visitedTargets.has(target)) return;
        visitedTargets.add(target);
        applyBadgeToTarget(target, appId, win);
    });

    // Pass 2: Standard Steam gridcells/listitems fallback (for Fiber/data-id capsules without /assets/ URL)
    const capsules = win.document.querySelectorAll('div[role="gridcell"], div[role="listitem"]');
    capsules.forEach((capsule) => {
        const img = getCoverImage(capsule);
        const target = (img?.parentElement || capsule) as HTMLElement;
        if (!target || visitedTargets.has(target)) return;
        visitedTargets.add(target);
        const appId = extractCapsuleAppId(capsule);
        applyBadgeToTarget(target, appId, win);
    });
}

function debouncedScan(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        scanCapsules();
    }, 120);
}

async function refreshCatalogAndScan(): Promise<void> {
    if (SettingsContext.value.enableLbkIntegration !== false) {
        const res = await getLbkCatalogMap();
        if (res.available) {
            catalogMap = res.games;
            catalogLoaded = true;
            log.info(`Loaded LBK catalog map: ${Object.keys(catalogMap).length} games`);
        }
    } else {
        catalogMap = {};
    }
    scanCapsules();
}

function stopObserving(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

function startObserving(): void {
    stopObserving();

    if (!SettingsContext.value.showOnThumbnails) {
        cleanupAllThumbBadges();
        return;
    }

    const win = getBigPictureWindow();
    if (!win?.document?.body) {
        setTimeout(() => {
            if (SettingsContext.value.showOnThumbnails) startObserving();
        }, 1200);
        return;
    }

    if (!catalogLoaded) {
        void refreshCatalogAndScan();
    } else {
        scanCapsules();
    }

    observer = new MutationObserver((mutations) => {
        const hasExternalAddition = mutations.some((m) =>
            Array.from(m.addedNodes).some(
                (node) => !(node instanceof HTMLElement && node.classList.contains(BADGE_CLASS))
            )
        );
        if (hasExternalAddition) {
            debouncedScan();
        }
    });

    // Observe document.body directly so route changes never detach the observer
    observer.observe(win.document.body, { childList: true, subtree: true });

    scanInterval = setInterval(scanCapsules, 1500);
}

export function initThumbnailPatch(): () => void {
    // Clean up any previous hot-reloaded instance to prevent duplicate observers fighting
    try {
        (window as any).__ukrBadgeThumbCleanup?.();
    } catch {
        // ignore
    }

    const homePatch = routerHook.addPatch("/library/home", (tree: any) => {
        setTimeout(scanCapsules, 100);
        return tree;
    });
    const libraryPatch = routerHook.addPatch("/library", (tree: any) => {
        setTimeout(scanCapsules, 100);
        return tree;
    });
    const searchPatch = routerHook.addPatch("/search", (tree: any) => {
        setTimeout(scanCapsules, 100);
        return tree;
    });

    const settingsSub = SettingsContext.subscribe((settings) => {
        if (!settings.showOnThumbnails) {
            stopObserving();
            cleanupAllThumbBadges();
        } else {
            cleanupAllThumbBadges();
            startObserving();
        }
    });

    const lbkSub = lbkRefresh$.subscribe(() => {
        void refreshCatalogAndScan();
    });

    // Initial kick-off in case user is already on Home/Library
    setTimeout(() => {
        void refreshCatalogAndScan();
        startObserving();
    }, 500);

    const cleanup = () => {
        routerHook.removePatch("/library/home", homePatch);
        routerHook.removePatch("/library", libraryPatch);
        routerHook.removePatch("/search", searchPatch);
        settingsSub.unsubscribe();
        lbkSub.unsubscribe();
        stopObserving();
        cleanupAllThumbBadges();
        cachedBigPicWindow = null;
        if ((window as any).__ukrBadgeThumbCleanup === cleanup) {
            delete (window as any).__ukrBadgeThumbCleanup;
        }
    };

    (window as any).__ukrBadgeThumbCleanup = cleanup;
    return cleanup;
}
