// src/components/DonateCard.tsx
import React, { FC, useState } from "react";
import { DialogButton, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";
import { FaBitcoin, FaQrcode } from "react-icons/fa";
import { t } from "../translations";

interface DonateCardProps {
    lang: string;
    openUrl: (url: string) => void;
}

const KOFI_URL = "https://ko-fi.com/yataktyni/tip";
const CRYPTO_URL = "https://nowpayments.io/donation/yataktyni";

const generateQRCode = (url: string): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

export const DonateCard: FC<DonateCardProps> = ({ lang, openUrl }) => {
    const [activeQr, setActiveQr] = useState<"kofi" | "crypto" | null>(null);

    const toggleQr = (kind: "kofi" | "crypto") => {
        setActiveQr((prev) => (prev === kind ? null : kind));
    };

    const compactBtnBase: React.CSSProperties = {
        minWidth: "unset",
        minHeight: "32px",
        padding: "6px 10px",
        borderRadius: "6px",
        border: "none",
        color: "#fff",
        fontWeight: 700,
        fontSize: "12px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: "pointer",
    };

    const qrBtnStyle: React.CSSProperties = {
        ...compactBtnBase,
        width: "36px",
        flex: "0 0 36px",
        padding: "6px",
        background: "rgba(255,255,255,0.12)",
    };

    return (
        <PanelSection title={`❤️ ${t("support_title", lang)}`}>
            <PanelSectionRow>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div
                        style={{
                            fontSize: "11px",
                            lineHeight: 1.35,
                            color: "rgba(255,255,255,0.72)",
                            padding: "0 2px",
                        }}
                    >
                        {t("support_subtitle", lang)}
                    </div>

                    {/* Ko-fi row */}
                    <Focusable
                        flow-children="row"
                        style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}
                    >
                        <DialogButton
                            onClick={() => openUrl(KOFI_URL)}
                            style={{
                                ...compactBtnBase,
                                flex: 1,
                                background: "#FF5E5B",
                                boxShadow: "0 3px 10px rgba(255, 94, 91, 0.28)",
                            }}
                        >
                            <svg height="14" width="14" viewBox="0 0 24 24" fill="#fff">
                                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 5.422-2.721 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-4.417-2.924-5.466-2.937-5.466-.267-.059 1.941-1.42 2.613-2.193.376-.433.973-.243.973-.243s.694-.239 1.139.298c1.328 1.602 2.766 2.368 2.641 3.637zm5.467 1.258c-.792 1.34-2.887 1.229-2.887 1.229V6.366s1.611-.08 2.559.576c1.378.956 1.121 2.809.328 3.264z" />
                            </svg>
                            <span>Ko-fi</span>
                        </DialogButton>
                        <DialogButton
                            onClick={() => toggleQr("kofi")}
                            style={{
                                ...qrBtnStyle,
                                background: activeQr === "kofi" ? "rgba(255,94,91,0.35)" : "rgba(255,255,255,0.12)",
                            }}
                        >
                            <FaQrcode size={14} />
                        </DialogButton>
                    </Focusable>

                    {/* Crypto row */}
                    <Focusable
                        flow-children="row"
                        style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}
                    >
                        <DialogButton
                            onClick={() => openUrl(CRYPTO_URL)}
                            style={{
                                ...compactBtnBase,
                                flex: 1,
                                background: "#26A17B",
                                boxShadow: "0 3px 10px rgba(38, 161, 123, 0.28)",
                            }}
                        >
                            <FaBitcoin size={14} />
                            <span>{t("crypto_support", lang)}</span>
                        </DialogButton>
                        <DialogButton
                            onClick={() => toggleQr("crypto")}
                            style={{
                                ...qrBtnStyle,
                                background: activeQr === "crypto" ? "rgba(38,161,123,0.35)" : "rgba(255,255,255,0.12)",
                            }}
                        >
                            <FaQrcode size={14} />
                        </DialogButton>
                    </Focusable>

                    {activeQr && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px",
                                background: "#fff",
                                borderRadius: "8px",
                                marginTop: "2px",
                            }}
                        >
                            <img
                                src={generateQRCode(activeQr === "kofi" ? KOFI_URL : CRYPTO_URL)}
                                alt={activeQr === "kofi" ? "Ko-fi QR Code" : "Crypto QR Code"}
                                style={{ width: "136px", height: "136px" }}
                            />
                            <span style={{ color: "#111", fontSize: "11px", fontWeight: 700 }}>
                                {activeQr === "kofi" ? "Ko-fi" : "NOWPayments (Crypto)"}
                            </span>
                        </div>
                    )}
                </div>
            </PanelSectionRow>
        </PanelSection>
    );
};

export default DonateCard;

