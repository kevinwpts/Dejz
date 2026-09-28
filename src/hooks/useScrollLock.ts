import { useEffect } from "react";

let activeLockCount = 0;
let savedHtmlOverflow = "";
let savedBodyOverflow = "";

function applyScrollLock() {
  if (activeLockCount === 0) {
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedBodyOverflow = document.body.style.overflow;
    
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  activeLockCount++;
}

function releaseScrollLock() {
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    // If the saved overflow was 'hidden' (from an orphaned previous modal), force clear it
    const restoreHtml = savedHtmlOverflow === "hidden" ? "" : savedHtmlOverflow;
    const restoreBody = savedBodyOverflow === "hidden" ? "" : savedBodyOverflow;
    
    document.documentElement.style.overflow = restoreHtml;
    document.body.style.overflow = restoreBody;
  }
}

/**
 * Hard safety reset: forcefully removes scroll locks from <html> and <body>.
 * Can be called when closing all modals or navigating tabs to guarantee the screen never freezes.
 */
export function forceUnlockAllScroll() {
  activeLockCount = 0;
  savedHtmlOverflow = "";
  savedBodyOverflow = "";
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    applyScrollLock();

    return () => {
      releaseScrollLock();
    };
  }, [lock]);
}
