import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, UserWallet, WithdrawalRecord, ReferralUser, RegisteredUser } from './types';
import { getSoundPreference, saveSoundPreference } from './utils/storage';
import { sounds } from './utils/audio';
import { ensureMonetagSdk } from './utils/monetag';
import { api, adminRequest } from './utils/api';

import { TelegramHeader } from './components/TelegramHeader';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { WalletScreen } from './components/WalletScreen';
import { ReferralScreen } from './components/ReferralScreen';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdModal } from './components/AdModal';
import { GuideModal } from './components/GuideModal';
import { Navigation } from './components/Navigation';

const EMPTY_WALLET: UserWallet = {
  balance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
  referralEarnings: 0,
  totalGames: 0,
  wins: 0,
  draws: 0,
  losses: 0,
};

// The backend doesn't track bankName/routingCode/referenceId separately —
// they're derived here purely for display, so the existing WalletScreen /
// AdminPortal UI (which was built around that shape) keeps working.
function toDisplayRecord(w: any): WithdrawalRecord {
  return {
    id: w.id,
    amount: w.amount,
    payoutType: w.payoutType,
    bankName: w.payoutType === 'upi' ? 'UPI Transfer' : (w.bankName || 'Bank Transfer'),
    accountHolder: w.accountHolder,
    accountNumber: w.accountNumber,
    routingCode: w.payoutType === 'upi' ? 'UPI-VPA' : (w.ifscCode || ''),
    upiId: w.upiId,
    ifscCode: w.ifscCode,
    status: w.status,
    createdAt: w.createdAt,
    paidAt: w.paidAt,
    rejectedAt: w.rejectedAt,
    referenceId: w.id,
    utrNumber: w.utrNumber,
    rejectionReason: w.rejectionReason,
  };
}

