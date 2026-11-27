// src/settings.tsx
import React, { FC, useState, useEffect, useRef } from "react";
import {
    ButtonItem,
    DialogButton,
    Focusable,
    PanelSection,
    PanelSectionRow,
    DropdownItem,
    SliderField,
    ToggleField,
    Navigation,
} from "@decky/ui";
import { t, resolveUiLanguage } from "./translations";
import { useSettings, ThumbnailPosition } from "./hooks/useSettings";
import { usePluginUpdate } from "./hooks/usePluginUpdate";
import { clearBadgeStatusCache } from "./hooks/useBadgeStatus";
import { SUPPORTED_LANGUAGES, TargetLanguageSetting, resolveTargetLanguage } from "./languages";
import {
    getCachedLbkStatus,
    getLbkStatus,
    installLbkLauncher,
    launchLbkLauncher,
    triggerLbkRefresh,
    LbkStatus,
} from "./hooks/useLbkTranslations";
import Spinner from "./components/Spinner";
import { LinksSection } from "./components/LinksSection";
import { DonateCard } from "./components/DonateCard";

declare const SteamClient: { System?: { OpenInSystemBrowser?: (url: string) => void } } | undefined;
declare const __ADMIN_BUILD__: boolean | undefined;

const IS_ADMIN_BUILD = typeof __ADMIN_BUILD__ !== "undefined" && Boolean(__ADMIN_BUILD__);

type SettingsTab = "general" | "layout" | "info";

