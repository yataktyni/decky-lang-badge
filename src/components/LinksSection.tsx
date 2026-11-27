// src/components/LinksSection.tsx
import React, { FC, useState, useEffect } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import { FaSteam, FaYoutube, FaGithub, FaGamepad, FaDownload, FaSyncAlt } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { call } from "@decky/api";
import { t } from "../translations";
import { LanguageConfig, resolveTargetLanguage } from "../languages";
import {
    FALLBACK_VERSION,
    VersionInfo,
    refreshPluginVersionInfo,
    setPluginVersionInfo,
    usePluginUpdate,
} from "../hooks/usePluginUpdate";
import { logger } from "../logger";

const log = logger.component("LinksSection");

interface LinksSectionProps {
    lang: string;
    openUrl: (url: string) => void;
    targetLang?: LanguageConfig;
}

interface UpdateResult {
    success: boolean;
    message?: string;
    error?: string;
    already_current?: boolean;
    needs_restart?: boolean;
    version?: string;
}

const Divider: FC = () => (
    <div style={{
        width: "100%",
        height: "1px",
        background: "rgba(255,255,255,0.14)",
        margin: "10px 0 12px 0"
    }} />
);

const LinkButton: FC<{ onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ onClick, icon, label, disabled }) => (
    <PanelSectionRow>
        <ButtonItem layout="below" bottomSeparator="none" onClick={onClick} disabled={disabled}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", minHeight: "22px", width: "100%" }}>
                {icon}
                <span style={{ textAlign: "center", display: "inline-block", whiteSpace: "normal", overflowWrap: "anywhere" }}>{label}</span>
            </div>
        </ButtonItem>
    </PanelSectionRow>
);

