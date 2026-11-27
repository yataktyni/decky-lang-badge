// decky-lang-badge/src/components/Badge.tsx
import React, { useState, useRef } from "react";
import { FaCheckCircle, FaInfoCircle, FaTimesCircle } from "react-icons/fa";
import {
    DialogButton,
    Focusable,
    showModal,
} from "@decky/ui";

import { useAppId } from "../hooks/useAppId";
import { useSettings } from "../hooks/useSettings";
import { useBadgeStatus, BadgeStatus } from "../hooks/useBadgeStatus";
import { useLbkTranslations } from "../hooks/useLbkTranslations";
import { resolveTargetLanguage } from "../languages";
import { LbkModal } from "./LbkModal";
import { t, resolveUiLanguage } from "../translations";
import { openInSteamBrowser } from "../utils";

const BADGE_CONFIG = {
    OFFICIAL: { icon: FaCheckCircle, color: "#28a745", shadow: "rgba(40, 167, 69, 0.4)" },
    INSTALLED: { icon: FaCheckCircle, color: "#10b981", shadow: "rgba(16, 185, 129, 0.45)" },
    COMMUNITY: { icon: FaInfoCircle, color: "#ffc107", shadow: "rgba(255, 193, 7, 0.4)" },
    NONE: { icon: FaTimesCircle, color: "#dc3545", shadow: "rgba(220, 53, 69, 0.4)" },
} as const;

type DisplayBadgeStatus = BadgeStatus | "INSTALLED";

interface BadgeProps {
    pAppId?: string;
    pAppName?: string;
}

const Badge: React.FC<BadgeProps> = ({ pAppId, pAppName }) => {
    const { settings, loading: settingsLoading } = useSettings();
    const { appId: hAppId, appName: hAppName, isLoading: hLoading } = useAppId();

    const appId = pAppId || hAppId;
    const appName = pAppName || hAppName || "";

    const targetLang = resolveTargetLanguage(settings.targetLanguage);
    const { status, url: kuliUrl, loading: statusLoading } = useBadgeStatus(appId, appName, targetLang);
    const lbkEnabled = Boolean(targetLang.hasUkrainianCommunity && settings.enableLbkIntegration !== false);
    const { data: lbkData, loading: lbkLoading } = useLbkTranslations(appId, lbkEnabled);
    const { badgeType } = settings;
    const lang = resolveUiLanguage(settings.targetLanguage, targetLang);

    const [isFocused, setIsFocused] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    if (hLoading || statusLoading || settingsLoading || (lbkEnabled && lbkLoading) || !status) return null;

    const hasLbkTranslations = lbkEnabled && lbkData.translations.length > 0;
    const isLbkInstalled = hasLbkTranslations && lbkData.installed_any;
    const hasLbkVoice = hasLbkTranslations && lbkData.translations.some((tr) => tr.has_voice);
    const lbkPillLabel = [
        lbkData.has_update_any ? "⬆" : isLbkInstalled && status === "OFFICIAL" ? "✓" : "",
        hasLbkVoice ? "🎙" : "",
        "LBK",
    ]
        .filter(Boolean)
        .join(" ");
    const effectiveStatus: DisplayBadgeStatus =
        isLbkInstalled && status !== "OFFICIAL"
            ? "INSTALLED"
            : status === "NONE" && hasLbkTranslations
                ? "COMMUNITY"
                : status;

    const config = BADGE_CONFIG[effectiveStatus] || BADGE_CONFIG.NONE;
    const labelKey = effectiveStatus === "INSTALLED" ? "lbk_installed" : effectiveStatus.toLowerCase();
    const label = badgeType === "full" ? t(labelKey, lang) : "";
    const isClickable = !!kuliUrl || hasLbkTranslations;
    const clickUrl = kuliUrl || "";

    const style: React.CSSProperties = {
        position: "absolute",
        zIndex: 1000,
        pointerEvents: "auto",
        transition: "all 0.3s ease",
    };

    const base = settings.badgePosition === "top-left" ? { top: "0px", left: "0px" } : { top: "0px", right: "0px" };
    style.top = `calc(0px + ${settings.offsetY}px)`;
    if (base.left) style.left = `calc(0px + ${settings.offsetX}px)`;
    if (base.right) style.right = `calc(0px + ${settings.offsetX}px)`;

    const BadgeIcon = config.icon;

    // Helper to lighten colors for focus state
    const getFocusedColor = (color: string) => {
        if (effectiveStatus === "OFFICIAL") return "#34ce57";
        if (effectiveStatus === "INSTALLED") return "#34d399";
        if (effectiveStatus === "COMMUNITY") return "#ffcd39";
        return color;
    };

    const handleActivate = (e?: any) => {
        e?.stopPropagation?.();
        if (hasLbkTranslations && typeof showModal === "function") {
            showModal(
                <LbkModal
                    gameName={appName}
                    translations={lbkData.translations}
                    kuliUrl={kuliUrl}
                    lang={lang}
                />
            );
            return;
        }
        if (clickUrl) {
            openInSteamBrowser(clickUrl);
        }
    };

    const buttonStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "auto",
        minWidth: "unset",
        minHeight: "unset",
        padding: "6px 12px",
        backgroundColor: isFocused ? getFocusedColor(config.color) : config.color,
        color: effectiveStatus === "COMMUNITY" ? "#000" : "#fff",
        border: "none",
        outline: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        fontSize: "14px",
        lineHeight: "1.2",
        boxShadow: isFocused ? `0 0 0 3px rgba(255,255,255,0.85), 0 4px 12px ${config.shadow}` : `0 4px 12px ${config.shadow}`,
        cursor: isClickable ? "pointer" : "default",
        opacity: effectiveStatus === "NONE" ? 0.8 : 1,
        fontFamily: '"Motiva Sans", sans-serif',
        transition: "all 0.2s ease-in-out",
        transform: isFocused ? "scale(1.05)" : "scale(1)",
        pointerEvents: "auto",
    };

    const content = (
        <>
            <span style={{ fontSize: "20px", lineHeight: "1" }}>{targetLang.flag}</span>
            <BadgeIcon size={16} />
            {label && <span>{label}</span>}
            {hasLbkTranslations && (
                <span
                    style={{
                        fontSize: "11px",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        backgroundColor: isLbkInstalled
                            ? "rgba(0, 0, 0, 0.22)"
                            : "rgba(0, 0, 0, 0.16)",
                        lineHeight: "1.3",
                    }}
                >
                    {lbkPillLabel}
                </span>
            )}
        </>
    );

    const hasDialogButton = typeof DialogButton !== "undefined" && !!DialogButton;

    return (
        <div
            ref={ref}
            className="ukr-badge-container"
            style={style}
        >
            <style>{`
                .ukr-badge-button,
                .ukr-badge-button:focus,
                .ukr-badge-button.gpfocus {
                    outline: none !important;
                }
                .ukr-badge-button:hover,
                .ukr-badge-button.gpfocus {
                    filter: brightness(1.12);
                    transform: scale(1.05) !important;
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.85), 0 4px 12px ${config.shadow} !important;
                }
            `}</style>
            {hasDialogButton ? (
                <DialogButton
                    className="ukr-badge-button"
                    focusable={isClickable}
                    noFocusRing={true}
                    onClick={handleActivate}
                    style={buttonStyle}
                >
                    {content}
                </DialogButton>
            ) : (
                <Focusable
                    noFocusRing={true}
                    onActivate={handleActivate}
                    onClick={handleActivate}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={buttonStyle}
                >
                    {content}
                </Focusable>
            )}
        </div>
    );
};

export default Badge;
