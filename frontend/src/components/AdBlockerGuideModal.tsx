import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  RefreshCw,
  Chrome,
  Compass,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface AdBlockerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type BrowserTab = 'chrome' | 'brave' | 'mobile' | 'opera';

export const AdBlockerGuideModal: React.FC<AdBlockerGuideModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<BrowserTab>('chrome');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">How to Deactivate AdBlocker</h3>
                <p className="text-[11px] text-amber-300 font-medium">To unlock Monetag ads & reward earnings</p>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Browser Selector Tabs */}
          <div className="p-3 bg-[#020617] border-b border-slate-800 grid grid-cols-4 gap-1.5">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('chrome');
              }}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                activeTab === 'chrome'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Chrome className="w-4 h-4" />
              <span>Chrome/Edge</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('brave');
              }}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                activeTab === 'brave'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Brave Shields</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('mobile');
              }}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                activeTab === 'mobile'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Phone / iOS</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('opera');
              }}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition ${
                activeTab === 'opera'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Opera/Other</span>
            </button>
          </div>

          {/* Guide Steps */}
          <div className="p-4 space-y-3 max-h-[340px] overflow-y-auto text-xs">
            {activeTab === 'chrome' && (
              <div className="space-y-3">
                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">1</span>
                    <span>Click the Extension Icon in toolbar</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Look for your ad blocker (e.g. <b>uBlock Origin, AdBlock Plus, AdGuard</b>) in the top right corner of Chrome or Edge.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Turn OFF or Pause for this site</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Click the big power/toggle button or select <b>"Don't run on pages on this site"</b> / <b>"Pause on this site"</b>.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px]">3</span>
                    <span>Reload the webpage</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Press <b>F5</b> or click the Refresh button to reload with Monetag ads enabled.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'brave' && (
              <div className="space-y-3">
                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">1</span>
                    <span>Click the Lion / Shield Icon</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    In Brave's address bar (right side), click the <b>orange Brave Lion Shield icon</b>.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Switch "Shields UP" to "DOWN"</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Toggle the main switch from <b>Shields are UP</b> to <b>DOWN</b> for this website.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">3</span>
                    <span>Brave auto-refreshes</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    The page will reload automatically and Monetag Rewarded Ads will start displaying.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'mobile' && (
              <div className="space-y-3">
                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                    <span>iPhone / Safari Content Blockers</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Tap the <b>"aA"</b> icon in Safari address bar &rarr; Select <b>"Turn Off Content Blockers"</b> for this site.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Android Chrome & Samsung Internet</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Open browser menu (3 dots) &rarr; Settings &rarr; Site Settings &rarr; Allow Pop-ups & Redirects / Ads.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">3</span>
                    <span>DNS-level Blockers (e.g. AdGuard DNS, NextDNS)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    If using Private DNS in phone settings (<code>dns.adguard.com</code>), temporarily set it to <b>Automatic</b>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'opera' && (
              <div className="space-y-3">
                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">1</span>
                    <span>Click Blue Shield in address bar</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    In Opera's address bar, click the blue shield icon on the right.
                  </p>
                </div>

                <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Toggle Off "Block Ads" for this site</span>
                  </div>
                  <p className="text-slate-400 text-[11px] pl-7">
                    Turn off the switch for this website to add it to your exceptions list.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-200 leading-relaxed">
                <b>Tip:</b> Even if an ad blocker is running, our built-in 5-second countdown sponsor flow will automatically let you unlock and play matches!
              </p>
            </div>
          </div>

          {/* Action footer */}
          <div className="p-4 bg-[#020617] border-t border-slate-800 flex gap-2.5">
            <button
              onClick={() => {
                sounds.playClick();
                if (onRefresh) {
                  onRefresh();
                } else if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="flex-1 py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
