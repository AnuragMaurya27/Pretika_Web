import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { chatAPI, usersAPI, walletAPI } from '../../api/index';
import { getMediaUrl } from '../../utils/media';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const BASE = 'https://pretika-api-1.onrender.com';
const API_BASE = 'https://pretika-api-1.onrender.com';

// ── Default Sticker Packs (emoji-based) ───────────────────────────────────────
const STICKER_PACKS = [
  {
    name: '👻 Bhoot',
    stickers: ['👻','💀','🎃','🕷️','🕸️','🦇','🌑','🌙','⚡','🌪️','🔮','🪄','😱','☠️','🩸','🫀'],
  },
  {
    name: '❤️ Dil',
    stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','🫶','😍','🥰','😘'],
  },
  {
    name: '😂 Funny',
    stickers: ['😂','🤣','😜','🤪','😝','😏','🤔','🙄','😴','🤤','🥴','😵','🤡','🫠','🙃','😈'],
  },
];

// ── Common Emojis ─────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😂','😍','🥰','😎','😭','😱','🔥','❤️','💀',
  '👻','🎃','⭐','🌙','💫','🙏','👍','🫶','😈','🕷️',
  '🦇','🌑','⚡','🌟','🩸','☠️','🌪️','🔮','🪄','😮',
  '😘','😏','🤔','🥺','🤩','🎉','🎊','🎵','💡','😤',
  '🫂','💪','👊','✌️','🤞','🤙','👏','🙌','🤝','🫡',
  '🍕','🍔','🍟','🎮','📱','💻','🏆','🎯','🚀','🌈',
];

// ── SUPER CHAT COIN PRESETS ───────────────────────────────────────────────────
const SC_PRESETS = [10, 20, 30, 50, 100, 200, 300, 500];