export const LinksSection: FC<LinksSectionProps> = ({ lang, openUrl, targetLang }) => {
    const activeTarget = targetLang ?? resolveTargetLanguage("uk");
    const isUkrainian = Boolean(activeTarget.hasUkrainianCommunity);
    const { versionInfo } = usePluginUpdate(false);
    const [updating, setUpdating] = useState(false);
    const [updateFeedback, setUpdateFeedback] = useState<{ text: string; tone: "success" | "info" | "error" } | null>(null);

    useEffect(() => {
        if (!versionInfo || !versionInfo.source_ok) {
            void refreshPluginVersionInfo(false);
        }
    }, []);

    const handleUpdatePlugin = async () => {
        if (updating) return;
        setUpdating(true);
        setUpdateFeedback(null);

        try {
            let latestInfo: VersionInfo | null = versionInfo;
            if (!latestInfo?.update_available) {
                try {
                    latestInfo = await call<[], VersionInfo>("get_latest_version");
                    setPluginVersionInfo(latestInfo);
                } catch (e) {
                    log.error("Version check failed before update:", e);
                    setUpdateFeedback({ text: `${t("update_error", lang)}: ${t("version_check_failed", lang)}`, tone: "error" });
                    setUpdating(false);
                    return;
                }

                if (latestInfo && !latestInfo.source_ok && latestInfo.error) {
                    setUpdateFeedback({ text: `${t("update_error", lang)}: ${latestInfo.error}`, tone: "error" });
                    setUpdating(false);
                    return;
                }

                if (!latestInfo?.update_available) {
                    setUpdateFeedback({ text: t("already_up_to_date", lang), tone: "info" });
                    setUpdating(false);
                    return;
                }
            }

            // Prefer Decky Loader's own privileged installer (runs as root, avoids Errno 13 Permission denied on root-owned plugin dirs)
            const deckyBackend = (window as any)?.DeckyBackend;
            if (typeof deckyBackend?.call === "function") {
                const targetVersion = latestInfo.latest || latestInfo.latest_tag || "latest";
                const releaseUrl = latestInfo.latest_tag
                    ? `https://github.com/yataktyni/decky-lang-badge/releases/download/${encodeURIComponent(latestInfo.latest_tag)}/release.zip`
                    : "https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip";
                // PluginInstallType.UPDATE === 2 in Decky Loader
                await deckyBackend.call(
                    "utilities/install_plugin",
                    releaseUrl,
                    "Decky Localization Badge",
                    targetVersion,
                    "",
                    2
                );
                return;
            }

            const result = await call<[], UpdateResult>("update_plugin");
            if (result?.success) {
                if (result.already_current) {
                    setUpdateFeedback({ text: t("already_up_to_date", lang), tone: "info" });
                } else {
                    const installedVer = result.version || latestInfo?.latest || versionInfo?.current || FALLBACK_VERSION;
                    setPluginVersionInfo((prev) => ({
                        current: installedVer,
                        latest: installedVer,
                        latest_tag: prev?.latest_tag,
                        update_available: false,
                        source_ok: true,
                        error: null,
                    }));
                    setUpdateFeedback({
                        text: `${t("update_success", lang)} ${t("restart_to_apply", lang)}`,
                        tone: "success",
                    });
                }
            } else {
                setUpdateFeedback({
                    text: `${t("update_error", lang)}${result?.error ? `: ${result.error}` : ""}`,
                    tone: "error",
                });
            }
        } catch (e: any) {
            log.error("Plugin update failed:", e);
            setUpdateFeedback({
                text: `${t("update_error", lang)}${e?.message ? `: ${e.message}` : ""}`,
                tone: "error",
            });
        } finally {
            setUpdating(false);
        }
    };

    const updateButtonLabel = updating
        ? t("updating", lang)
        : versionInfo?.update_available && versionInfo.latest
            ? `${t("update_to", lang)} v${versionInfo.latest}`
            : t("update_plugin", lang);

    const feedbackStyles: Record<"success" | "info" | "error", { color: string; bg: string; border: string }> = {
        success: {
            color: "#4ade80",
            bg: "rgba(74, 222, 128, 0.12)",
            border: "1px solid rgba(74, 222, 128, 0.32)",
        },
        error: {
            color: "#f87171",
            bg: "rgba(248, 113, 113, 0.12)",
            border: "1px solid rgba(248, 113, 113, 0.32)",
        },
        info: {
            color: "rgba(255, 255, 255, 0.9)",
            bg: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
        },
    };

    const activeFeedbackStyle = updateFeedback ? feedbackStyles[updateFeedback.tone] : null;

    return (
        <PanelSection title={`🔗 ${t("links", lang)}`}>
            {/* Language-specific Community Portals & Guides */}
            {isUkrainian ? (
                <>
                    <LinkButton onClick={() => openUrl("https://kuli.com.ua/")} icon={<FaGamepad />} label={t("kuli_website", lang)} />
                    <LinkButton onClick={() => openUrl("https://lbklauncher.com/")} icon={<FaGamepad />} label={t("lbk_website", lang)} />
                    <LinkButton onClick={() => openUrl("https://www.youtube.com/watch?v=24gxXddKNv0")} icon={<FaYoutube />} label={t("video_guide", lang)} />
                    <LinkButton onClick={() => openUrl("https://steamcommunity.com/sharedfiles/filedetails/?id=3137617136")} icon={<FaSteam />} label={t("text_guide", lang)} />
                </>
            ) : (
                activeTarget.communityLinks?.map((item) => (
                    <LinkButton
                        key={item.url}
                        onClick={() => openUrl(item.url)}
                        icon={item.kind === "video" ? <FaYoutube /> : item.kind === "guide" ? <FaSteam /> : <FaGamepad />}
                        label={item.label}
                    />
                ))
            )}

            {!isUkrainian && (
                <LinkButton onClick={() => openUrl("https://github.com/yataktyni/decky-lang-badge#installing-community-translations-on-steam-deck")} icon={<FaGithub />} label={t("translation_guide_en", lang)} />
            )}

            {/* Universal Plugin Links */}
            <LinkButton onClick={() => openUrl("https://github.com/yataktyni/decky-lang-badge")} icon={<FaGithub />} label={t("github_source", lang)} />
            <LinkButton onClick={() => openUrl("https://x.com/yataktyni")} icon={<FaXTwitter />} label={t("author_x", lang)} />

            <Divider />

            {/* 1-Click Auto-Updater */}
            <LinkButton
                onClick={handleUpdatePlugin}
                disabled={updating}
                icon={versionInfo?.update_available ? <FaDownload color="#facc15" /> : <FaSyncAlt />}
                label={updateButtonLabel}
            />

            {updateFeedback && activeFeedbackStyle && (
                <PanelSectionRow>
                    <div style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        lineHeight: 1.35,
                        color: activeFeedbackStyle.color,
                        background: activeFeedbackStyle.bg,
                        border: activeFeedbackStyle.border,
                        borderRadius: "6px",
                        width: "100%",
                        boxSizing: "border-box",
                        textAlign: "center",
                        overflowWrap: "anywhere",
                        marginTop: "10px",
                        marginBottom: "4px",
                        padding: "7px 10px",
                    }}>
                        {updateFeedback.text}
                    </div>
                </PanelSectionRow>
            )}

            {/* Version */}
            <PanelSectionRow>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "20px",
                    fontSize: "12px",
                    marginTop: "8px",
                    marginBottom: "4px",
                    color: "rgba(255,255,255,0.75)",
                    width: "100%",
                    textAlign: "center",
                    overflowWrap: "anywhere",
                    padding: "0 6px"
                }}>
                    {`${t("version", lang)}: v${versionInfo?.current ?? FALLBACK_VERSION}`}
                </div>
            </PanelSectionRow>

            {/* Credits / Disclaimer */}
            <PanelSectionRow>
                <div style={{
                    fontSize: "11px",
                    lineHeight: 1.35,
                    color: "rgba(255,255,255,0.58)",
                    width: "100%",
                    textAlign: "center",
                    overflowWrap: "anywhere",
                    padding: "0 6px 6px 6px"
                }}>
                    {isUkrainian
                        ? t("credits_disclaimer", lang)
                        : t("generic_disclaimer", lang)}
                </div>
            </PanelSectionRow>
        </PanelSection>
    );
};
