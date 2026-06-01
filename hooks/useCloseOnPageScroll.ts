"use client";

import { useEffect } from "react";

// Closes anchored popovers when the document scrolls behind them.
export function useCloseOnPageScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    window.addEventListener("scroll", onClose, { passive: true });

    return () => {
      window.removeEventListener("scroll", onClose);
    };
  }, [onClose, open]);
}
