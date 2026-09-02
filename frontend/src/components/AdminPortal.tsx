import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Smartphone,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  PlusCircle,
  FileSpreadsheet,
  IndianRupee,
  ChevronLeft,
  Info,
  Send,
  AlertCircle,
  Lock,
  Users,
  UserCheck,
  UserPlus,
  Gamepad2,
  Trophy,
  TrendingUp,
  Activity,
  Phone,
  Wallet,
  Sparkles
} from 'lucide-react';
import { WithdrawalRecord, RegisteredUser } from '../types';
import { sounds } from '../utils/audio';

interface AdminPortalProps {
  withdrawals: WithdrawalRecord[];
  users: RegisteredUser[];
  onMarkPaid: (id: string, utrNumber: string) => Promise<void>;
  onRejectWithdrawal: (id: string, reason: string) => Promise<void>;
  onBackToHome: () => void;
  onLockAdmin?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  withdrawals,
  users = [],
  onMarkPaid,
  onRejectWithdrawal,
  onBackToHome,
  onLockAdmin,
}) => {
  // Main view: 'payouts' or 'users'
  const [adminSection, setAdminSection] = useState<'payouts' | 'users'>('payouts');

  // Withdrawal filters
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'rejected' | 'upi' | 'bank'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedFullId, setCopiedFullId] = useState<string | null>(null);

  // User filters
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'online' | 'active' | 'referrals'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Selected item for payment modal
  const [activePaymentModal, setActivePaymentModal] = useState<WithdrawalRecord | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState<string>('');

  // Selected item for reject modal
  const [activeRejectModal, setActiveRejectModal] = useState<WithdrawalRecord | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Incorrect UPI ID or Bank Details');
  const [adminCustomMessage, setAdminCustomMessage] = useState<string>('');

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sounds.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Full formatted text
  const handleCopyFull = (record: WithdrawalRecord) => {
    const isUpi = record.payoutType === 'upi' || record.routingCode === 'UPI-VPA';
    const text = `--- WORM WITHDRAWAL PAYOUT ---
Beneficiary: ${record.accountHolder}
Amount: ₹${record.amount.toFixed(2)} INR
Method: ${isUpi ? 'UPI' : 'Bank IMPS/NEFT'}
${isUpi ? `UPI ID: ${record.upiId || record.accountNumber}` : `Bank Name: ${record.bankName}\nAccount No: ${record.accountNumber}\nIFSC Code: ${record.ifscCode || record.routingCode}`}
Reference ID: ${record.referenceId}
Date: ${record.createdAt}
-----------------------------`;

    navigator.clipboard.writeText(text);
    setCopiedFullId(record.id);
    sounds.playClick();
    setTimeout(() => setCopiedFullId(null), 2000);
  };

  // Stats calculation
  const pendingRecords = withdrawals.filter((w) => w.status === 'pending');
  const completedRecords = withdrawals.filter((w) => w.status === 'completed');
  const rejectedRecords = withdrawals.filter((w) => w.status === 'rejected');
  const totalPendingAmount = pendingRecords.reduce((sum, w) => sum + w.amount, 0);
  const totalCompletedAmount = completedRecords.reduce((sum, w) => sum + w.amount, 0);
  const totalRejectedAmount = rejectedRecords.reduce((sum, w) => sum + w.amount, 0);

  // User Stats Calculation
  const totalUsersCount = users.length;
  const onlineUsersCount = users.filter((u) => u.status === 'online').length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const referralUsersCount = users.filter((u) => u.isReferral).length;
  const totalGamesPlayedAllUsers = users.reduce((sum, u) => sum + u.totalGames, 0);
  const totalUserBalancesCombined = users.reduce((sum, u) => sum + u.balance, 0);
  const totalUserEarningsCombined = users.reduce((sum, u) => sum + u.totalEarned, 0);

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((item) => {
    const isUpi = item.payoutType === 'upi' || item.routingCode === 'UPI-VPA';
    if (filterTab === 'pending' && item.status !== 'pending') return false;
    if (filterTab === 'completed' && item.status !== 'completed') return false;
    if (filterTab === 'rejected' && item.status !== 'rejected') return false;
    if (filterTab === 'upi' && !isUpi) return false;
    if (filterTab === 'bank' && isUpi) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHolder = item.accountHolder.toLowerCase().includes(q);
      const matchAcc = item.accountNumber.toLowerCase().includes(q);
      const matchRef = item.referenceId.toLowerCase().includes(q);
      const matchBank = item.bankName.toLowerCase().includes(q);
      const matchUpi = (item.upiId || '').toLowerCase().includes(q);
      return matchHolder || matchAcc || matchRef || matchBank || matchUpi;
    }
    return true;
  });

  // Filtered Users
  const filteredUsers = users.filter((user) => {
    if (userFilterTab === 'online' && user.status !== 'online') return false;
    if (userFilterTab === 'active' && user.status !== 'active') return false;
    if (userFilterTab === 'referrals' && !user.isReferral) return false;

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchUsername = user.username.toLowerCase().includes(q);
      const matchPhone = (user.phoneNumber || '').toLowerCase().includes(q);
      const matchUpi = (user.upiOrBank || '').toLowerCase().includes(q);
      return matchName || matchUsername || matchPhone || matchUpi;
    }
    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    sounds.playClick();
    if (adminSection === 'payouts') {
      const headers = ['Reference ID', 'Date', 'Beneficiary', 'Method', 'UPI ID / Account', 'IFSC / Bank', 'Amount (INR)', 'Status', 'UTR Number'];
      const rows = withdrawals.map((w) => [
        w.referenceId,
        w.createdAt,
        `"${w.accountHolder}"`,
        w.payoutType === 'upi' || w.routingCode === 'UPI-VPA' ? 'UPI' : 'Bank IMPS',
        `"${w.upiId || w.accountNumber}"`,
        `"${w.ifscCode || w.bankName}"`,
        w.amount.toFixed(2),
        w.status,
        w.utrNumber || ''
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `worm_withdrawals_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['User ID', 'Name', 'Telegram Username', 'Phone', 'Joined Date', 'Games Played', 'Wins', 'Balance (INR)', 'Total Earned (INR)', 'Total Withdrawn (INR)', 'Status', 'UPI/Bank'];
      const rows = users.map((u) => [
        u.id,
        `"${u.name}"`,
        u.username,
        `"${u.phoneNumber || ''}"`,
        u.joinedDate,
        u.totalGames,
        u.wins,
        u.balance.toFixed(2),
        u.totalEarned.toFixed(2),
        u.totalWithdrawn.toFixed(2),
        u.status,
        `"${u.upiOrBank || ''}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `worm_users_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleConfirmPaid = async () => {
    if (!activePaymentModal) return;
    if (!utrInput.trim()) {
      setConfirmError('Enter the UTR/reference number from the transfer you just sent.');
      return;
    }
    setIsApproving(true);
    setConfirmError(null);
    try {
      await onMarkPaid(activePaymentModal.id, utrInput.trim());
      sounds.playWin();
      setActivePaymentModal(null);
      setUtrInput('');
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Could not save. You can retry.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeRejectModal) return;
    const finalReason = rejectReason.trim() || 'Declined by administrator';
    try {
      await onRejectWithdrawal(activeRejectModal.id, finalReason);
      sounds.playLoss();
      setActiveRejectModal(null);
      setAdminCustomMessage('');
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Reject failed. Please retry.');
    }
  };

  const handleOpenRejectModal = (record: WithdrawalRecord) => {
    sounds.playClick();
    setActiveRejectModal(record);
    setRejectReason('Incorrect UPI ID or Bank Details');
    setAdminCustomMessage(`Your payout request of ₹${record.amount.toFixed(2)} could not be processed due to incorrect payment details. The amount of ₹${record.amount.toFixed(2)} has been refunded to your wallet.`);
  };

  // (Sample/test user generator removed — the registered-user list now
  // comes from real accounts created automatically the first time someone
  // opens the Mini App inside Telegram; see backend GET /api/admin/users.)

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            sounds.playClick();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white font-display uppercase tracking-wider">
              Worm Admin Panel
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>mamuanteiamanda@gmail.com</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          {onLockAdmin && (
            <button
              onClick={() => {
                sounds.playClick();
                onLockAdmin();
              }}
              title="Lock Admin Mode"
              className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-1.5 rounded-xl hover:bg-rose-500/20 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Section Switcher (Payouts vs Users Count) */}
      <div className="flex p-1 bg-[#020617] rounded-2xl border border-slate-800 shadow-inner">
        <button
          onClick={() => {
            sounds.playClick();
            setAdminSection('payouts');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            adminSection === 'payouts'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Payout Requests</span>
          {pendingRecords.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                adminSection === 'payouts' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {pendingRecords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setAdminSection('users');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            adminSection === 'users'
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black shadow-lg shadow-sky-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users & Players</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              adminSection === 'users' ? 'bg-white text-sky-700' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}
          >
            {totalUsersCount}
          </span>
        </button>
      </div>

      {/* Top Metrics Dashboard */}
      <div className="grid grid-cols-4 gap-2">
        {/* Total Users Metric Card */}
        <div
          onClick={() => {
            sounds.playClick();
            setAdminSection('users');
          }}
          className={`cursor-pointer rounded-2xl p-2.5 border transition ${
            adminSection === 'users'
              ? 'bg-gradient-to-br from-sky-500/20 via-slate-900 to-slate-950 border-sky-500/50 shadow-md shadow-sky-500/10'
              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1 uppercase tracking-wider">
              <Users className="w-3 h-3 text-sky-400" />
              Users
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online users" />
          </div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {totalUsersCount}
          </div>
          <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">
            {onlineUsersCount} online
          </div>
        </div>

        {/* Pending Payouts Card */}
        <div
          onClick={() => {
            sounds.playClick();
            setAdminSection('payouts');
            setFilterTab('pending');
          }}
          className={`cursor-pointer rounded-2xl p-2.5 border transition ${
            adminSection === 'payouts' && filterTab === 'pending'
              ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-amber-500/50 shadow-md shadow-amber-500/10'
              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider">
              <Clock className="w-3 h-3 text-amber-400" />
              Pending
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1 rounded">
              {pendingRecords.length}
            </span>
          </div>
          <div className="text-base font-black text-white font-mono mt-1">
            ₹{totalPendingAmount.toFixed(0)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Needs Pay</div>
        </div>

        {/* Total Settled Card */}
        <div
          onClick={() => {
            sounds.playClick();
            setAdminSection('payouts');
            setFilterTab('completed');
          }}
          className={`cursor-pointer rounded-2xl p-2.5 border transition ${
            adminSection === 'payouts' && filterTab === 'completed'
              ? 'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border-emerald-500/50 shadow-md shadow-emerald-500/10'
              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Paid
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1 rounded">
              {completedRecords.length}
            </span>
          </div>
          <div className="text-base font-black text-white font-mono mt-1">
            ₹{totalCompletedAmount.toFixed(0)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Settled</div>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => {
            sounds.playClick();
            setAdminSection('payouts');
            setFilterTab('rejected');
          }}
          className={`cursor-pointer rounded-2xl p-2.5 border transition ${
            adminSection === 'payouts' && filterTab === 'rejected'
              ? 'bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-950 border-rose-500/50 shadow-md shadow-rose-500/10'
              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-300 flex items-center gap-1 uppercase tracking-wider">
              <XCircle className="w-3 h-3 text-rose-400" />
              Rejected
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1 rounded">
              {rejectedRecords.length}
            </span>
          </div>
          <div className="text-base font-black text-white font-mono mt-1">
            ₹{totalRejectedAmount.toFixed(0)}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Refunded</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PAYOUTS LEDGER */}
      {/* ========================================================================= */}
      {adminSection === 'payouts' && (
        <div className="space-y-4">
          {/* Guide Banner for Admin */}
          <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl flex items-start gap-2.5 text-xs text-sky-200">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>How to send money to players:</strong>
              <div className="text-[11px] text-slate-300 mt-0.5">
                1. Copy user's <strong>UPI ID</strong> or <strong>Bank Account + IFSC</strong>.<br />
                2. Open your <strong>Google Pay / PhonePe / Paytm / Netbanking</strong> and send the exact INR amount.<br />
                3. Tap <strong>"Mark as Paid"</strong> to notify the player and close the request.
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, UPI ID, account, or ref..."
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
              {[
                { id: 'pending', label: `Pending (${pendingRecords.length})` },
                { id: 'all', label: `All (${withdrawals.length})` },
                { id: 'rejected', label: `Rejected (${rejectedRecords.length})` },
                { id: 'upi', label: 'UPI only' },
                { id: 'bank', label: 'Bank IMPS only' },
                { id: 'completed', label: `Paid (${completedRecords.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    sounds.playClick();
                    setFilterTab(tab.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition ${
                    filterTab === tab.id
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Withdrawal count header (test-data generator removed — real
              withdrawal requests only, sourced from the backend) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {filteredWithdrawals.length} Withdrawal Request{filteredWithdrawals.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Withdrawal Request Cards */}
          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-6">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-300">No withdrawal requests found</div>
              <div className="text-xs text-slate-500 mt-1">
                {filterTab === 'pending'
                  ? 'Great job! All player payout requests have been settled.'
                  : 'Try changing your search query or filter criteria.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((record) => {
                const isUpi = record.payoutType === 'upi' || record.routingCode === 'UPI-VPA';
                const isPending = record.status === 'pending';
                const upiTarget = record.upiId || record.accountNumber;
                const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiTarget)}&pn=${encodeURIComponent(record.accountHolder)}&am=${record.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Worm Earnings Payout ${record.referenceId}`)}`;

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[#0f172a] border rounded-2xl p-4 shadow-xl flex flex-col gap-3 transition ${
                      isPending
                        ? 'border-amber-500/40 bg-gradient-to-br from-[#0f172a] to-[#1e1b18]'
                        : record.status === 'rejected'
                        ? 'border-rose-500/30 bg-gradient-to-br from-[#0f172a] to-[#1e1215]'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header: Type, Status, and Amount */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isUpi
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isUpi ? <Smartphone className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{isUpi ? 'UPI Transfer' : 'Bank IMPS / NEFT'}</span>
                            <span className="text-[10px] text-slate-500 font-mono">#{record.referenceId}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{record.createdAt}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-white font-mono">
                          ₹{record.amount.toFixed(2)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            record.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : record.status === 'rejected'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : record.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {record.status === 'pending'
                            ? 'Needs Payment'
                            : record.status === 'rejected'
                            ? 'Rejected & Refunded'
                            : 'Paid & Settled'}
                        </span>
                      </div>
                    </div>

                    {/* Beneficiary Details Section */}
                    <div className="bg-[#020617]/80 rounded-xl p-3 border border-slate-850 space-y-2 text-xs">
                      {/* Beneficiary Name */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Beneficiary Name:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-sans">{record.accountHolder}</span>
                          <button
                            onClick={() => handleCopy(record.accountHolder, `name-${record.id}`)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                            title="Copy Name"
                          >
                            {copiedId === `name-${record.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* UPI Details */}
                      {isUpi ? (
                        <div className="flex items-center justify-between bg-sky-950/30 p-2 rounded-lg border border-sky-900/40">
                          <div>
                            <span className="text-[10px] text-sky-300 font-bold block uppercase tracking-wider">
                              UPI ID (VPA)
                            </span>
                            <span className="font-mono font-bold text-white text-xs select-all">
                              {upiTarget}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopy(upiTarget, `upi-${record.id}`)}
                              className="flex items-center gap-1 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-2 py-1 rounded-md text-[11px] font-bold transition border border-sky-500/30"
                            >
                              {copiedId === `upi-${record.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy UPI</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Bank Account & IFSC Details */
                        <div className="space-y-1.5 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Bank:</span>
                            <span className="font-semibold text-slate-200">{record.bankName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Account Number:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white select-all">{record.accountNumber}</span>
                              <button
                                onClick={() => handleCopy(record.accountNumber, `acc-${record.id}`)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                              >
                                {copiedId === `acc-${record.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">IFSC Code:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-300 uppercase select-all">
                                {record.ifscCode || record.routingCode}
                              </span>
                              <button
                                onClick={() => handleCopy(record.ifscCode || record.routingCode, `ifsc-${record.id}`)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                              >
                                {copiedId === `ifsc-${record.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment settlement timestamp & UTR */}
                      {record.status === 'completed' && record.utrNumber && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                          <span className="text-slate-400">UTR / Ref:</span>
                          <span className="font-mono text-emerald-400 font-bold">{record.utrNumber}</span>
                        </div>
                      )}

                      {/* Rejection Details with Admin Message */}
                      {record.status === 'rejected' && (
                        <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/50 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              Rejection Reason:
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {record.rejectedAt || record.createdAt}
                            </span>
                          </div>
                          <div className="text-xs text-rose-200 font-medium">
                            {record.rejectionReason || 'Declined by administrator'}
                          </div>
                          {record.adminMessage && (
                            <div className="text-[11px] text-slate-300 bg-black/40 p-2 rounded-lg border border-rose-900/40">
                              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Admin Message to Player:</span>
                              "{record.adminMessage}"
                            </div>
                          )}
                          <div className="text-[10px] text-emerald-400 font-semibold pt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>₹{record.amount.toFixed(2)} refunded back to user's wallet</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Copy All Details Button */}
                      <button
                        onClick={() => handleCopyFull(record)}
                        className="flex-1 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                      >
                        {copiedFullId === record.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied All</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>

                      {/* UPI Direct App Launch (Mobile friendly) */}
                      {isUpi && isPending && (
                        <a
                          href={upiDeepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-sky-600/20 transition"
                          title="Open in UPI App (GPay/PhonePe)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open UPI</span>
                        </a>
                      )}

                      {/* Mark as Paid / Reject / Reopen Buttons */}
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleOpenRejectModal(record)}
                            className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-98"
                            title="Reject and refund coins to player"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setActivePaymentModal(record);
                              setConfirmError(null);
                            }}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 transition active:scale-98"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: USERS & PLAYERS DIRECTORY & HOW MUCH USERS THERE ARE */}
      {/* ========================================================================= */}
      {adminSection === 'users' && (
        <div className="space-y-4">
          {/* User Base Statistics Banner */}
          <div className="bg-gradient-to-br from-[#0f172a] via-[#0b132b] to-[#020617] border border-sky-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-display">User Base Overview</h3>
                  <p className="text-[10px] text-slate-400">Active Worm Player Community</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-sky-400 font-mono leading-none">
                  {totalUsersCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block">Total Players</span>
              </div>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
              <div className="bg-[#020617]/70 p-2.5 rounded-xl border border-slate-800/70">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    Online Now:
                  </span>
                  <strong className="text-emerald-400 font-mono font-bold">{onlineUsersCount}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] mt-1.5">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-sky-400" />
                    Active Members:
                  </span>
                  <strong className="text-sky-300 font-mono font-bold">{activeUsersCount}</strong>
                </div>
              </div>

              <div className="bg-[#020617]/70 p-2.5 rounded-xl border border-slate-800/70">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-amber-400" />
                    Games Played:
                  </span>
                  <strong className="text-amber-300 font-mono font-bold">{totalGamesPlayedAllUsers}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] mt-1.5">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-purple-400" />
                    Wallets Held:
                  </span>
                  <strong className="text-purple-300 font-mono font-bold">₹{totalUserBalancesCombined.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* User Search & Filter Pills */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, @handle, or phone..."
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
              {[
                { id: 'all', label: `All Users (${totalUsersCount})` },
                { id: 'online', label: `Online (${onlineUsersCount})` },
                { id: 'active', label: `Active (${activeUsersCount})` },
                { id: 'referrals', label: `Referrals (${referralUsersCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    sounds.playClick();
                    setUserFilterTab(tab.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition ${
                    userFilterTab === tab.id
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Action Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {filteredUsers.length} Player Profile{filteredUsers.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* User List Cards */}
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-6">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-300">No users match your filter</div>
              <div className="text-xs text-slate-500 mt-1">Try clearing your search query or switching filters.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user, idx) => {
                const winRate = user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-col gap-2.5 hover:border-slate-700 transition"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                          />
                          <span
                            className={`w-3 h-3 rounded-full border-2 border-[#0f172a] absolute -bottom-0.5 -right-0.5 ${
                              user.status === 'online'
                                ? 'bg-emerald-400'
                                : user.status === 'active'
                                ? 'bg-sky-400'
                                : 'bg-slate-500'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{user.name}</span>
                            {user.isReferral && (
                              <span className="text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                                Ref
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-sky-400 font-mono">{user.username}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          ₹{user.balance.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Wallet Balance</span>
                      </div>
                    </div>

                    {/* Stats Pill Row */}
                    <div className="grid grid-cols-3 gap-1.5 bg-[#020617]/70 p-2 rounded-xl border border-slate-850 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Games</span>
                        <span className="text-xs font-mono font-bold text-white">{user.totalGames} ({winRate}%)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Won</span>
                        <span className="text-xs font-mono font-bold text-amber-300">₹{user.totalEarned.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Withdrawn</span>
                        <span className="text-xs font-mono font-bold text-slate-300">₹{user.totalWithdrawn.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Footer Info: Phone, Joined & Payout Details */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span className="font-mono text-slate-300">{user.phoneNumber || 'Telegram Verified'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Joined {user.joinedDate}</span>
                    </div>

                    {user.upiOrBank && (
                      <div className="bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Payout ID:</span>
                        <span className="font-mono text-sky-300 font-semibold select-all">{user.upiOrBank}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MARK AS PAID MODAL */}
      {activePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center gap-2.5 text-emerald-400">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Mark Withdrawal as Paid</h3>
            </div>

            <div className="p-3 bg-[#020617] rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">
                Beneficiary: <strong className="text-white">{activePaymentModal.accountHolder}</strong>
              </div>
              <div className="text-slate-400">
                Amount:{' '}
                <strong className="text-emerald-400 font-mono text-sm">
                  ₹{activePaymentModal.amount.toFixed(2)} INR
                </strong>
              </div>
              <div className="text-slate-400">
                Target:{' '}
                <span className="font-mono text-sky-300">
                  {activePaymentModal.upiId || activePaymentModal.accountNumber}
                </span>
              </div>
              {activePaymentModal.ifscCode && (
                <div className="text-slate-400">
                  IFSC: <span className="font-mono text-sky-300">{activePaymentModal.ifscCode}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              First, actually send ₹{activePaymentModal.amount.toFixed(2)} to this player from your
              own UPI/banking app. <strong>Only then</strong> enter the real UTR/reference number
              below to mark it paid.
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                UTR / UPI Transaction Reference
              </label>
              <input
                type="text"
                value={utrInput}
                onChange={(e) => { setUtrInput(e.target.value); if (confirmError) setConfirmError(null); }}
                placeholder="e.g. 423891024819"
                className="w-full bg-[#020617] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {confirmError && (
              <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-lg px-3 py-2">
                {confirmError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setActivePaymentModal(null); setConfirmError(null); setUtrInput(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                disabled={isApproving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isApproving ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* REJECT & REFUND WITHDRAWAL MODAL */}
      {activeRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0f172a] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Reject Withdrawal</h3>
                <p className="text-[11px] text-slate-400">Refund ₹{activeRejectModal.amount.toFixed(2)} to player wallet</p>
              </div>
            </div>

            {/* Target Information */}
            <div className="p-3 bg-[#020617] rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Player Name:</span>
                <strong className="text-white">{activeRejectModal.accountHolder}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Amount to Refund:</span>
                <strong className="text-amber-400 font-mono text-sm font-bold">
                  ₹{activeRejectModal.amount.toFixed(2)} INR
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Destination:</span>
                <span className="font-mono text-sky-300">
                  {activeRejectModal.upiId || activeRejectModal.accountNumber}
                </span>
              </div>
            </div>

            {/* Rejection Reason Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Select Rejection Reason:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Incorrect UPI ID or Bank Details',
                  'Account Holder Name Mismatch',
                  'Suspected Duplicate Withdrawal',
                  'Bank Server Failure / Transaction Bounced',
                  'Account Under Review / Policy Violation',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setRejectReason(reason);
                      setAdminCustomMessage(`Your payout request of ₹${activeRejectModal.amount.toFixed(2)} was rejected due to: "${reason}". The full amount of ₹${activeRejectModal.amount.toFixed(2)} has been refunded to your wallet. Please verify your payment details and request again.`);
                    }}
                    className={`p-2 rounded-lg text-left text-xs transition border ${
                      rejectReason === reason
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-200 font-semibold shadow-sm'
                        : 'bg-[#020617] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Admin Message to User */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Message for Player (Shown in Wallet):
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Editable</span>
              </div>
              <textarea
                value={adminCustomMessage}
                onChange={(e) => setAdminCustomMessage(e.target.value)}
                rows={3}
                placeholder="Enter explanation or instructions for the player..."
                className="w-full bg-[#020617] border border-slate-800 rounded-xl p-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
              />
              <div className="text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>₹{activeRejectModal.amount.toFixed(2)} will be immediately credited back to the user's wallet.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 active:scale-98"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject & Refund</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