const ADMIN_TOKEN_KEY = 'worm_admin_token';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [wallet, setWallet] = useState<UserWallet>(EMPTY_WALLET);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isMatchUnlocked, setIsMatchUnlocked] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(getSoundPreference);

  const isAdminUnlocked = Boolean(adminToken);
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  // Load the signed-in user's wallet + withdrawals from the backend on start
  useEffect(() => {
    (async () => {
      try {
        // If someone opened the Mini App via a referral link
        // (t.me/YourBot/app?startapp=WORM_ABC123), Telegram passes that
        // code through as start_param — used once to link the new user to
        // whoever referred them.
        const startParam = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.start_param;

        const { user } = await api.getWallet(startParam);
        setWallet({
          balance: user.balance,
          totalEarned: user.totalEarned,
          totalWithdrawn: user.totalWithdrawn,
          referralEarnings: user.referralEarnings,
          totalGames: user.totalGames,
          wins: user.wins,
          draws: user.draws,
          losses: user.losses,
        });
        setReferralCode(user.referralCode);

        const [{ withdrawals: mine }, { referrals: myReferrals }] = await Promise.all([
          api.getWithdrawals(),
          api.getReferrals(),
        ]);
        setWithdrawals(mine.map(toDisplayRecord));
        setReferrals(
          myReferrals.map((r: any) => ({
            id: r.id,
            name: r.name,
            username: r.username,
            avatar: '',
            joinedDate: r.joinedDate,
            gamesPlayed: r.gamesPlayed,
            totalEarnedByRef: r.totalEarnedByRef,
            commissionPaid: r.commissionPaid,
            status: 'active',
          }))
        );
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not reach the server.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    ensureMonetagSdk();
  }, []);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sounds.enabled = next;
      saveSoundPreference(next);
      return next;
    });
  };

  const handleInitiatePlay = () => {
    sounds.playClick();
    setIsMatchUnlocked(false);
    setIsAdModalOpen(true);
  };

  const handleAdComplete = async () => {
    try {
      await api.adComplete();
    } catch {
      // Non-fatal: unlocking the match doesn't depend on this ledger write.
    }
    setIsMatchUnlocked(true);
    setIsAdModalOpen(false);
    setActiveTab('game');
  };

  // The frontend only reports the game RESULT — the reward amount is
  // decided entirely on the server (see backend/src/routes/wallet.js).
  const handleGameComplete = useCallback(async (payout: { result: 'win' | 'draw' | 'loss' }) => {
    try {
      const { user } = await api.gameComplete(payout.result);
      setWallet({
        balance: user.balance,
        totalEarned: user.totalEarned,
        totalWithdrawn: user.totalWithdrawn,
        referralEarnings: user.referralEarnings,
        totalGames: user.totalGames,
        wins: user.wins,
        draws: user.draws,
        losses: user.losses,
      });
    } catch (err) {
      console.error('Failed to record game result:', err);
    }
  }, []);

  const handleWithdraw = async (payload: {
    amount: number;
    payoutType: 'upi' | 'bank';
    accountHolder: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  }) => {
    const { withdrawal, user } = await api.createWithdrawal(payload);
    setWithdrawals((prev) => [toDisplayRecord(withdrawal), ...prev]);
    setWallet({
      balance: user.balance,
      totalEarned: user.totalEarned,
      totalWithdrawn: user.totalWithdrawn,
      referralEarnings: user.referralEarnings,
      totalGames: user.totalGames,
      wins: user.wins,
      draws: user.draws,
      losses: user.losses,
    });
  };

  const refreshAdminData = useCallback(async (token: string) => {
    const [{ users: allUsers }, { withdrawals: allWithdrawals }] = await Promise.all([
      adminRequest('/api/admin/users', token),
      adminRequest('/api/admin/withdrawals', token),
    ]);
    setUsers(
      allUsers.map((u: any) => ({
        id: u.id,
        name: u.firstName || u.username || `User ${u.telegramId}`,
        username: u.username ? `@${u.username}` : '',
        phoneNumber: u.phoneNumber,
        avatar: '',
        joinedDate: new Date(u.createdAt).toLocaleDateString(),
        totalGames: u.totalGames,
        wins: u.wins,
        balance: u.balance,
        totalEarned: u.totalEarned,
        totalWithdrawn: u.totalWithdrawn,
        status: 'active',
      }))
    );
    setWithdrawals(allWithdrawals.map(toDisplayRecord));
  }, []);

  useEffect(() => {
    if (adminToken) refreshAdminData(adminToken).catch(() => setAdminToken(null));
  }, [adminToken, refreshAdminData]);

  const handleMarkPaid = async (id: string, utrNumber: string) => {
    if (!adminToken) return;
    await adminRequest(`/api/admin/withdrawals/${id}/mark-paid`, adminToken, {
      method: 'POST',
      body: JSON.stringify({ utrNumber }),
    });
    await refreshAdminData(adminToken);
  };

  const handleRejectWithdrawal = async (id: string, reason: string) => {
    if (!adminToken) return;
    await adminRequest(`/api/admin/withdrawals/${id}/reject`, adminToken, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await refreshAdminData(adminToken);
  };

  const handleAdminLoginSuccess = (token: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminToken(token);
    setIsAdminLoginModalOpen(false);
    setActiveTab('admin');
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setActiveTab('home');
    sounds.playClick();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400 text-sm">
        Loading your wallet…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-center p-6">
        <div>
          <p className="text-rose-400 font-bold mb-2">Couldn't reach the server</p>
          <p className="text-slate-400 text-sm">{loadError}</p>
          <p className="text-slate-500 text-xs mt-3">
            Check that the backend is running and VITE_API_URL is set correctly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col antialiased selection:bg-sky-500/30">
      <TelegramHeader
        balance={wallet.balance}
        soundEnabled={soundEnabled}
        isAdminUnlocked={isAdminUnlocked}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        onToggleSound={handleToggleSound}
        onOpenWallet={() => setActiveTab('wallet')}
        onOpenAdmin={() => (isAdminUnlocked ? setActiveTab('admin') : setIsAdminLoginModalOpen(true))}
        onTriggerAdminLogin={() => (isAdminUnlocked ? setActiveTab('admin') : setIsAdminLoginModalOpen(true))}
      />

      <main className="flex-1 w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.18 }}>
              <HomeScreen
                wallet={wallet}
                isAdminUnlocked={isAdminUnlocked}
                pendingWithdrawalsCount={pendingWithdrawalsCount}
                onPlayClick={handleInitiatePlay}
                onOpenWallet={() => setActiveTab('wallet')}
                onOpenReferral={() => setActiveTab('referral')}
                onOpenGuide={() => setIsGuideModalOpen(true)}
                onOpenAdmin={() => (isAdminUnlocked ? setActiveTab('admin') : setIsAdminLoginModalOpen(true))}
              />
            </motion.div>
          )}

          {activeTab === 'game' && (
            <motion.div key="game" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18 }}>
              {isMatchUnlocked ? (
                <GameScreen
                  wallet={wallet}
                  onGameComplete={handleGameComplete}
                  onRequireAdForNextMatch={handleInitiatePlay}
                  onBackToHome={() => { setIsMatchUnlocked(false); setActiveTab('home'); }}
                  onOpenWallet={() => { setIsMatchUnlocked(false); setActiveTab('wallet'); }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-[60vh] gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white font-display">Match Locked</h3>
                    <p className="mt-1 text-xs text-slate-400">You must watch a sponsored rewarded ad to unlock and play this match.</p>
                  </div>
                  <button
                    onClick={handleInitiatePlay}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2"
                  >
                    <span>Watch Ad to Unlock</span>
                  </button>
                  <button onClick={() => setActiveTab('home')} className="text-xs text-slate-400 hover:text-slate-200">
                    Back to Home
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
              <WalletScreen
                wallet={wallet}
                withdrawals={withdrawals}
                onWithdraw={handleWithdraw}
                onOpenReferral={() => setActiveTab('referral')}
                onBackToHome={() => setActiveTab('home')}
              />
            </motion.div>
          )}

          {activeTab === 'referral' && (
            <motion.div key="referral" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
              <ReferralScreen
                referralCode={referralCode}
                referrals={referrals}
                totalReferralCommission={wallet.referralEarnings}
                onBackToHome={() => setActiveTab('home')}
              />
            </motion.div>
          )}

          {activeTab === 'admin' && isAdminUnlocked && (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18 }}>
              <AdminPortal
                withdrawals={withdrawals}
                users={users}
                onMarkPaid={handleMarkPaid}
                onRejectWithdrawal={handleRejectWithdrawal}
                onBackToHome={() => setActiveTab('home')}
                onLockAdmin={handleLockAdmin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AdModal isOpen={isAdModalOpen} onAdComplete={handleAdComplete} onClose={() => setIsAdModalOpen(false)} />
      <GuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
      <AdminLoginModal isOpen={isAdminLoginModalOpen} onClose={() => setIsAdminLoginModalOpen(false)} onSuccess={handleAdminLoginSuccess} />

      <Navigation
        activeTab={activeTab}
        isAdminUnlocked={isAdminUnlocked}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        onTabChange={(tab) => {
          if (tab === 'admin' && !isAdminUnlocked) { setIsAdminLoginModalOpen(true); return; }
          setActiveTab(tab);
        }}
        onPlayClick={handleInitiatePlay}
      />
    </div>
  );
}
