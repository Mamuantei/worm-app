declare global {
  interface Window {
    [key: string]: any;
  }
}

// Keep the known Rewarded Interstitial zone working even when the deployment
// platform has not been given VITE_MONETAG_ZONE_ID yet. Vercel can still
// override this with its environment variable when needed.
const DEFAULT_MONETAG_ZONE_ID = '11697097';
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
export function waitForMonetagSdk(timeoutMs = 8000): Promise<boolean> {
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

export async function showRewardedInterstitial(): Promise<boolean> {
  const ready = await waitForMonetagSdk();
  if (!ready) return false;

  try {
    await window[showFnName()]();
    return true;
  } catch (error) {
    console.warn('[Monetag] Rewarded ad failed:', error);
    return false;
  }
}
