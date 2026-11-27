// decky-lang-badge/src/components/LbkModal.tsx
import React, { FC, useState } from "react";
import {
    DialogBody,
    DialogButton,
    DialogHeader,
    ModalRoot,
} from "@decky/ui";
import { FaCheckCircle, FaDownload, FaExternalLinkAlt, FaMicrophone, FaTrophy } from "react-icons/fa";
import { LbkTranslation, openInLbk } from "../hooks/useLbkTranslations";
import { t } from "../translations";
import { openInSteamBrowser } from "../utils";

export interface LbkModalProps {
    gameName: string;
    translations: LbkTranslation[];
    kuliUrl?: string | null;
    lang: string;
    closeModal?: () => void;
}

export const LbkModal: FC<LbkModalProps> = ({
    gameName,
    translations,
    kuliUrl,
    lang,
    closeModal,
}) => {
    const [launchingId, setLaunchingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

    const handleOpenInLbk = async (tr: LbkTranslation) => {
        setLaunchingId(tr.id);
        setFeedback(null);

        const res = await openInLbk(tr.slug, tr.team);
        setLaunchingId(null);

        if (res.success) {
            setFeedback({ msg: t("lbk_launched", lang), isError: false });
            if (res.method?.startsWith("steam-shortcut:")) {
                closeModal?.();
            }
        } else {
            setFeedback({
                msg: `${t("lbk_launch_failed", lang)}${res.error ? `: ${res.error}` : ""}`,
                isError: true,
            });
        }
    };

    return (
        <ModalRoot onCancel={closeModal} closeModal={closeModal}>
            <DialogHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>🇺🇦</span>
                    <span>{gameName || t("lbk_modal_title", lang)}</span>
                </div>
            </DialogHeader>
            <DialogBody>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                    <div style={{ fontSize: "13px", opacity: 0.85 }}>
                        {t("lbk_available_translations", lang)}
                    </div>

                    {translations.map((tr) => (
                        <div
                            key={tr.id}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                padding: "12px",
                                borderRadius: "8px",
                                background: tr.installed
                                    ? "rgba(40, 167, 69, 0.16)"
                                    : "rgba(255, 255, 255, 0.06)",
                                border: tr.installed
                                    ? "1px solid rgba(40, 167, 69, 0.45)"
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                                <div style={{ fontWeight: 700, fontSize: "15px" }}>
                                    {tr.team || tr.name}
                                    {tr.version ? (
                                        <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: "6px", fontSize: "12px" }}>
                                            v{tr.version}
                                        </span>
                                    ) : null}
                                </div>
                                {tr.installed && (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        color: tr.has_update ? "#facc15" : "#4ade80",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                    }}>
                                        <FaCheckCircle size={12} />
                                        {tr.has_update
                                            ? `${t("lbk_update_available", lang)}${tr.installed_version && tr.version ? ` (v${tr.installed_version} → v${tr.version})` : ""}`
                                            : t("lbk_installed", lang)}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "12px", opacity: 0.85 }}>
                                <span>{t("lbk_text_progress", lang)}: {tr.translation_progress}%</span>
                                {tr.has_voice && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <FaMicrophone size={11} />
                                        {t("lbk_voice", lang)}
                                        {tr.voice_progress !== null ? ` ${tr.voice_progress}%` : ""}
                                    </span>
                                )}
                                {tr.has_achievements && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <FaTrophy size={11} />
                                        {t("lbk_achievements", lang)}
                                    </span>
                                )}
                                {tr.ai && (
                                    <span style={{ opacity: 0.75 }}>AI ({tr.ai})</span>
                                )}
                            </div>

                            <DialogButton
                                disabled={launchingId === tr.id}
                                onClick={() => handleOpenInLbk(tr)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    padding: "8px 12px",
                                }}
                            >
                                <FaDownload size={14} />
                                <span>
                                    {launchingId === tr.id
                                        ? t("lbk_launching", lang)
                                        : tr.installed
                                            ? t("lbk_manage_in_lbk", lang)
                                            : t("lbk_install_in_lbk", lang)}
                                </span>
                            </DialogButton>
                        </div>
                    ))}

                    {feedback && (
                        <div style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            textAlign: "center",
                            color: feedback.isError ? "#f87171" : "#4ade80",
                        }}>
                            {feedback.msg}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                        {kuliUrl && (
                            <DialogButton
                                onClick={() => {
                                    closeModal?.();
                                    openInSteamBrowser(kuliUrl);
                                }}
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                }}
                            >
                                <FaExternalLinkAlt size={13} />
                                <span>{t("kuli_website", lang)}</span>
                            </DialogButton>
                        )}
                        <DialogButton
                            onClick={closeModal}
                            style={{ flex: kuliUrl ? 0.6 : 1 }}
                        >
                            {t("close", lang)}
                        </DialogButton>
                    </div>

                    <div style={{
                        fontSize: "11px",
                        opacity: 0.62,
                        textAlign: "center",
                        lineHeight: 1.35,
                        marginTop: "2px",
                    }}>
                        {t("lbk_modal_attribution", lang)}
                    </div>
                </div>
            </DialogBody>
        </ModalRoot>
    );
};

export default LbkModal;

