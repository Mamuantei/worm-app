declare global {
  interface Window {
    [key: string]: any;
  }
}

// Monetag Rewarded Interstitial zone supplied for Worm.
const DEFAULT_MONETAG_ZONE_ID = '11716044';
export const MONETAG_ZONE_ID =
  String(import.meta.env.VITE_MONETAG_ZONE_ID || DEFAULT_MONETAG_ZONE_ID).trim();

function showFnName(): string {
  return `show_${MONETAG_ZONE_ID}`;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

export function isMonetagReady(): boolean {
  return isMonetagConfigured() && typeof window[showFnName()] === 'function';
}

/** Wait for the statically-loaded Monetag SDK to register show_<zoneId>. */
export function waitForMonetagSdk(timeoutMs = 10000): Promise<boolean> {
  if (isMonetagReady()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (isMonetagReady() || Date.now() - start >= timeoutMs) {
        window.clearInterval(interval);
        resolve(isMonetagReady());
      }
    }, 100);
  });
}

/**
 * Show the Monetag Rewarded Interstitial.
 * The caller's reward callback runs only after this promise resolves true.
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  const ready = await waitForMonetagSdk();
  if (!ready) {
    console.warn(`[Monetag] show_${MONETAG_ZONE_ID} is not available.`);
    return false;
  }

  try {
    await window[showFnName()]();
    return true;
  } catch (error) {
    console.warn('[Monetag] Rewarded interstitial failed:', error);
    return false;
  }
}
