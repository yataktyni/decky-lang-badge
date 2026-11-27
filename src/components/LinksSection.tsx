// src/components/LinksSection.tsx
import React, { FC, useState, useEffect } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import { FaSteam, FaYoutube, FaGithub, FaGamepad } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { call } from "@decky/api";
import { t } from "../translations";
import { LanguageConfig, resolveTargetLanguage } from "../languages";
import { logger } from "../logger";

declare const __PLUGIN_VERSION__: string | undefined;

const log = logger.component("LinksSection");
const FALLBACK_VERSION: string =
    typeof __PLUGIN_VERSION__ !== "undefined" && __PLUGIN_VERSION__
        ? __PLUGIN_VERSION__
        : "unknown";

interface LinksSectionProps {
    lang: string;
    openUrl: (url: string) => void;
    targetLang?: LanguageConfig;
}

interface VersionInfo {
    current: string;
    latest: string | null;
    latest_tag?: string | null;
    update_available: boolean;
    source_ok?: boolean;
    error?: string | null;
    checked_at?: number;
}

const Divider: FC = () => (
    <div style={{
        width: "100%",
        height: "1px",
        background: "rgba(255,255,255,0.15)",
        margin: "12px 0"
    }} />
);

const LinkButton: FC<{ onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ onClick, icon, label, disabled }) => (
    <PanelSectionRow>
        <ButtonItem layout="below" onClick={onClick} disabled={disabled}>
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
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

    useEffect(() => {
        let cancelled = false;
        const checkVersion = async () => {
            try {
                const current = await call<[], string>("get_current_version");
                if (!cancelled) {
                    setVersionInfo(prev => prev ? { ...prev, current } : {
                        current,
                        latest: null,
                        update_available: false,
                        source_ok: false,
                        error: null
                    });
                }
            } catch (e) {
                log.warn("Failed to get immediate version:", e);
            }

            try {
                const info = await call<[], VersionInfo>("get_latest_version");
                log.info("Full version info:", info);
                if (!cancelled) setVersionInfo(info);
            } catch (e) {
                log.error("Failed to check version from GitHub:", e);
                if (!cancelled) {
                    setVersionInfo(prev => prev ? { ...prev, update_available: false, source_ok: false, error: "Version check failed" } : {
                        current: FALLBACK_VERSION,
                        latest: null,
                        update_available: false,
                        source_ok: false,
                        error: "Version check failed"
                    });
                }
            }
        };
        checkVersion();
        return () => {
            cancelled = true;
        };
    }, []);

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

            {/* Version only (update UI hidden) */}
            <PanelSectionRow>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "20px",
                    fontSize: "12px",
                    marginTop: "2px",
                    marginBottom: "2px",
                    color: "rgba(255,255,255,0.75)",
                    width: "100%",
                    textAlign: "center",
                    overflowWrap: "anywhere",
                    padding: "0 6px"
                }}>
                    {`${t("version", lang)}: v${versionInfo?.current ?? FALLBACK_VERSION}`}
                </div>
            </PanelSectionRow>
        </PanelSection>
    );
};
