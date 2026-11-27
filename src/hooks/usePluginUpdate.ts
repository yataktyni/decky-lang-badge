// src/hooks/usePluginUpdate.ts
import { useEffect, useState } from "react";
import { call } from "@decky/api";
import { BehaviorSubject } from "rxjs";
import { logger } from "../logger";

declare const __PLUGIN_VERSION__: string | undefined;

const log = logger.component("usePluginUpdate");

export const FALLBACK_VERSION: string =
    typeof __PLUGIN_VERSION__ !== "undefined" && __PLUGIN_VERSION__
        ? __PLUGIN_VERSION__
        : "unknown";

export interface VersionInfo {
    current: string;
    latest: string | null;
    latest_tag?: string | null;
    update_available: boolean;
    source_ok?: boolean;
    error?: string | null;
    checked_at?: number;
}

export const pluginVersionInfo$ = new BehaviorSubject<VersionInfo | null>(null);

let inFlightCheck: Promise<VersionInfo | null> | null = null;

export function setPluginVersionInfo(
    updater: VersionInfo | null | ((prev: VersionInfo | null) => VersionInfo | null)
): void {
    const next = typeof updater === "function" ? updater(pluginVersionInfo$.value) : updater;
    if (next === null) {
        inFlightCheck = null;
    }
    pluginVersionInfo$.next(next);
}

export async function refreshPluginVersionInfo(force = false): Promise<VersionInfo | null> {
    if (!force && inFlightCheck) {
        return inFlightCheck;
    }

    const run = (async (): Promise<VersionInfo | null> => {
        try {
            const current = await call<[], string>("get_current_version");
            setPluginVersionInfo((prev) =>
                prev
                    ? { ...prev, current }
                    : {
                          current,
                          latest: null,
                          update_available: false,
                          source_ok: false,
                          error: null,
                      }
            );
        } catch (e) {
            log.warn("Failed to get immediate version:", e);
        }

        try {
            const info = await call<[], VersionInfo>("get_latest_version");
            log.info("Full version info:", info);
            pluginVersionInfo$.next(info);
            return info;
        } catch (e) {
            log.error("Failed to check version from GitHub:", e);
            const fallback: VersionInfo = pluginVersionInfo$.value
                ? {
                      ...pluginVersionInfo$.value,
                      update_available: false,
                      source_ok: false,
                      error: "Version check failed",
                  }
                : {
                      current: FALLBACK_VERSION,
                      latest: null,
                      update_available: false,
                      source_ok: false,
                      error: "Version check failed",
                  };
            pluginVersionInfo$.next(fallback);
            return fallback;
        }
    })();

    const tracked = run.finally(() => {
        if (inFlightCheck === tracked) {
            inFlightCheck = null;
        }
    });
    inFlightCheck = tracked;

    return tracked;
}

export function usePluginUpdate(autoCheck = false): {
    versionInfo: VersionInfo | null;
    updateAvailable: boolean;
    refresh: (force?: boolean) => Promise<VersionInfo | null>;
} {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(pluginVersionInfo$.value);

    useEffect(() => {
        const sub = pluginVersionInfo$.subscribe((info) => {
            setVersionInfo(info);
        });
        if (autoCheck && !pluginVersionInfo$.value) {
            void refreshPluginVersionInfo(false);
        }
        return () => {
            sub.unsubscribe();
        };
    }, [autoCheck]);

    return {
        versionInfo,
        updateAvailable: Boolean(versionInfo?.update_available),
        refresh: refreshPluginVersionInfo,
    };
}