export const Settings: FC = () => {
    const {
        settings, loading, setTargetLanguage, setBadgeType, setBadgePosition,
        setOffsetX, setOffsetY, setShowOnStore, setStoreOffsetX, setStoreOffsetY,
        setEnableLbkIntegration, setShowOnThumbnails, setThumbnailPosition,
    } = useSettings();

    const topRef = useRef<HTMLDivElement | null>(null);
    const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");
    const [offsets, setOffsets] = useState({ x: 10, y: 10, sx: 0, sy: 0 });
    const [lbkStatus, setLbkStatus] = useState<LbkStatus | null>(() => getCachedLbkStatus());
    const [installingLbk, setInstallingLbk] = useState(false);
    const [lbkInstallMsg, setLbkInstallMsg] = useState<{ text: string; isError: boolean } | null>(null);
    const { updateAvailable } = usePluginUpdate(true);

    // Ensure QAM panel always opens at the top instead of inheriting the plugin-list scroll offset
    useEffect(() => {
        const resetScrollToTop = () => {
            try {
                let el: HTMLElement | null = topRef.current?.parentElement ?? null;
                while (el) {
                    if (el.scrollTop > 0) {
                        el.scrollTop = 0;
                    }
                    el = el.parentElement;
                }
            } catch {
                // ignore
            }
        };

        resetScrollToTop();
        const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(resetScrollToTop) : 0;
        const t1 = setTimeout(resetScrollToTop, 60);
        const t2 = setTimeout(resetScrollToTop, 180);

        return () => {
            if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getLbkStatus().then((status) => {
            if (!cancelled) setLbkStatus(status);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Sync local slider offsets with saved settings when no debounce timer is active
    useEffect(() => {
        const hasPending = Object.values(timeoutsRef.current).some(Boolean);
        if (!hasPending) {
            setOffsets({
                x: settings.offsetX,
                y: settings.offsetY,
                sx: settings.storeOffsetX,
                sy: settings.storeOffsetY,
            });
        }
    }, [settings.offsetX, settings.offsetY, settings.storeOffsetX, settings.storeOffsetY]);

    // Cleanup active slider debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(timeoutsRef.current).forEach((timer) => {
                if (timer) clearTimeout(timer);
            });
            timeoutsRef.current = {};
        };
    }, []);

    const resolvedTargetLang = resolveTargetLanguage(settings.targetLanguage);
    const isUkrainianTarget = Boolean(resolvedTargetLang.hasUkrainianCommunity);
    const lang = resolveUiLanguage(settings.targetLanguage, resolvedTargetLang);

    const openUrl = (url: string) => {
        if (Navigation && typeof Navigation.NavigateToExternalWeb === "function") {
            Navigation.NavigateToExternalWeb(url);
        } else if (typeof SteamClient !== "undefined" && SteamClient.System?.OpenInSystemBrowser) {
            SteamClient.System.OpenInSystemBrowser(url);
        } else if (typeof window !== "undefined") {
            window.open(url, "_blank");
        }
    };

    const debouncedSet = (key: string, value: number, persister: (v: number) => void) => {
        setOffsets((prev) => ({ ...prev, [key]: value }));
        const prevTimer = timeoutsRef.current[key];
        if (prevTimer) clearTimeout(prevTimer);
        timeoutsRef.current[key] = setTimeout(() => {
            timeoutsRef.current[key] = null;
            persister(value);
        }, 300);
    };

    const languageOptions: { data: number; label: string; value: TargetLanguageSetting }[] = [
        { data: 0, label: t("target_language_auto", lang), value: "auto" },
        ...SUPPORTED_LANGUAGES.map((l, idx) => ({
            data: idx + 1,
            label: `${l.flag} ${l.nativeName}`,
            value: l.code as TargetLanguageSetting,
        })),
    ];

    const typeOptions = [
        { data: 0, label: t("type_default", lang), value: "default" as const },
        { data: 1, label: t("type_full", lang), value: "full" as const },
    ];
    const posOptions = [
        { data: 0, label: t("top_left", lang), value: "top-left" as const },
        { data: 1, label: t("top_right", lang), value: "top-right" as const },
    ];
    const thumbPosOptions: { data: number; label: string; value: ThumbnailPosition }[] = [
        { data: 0, label: t("top_left", lang), value: "top-left" },
        { data: 1, label: t("top_right", lang), value: "top-right" },
        { data: 2, label: t("bottom_left", lang), value: "bottom-left" },
        { data: 3, label: t("bottom_right", lang), value: "bottom-right" },
    ];

    const handleInstallLbk = async () => {
        setInstallingLbk(true);
        setLbkInstallMsg(null);
        const res = await installLbkLauncher();
        setInstallingLbk(false);
        if (res.success) {
            if (res.status) setLbkStatus(res.status);
            else getLbkStatus().then(setLbkStatus);
            setLbkInstallMsg({ text: t("lbk_install_launcher_success", lang), isError: false });
        } else {
            setLbkInstallMsg({
                text: `${t("lbk_install_launcher_failed", lang)}${res.error ? `: ${res.error}` : ""}`,
                isError: true,
            });
        }
    };

    const handleLaunchLbk = async () => {
        setLbkInstallMsg(null);
        const res = await launchLbkLauncher();
        if (res.success) {
            setLbkInstallMsg({ text: t("lbk_launched", lang), isError: false });
        } else {
            setLbkInstallMsg({
                text: `${t("lbk_launch_failed", lang)}${res.error ? `: ${res.error}` : ""}`,
                isError: true,
            });
        }
    };

    const handleRefreshLbk = async () => {
        setLbkInstallMsg(null);
        clearBadgeStatusCache();
        triggerLbkRefresh();
        const status = await getLbkStatus();
        setLbkStatus(status);
        setLbkInstallMsg({ text: t("lbk_refresh_done", lang), isError: false });
    };

    const tabButtonStyle = (tab: SettingsTab): React.CSSProperties => ({
        flex: 1,
        minWidth: "unset",
        minHeight: "30px",
        padding: "5px 4px",
        fontSize: "11px",
        fontWeight: 700,
        borderRadius: "6px",
        background: activeTab === tab ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.06)",
        color: activeTab === tab ? "#ffffff" : "rgba(255,255,255,0.72)",
        border: activeTab === tab ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent",
        textAlign: "center",
    });

    if (loading) {
        return (
            <>
                <div ref={topRef} style={{ height: 0, width: 0, overflow: "hidden" }} />
                <PanelSection title={t("settings_title", lang)}>
                    <PanelSectionRow>
                        <div style={{ display: "flex", justifyContent: "center", padding: 20, width: "100%" }}>
                            <Spinner />
                        </div>
                    </PanelSectionRow>
                </PanelSection>
            </>
        );
    }

    return (
        <>
            <div ref={topRef} style={{ height: 0, width: 0, overflow: "hidden" }} />

            {/* Compact Tab Bar (avoids long vertical scrolling in QAM) */}
            <PanelSection>
                <PanelSectionRow>
                    <Focusable
                        flow-children="row"
                        style={{ display: "flex", gap: "6px", width: "100%", paddingBottom: "4px" }}
                    >
                        <DialogButton style={tabButtonStyle("general")} onClick={() => setActiveTab("general")}>
                            {`⚙️ ${t("tab_general", lang)}`}
                        </DialogButton>
                        <DialogButton style={tabButtonStyle("layout")} onClick={() => setActiveTab("layout")}>
                            {`📍 ${t("tab_layout", lang)}`}
                        </DialogButton>
                        <DialogButton
                            style={{ ...tabButtonStyle("info"), position: "relative" }}
                            onClick={() => setActiveTab("info")}
                        >
                            {`🔗 ${t("tab_info", lang)}`}
                            {updateAvailable && (
                                <span
                                    data-testid="info-tab-update-dot"
                                    style={{
                                        position: "absolute",
                                        top: "4px",
                                        right: "5px",
                                        width: "7px",
                                        height: "7px",
                                        borderRadius: "50%",
                                        background: "#facc15",
                                        boxShadow: "0 0 6px rgba(250, 204, 21, 0.9)",
                                    }}
                                />
                            )}
                        </DialogButton>
                    </Focusable>
                </PanelSectionRow>
            </PanelSection>

            {/* Tab 1: General + LBK (when Ukrainian) */}
            {activeTab === "general" && (
                <PanelSection title={`${resolvedTargetLang.flag} ${t("tab_general", lang)}`}>
                    <PanelSectionRow>
                        <DropdownItem
                            label={t("target_language", lang)}
                            description={
                                settings.targetLanguage === "auto" || !settings.targetLanguage
                                    ? `${t("target_language_active", lang)}: ${resolvedTargetLang.flag} ${resolvedTargetLang.nativeName}`
                                    : undefined
                            }
                            rgOptions={languageOptions}
                            selectedOption={Math.max(
                                0,
                                languageOptions.findIndex((o) => o.value === (settings.targetLanguage || "auto"))
                            )}
                            onChange={(n: any) => {
                                const picked = languageOptions.find((o) => o.data === n.data);
                                if (picked) setTargetLanguage(picked.value);
                            }}
                        />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <DropdownItem
                            label={t("badge_type", lang)}
                            rgOptions={typeOptions}
                            selectedOption={typeOptions.findIndex((o) => o.value === settings.badgeType)}
                            onChange={(n: any) => setBadgeType(typeOptions.find((o) => o.data === n.data)!.value)}
                        />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField
                            label={t("show_on_thumbnails", lang)}
                            checked={settings.showOnThumbnails !== false}
                            onChange={setShowOnThumbnails}
                        />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField
                            label={t("show_on_store", lang)}
                            checked={settings.showOnStore}
                            onChange={setShowOnStore}
                        />
                    </PanelSectionRow>

                    {isUkrainianTarget && (
                        <>
                            <PanelSectionRow>
                                <ToggleField
                                    label={t("lbk_integration", lang)}
                                    description={
                                        lbkStatus
                                            ? lbkStatus.db_found
                                                ? `✅ ${t("lbk_status_found", lang)}${lbkStatus.launch_method ? ` (${lbkStatus.launch_method})` : ""}`
                                                : `⚠️ ${t("lbk_status_not_found", lang)}`
                                            : undefined
                                    }
                                    checked={settings.enableLbkIntegration !== false}
                                    onChange={setEnableLbkIntegration}
                                />
                            </PanelSectionRow>

                            {lbkStatus && !lbkStatus.installed && (
                                <PanelSectionRow>
                                    <ButtonItem layout="below" disabled={installingLbk} onClick={handleInstallLbk}>
                                        {installingLbk ? t("lbk_installing_launcher", lang) : t("lbk_install_launcher", lang)}
                                    </ButtonItem>
                                </PanelSectionRow>
                            )}

                            {lbkStatus && lbkStatus.installed && (
                                <>
                                    <PanelSectionRow>
                                        <ButtonItem layout="below" onClick={handleLaunchLbk}>
                                            {t("lbk_open_launcher", lang)}
                                        </ButtonItem>
                                    </PanelSectionRow>
                                    <PanelSectionRow>
                                        <ButtonItem layout="below" onClick={handleRefreshLbk}>
                                            {t("lbk_refresh_catalog", lang)}
                                        </ButtonItem>
                                    </PanelSectionRow>
                                </>
                            )}

                            {lbkInstallMsg && (
                                <PanelSectionRow>
                                    <div style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        textAlign: "center",
                                        width: "100%",
                                        color: lbkInstallMsg.isError ? "#f87171" : "#4ade80",
                                    }}>
                                        {lbkInstallMsg.text}
                                    </div>
                                </PanelSectionRow>
                            )}
                        </>
                    )}
                </PanelSection>
            )}

            {/* Tab 2: Layout & Positioning */}
            {activeTab === "layout" && (
                <PanelSection title={`📍 ${t("tab_layout", lang)}`}>
                    <PanelSectionRow>
                        <DropdownItem
                            label={t("badge_position", lang)}
                            rgOptions={posOptions}
                            selectedOption={posOptions.findIndex((o) => o.value === settings.badgePosition)}
                            onChange={(n: any) => setBadgePosition(posOptions.find((o) => o.data === n.data)!.value)}
                        />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <SliderField
                            label={t("x_offset", lang)}
                            value={offsets.x}
                            min={0}
                            max={300}
                            onChange={(v) => debouncedSet("x", v, setOffsetX)}
                            showValue
                        />
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <SliderField
                            label={t("y_offset", lang)}
                            value={offsets.y}
                            min={0}
                            max={300}
                            onChange={(v) => debouncedSet("y", v, setOffsetY)}
                            showValue
                        />
                    </PanelSectionRow>

                    {settings.showOnThumbnails !== false && (
                        <PanelSectionRow>
                            <DropdownItem
                                label={t("thumbnail_position", lang)}
                                rgOptions={thumbPosOptions}
                                selectedOption={Math.max(
                                    0,
                                    thumbPosOptions.findIndex((o) => o.value === (settings.thumbnailPosition || "top-left"))
                                )}
                                onChange={(n: any) =>
                                    setThumbnailPosition(thumbPosOptions.find((o) => o.data === n.data)!.value)
                                }
                            />
                        </PanelSectionRow>
                    )}

                    {settings.showOnStore && (
                        <>
                            <PanelSectionRow>
                                <SliderField
                                    label={t("store_x_offset", lang)}
                                    value={offsets.sx}
                                    min={-200}
                                    max={200}
                                    onChange={(v) => debouncedSet("sx", v, setStoreOffsetX)}
                                    showValue
                                />
                            </PanelSectionRow>
                            <PanelSectionRow>
                                <SliderField
                                    label={t("store_y_offset", lang)}
                                    value={offsets.sy}
                                    min={-200}
                                    max={200}
                                    onChange={(v) => debouncedSet("sy", v, setStoreOffsetY)}
                                    showValue
                                />
                            </PanelSectionRow>
                        </>
                    )}
                </PanelSection>
            )}

            {/* Tab 3: Info, Guides, Credits & Version */}
            {activeTab === "info" && (
                <LinksSection lang={lang} openUrl={openUrl} targetLang={resolvedTargetLang} />
            )}

            {/* Support / Donate card is always visible on every tab */}
            <DonateCard lang={lang} openUrl={openUrl} />
        </>
    );
};
