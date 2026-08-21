"use client";

import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "5215631992165";
const POPUP_SHOWN_KEY = "tienda-whatsapp-popup-shown";

export function WhatsappButton() {
  const [showPopup, setShowPopup] = useState(false);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hola, tengo una duda sobre un producto",
  )}`;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(POPUP_SHOWN_KEY)) return;
    } catch {
      return;
    }
    const showTimeout = setTimeout(() => {
      setShowPopup(true);
      try {
        sessionStorage.setItem(POPUP_SHOWN_KEY, "1");
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearTimeout(showTimeout);
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    const hideTimeout = setTimeout(() => setShowPopup(false), 8000);
    return () => clearTimeout(hideTimeout);
  }, [showPopup]);

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-2">
      {showPopup && (
        <div className="relative max-w-[240px] rounded-xl rounded-br-sm bg-white p-3 text-sm text-zinc-700 shadow-lg">
          <button
            type="button"
            onClick={() => setShowPopup(false)}
            aria-label="Cerrar"
            className="absolute top-1 right-1.5 text-zinc-400"
          >
            ×
          </button>
          <p className="pr-3">
            ¿Tienes dudas? Escríbenos por WhatsApp y te ayudamos 👋
          </p>
        </div>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" fill="white" className="h-7 w-7">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.5 5.2L2 22l4.9-1.4c1.5.8 3.2 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3.1.9.9-3-.2-.3C3.7 14.6 3.2 13 3.2 12c0-4.8 3.9-8.8 8.8-8.8s8.8 3.9 8.8 8.8-3.9 8.8-8.8 8.8z" />
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z" />
        </svg>
      </a>
    </div>
  );
}
