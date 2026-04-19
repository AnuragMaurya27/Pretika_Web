import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const STATUS_COLOR = {
  open: 'badge-green', pending: 'badge-gold', resolved: 'badge-muted', closed: 'badge-muted',
};

export default function SupportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [newMsgText, setNewMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ category_id: '', subject: '', description: '' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      supportAPI.getMyTickets(),
      supportAPI.getCategories(),
    ]).then(([tRes, cRes]) => {
      const d = tRes.data?.data;
      setTickets(d?.items || d || []);
      setCategories(cRes.data?.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      supportAPI.getTicketMessages(selectedTicket.id)
        .then((res) => setTicketMessages(res.data?.data || []))
        .catch(() => {});
    }
  }, [selectedTicket]);

  const createTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Subject and description are required.');
      return;
    }
    try {
      const res = await supportAPI.createTicket(form);
      const newTicket = res.data?.data;
      setTickets((prev) => [newTicket, ...prev]);
      setCreateModal(false);
      setForm({ category_id: '', subject: '', description: '' });
      toast.success(`Ticket #${newTicket?.ticket_number} create ho gaya!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket.');
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() || sending) return;
    setSending(true);
    try {
      // FIXED: pass message string directly, not { content } object
      const res = await supportAPI.addMessage(selectedTicket.id, newMsgText);
      setTicketMessages((prev) => [...prev, res.data?.data]);
      setNewMsgText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    try {
      await supportAPI.closeTicket(selectedTicket.id);
      const updated = { ...selectedTicket, status: 'closed' };
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? updated : t));
      toast.success('Ticket close ho gayi.');
      setRateModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close ticket.');
    }
  };

  const submitRating = async () => {
    try {
      await supportAPI.rateTicket(selectedTicket.id, { rating, feedback: '' });
      toast.success('Rating de di! Shukriya 🙏');
      setRateModal(false);
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '860px' }}>
        {!selectedTicket ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>
                🎫 <span style={{ color: 'var(--red-primary)' }}>Support</span> Tickets
              </h1>
              <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>+ New Ticket</button>
            </div>

            {tickets.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎫</div>
                <p style={{ marginBottom: '1rem' }}>No tickets yet. Have a new issue?</p>
                <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>+ Ticket Banao</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--red-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--red-primary)' }}>
                          #{ticket.ticket_number}
                        </span>
                        <span className={`badge ${STATUS_COLOR[ticket.status] || 'badge-muted'}`}>{ticket.status}</span>
                        <span className="badge badge-muted">{ticket.priority}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.subject}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {ticket.message_count} messages • {new Date(ticket.created_at).toLocaleDateString('hi-IN')}
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: '0.875rem' }} onClick={() => setSelectedTicket(null)}>
              ← All Tickets
            </button>

            {/* Ticket header */}
            <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--red-primary)', fontSize: '0.8rem' }}>#{selectedTicket.ticket_number}</span>
                <span className={`badge ${STATUS_COLOR[selectedTicket.status] || 'badge-muted'}`}>{selectedTicket.status}</span>
                <span className="badge badge-muted">{selectedTicket.priority}</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{selectedTicket.subject}</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedTicket.description}</p>

              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={closeTicket}>
                  ✓ Close Ticket
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              {ticketMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No messages yet.</div>
              ) : ticketMessages.map((msg) => (
                <div key={msg.id} style={{
                  // FIXED: is_support (not is_staff_reply)
                  background: msg.is_support ? 'rgba(220,20,60,0.06)' : 'var(--bg-card)',
                  border: `1px solid ${msg.is_support ? 'var(--border-light)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', padding: '0.75rem 0.875rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: msg.is_support ? 'var(--red-primary)' : 'var(--text-secondary)' }}>
                      {msg.is_support ? '🎫 Support Team' : (msg.sender_username || 'Aap')}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleString('hi-IN')}</span>
                  </div>
                  {/* FIXED: msg.message (not msg.content) — TicketMessageResponse.Message */}
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{msg.message}</p>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' && (
              <form onSubmit={sendReply} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <textarea
                  className="form-input" placeholder="Write a reply..." rows={2}
                  value={newMsgText} onChange={(e) => setNewMsgText(e.target.value)}
                  style={{ flex: 1, minHeight: '60px', fontSize: '0.875rem' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!newMsgText.trim() || sending}>
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Naya Support Ticket">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Category chunno (optional)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input type="text" className="form-input" placeholder="Samasya kya hai? (5-255 chars)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(20+ chars)</span></label>
            <textarea className="form-input" placeholder="Detail mein batao..." rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ minHeight: '100px' }} />
          </div>
          <button
            className="btn btn-primary"
            onClick={createTicket}
            disabled={form.subject.length < 5 || form.description.length < 20}
          >
            🎫 Submit Ticket
          </button>
        </div>
      </Modal>

      {/* Rate Modal */}
      <Modal isOpen={rateModal} onClose={() => setRateModal(false)} title="Rate Support">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>Hamari support kaisi rahi?</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginBottom: '1.25rem' }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => setRating(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.75rem', filter: r <= rating ? 'none' : 'grayscale(1)', transition: 'filter 0.15s' }}>
                ⭐
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={submitRating} style={{ width: '100%', justifyContent: 'center' }}>
            Rating Do
          </button>
        </div>
      </Modal>
    </div>
  );
}
