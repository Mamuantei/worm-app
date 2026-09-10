declare global {
  interface Window {
    [key: string]: any; // Monetag registers a function named `show_<zoneId>`
  }
}

// Your real Monetag zone ID, set in frontend/.env as VITE_MONETAG_ZONE_ID
// (see SETUP.md "Real Ads Setup"). The actual <script> tag is static in
// index.html (not injected here) — that's deliberate: some mobile WebViews
// (including Telegram's native app) can treat scripts injected after page
// load differently than ones present from the start, so we load it the
// same way Monetag's own install snippet does.
export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';

function showFnName(): string {
  return `show_${MONETAG_ZONE_ID}`;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

export function isMonetagReady(): boolean {
  return isMonetagConfigured() && typeof window[showFnName()] === 'function';
}

/** Waits (briefly) for the statically-loaded SDK script to register its function. */
export function waitForMonetagSdk(timeoutMs = 4000): Promise<boolean> {
  if (isMonetagReady()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (isMonetagReady() || Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        resolve(isMonetagReady());
      }
    }, 100);
  });
}

/**
 * Shows the real Monetag Rewarded Interstitial ad — the exact
 * `show_XXX().then(...)` call from Monetag's own snippet, wrapped so the
 * caller gets a simple true/false instead of having to handle the Promise
 * directly.
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  const ready = await waitForMonetagSdk();
  if (!ready) return false;

  try {
    await window[showFnName()]();
    return true; // user watched the ad
  } catch {
    return false; // ad failed to load / was skipped / no fill
  }
}
