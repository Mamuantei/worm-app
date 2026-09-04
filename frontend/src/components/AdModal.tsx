import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  Play,
  Lock,
  CheckCircle2,
  Radio,
  ExternalLink,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { isMonetagReady, waitForMonetagSdk, triggerRealMonetagAd, MONETAG_ZONE_ID } from '../utils/monetag';
import { AD_CREATIVES } from '../utils/storage';
import { AdCreative } from '../types';

interface AdModalProps {
  isOpen: boolean;
  onAdComplete: () => void;
  onClose: () => void;
}

const MANDATORY_SECONDS = 5;

export const AdModal: React.FC<AdModalProps> = ({ isOpen, onAdComplete, onClose }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(MANDATORY_SECONDS);
  const [isAdCompleted, setIsAdCompleted] = useState<boolean>(false);
  const [isCallingRealAd, setIsCallingRealAd] = useState<boolean>(false);
  const [realAdPlayed, setRealAdPlayed] = useState<boolean>(false);
  const [monetagState, setMonetagState] = useState<'checking' | 'loaded' | 'showing' | 'finished' | 'blocked'>('checking');
  const [currentCreative, setCurrentCreative] = useState<AdCreative>(AD_CREATIVES[0]);

  const hasTriggeredRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);

  // Initialize and run Monetag + timer
  useEffect(() => {
    if (!isOpen) {
      hasTriggeredRef.current = false;
      completedRef.current = false;
      setIsAdCompleted(false);
      setSecondsRemaining(MANDATORY_SECONDS);
      setIsCallingRealAd(false);
      setRealAdPlayed(false);
      return;
    }

    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    completedRef.current = false;
    setIsAdCompleted(false);
    setSecondsRemaining(MANDATORY_SECONDS);
    setMonetagState('checking');

    // Pick random real sponsor creative
    const randomAd = AD_CREATIVES[Math.floor(Math.random() * AD_CREATIVES.length)];
    setCurrentCreative(randomAd);

    // 1. Immediately launch your real Monetag Interstitial Ad (uses whatever
    //    zone ID you set in frontend/.env as VITE_MONETAG_ZONE_ID)
    (async () => {
      setIsCallingRealAd(true);
      const isReady = await waitForMonetagSdk(1800);

      if (isReady) {
        setMonetagState('showing');
        try {
          // Trigger the actual Monetag ad function provided by https://libtl.com/sdk.js
          const result = await triggerRealMonetagAd();
          if (!result.success) throw new Error(result.error || 'Ad did not complete');
          setRealAdPlayed(true);
          setMonetagState('finished');
          if (!completedRef.current) {
            completedRef.current = true;
            setIsAdCompleted(true);
            setSecondsRemaining(0);
            sounds.playAdComplete();
          }
        } catch (err) {
          console.warn('Monetag ad returned/dismissed:', err);
          setMonetagState('loaded');
        } finally {
          setIsCallingRealAd(false);
        }
      } else {
        // No zone ID configured yet, or the SDK is ad-blocked / slow network
        setMonetagState('blocked');
        setIsCallingRealAd(false);
      }
    })();

    // 2. Strict timer ensures the user stays and watches the ad for at least MANDATORY_SECONDS
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            setIsAdCompleted(true);
            sounds.playAdComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = Math.min(
    100,
    Math.round(((MANDATORY_SECONDS - secondsRemaining) / MANDATORY_SECONDS) * 100)
  );

  const handleStartGame = () => {
    if (!isAdCompleted) return;
    sounds.playClick();
    onAdComplete();
  };

  const handleLaunchMonetagAdManually = async () => {
    sounds.playClick();
    setIsCallingRealAd(true);
    const res = await triggerRealMonetagAd();
    setIsCallingRealAd(false);
    if (res.success) {
      setRealAdPlayed(true);
      setMonetagState('finished');
      if (!completedRef.current) {
        completedRef.current = true;
        setIsAdCompleted(true);
        setSecondsRemaining(0);
        sounds.playAdComplete();
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#020617] border border-slate-700/80 shadow-2xl text-slate-100 flex flex-col"
        >
          {/* Header Bar */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#020617]/70">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                  {realAdPlayed ? 'Monetag Real Network Ad' : 'Match Unlock'}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {realAdPlayed ? `Zone ID: ${MONETAG_ZONE_ID}` : 'Ad unavailable — timed unlock'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isAdCompleted ? (
                realAdPlayed ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Ad Verified</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-slate-400" />
                    <span>Unlocked</span>
                  </span>
                )
              ) : (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                  <span>{secondsRemaining}s remaining</span>
                </span>
              )}

              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Exit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ad Creative Card Body */}
          <div className="p-4 flex flex-col gap-3.5">
            {/* Live Real Monetag SDK Trigger Status Banner */}
            <div className="rounded-2xl p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{realAdPlayed ? 'Monetag Rewarded Stream' : 'Unlocking Match'}</span>
                    {realAdPlayed && (
                      <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                        DELIVERED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isCallingRealAd
                      ? 'Loading live Monetag interstitial…'
                      : isAdCompleted && realAdPlayed
                      ? 'Ad watched — match unlocked'
                      : isAdCompleted
                      ? 'No ad available right now — unlocked by timer'
                      : 'Waiting for ad network…'}
                  </div>
                </div>
              </div>

              {/* Direct Click to re-invoke Real Ad Script */}
              {!isAdCompleted && (
                <button
                  onClick={handleLaunchMonetagAdManually}
                  disabled={isCallingRealAd}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-bold shadow-md flex items-center gap-1 transition shrink-0"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>{isCallingRealAd ? 'Loading...' : 'Show Real Ad'}</span>
                </button>
              )}
            </div>

            {/* Sponsored Content Banner */}
            <div
              className={`relative rounded-2xl p-4 bg-gradient-to-br ${currentCreative.bannerGradient} border border-white/20 shadow-xl overflow-hidden flex flex-col justify-between min-h-[145px]`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white border border-white/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{currentCreative.badge}</span>
                </span>
                <span className="text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {currentCreative.category}
                </span>
              </div>

              <div className="relative z-10 mt-3">
                <div className="text-[11px] font-bold text-sky-200 uppercase tracking-wide">
                  {currentCreative.sponsor}
                </div>
                <h4 className="text-base font-black text-white font-display leading-snug drop-shadow-sm">
                  {currentCreative.title}
                </h4>
                <p className="mt-1 text-[11px] text-white/90 line-clamp-2 leading-relaxed font-medium">
                  {currentCreative.tagline}
                </p>
              </div>

              {/* Status Badge — honest about whether this is a real ad or filler */}
              <div className="relative z-10 mt-2 flex items-center justify-between text-[10px] text-white/80 pt-2 border-t border-white/15">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{realAdPlayed ? 'Delivered via Monetag' : 'Placeholder — no ad network configured'}</span>
                </span>
                {realAdPlayed && (
                  <span className="font-bold underline cursor-pointer hover:text-white flex items-center gap-0.5">
                    <span>{currentCreative.ctaText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>

            {/* Live Progress Bar & Status */}
            <div className="p-3 rounded-2xl bg-[#020617] border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  {isAdCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Ad Finished — Match Ready!</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      <span>Watching Ad ({secondsRemaining}s required)...</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-xs font-bold text-sky-400">
                  {isAdCompleted ? '100%' : `${progressPercent}%`}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                <motion.div
                  className={`h-full transition-all duration-300 ${
                    isAdCompleted
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                      : 'bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400'
                  }`}
                  style={{ width: `${isAdCompleted ? 100 : progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Play Match Reward:</span>
                <span className="font-mono font-bold text-emerald-400">+₹0.10 Play + ₹0.10 Win / ₹0.50 Tie</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                id="ad-modal-start-btn"
                type="button"
                disabled={!isAdCompleted}
                onClick={handleStartGame}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${
                  isAdCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 active:scale-95 cursor-pointer animate-pulse'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }`}
              >
                {isAdCompleted ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>START MATCH NOW</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Please Watch Full Ad ({secondsRemaining}s)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onClose();
                }}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Cancel & Return Home
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
