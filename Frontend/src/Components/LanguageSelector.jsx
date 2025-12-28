import React, { useEffect } from "react";
import { Globe } from "lucide-react"; // Globe icon from lucide-react

const LanguageSwitcher = () => {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.body.appendChild(script);

        window.googleTranslateElementInit = function () {
            new window.google.translate.TranslateElement(
                {
                    pageLanguage: "en",
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                },
                "google_translate_element"
            );
        };
    }, []);

    return (
        <div style={styles.container}>
            {/* Hidden Google Translate Widget */}
            <div id="google_translate_element" style={{ display: "none" }}></div>

            {/* Floating Globe Button */}
            <button
                onClick={() => {
                    const googleButton = document.querySelector(".goog-te-gadget-simple");
                    if (googleButton) googleButton.click();
                }}
                style={styles.button}
                title="Translate Page"
            >
                <Globe size={24} />
            </button>
        </div>
    );
};

const styles = {
    container: {
        position: "fixed",
        top: "2px",
left: "3px",
        zIndex: "1000",
    },
    button: {
        backgroundColor: "#fff",
        border: "2px solid #ddd",
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
        cursor: "pointer",
        transition: "0.3s",
    },
};

export default LanguageSwitcher;
