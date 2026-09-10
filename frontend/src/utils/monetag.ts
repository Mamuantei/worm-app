declare global {
  interface Window {
    [key: string]: any;
  }
}

// Monetag Rewarded Interstitial + Rewarded Popup zone.
export const MONETAG_ZONE_ID = '11716044';

function showFnName(): string {
  return `show_${MONETAG_ZONE_ID}`;
}

export function isMonetagConfigured(): boolean {
  return true;
}

export function isMonetagReady(): boolean {
  return typeof window !== 'undefined' && typeof window[showFnName()] === 'function';
}

/** Wait only for diagnostics/preloading. Do NOT await this before a popup click,
 * because the browser/Telegram WebView can lose the user's gesture activation. */
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
export function showRewardedInterstitial(): Promise<boolean> {
  if (!isMonetagReady()) {
    console.warn(`[Monetag] show_${MONETAG_ZONE_ID} is not available yet.`);
    return Promise.resolve(false);
  }

  try {
    // Keep this call synchronous with the user's click.
    return Promise.resolve(window[showFnName()]()).then(
      () => true,
      (error) => {
        console.warn('[Monetag] Rewarded interstitial failed:', error);
        return false;
      },
    );
  } catch (error) {
    console.warn('[Monetag] Rewarded interstitial failed:', error);
    return Promise.resolve(false);
  }
}

/** Rewarded Popup: show_<zoneId>('pop'). Must be called directly from the click handler. */
export function showRewardedPopup(): Promise<boolean> {
  if (!isMonetagReady()) {
    console.warn(`[Monetag] show_${MONETAG_ZONE_ID} is not available yet.`);
    return Promise.resolve(false);
  }

  try {
    // IMPORTANT: do not await anything before this call.
    // Monetag needs the original Play-button user gesture for the popup.
    return Promise.resolve(window[showFnName()]('pop')).then(
      () => true,
      (error) => {
        console.warn('[Monetag] Rewarded popup failed:', error);
        return false;
      },
    );
  } catch (error) {
    console.warn('[Monetag] Rewarded popup failed:', error);
    return Promise.resolve(false);
  }
}
