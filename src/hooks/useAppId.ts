// decky-lang-badge/src/hooks/useAppId.ts
import { useEffect, useState } from "react";
import { useParams } from "./useParams";
import { fetchNoCors } from "@decky/api";
import { cleanNonSteamName, isSteamAppId } from "../utils";
import { logger } from "../logger";

const log = logger.component("useAppId");

// Declare appStore for TypeScript
declare const appStore: {
    GetAppOverviewByGameID: (id: number) => {
        appid: number;
        display_name: string;
        app_type: number;
    } | null;
};

/**
 * Hook to get the current app ID from the route.
 * Returns the app ID and display name of the current game/app.
 */
export function useAppId(): {
    appId: string | undefined;
    appName: string;
    isLoading: boolean;
} {
    const [appId, setAppId] = useState<string | undefined>();
    const [appName, setAppName] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    const { appid: pathId } = useParams<{ appid: string }>();

    useEffect(() => {
        let ignore = false;

        async function resolveAppId() {
            if (!pathId) {
                setIsLoading(false);
                return;
            }

            try {
                const appDetails = appStore.GetAppOverviewByGameID(
                    parseInt(pathId, 10)
                );

                if (ignore) return;

                if (!appDetails) {
                    log.warn("Could not get app details for:", pathId);
                    setAppId(pathId);

                    // Fallback strategies for Name
                    // 1. Try to extract from document title
                    let resolvedName: string | null = null;
                    const titleMatch = document.title.match(/^(.+?)\s*(?:on Steam|·|–|-)/);
                    if (titleMatch) {
                        resolvedName = titleMatch[1].trim();
                    }

                    // 2. Try to extract from meta tags
                    if (!resolvedName) {
                        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
                        if (metaTitle) {
                            resolvedName = metaTitle.replace(/\s*on Steam$/, '').trim();
                        }
                    }

                    if (resolvedName) {
                        log.info(`Extracted name from title for ${pathId}: ${resolvedName}`);
                        setAppName(resolvedName);
                    }

                    setIsLoading(false);
                    return;
                }

                const appName = appDetails.display_name || "";
                setAppId(pathId);
                setAppName(appName);

                if (appName && !isSteamAppId(pathId)) {
                    const rawName = appName;

                    const cleanedName = cleanNonSteamName(rawName);
                    if (cleanedName && cleanedName.length > 2) {
                        log.info(`Resolving non-Steam game: ${cleanedName} (ID: ${pathId})`);
                        try {
                            const searchRes = await fetchNoCors(
                                `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(cleanedName)}`,
                                { method: "GET" }
                            );
                            if (searchRes.ok) {
                                const options = await searchRes.json() as { appid: string; name: string }[];
                                // Simple match: first result where name roughly matches
                                const match = options.find(o =>
                                    cleanNonSteamName(o.name).toLowerCase() === cleanedName.toLowerCase()
                                );

                                if (match) {
                                    log.info(`Resolved ${cleanedName} -> ${match.name} (AppID: ${match.appid})`);
                                    setAppId(match.appid); // Treat as this Steam game!
                                    setAppName(match.name);
                                }
                            }
                        } catch (err) {
                            log.warn("Failed to resolve non-Steam game name:", err);
                        }
                    }
                }
            } catch (error) {
                log.error("Error getting app details:", error);
                setAppId(pathId);
            }

            if (!ignore) {
                setIsLoading(false);
            }
        }

        setIsLoading(true);
        resolveAppId();

        return () => {
            ignore = true;
        };
    }, [pathId]);

    return { appId, appName, isLoading };
}

export default useAppId;
