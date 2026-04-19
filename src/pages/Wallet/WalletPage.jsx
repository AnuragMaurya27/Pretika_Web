import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { walletAPI } from '../../api/index';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { useNavigate } from 'react-router-dom';

export default function WalletPage() {
  const { user } = useAuth();
  const { walletBalance, refreshWallet } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [packs, setPacks] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [rechargeModal, setRechargeModal] = useState(false);
  const [withdrawalModal, setWithdrawalModal] = useState(false);
  // FIXED: coin_amount (not coins), min 1000
  const [withdrawalForm, setWithdrawalForm] = useState({ coin_amount: 1000, upi_id: '' });
  const [selectedPack, setSelectedPack] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      walletAPI.getWallet(),
      walletAPI.getRechargePacks(),
    ]).then(([wRes, pRes]) => {
      setWallet(wRes.data?.data);
      setPacks(pRes.data?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    walletAPI.getTransactions(txPage)
      .then((res) => {
        const d = res.data?.data;
        setTransactions(d?.items || d || []);
        setTxTotalPages(d?.total_pages || 1);
      }).catch(() => {});
  }, [user, txPage]);

  useEffect(() => {
    if (activeTab === 'withdrawals' && user) {
      walletAPI.getWithdrawalHistory()
        .then((res) => setWithdrawals(res.data?.data || []))
        .catch(() => {});
    }
  }, [activeTab, user]);

  const handleBuyPack = (pack) => {
    setSelectedPack(pack);
    setRechargeModal(true);
  };

  const handleInitiateRecharge = async () => {
    if (!selectedPack || processing) return;
    setProcessing(true);
    try {
      const res = await walletAPI.initiateRecharge({ pack_id: selectedPack.id });
      const txId = res.data?.data?.transaction_id;
      toast.info('Payment initiate hua. Verify ho raha hai...');
      // FIXED: gateway_transaction_id (not payment_id)
      await walletAPI.verifyRecharge({
        transaction_id: txId,
        gateway_transaction_id: 'demo_gateway_' + Date.now(),
      });
      await refreshWallet();
      const wRes = await walletAPI.getWallet();
      setWallet(wRes.data?.data);
      setRechargeModal(false);
      toast.success(`🪙 ${selectedPack.coins} coins add ho gaye!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recharge fail ho gaya.');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdrawal = async () => {
    // FIXED: coin_amount (not coins), min 1000, payment_method required
    if (withdrawalForm.coin_amount < 1000) {
      toast.error('Minimum 1000 coins chahiye withdrawal ke liye.');
      return;
    }
    if (!withdrawalForm.upi_id.trim()) {
      toast.error('UPI ID required hai.');
      return;
    }
    try {
      await walletAPI.requestWithdrawal({
        coin_amount: withdrawalForm.coin_amount,
        upi_id: withdrawalForm.upi_id,
        payment_method: 'upi',
      });
      toast.success('Withdrawal request bhej di!');
      setWithdrawalModal(false);
      refreshWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal fail ho gayi.');
    }
  };

  if (loading) return <Spinner fullPage />;

  const balance = wallet?.coin_balance ?? walletBalance;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1.25rem' }}>
          🪙 <span style={{ color: 'var(--red-primary)' }}>Mera</span> Wallet
        </h1>

        {/* Balance cards */}
        <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: 'Coin Balance', value: `🪙 ${balance.toLocaleString()}`, sub: `≈ ₹${(balance / 10).toFixed(0)}` },
            { label: 'Total Earned', value: `🪙 ${(wallet?.total_earned || 0).toLocaleString()}`, sub: 'Lifetime earnings' },
            { label: 'Total Spent', value: `🪙 ${(wallet?.total_spent || 0).toLocaleString()}`, sub: 'Lifetime spending' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{s.label}</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{s.value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('recharge')}>
            ⚡ Coins Kharido
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setWithdrawalModal(true)}>
            💸 Withdrawal Request
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'overview', label: '📊 Transactions' },
            { key: 'recharge', label: '⚡ Recharge' },
            { key: 'withdrawals', label: '💸 Withdrawals' },
          ].map((t) => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Transactions */}
        {activeTab === 'overview' && (
          <div>
            {transactions.length === 0 ? (
              <div className="empty-state"><p>Koi transaction nahi abhi tak.</p></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {transactions.map((tx) => (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{tx.description || tx.transaction_type}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString('hi-IN')}</p>
                      </div>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: tx.is_credit ? '#22c55e' : 'var(--red-light)', fontWeight: 700 }}>
                        {tx.is_credit ? '+' : '-'}{tx.coin_amount} 🪙
                      </span>
                    </div>
                  ))}
                </div>
                <Pagination page={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
              </>
            )}
          </div>
        )}

        {/* Recharge Packs */}
        {activeTab === 'recharge' && (
          <div className="grid-3">
            {packs.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}><p>Koi recharge pack available nahi.</p></div>
            ) : packs.map((pack) => (
              <div key={pack.id} style={{
                background: 'var(--bg-card)', border: `1px solid ${pack.is_popular ? 'var(--red-primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center',
                position: 'relative',
              }}>
                {pack.is_popular && (
                  <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--red-primary)', color: 'white', padding: '0.12rem 0.65rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>
                    🔥 POPULAR
                  </span>
                )}
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: '#D4AF37', marginBottom: '0.2rem' }}>
                  🪙 {pack.coins?.toLocaleString()}
                </div>
                {pack.bonus_coins > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '0.2rem' }}>+{pack.bonus_coins} bonus</div>
                )}
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  ₹{pack.price_inr}
                </div>
                {pack.description && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>{pack.description}</p>}
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleBuyPack(pack)}>
                  Kharido
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Withdrawals */}
        {activeTab === 'withdrawals' && (
          withdrawals.length === 0 ? (
            <div className="empty-state"><p>Koi withdrawal request nahi.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {withdrawals.map((w) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                }}>
                  <div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>🪙 {w.coin_amount} coins → ₹{(w.coin_amount / 10).toFixed(0)}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{w.upi_id} • {new Date(w.created_at).toLocaleDateString('hi-IN')}</p>
                  </div>
                  <span className={`badge ${w.status === 'approved' ? 'badge-green' : w.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Recharge Modal */}
      <Modal isOpen={rechargeModal} onClose={() => setRechargeModal(false)} title="Pack Kharido">
        {selectedPack && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🪙</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: '#D4AF37', marginBottom: '0.2rem' }}>
              {(selectedPack.coins + (selectedPack.bonus_coins || 0)).toLocaleString()} Coins
            </h3>
            {selectedPack.bonus_coins > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '0.2rem' }}>({selectedPack.coins} + {selectedPack.bonus_coins} bonus)</p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>₹{selectedPack.price_inr} ka payment karo</p>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ⚠️ Demo mode — Real payment gateway integrate hoga
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleInitiateRecharge} disabled={processing}>
              {processing ? 'Processing...' : `₹${selectedPack.price_inr} Pay Karo`}
            </button>
          </div>
        )}
      </Modal>

      {/* Withdrawal Modal */}
      <Modal isOpen={withdrawalModal} onClose={() => setWithdrawalModal(false)} title="💸 Withdrawal Request">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>10 coins = ₹1 • Minimum 1000 coins withdraw karo</p>
          <div className="form-group">
            <label className="form-label">Coins (min 1000)</label>
            <input
              type="number" className="form-input"
              min={1000} step={100}
              value={withdrawalForm.coin_amount}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, coin_amount: Number(e.target.value) })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              = ₹{(withdrawalForm.coin_amount / 10).toFixed(0)}
              {withdrawalForm.coin_amount < 1000 && <span style={{ color: 'var(--red-light)', marginLeft: '0.5rem' }}>⚠️ min 1000 coins</span>}
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">UPI ID</label>
            <input type="text" className="form-input" placeholder="yourname@upi" value={withdrawalForm.upi_id} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, upi_id: e.target.value })} />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleWithdrawal}
            disabled={withdrawalForm.coin_amount < 1000 || !withdrawalForm.upi_id.trim()}
          >
            💸 Request Bhejo
          </button>
        </div>
      </Modal>
    </div>
  );
}
