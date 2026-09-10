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
export function waitForMonetagSdk(timeoutMs = 10000): Promise<boolean> {
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
 * Shows the Monetag Rewarded Popup ad — passing 'pop' selects this format,
 * where the user is sent directly to an offer page on click rather than
 * seeing an inline interstitial. Wrapped so the caller gets a simple
 * true/false instead of having to handle the Promise directly.
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  const ready = await waitForMonetagSdk();
  if (!ready) {
    console.warn(`[Monetag] show_${MONETAG_ZONE_ID} is not available.`);
    return false;
  }

  try {
    await window[showFnName()]('pop');
    return true; // user watched the ad / completed the popup flow
  } catch (error) {
    console.warn('[Monetag] Rewarded popup failed:', error);
    return false; // ad failed to load / was skipped / no fill
  }
}
