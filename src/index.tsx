// decky-lang-badge/src/index.tsx
import { definePlugin, routerHook } from "@decky/api";
import {
    afterPatch,
    findInReactTree,
    appDetailsClasses,
    appDetailsHeaderClasses,
    createReactTreePatcher,
} from "@decky/ui";
import { FaFlag } from "react-icons/fa";

import { Settings } from "./settings";

import Badge from "./components/Badge";
import { loadSettings, SettingsContext } from "./hooks/useSettings";
import { refreshPluginVersionInfo, usePluginUpdate } from "./hooks/usePluginUpdate";
import { resolveTargetLanguage } from "./languages";
import { initStorePatch } from "./patches/StorePatch";
import { initThumbnailPatch } from "./patches/ThumbnailPatch";
import { openInSteamBrowser } from "./utils";

// Declare appStore for non-Steam game detection
declare const appStore: {
    GetAppOverviewByGameID: (id: number) => {
        appid: number;
        display_name: string;
        app_type: number;
    } | null;
};

/**
 * Check if ProtonDB badge plugin is present to avoid overlap
 */
function hasProtonDBBadge(): boolean {
    try {
        if (typeof window !== "undefined") {
            const protonBadgeExists = document.querySelector('[class*="protonbadge"], [class*="proton-badge"], [id*="protondb"]');
            if (protonBadgeExists) return true;

            if ((window as any).protonbadge || (window as any).ProtonDBBadge) {
                return true;
            }
        }
    } catch (e) { }
    return false;
}

/**
 * Patches the library app page to inject the Ukrainian badge.
 */
function patchLibraryApp() {
    return routerHook.addPatch("/library/app/:appid", (tree: any) => {
        const routeProps = findInReactTree(tree, (x: any) => x?.renderFunc);

        if (routeProps) {
            // Patch 1: Add Badge component to InnerContainer
            const patchHandlerInner = createReactTreePatcher(
                [
                    (tree: any) =>
                        findInReactTree(
                            tree,
                            (x: any) => x?.props?.children?.props?.overview,
                        )?.props?.children,
                ],
                (
                    _: Array<Record<string, unknown>>,
                    ret?: React.ReactElement,
                ) => {
                    const overview = findInReactTree(ret, (x: any) => x?.props?.overview)?.props?.overview;
                    let appId = overview?.appid ? String(overview.appid) : undefined;
                    let appName = overview?.display_name || overview?.name || "";

                    // Fallback AppID and Name extraction from route/appStore if overview fails
                    if (!appId || !appName) {
                        const match = window.location.pathname.match(/\/appdetails\/(\d+)/);
                        const pathId = match ? match[1] : undefined;

                        if (pathId) {
                            if (!appId) appId = pathId;
                            try {
                                const details = appStore.GetAppOverviewByGameID(parseInt(pathId, 10));
                                if (details && !appName) appName = details.display_name;
                            } catch (e) { }
                        }
                    }

                    const innerClass = appDetailsClasses?.InnerContainer;
                    const container = findInReactTree(
                        ret,
                        (x: React.ReactElement) =>
                            Array.isArray(x?.props?.children) &&
                            typeof x?.props?.className === "string" &&
                            !!innerClass &&
                            x.props.className.includes(innerClass),
                    );

                    if (typeof container !== "object" || !container) {
                        return ret;
                    }

                    if (!findInReactTree(container, (x: any) => x?.key === "ukr-badge")) {
                        container.props.children.splice(
                            1,
                            0,
                            <Badge
                                key="ukr-badge"
                                pAppId={appId}
                                pAppName={appName}
                            />,
                        );
                    }

                    return ret;
                },
            );

            // Patch 2: Add icon to TopCapsule header
            const patchHandlerHeader = createReactTreePatcher(
                [
                    (tree: any) =>
                        findInReactTree(
                            tree,
                            (x: any) => x?.props?.children?.props?.overview,
                        )?.props?.children,
                ],
                (
                    _: Array<Record<string, unknown>>,
                    ret?: React.ReactElement,
                ) => {
                    const overview = findInReactTree(ret, (x: any) => x?.props?.overview)?.props?.overview;
                    const headerAppId = overview?.appid ? String(overview.appid) : undefined;
                    const topCapsuleClass = appDetailsHeaderClasses?.TopCapsule;
                    const topCapsule = findInReactTree(
                        ret,
                        (x: React.ReactElement) =>
                            Array.isArray(x?.props?.children) &&
                            typeof x?.props?.className === "string" &&
                            !!topCapsuleClass &&
                            x.props.className.includes(topCapsuleClass),
                    );

                    if (typeof topCapsule !== "object" || !topCapsule) {
                        return ret;
                    }

                    if (!findInReactTree(topCapsule, (x: any) => x?.key === "ukr-badge-header")) {
                        const protonDBExists = hasProtonDBBadge();
                        const activeLang = resolveTargetLanguage(SettingsContext.value.targetLanguage);

                        const headerIcon = (
                            <span
                                key="ukr-badge-header"
                                style={{
                                    position: "absolute",
                                    [protonDBExists ? "left" : "right"]: "20px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    zIndex: 1000,
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    opacity: 0.8,
                                    pointerEvents: "auto",
                                }}
                                title={`${activeLang.englishName} Language Support`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const pathMatch = window.location.pathname.match(/\/app(?:details)?\/(\d+)/);
                                    const targetId = headerAppId || pathMatch?.[1];
                                    if (targetId) {
                                        openInSteamBrowser(`https://store.steampowered.com/app/${targetId}`);
                                    }
                                }}
                            >
                                {activeLang.flag}
                            </span>
                        );

                        topCapsule.props.children.unshift(headerIcon);
                    }

                    return ret;
                },
            );

            afterPatch(routeProps, "renderFunc", patchHandlerInner);
            afterPatch(routeProps, "renderFunc", patchHandlerHeader);
        }

        return tree;
    });
}

/**
 * Plugin icon in Decky QAM plugin list.
 * Uses a Fragment so the yellow dot positions at the top-right corner of Decky's
 * plugin list button (matching native Decky update dots like TabMaster).
 */
const PluginIconWithUpdateDot: React.FC = () => {
    const { updateAvailable } = usePluginUpdate(false);
    return (
        <>
            <FaFlag />
            {updateAvailable && (
                <div
                    data-testid="decky-plugin-icon-update-dot"
                    style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        height: "10px",
                        width: "10px",
                        background: "#facc15",
                        borderRadius: "50%",
                        pointerEvents: "none",
                    }}
                />
            )}
        </>
    );
};

/**
 * Settings Panel Component for the Quick Access Menu
 */
const SettingsPanel: React.FC = () => {
    return (
        <>
            <Settings />
        </>
    );
};

export default definePlugin(() => {
    // Load settings on plugin init
    loadSettings();

    // Check for newer plugin release in background so Decky list/tab dot appears immediately
    void refreshPluginVersionInfo(false);

    // Patch the library app page
    const libraryPatch = patchLibraryApp();

    // Initialize store patch (WebSocket injection)
    const stopStorePatch = initStorePatch();

    // Initialize library & home thumbnail badges
    const stopThumbnailPatch = initThumbnailPatch();

    return {
        name: "Decky Localization Badge",
        title: "Decky Localization Badge",
        icon: <PluginIconWithUpdateDot />,
        content: <SettingsPanel />,
        onDismount() {
            routerHook.removePatch("/library/app/:appid", libraryPatch);
            stopStorePatch();
            stopThumbnailPatch();
        },
    };
});
