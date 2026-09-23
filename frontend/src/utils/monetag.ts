import createAdHandler from 'monetag-tg-sdk';

export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';
const MONETAG_ZONE_NUMBER = Number(MONETAG_ZONE_ID);
const AD_TIMEOUT_MS = 20000;

let adHandler: ReturnType<typeof createAdHandler> | null = null;

function getYmid(): string {
  const userId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return userId ? `tg_${userId}` : `worm_${Date.now()}`;
}

function getAdHandler() {
  if (!MONETAG_ZONE_ID || !Number.isFinite(MONETAG_ZONE_NUMBER) || MONETAG_ZONE_NUMBER <= 0) {
    return null;
  }

  if (!adHandler) {
    adHandler = createAdHandler(MONETAG_ZONE_NUMBER);
  }

  return adHandler;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

export function isMonetagReady(): boolean {
  return Boolean(getAdHandler());
}

/**
 * Show a Monetag Rewarded Interstitial.
 *
 * IMPORTANT:
 * This is intentionally called directly from the user's Play button flow.
 * We do not preload the ad because a preload that never resolves can make
 * the whole reward flow time out before the actual ad request is attempted.
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  const handler = getAdHandler();

  if (!handler) {
    console.warn('[Monetag] Zone ID is not configured.');
    return false;
  }

  try {
    console.log('[Monetag] Requesting Rewarded Interstitial', {
      zone: MONETAG_ZONE_NUMBER,
      ymid: getYmid(),
      telegram: Boolean((window as any)?.Telegram?.WebApp),
    });

    // The official Telegram SDK package documents handler() as the
    // Rewarded Interstitial call. Keep this as the simplest supported path.
    await Promise.race([
      handler(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Monetag ad request timed out')), AD_TIMEOUT_MS)
      ),
    ]);

    console.log('[Monetag] Rewarded Interstitial completed successfully.');
    return true;
  } catch (error) {
    console.error(
      '[Monetag] Rewarded interstitial failed:',
      error instanceof Error ? error.message : error,
      error
    );
    return false;
  }
}