function scColor(coins) {
  if (coins >= 300) return '#FF4500';
  if (coins >= 100) return '#FFA500';
  return '#D4AF37';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function getDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const msg = new Date(d); msg.setHours(0, 0, 0, 0);
  if (msg.getTime() === today.getTime()) return 'Aaj';
  if (msg.getTime() === yest.getTime()) return 'Kal';
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Single-tick Seen component ────────────────────────────────────────────────
function SeenTick({ status }) {
  if (status === 'sending') return <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginLeft: '0.25rem' }}>🕐</span>;
  if (status === 'sent' || status === 'delivered') return <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginLeft: '0.2rem' }}>✓</span>;
  if (status === 'seen') return <span style={{ fontSize: '0.7rem', color: '#4fc3f7', marginLeft: '0.2rem' }}>✓</span>;
  return null;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function ChatAvatar({ username, avatarUrl, size = 28 }) {
  const src = getMediaUrl(avatarUrl);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--red-dark)', border: '1px solid rgba(220,20,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4 + 'px', color: 'white', flexShrink: 0, overflow: 'hidden', fontWeight: 700 }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} /> : (username || '?')[0].toUpperCase()}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const messagesEndRef = useRef(null);
  const hubRef = useRef(null);
  const prevRoomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Core state
  const [publicRooms, setPublicRooms] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('public');
  const [dmModal, setDmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Typing / seen
  const [isTyping, setIsTyping] = useState(false);
  const [othersTyping, setOthersTyping] = useState({});
  const [seenMsgIds, setSeenMsgIds] = useState(new Set());

  // DM
  const [dmSearch, setDmSearch] = useState('');
  const [dmResults, setDmResults] = useState([]);
  const [dmSelected, setDmSelected] = useState(null);
  const debouncedDmSearch = useDebounce(dmSearch, 300);

  // Feature panels: 'emoji' | 'sticker' | 'super_chat' | null
  const [activePanel, setActivePanel] = useState(null);
  const [stickerPackIdx, setStickerPackIdx] = useState(0);
  const [superChatCoins, setSuperChatCoins] = useState(50);
  const [walletBalance, setWalletBalance] = useState(null);

  // Message context menu & report
  const [msgMenuId, setMsgMenuId] = useState(null);
  const [reportModal, setReportModal] = useState({ open: false, messageId: null });
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');

  // ── DM search ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedDmSearch.trim().length < 2 || dmSelected) { setDmResults([]); return; }
    usersAPI.search(debouncedDmSearch.trim()).then((res) => {
      setDmResults((res.data?.data || []).slice(0, 6).filter((u) => u.id !== user?.id));
    }).catch(() => {});
  }, [debouncedDmSearch, user?.id, dmSelected]);

  // ── Load rooms ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      chatAPI.getPublicRooms(),
      chatAPI.getPrivateChats(),
    ]).then(([pubRes, privRes]) => {
      const pub = pubRes.data?.data || [];
      const priv = privRes.data?.data || [];
      setPublicRooms(pub);
      setPrivateChats(priv);
      setLoading(false);
      const roomId = searchParams.get('room');
      if (roomId) {
        const found = priv.find((r) => r.id === roomId) || pub.find((r) => r.id === roomId);
        if (found) { setSelectedRoom(found); setActiveTab(found.room_type === 'private' ? 'private' : 'public'); }
        else { setActiveTab('private'); }
      }
    }).catch(() => setLoading(false));
  }, [user]);

  // ── SignalR setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('hvu_token');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE}/hubs/chat?access_token=${token}`)
      .withAutomaticReconnect()
      .build();

    connection.on('NewMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id && !m._temp)) return prev;
        if (msg.sender_id === user.id) {
          const hasTempForThis = prev.some((m) => m._temp && !m._replaced);
          if (hasTempForThis) return prev;
          if (prev.some((m) => m.id === msg.id)) return prev;
        }
        return [...prev, msg];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    connection.on('UserTyping', (data) => {
      if (data.userId === user.id) return;
      setOthersTyping((prev) => {
        const updated = { ...prev };
        if (updated[data.userId]?.timeout) clearTimeout(updated[data.userId].timeout);
        const t = setTimeout(() => {
          setOthersTyping((p) => { const n = { ...p }; delete n[data.userId]; return n; });
        }, 3000);
        updated[data.userId] = { username: data.username, timeout: t };
        return updated;
      });
    });

    connection.on('MessageSeen', (data) => {
      setSeenMsgIds((prev) => {
        const next = new Set(prev);
        (data.messageIds || []).forEach((id) => next.add(id));
        return next;
      });
    });

    connection.start().catch(() => {});
    hubRef.current = connection;
    return () => { connection.stop(); hubRef.current = null; };
  }, [user]);

  // ── Load messages when room selected ───────────────────────────────────────
  useEffect(() => {
    if (!selectedRoom) return;
    setMsgLoading(true);
    setMessages([]);
    setOthersTyping({});
    setActivePanel(null);
    chatAPI.getMessages(selectedRoom.id)
      .then((res) => {
        const d = res.data?.data;
        // Backend already returns chronological order (oldest first) — DO NOT reverse
        const msgs = d?.items || d || [];
        setMessages(msgs);
        setMsgLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
      }).catch(() => setMsgLoading(false));

    const hub = hubRef.current;
    const joinRoom = () => {
      if (prevRoomRef.current && prevRoomRef.current !== selectedRoom.id)
        hub.invoke('LeaveRoom', prevRoomRef.current).catch(() => {});
      hub.invoke('JoinRoom', selectedRoom.id).catch(() => {});
      prevRoomRef.current = selectedRoom.id;
    };

    if (hub) {
      if (hub.state === signalR.HubConnectionState.Connected) joinRoom();
      else {
        const wait = setInterval(() => {
          if (hub.state === signalR.HubConnectionState.Connected) { joinRoom(); clearInterval(wait); }
        }, 300);
        setTimeout(() => clearInterval(wait), 5000);
      }
    }
  }, [selectedRoom]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load wallet balance when super chat panel opens ──────────────────────
  useEffect(() => {
    if (activePanel === 'super_chat' && walletBalance === null) {
      walletAPI.getWallet().then((res) => {
        setWalletBalance(res.data?.data?.coin_balance ?? 0);
      }).catch(() => setWalletBalance(0));
    }
  }, [activePanel]);

  // ── Close panels/menu on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.chat-feature-panel') && !e.target.closest('.chat-panel-btn')) {
        setActivePanel(null);
      }
      if (!e.target.closest('.msg-menu-wrap')) {
        setMsgMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const selectRoom = useCallback(async (room) => {
    setSelectedRoom(room);
    setMessages([]);
    if (room.room_type !== 'private' && !room.is_member) {
      try { await chatAPI.joinRoom(room.id); } catch { /* ignore */ }
    }
  }, []);

  const handleTyping = (e) => {
    setMsgText(e.target.value);
    const hub = hubRef.current;
    if (!hub || hub.state !== signalR.HubConnectionState.Connected || !selectedRoom) return;
    if (!isTyping) {
      setIsTyping(true);
      hub.invoke('Typing', { roomId: selectedRoom.id }).catch(() => {});
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 2000);
  };

  // ── Send text message ──────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!msgText.trim() || !selectedRoom || sending) return;
    const text = msgText.trim();
    setMsgText('');
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      content: text,
      sender_id: user.id,
      sender_username: user.username,
      sender_display_name: user.display_name,
      message_type: 'text',
      created_at: new Date().toISOString(),
      _status: 'sending',
      _temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    try {
      const res = await chatAPI.sendMessage(selectedRoom.id, { content: text, message_type: 'text' });
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages((prev) => {
          const without = prev.filter((m) => !(m.id === newMsg.id && !m._temp));
          return without.map((m) => m.id === tempId ? { ...newMsg, _status: 'sent', _replaced: true } : m);
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMsgText(text);
      toast.error(err.response?.data?.message || 'Message send nahi hua.');
    } finally { setSending(false); }
  };

  // ── Send emoji as text ────────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    setMsgText((prev) => prev + emoji);
    setActivePanel(null);
  };

  // ── Send sticker ──────────────────────────────────────────────────────────
  const sendSticker = async (emoji) => {
    if (!selectedRoom || sending) return;
    setActivePanel(null);
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      content: emoji,
      sender_id: user.id,
      sender_username: user.username,
      message_type: 'sticker',
      created_at: new Date().toISOString(),
      _status: 'sending',
      _temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    try {
      const res = await chatAPI.sendMessage(selectedRoom.id, { content: emoji, message_type: 'sticker' });
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages((prev) => {
          const without = prev.filter((m) => !(m.id === newMsg.id && !m._temp));
          return without.map((m) => m.id === tempId ? { ...newMsg, _status: 'sent', _replaced: true } : m);
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error('Sticker nahi bheja.');
    } finally { setSending(false); }
  };

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;
    e.target.value = '';
    setUploadingImage(true);
    try {
      const uploadRes = await chatAPI.uploadChatImage(file);
      const imageUrl = uploadRes.data?.data?.url;
      if (!imageUrl) throw new Error('URL nahi mila');

      setSending(true);
      const tempId = `temp_${Date.now()}`;
      const tempMsg = {
        id: tempId,
        image_url: imageUrl,
        content: null,
        sender_id: user.id,
        sender_username: user.username,
        message_type: 'image',
        created_at: new Date().toISOString(),
        _status: 'sending',
        _temp: true,
      };
      setMessages((prev) => [...prev, tempMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

      const res = await chatAPI.sendMessage(selectedRoom.id, { message_type: 'image', image_url: imageUrl });
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages((prev) => {
          const without = prev.filter((m) => !(m.id === newMsg.id && !m._temp));
          return without.map((m) => m.id === tempId ? { ...newMsg, _status: 'sent', _replaced: true } : m);
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image nahi bheji. Dobara try karo.');
    } finally { setUploadingImage(false); setSending(false); }
  };

  // ── Super Chat send ───────────────────────────────────────────────────────
  const sendSuperChat = async () => {
    if (!msgText.trim() || !selectedRoom || sending) return;
    if (walletBalance !== null && walletBalance < superChatCoins) {
      toast.error(`Coins kam hain! Aapke paas sirf ${walletBalance} coins hain.`);
      return;
    }
    const text = msgText.trim();
    setMsgText('');
    setActivePanel(null);
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      content: text,
      sender_id: user.id,
      sender_username: user.username,
      sender_display_name: user.display_name,
      message_type: 'super_chat',
      is_super_chat: true,
      super_chat_coins: superChatCoins,
      super_chat_highlight_color: scColor(superChatCoins),
      created_at: new Date().toISOString(),
      _status: 'sending',
      _temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    try {
      const res = await chatAPI.sendMessage(selectedRoom.id, {
        content: text,
        message_type: 'super_chat',
        super_chat_coins: superChatCoins,
      });
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages((prev) => {
          const without = prev.filter((m) => !(m.id === newMsg.id && !m._temp));
          return without.map((m) => m.id === tempId ? { ...newMsg, _status: 'sent', _replaced: true } : m);
        });
        setWalletBalance((prev) => prev !== null ? prev - superChatCoins : null);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMsgText(text);
      toast.error(err.response?.data?.message || 'Super Chat nahi gaya.');
    } finally { setSending(false); }
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = async (msgId) => {
    setMsgMenuId(null);
    try {
      await chatAPI.deleteMessage(msgId);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true, content: null } : m));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete nahi hua.');
    }
  };

  // ── Report message ────────────────────────────────────────────────────────
  const openReport = (msgId) => {
    setMsgMenuId(null);
    setReportModal({ open: true, messageId: msgId });
    setReportReason('spam');
    setReportDesc('');
  };

  const submitReport = async () => {
    if (!reportModal.messageId) return;
    try {
      await chatAPI.reportMessage(reportModal.messageId, { reason: reportReason, description: reportDesc });
      toast.success('Report submit ho gaya. Team review karegi. 🛡️');
      setReportModal({ open: false, messageId: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Report submit nahi hua.');
    }
  };

  // ── Start DM ───────────────────────────────────────────────────────────────
  const startDM = async () => {
    if (!dmSelected) return;
    try {
      const res = await chatAPI.startPrivateChat({ target_user_id: dmSelected.id });
      const newRoom = res.data?.data;
      setPrivateChats((prev) => [newRoom, ...prev.filter((r) => r.id !== newRoom.id)]);
      setSelectedRoom(newRoom);
      setActiveTab('private');
      setDmModal(false);
      setDmSearch(''); setDmSelected(null); setDmResults([]);
      toast.success('Chat shuru ho gayi!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'DM start nahi hua.');
    }
  };

  // ── Grouped messages for date separators ──────────────────────────────────
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg, idx) => {
    if (!msg) return;
    const d = getDateLabel(msg.created_at);
    if (d !== lastDate) {
      groupedMessages.push({ type: 'date', label: d, key: `date_${idx}` });
      lastDate = d;
    }
    groupedMessages.push({ type: 'msg', msg, key: msg.id });
  });

  const typingUsers = Object.values(othersTyping).map((t) => t.username);
  const rooms = activeTab === 'public' ? publicRooms : privateChats;
  const isSuperChatActive = activePanel === 'super_chat';

  if (loading) return <Spinner fullPage />;

  return (
    <div style={{ height: 'calc(100vh - var(--navbar-height))', display: 'flex', overflow: 'hidden', marginTop: 'var(--navbar-height)' }}>

      {/* ── Hidden file input ───────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ width: '265px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>💬 Chat</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setDmModal(true)}>+ DM</button>
          </div>
          <div className="tabs" style={{ margin: 0, border: 'none' }}>
            {[{ key: 'public', label: '🌐 Public' }, { key: 'private', label: '🔒 DMs' }].map((t) => (
              <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)} style={{ flex: 1, textAlign: 'center', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {activeTab === 'public' ? 'Koi public room nahi.' : 'Koi DM nahi. + DM pe click karo!'}
            </div>
          ) : rooms.map((room) => {
            const isPrivate = room.room_type === 'private';
            const displayName = room.name || room.other_username || 'DM';
            const lastContent = room.last_message?.content || '';
            const isSelected = selectedRoom?.id === room.id;
            return (
              <div
                key={room.id}
                onClick={() => selectRoom(room)}
                style={{
                  padding: '0.65rem 0.875rem', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', background: isSelected ? 'rgba(220,20,60,0.1)' : 'transparent',
                  transition: 'background 0.15s', display: 'flex', gap: '0.6rem', alignItems: 'center',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <ChatAvatar username={isPrivate ? room.other_username : room.name} avatarUrl={room.other_avatar_url || room.icon_url} size={34} />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  {lastContent && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastContent}</p>
                  )}
                </div>
                {!room.is_member && !isPrivate && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--red-primary)', flexShrink: 0 }}>Join</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat window ─────────────────────────────────────────────────── */}
      {selectedRoom ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>

          {/* Header */}
          <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <ChatAvatar
              username={selectedRoom.room_type === 'private' ? selectedRoom.other_username : selectedRoom.name}
              avatarUrl={selectedRoom.other_avatar_url || selectedRoom.icon_url}
              size={36}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.2 }}>
                {selectedRoom.name || selectedRoom.other_username || 'DM'}
              </p>
              {typingUsers.length > 0 ? (
                <p style={{ fontSize: '0.68rem', color: 'var(--red-primary)', fontStyle: 'italic', animation: 'pulse 1s infinite' }}>
                  {typingUsers[0]} likh raha/rahi hai...
                </p>
              ) : selectedRoom.member_count > 0 ? (
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{selectedRoom.member_count} members</p>
              ) : null}
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--red-primary)', fontWeight: 600, background: 'rgba(220,20,60,0.08)', padding: '0.12rem 0.4rem', borderRadius: '20px', border: '1px solid rgba(220,20,60,0.2)' }}>
              ⚡ LIVE
            </span>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {msgLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}><Spinner size={28} /></div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 'auto', fontSize: '0.875rem', paddingTop: '4rem' }}>
                👻 Pehla message bhejo!
              </div>
            ) : (
              groupedMessages.map((item) => {
                if (item.type === 'date') {
                  return (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.75rem 0 0.4rem' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.15rem 0.55rem', borderRadius: '20px', border: '1px solid var(--border)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {item.label}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>
                  );
                }

                const msg = item.msg;
                const isMe = msg.sender_id === user?.id;
                const tickStatus = msg._status || (seenMsgIds.has(msg.id) ? 'seen' : 'delivered');
                const isSuperChat = msg.is_super_chat || msg.message_type === 'super_chat';
                const isSticker = msg.message_type === 'sticker';
                const isImage = msg.message_type === 'image';
                const isSystem = msg.is_system_message;
                const highlightColor = msg.super_chat_highlight_color || scColor(msg.super_chat_coins || 0);

                return (
                  <div key={item.key} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '0.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', maxWidth: isSticker ? '120px' : '68%', position: 'relative' }}>
                      {!isMe && <ChatAvatar username={msg.sender_username} avatarUrl={msg.sender_avatar_url} size={24} />}

                      <div style={{ flex: 1 }}>
                        {/* Sender name in group/public rooms */}
                        {!isMe && selectedRoom.room_type !== 'private' && (
                          <p style={{ fontSize: '0.65rem', color: 'var(--red-primary)', fontWeight: 600, marginBottom: '0.1rem', paddingLeft: '0.5rem' }}>
                            {msg.sender_display_name || msg.sender_username}
                          </p>
                        )}

                        {/* Super Chat glow wrapper */}
                        {isSuperChat ? (
                          <div style={{
                            borderRadius: '12px',
                            border: `2px solid ${highlightColor}`,
                            boxShadow: `0 0 12px ${highlightColor}60, 0 2px 8px rgba(0,0,0,0.3)`,
                            overflow: 'hidden',
                          }}>
                            {/* Super Chat header */}
                            <div style={{ background: highlightColor, padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>⚡ Super Chat</span>
                              <span style={{ fontSize: '0.7rem', color: '#fff' }}>🪙 {msg.super_chat_coins} coins</span>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginLeft: 'auto' }}>
                                {msg.sender_display_name || msg.sender_username}
                              </span>
                            </div>
                            {/* Super Chat bubble */}
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              background: isMe ? '#dc143c' : 'var(--bg-card)',
                              fontSize: '0.875rem',
                              color: isMe ? '#fff' : 'var(--text-primary)',
                              wordBreak: 'break-word',
                            }}>
                              {msg.is_deleted ? <em style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>🚫 Deleted</em> : msg.content}
                            </div>
                          </div>
                        ) : isSticker ? (
                          /* Sticker bubble */
                          <div style={{ fontSize: '2.8rem', lineHeight: 1, padding: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>
                            {msg.is_deleted ? '🚫' : (msg.content || '👻')}
                          </div>
                        ) : isImage ? (
                          /* Image bubble */
                          <div style={{
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            overflow: 'hidden',
                            border: `1px solid ${isMe ? 'rgba(220,20,60,0.35)' : 'var(--border)'}`,
                          }}>
                            {msg.image_url ? (
                              <img
                                src={getMediaUrl(msg.image_url)}
                                alt="chat image"
                                style={{ maxWidth: '240px', maxHeight: '200px', display: 'block', objectFit: 'cover' }}
                                onClick={() => window.open(getMediaUrl(msg.image_url), '_blank')}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : <em style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem' }}>🚫 Image</em>}
                          </div>
                        ) : (
                          /* Normal text bubble */
                          <div style={{
                            padding: '0.45rem 0.75rem',
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isMe ? '#dc143c' : 'var(--bg-card)',
                            border: `1px solid ${isMe ? 'rgba(220,20,60,0.35)' : 'var(--border)'}`,
                            fontSize: '0.875rem',
                            color: isMe ? '#ffffff' : 'var(--text-primary)',
                            wordBreak: 'break-word',
                            boxShadow: isMe ? '0 2px 8px rgba(220,20,60,0.25)' : '0 1px 3px rgba(0,0,0,0.2)',
                          }}>
                            {isSystem ? (
                              <em style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontSize: '0.8rem' }}>{msg.content}</em>
                            ) : msg.is_deleted ? (
                              <em style={{ color: isMe ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', fontSize: '0.8rem' }}>🚫 Message delete ho gaya</em>
                            ) : msg.content}
                          </div>
                        )}

                        {/* Time + tick */}
                        {!isSticker && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: '0.12rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                              {fmtTime(msg.created_at)}
                            </span>
                            {isMe && <SeenTick status={tickStatus} />}
                          </div>
                        )}
                        {isSticker && isMe && (
                          <div style={{ textAlign: 'right', marginTop: '0.1rem', paddingRight: '0.1rem' }}>
                            <SeenTick status={tickStatus} />
                          </div>
                        )}
                      </div>

                      {/* ⋮ Message menu button */}
                      {!msg.is_deleted && !isSystem && (
                        <div className="msg-menu-wrap" style={{ position: 'relative', alignSelf: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMsgMenuId(msgMenuId === msg.id ? null : msg.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.2rem', opacity: 0.5, lineHeight: 1 }}
                            title="Options"
                          >⋮</button>
                          {msgMenuId === msg.id && (
                            <div style={{
                              position: 'absolute',
                              [isMe ? 'right' : 'left']: '0',
                              bottom: '100%',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              zIndex: 100,
                              minWidth: '110px',
                              overflow: 'hidden',
                            }}>
                              {isMe && (
                                <button
                                  onClick={() => deleteMessage(msg.id)}
                                  style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--red-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}
                                >🗑️ Delete</button>
                              )}
                              <button
                                onClick={() => openReport(msg.id)}
                                style={{ display: 'block', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem' }}
                              >🚩 Report</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.45rem 0.7rem', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: `typing-dot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Feature Panels (above input) ────────────────────────────── */}
          {activePanel === 'emoji' && (
            <div className="chat-feature-panel" style={{ padding: '0.65rem 0.875rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {EMOJI_LIST.map((em) => (
                  <button key={em} onClick={() => insertEmoji(em)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.35rem', padding: '0.2rem', borderRadius: '6px', transition: 'background 0.1s', lineHeight: 1 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >{em}</button>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'sticker' && (
            <div className="chat-feature-panel" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              {/* Pack tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
                {STICKER_PACKS.map((pack, i) => (
                  <button key={i} onClick={() => setStickerPackIdx(i)} style={{ padding: '0.4rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: stickerPackIdx === i ? 700 : 400, color: stickerPackIdx === i ? 'var(--red-primary)' : 'var(--text-muted)', borderBottom: stickerPackIdx === i ? '2px solid var(--red-primary)' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {pack.name}
                  </button>
                ))}
              </div>
              {/* Stickers grid */}
              <div style={{ padding: '0.5rem 0.875rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {STICKER_PACKS[stickerPackIdx].stickers.map((st) => (
                  <button key={st} onClick={() => sendSticker(st)} disabled={sending} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '1.9rem', padding: '0.3rem', lineHeight: 1, transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,20,60,0.1)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >{st}</button>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'super_chat' && (
            <div className="chat-feature-panel" style={{ padding: '0.75rem 0.875rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D4AF37' }}>⚡ Super Chat</span>
                {walletBalance !== null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🪙 Balance: <b style={{ color: 'var(--text-primary)' }}>{walletBalance}</b></span>
                )}
              </div>

              {/* Coin preset chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                {SC_PRESETS.map((coin) => (
                  <button
                    key={coin}
                    onClick={() => setSuperChatCoins(coin)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      border: `1.5px solid ${superChatCoins === coin ? scColor(coin) : 'var(--border)'}`,
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: superChatCoins === coin ? 700 : 400,
                      background: superChatCoins === coin ? `${scColor(coin)}18` : 'var(--bg-card)',
                      color: superChatCoins === coin ? scColor(coin) : 'var(--text-primary)',
                      transition: 'all 0.15s',
                    }}
                  >🪙 {coin}</button>
                ))}
              </div>

              {/* Custom slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
                <input
                  type="range" min={10} max={500} step={10}
                  value={superChatCoins}
                  onChange={(e) => setSuperChatCoins(Number(e.target.value))}
                  style={{ flex: 1, accentColor: scColor(superChatCoins) }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: scColor(superChatCoins), minWidth: '55px', textAlign: 'right' }}>🪙 {superChatCoins}</span>
              </div>

              {/* Preview */}
              {msgText.trim() && (
                <div style={{ padding: '0.5rem 0.75rem', borderRadius: '10px', border: `2px solid ${scColor(superChatCoins)}`, background: `${scColor(superChatCoins)}12`, marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: scColor(superChatCoins), fontWeight: 700 }}>⚡ Preview: </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{msgText.slice(0, 80)}</span>
                </div>
              )}

              {/* Send button */}
              <button
                onClick={sendSuperChat}
                disabled={!msgText.trim() || sending || (walletBalance !== null && walletBalance < superChatCoins)}
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: scColor(superChatCoins),
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  opacity: (!msgText.trim() || (walletBalance !== null && walletBalance < superChatCoins)) ? 0.5 : 1,
                }}
              >
                ⚡ {sending ? 'Bhej raha hai...' : `Super Chat Bhejo (🪙 ${superChatCoins})`}
              </button>
              {walletBalance !== null && walletBalance < superChatCoins && (
                <p style={{ fontSize: '0.72rem', color: 'var(--red-primary)', marginTop: '0.35rem', textAlign: 'center' }}>
                  ⚠️ Aapke paas sirf {walletBalance} coins hain
                </p>
              )}
            </div>
          )}

          {/* ── Input bar ───────────────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
            <form onSubmit={sendMessage} style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>

              {/* Emoji button */}
              <button
                type="button"
                className="chat-panel-btn"
                onClick={() => setActivePanel(activePanel === 'emoji' ? null : 'emoji')}
                title="Emoji"
                style={{ background: activePanel === 'emoji' ? 'rgba(220,20,60,0.1)' : 'none', border: activePanel === 'emoji' ? '1px solid rgba(220,20,60,0.3)' : '1px solid transparent', borderRadius: '8px', padding: '0.35rem 0.45rem', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: 'var(--text-muted)', transition: 'all 0.15s', flexShrink: 0 }}
              >😊</button>

              {/* Sticker button */}
              <button
                type="button"
                className="chat-panel-btn"
                onClick={() => setActivePanel(activePanel === 'sticker' ? null : 'sticker')}
                title="Sticker"
                style={{ background: activePanel === 'sticker' ? 'rgba(220,20,60,0.1)' : 'none', border: activePanel === 'sticker' ? '1px solid rgba(220,20,60,0.3)' : '1px solid transparent', borderRadius: '8px', padding: '0.35rem 0.45rem', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: 'var(--text-muted)', transition: 'all 0.15s', flexShrink: 0 }}
              >🎭</button>

              {/* Image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Image bhejo"
                disabled={uploadingImage}
                style={{ background: 'none', border: '1px solid transparent', borderRadius: '8px', padding: '0.35rem 0.45rem', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: 'var(--text-muted)', transition: 'all 0.15s', flexShrink: 0 }}
              >{uploadingImage ? '⏳' : '🖼️'}</button>

              {/* Super Chat button */}
              <button
                type="button"
                className="chat-panel-btn"
                onClick={() => setActivePanel(activePanel === 'super_chat' ? null : 'super_chat')}
                title="Super Chat"
                style={{ background: activePanel === 'super_chat' ? '#D4AF3722' : 'none', border: activePanel === 'super_chat' ? '1px solid #D4AF37' : '1px solid transparent', borderRadius: '8px', padding: '0.35rem 0.45rem', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, color: '#D4AF37', transition: 'all 0.15s', flexShrink: 0 }}
              >⚡</button>

              {/* Text input */}
              <input
                type="text" className="form-input"
                placeholder={isSuperChatActive ? '⚡ Super Chat message likho...' : 'Message likho...'}
                value={msgText}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (isSuperChatActive) { e.preventDefault(); sendSuperChat(); }
                    else { sendMessage(e); }
                  }
                }}
                style={{ flex: 1, fontSize: '0.875rem', borderColor: isSuperChatActive ? '#D4AF37' : undefined, boxShadow: isSuperChatActive ? '0 0 0 2px #D4AF3730' : undefined }}
                autoComplete="off"
              />

              {/* Send button */}
              <button
                type={isSuperChatActive ? 'button' : 'submit'}
                onClick={isSuperChatActive ? sendSuperChat : undefined}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 0.875rem',
                  flexShrink: 0,
                  background: isSuperChatActive ? scColor(superChatCoins) : undefined,
                  border: isSuperChatActive ? 'none' : undefined,
                }}
                disabled={isSuperChatActive ? (!msgText.trim() || sending) : (!msgText.trim() || sending)}
              >
                {sending ? '⏳' : isSuperChatActive ? '⚡' : '➤'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-primary)' }}>
          <span style={{ fontSize: '2.5rem' }}>💬</span>
          <p style={{ fontSize: '0.875rem' }}>Koi room select karo ya + DM se naya chat shuru karo</p>
        </div>
      )}

      {/* ── DM Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={dmModal}
        onClose={() => { setDmModal(false); setDmSearch(''); setDmSelected(null); setDmResults([]); }}
        title="💬 Naya DM Shuru Karo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-group">
            <label className="form-label">Username se dhundo</label>
            <input type="text" className="form-input" placeholder="Username type karo..." value={dmSearch}
              onChange={(e) => { setDmSearch(e.target.value); setDmSelected(null); }} autoFocus />
          </div>

          {dmResults.length > 0 && !dmSelected && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {dmResults.map((u) => (
                <div key={u.id} onClick={() => { setDmSelected(u); setDmSearch(u.display_name || u.username); setDmResults([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <ChatAvatar username={u.username} avatarUrl={u.avatar_url} size={30} />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.display_name || u.username}
                      {u.is_verified_creator && <span style={{ color: 'var(--red-primary)', marginLeft: '0.25rem', fontSize: '0.75rem' }}>✓</span>}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dmSelected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(220,20,60,0.06)', border: '1px solid rgba(220,20,60,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <ChatAvatar username={dmSelected.username} avatarUrl={dmSelected.avatar_url} size={30} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{dmSelected.display_name || dmSelected.username}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{dmSelected.username}</p>
              </div>
              <button onClick={() => { setDmSelected(null); setDmSearch(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💡 Tip: Dono ko ek doosre ko follow karna zaroori hai private chat ke liye.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={startDM} disabled={!dmSelected}>
            💬 Chat Shuru Karo
          </button>
        </div>
      </Modal>

      {/* ── Report Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={reportModal.open}
        onClose={() => setReportModal({ open: false, messageId: null })}
        title="🚩 Message Report Karo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-group">
            <label className="form-label">Report ki wajah</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'spam', label: '🛑 Spam / Unwanted' },
                { value: 'harassment', label: '😡 Harassment / Bullying' },
                { value: 'inappropriate', label: '🔞 Inappropriate Content' },
                { value: 'fake', label: '🎭 Fake / Misleading' },
                { value: 'other', label: '❓ Kuch aur' },
              ].map(({ value, label }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0.5rem', borderRadius: '8px', background: reportReason === value ? 'rgba(220,20,60,0.08)' : 'transparent', border: reportReason === value ? '1px solid rgba(220,20,60,0.25)' : '1px solid transparent', transition: 'all 0.15s' }}>
                  <input type="radio" name="report_reason" value={value} checked={reportReason === value} onChange={() => setReportReason(value)} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Aur kuch batana chahte hain? (optional)"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              style={{ resize: 'none', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={() => setReportModal({ open: false, messageId: null })}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submitReport}>
              🚩 Report Bhejo
            </button>
          </div>
        </div>
      </Modal>

      {/* ── CSS ──────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
