declare global {
  interface Window {
    [key: string]: any; // Monetag injects a function named `show_<yourZoneId>`
    monetagSdkLoaded?: boolean;
    Telegram?: {
      WebApp?: {
        version?: string;
        isVersionAtLeast?: (version: string) => boolean;
        showAlert?: (message: string, callback?: () => void) => void;
        showPopup?: (params: unknown, callback?: (buttonId: string) => void) => void;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

// Set this to YOUR OWN Monetag zone ID (see SETUP.md "Real Ads" section for
// how to get one). Until you set this, ads won't actually load — the app
// falls back to a plain "watch for N seconds" unlock instead of pretending
// an ad played. VITE_MONETAG_ZONE_ID is read from frontend/.env.
export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';
export const MONETAG_SDK_URL = 'https://libtl.com/sdk.js';

function showFnName(): string {
  return `show_${MONETAG_ZONE_ID}`;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

/**
 * Ensures the Monetag SDK script tag is present in the DOM. No-ops if you
 * haven't set your zone ID yet.
 */
export function ensureMonetagSdk(): void {
  if (typeof window === 'undefined' || !isMonetagConfigured()) return;

  const existing = document.querySelector(`script[data-zone="${MONETAG_ZONE_ID}"]`);
  if (!existing) {
    const script = document.createElement('script');
    script.src = MONETAG_SDK_URL;
    script.setAttribute('data-zone', MONETAG_ZONE_ID);
    script.setAttribute('data-sdk', showFnName());
    script.async = true;
    script.onload = () => {
      window.monetagSdkLoaded = true;
    };
    script.onerror = (err) => {
      console.warn('Monetag external script failed to load:', err);
    };
    document.head.appendChild(script);
  }
}

/**
 * Checks if the Monetag SDK is ready to be called.
 */
export function isMonetagReady(): boolean {
  if (typeof window === 'undefined' || !isMonetagConfigured()) return false;
  return typeof window[showFnName()] === 'function';
}

/**
 * Wait for Monetag SDK to become available if still loading.
 */
export function waitForMonetagSdk(timeoutMs = 3000): Promise<boolean> {
  if (isMonetagReady()) return Promise.resolve(true);
  ensureMonetagSdk();

  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (isMonetagReady()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval);
        resolve(isMonetagReady());
      }
    }, 100);
  });
}

/**
 * Directly invoke the real Monetag Interstitial/Rewarded ad format.
 */
export async function triggerRealMonetagAd(): Promise<{ success: boolean; error?: string }> {
  if (!isMonetagConfigured()) {
    return { success: false, error: 'No Monetag zone ID configured (VITE_MONETAG_ZONE_ID).' };
  }
  try {
    const ready = await waitForMonetagSdk(2500);
    if (!ready || typeof window[showFnName()] !== 'function') {
      return { success: false, error: 'Monetag SDK not loaded yet' };
    }
    await window[showFnName()]();
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Monetag execution returned:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Safely shows an alert in the Telegram WebApp without triggering
 * 'Method showPopup is not supported in version 6.0' on old clients.
 */
export function safeTelegramAlert(message: string): void {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.2') && typeof tg.showAlert === 'function') {
      tg.showAlert(message);
    }
  } catch {
    // Ignore any Telegram alert errors
  }
}
