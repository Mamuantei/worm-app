declare global {
  interface Window {
    [key: string]: any; // Monetag injects a function named `show_<zoneId>`
  }
}

// Your real Monetag zone ID, set in frontend/.env as VITE_MONETAG_ZONE_ID
// (see SETUP.md "Real Ads Setup"). This mirrors exactly the install snippet
// Monetag's dashboard gives you:
//
//   <script src='//libtl.com/sdk.js' data-zone='YOUR_ZONE_ID' data-sdk='show_YOUR_ZONE_ID'></script>
//
export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';

function showFnName(): string {
  return `show_${MONETAG_ZONE_ID}`;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

/**
 * Injects the Monetag SDK script tag once. No-ops if no zone ID is set.
 */
export function ensureMonetagSdk(): void {
  if (typeof window === 'undefined' || !isMonetagConfigured()) return;
  if (document.querySelector(`script[data-zone="${MONETAG_ZONE_ID}"]`)) return;

  const script = document.createElement('script');
  script.src = '//libtl.com/sdk.js';
  script.setAttribute('data-zone', MONETAG_ZONE_ID);
  script.setAttribute('data-sdk', showFnName());
  document.head.appendChild(script);
}

export function isMonetagReady(): boolean {
  return isMonetagConfigured() && typeof window[showFnName()] === 'function';
}

/** Waits (briefly) for the SDK script to finish loading and register its function. */
export function waitForMonetagSdk(timeoutMs = 4000): Promise<boolean> {
  if (isMonetagReady()) return Promise.resolve(true);
  ensureMonetagSdk();

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
