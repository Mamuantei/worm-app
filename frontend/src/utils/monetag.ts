declare global {
  interface Window {
    [key: string]: any; // Monetag registers show_<zoneId>
  }
}

// Monetag Rewarded Interstitial + Rewarded Popup zone.
export const MONETAG_ZONE_ID = '11716044';

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

/** Rewarded Interstitial: show_<zoneId>() */
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

/** Rewarded Popup: show_<zoneId>('pop') */
export async function showRewardedPopup(): Promise<boolean> {
  const ready = await waitForMonetagSdk();
  if (!ready) {
    console.warn(`[Monetag] show_${MONETAG_ZONE_ID} is not available.`);
    return false;
  }

  try {
    await window[showFnName()]('pop');
    return true;
  } catch (error) {
    console.warn('[Monetag] Rewarded popup failed:', error);
    return false;
  }
}
