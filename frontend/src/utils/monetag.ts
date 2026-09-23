declare global {
  interface Window {
    [key: string]: any;
  }
}

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

/**
 * Wait for the Monetag SDK to register the rewarded interstitial function.
 * The SDK tag is loaded statically from index.html.
 */
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
 * Shows the Monetag Rewarded Interstitial.
 *
 * Monetag's Rewarded Interstitial example calls show_<zoneId>()
 * without the 'pop' argument. The 'pop' argument belongs to the
 * Rewarded Popup flow, so do not pass it here.
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
