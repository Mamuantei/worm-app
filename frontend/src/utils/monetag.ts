declare global {
  interface Window {
    show_11697097?: () => Promise<unknown>;
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

export const MONETAG_ZONE_ID = '11697097';
export const MONETAG_SDK_URL = 'https://libtl.com/sdk.js';

/**
 * Ensures the Monetag SDK script tag is present in the DOM
 */
export function ensureMonetagSdk(): void {
  if (typeof window === 'undefined') return;

  const existing = document.querySelector(`script[data-zone="${MONETAG_ZONE_ID}"]`);
  if (!existing) {
    const script = document.createElement('script');
    script.src = MONETAG_SDK_URL;
    script.setAttribute('data-zone', MONETAG_ZONE_ID);
    script.setAttribute('data-sdk', `show_${MONETAG_ZONE_ID}`);
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
 * Checks if Monetag SDK is ready to be called
 */
export function isMonetagReady(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.show_11697097 === 'function';
}

/**
 * Wait for Monetag SDK to become available if still loading
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
 * Directly invoke real Monetag Interstitial / Rewarded ad format
 */
export async function triggerRealMonetagAd(): Promise<{ success: boolean; error?: string }> {
  try {
    const ready = await waitForMonetagSdk(2500);
    if (!ready || typeof window.show_11697097 !== 'function') {
      return { success: false, error: 'Monetag SDK not loaded yet' };
    }
    await window.show_11697097();
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Monetag execution returned:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Safely shows alert in Telegram WebApp without triggering 'Method showPopup is not supported in version 6.0'
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
