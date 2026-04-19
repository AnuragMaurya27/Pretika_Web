import axios from 'axios';

const BASE = 'https://pretika-api-1.onrender.com';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hvu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const refresh = localStorage.getItem('hvu_refresh');
      if (refresh) {
        try {
          const res = await axios.post(`${BASE}/api/auth/refresh`, { refresh_token: refresh });
          const { access_token, refresh_token } = res.data.data;
          localStorage.setItem('hvu_token', access_token);
          localStorage.setItem('hvu_refresh', refresh_token);
          orig.headers.Authorization = `Bearer ${access_token}`;
          return api(orig);
        } catch {
          localStorage.removeItem('hvu_token');
          localStorage.removeItem('hvu_refresh');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── AUTH ─────────────────────────────────────────────────────────────────────
// LoginRequest.EmailOrUsername → snake: email_or_username
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: ({ email_or_username, password }) =>
    api.post('/api/auth/login', { email_or_username, password }),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: ({ token, new_password }) =>
    api.post('/api/auth/reset-password', { token, new_password }),
  refreshToken: (refresh_token) => api.post('/api/auth/refresh', { refresh_token }),
  logout: (refresh_token) => api.post('/api/auth/logout', { refresh_token }),
};

// ── USERS ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  getMe: () => api.get('/api/users/me'),
  updateProfile: (data) => api.put('/api/users/me', data),
  getProfile: (username) => api.get(`/api/users/${username}`),
  follow: (userId) => api.post(`/api/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/api/users/${userId}/follow`),
  getFollowers: (userId, page = 1) => api.get(`/api/users/${userId}/followers?page=${page}`),
  getFollowing: (userId, page = 1) => api.get(`/api/users/${userId}/following?page=${page}`),
  search: (q, page = 1) => api.get(`/api/users/search?q=${encodeURIComponent(q)}&page=${page}`),
  applyCreator: (data) => api.post('/api/users/creator-application', data),
  updateAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.put('/api/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── STORIES ───────────────────────────────────────────────────────────────────
// Routes: GET /api/stories (list), GET /api/stories/{slug}, GET /api/stories/id/{id}
// Episodes (NOT chapters): GET /api/stories/{storyId}/episodes
// CreateStoryRequest: { title, summary?, category_id?, story_type, language, age_rating, tags[] }
// CreateEpisodeRequest: { title, content, access_type, unlock_coin_cost, scheduled_publish_at? }

// Helper: snake_case → PascalCase for [FromQuery] backend binding
const toStoryParams = (p = {}) => {
  const m = {};
  if (p.sort_by          !== undefined) m.SortBy          = p.sort_by;
  if (p.page_size        !== undefined) m.PageSize        = p.page_size;
  if (p.page             !== undefined) m.Page            = p.page;
  if (p.category         !== undefined) m.Category        = p.category;
  if (p.language         !== undefined) m.Language        = p.language;
  if (p.story_type       !== undefined) m.StoryType       = p.story_type;
  if (p.age_rating       !== undefined) m.AgeRating       = p.age_rating;
  if (p.search           !== undefined) m.Search          = p.search;
  if (p.creator_username !== undefined) m.CreatorUsername = p.creator_username;
  if (p.date_from        !== undefined) m.DateFrom        = p.date_from;
  if (p.date_to          !== undefined) m.DateTo          = p.date_to;
  if (p.status           !== undefined) m.status          = p.status;
  return m;
};

export const storiesAPI = {
  list: (params = {}) => api.get('/api/stories?' + new URLSearchParams(toStoryParams(params)).toString()),
  getBySlug: (slug) => api.get(`/api/stories/${slug}`),
  getById: (id) => api.get(`/api/stories/id/${id}`),
  getCategories: () => api.get('/api/stories/categories'),
  createCategory: (data) => api.post('/api/stories/categories', data),
  deleteCategory: (id) => api.delete(`/api/stories/categories/${id}`),
  create: (data) => api.post('/api/stories', data),
  update: (id, data) => api.put(`/api/stories/${id}`, data),
  delete: (id) => api.delete(`/api/stories/${id}`),
  publish: (id) => api.post(`/api/stories/${id}/publish`),
  unpublish: (id) => api.post(`/api/stories/${id}/unpublish`),
  getEpisodes: (storyId) => api.get(`/api/stories/${storyId}/episodes`),
  getEpisode: (storyId, episodeId) => api.get(`/api/stories/${storyId}/episodes/${episodeId}`),
  createEpisode: (storyId, data) => api.post(`/api/stories/${storyId}/episodes`, data),
  updateEpisode: (storyId, episodeId, data) => api.put(`/api/stories/${storyId}/episodes/${episodeId}`, data),
  deleteEpisode: (storyId, episodeId) => api.delete(`/api/stories/${storyId}/episodes/${episodeId}`),
  publishEpisode: (storyId, episodeId) => api.post(`/api/stories/${storyId}/episodes/${episodeId}/publish`),
  unlockEpisode: (episodeId) => api.post(`/api/stories/episodes/${episodeId}/unlock`),
  rate: (storyId, rating) => api.post(`/api/stories/${storyId}/rate`, { rating }),
  like: (storyId) => api.post(`/api/stories/${storyId}/like`),
  unlike: (storyId) => api.delete(`/api/stories/${storyId}/like`),
  bookmark: (storyId) => api.post(`/api/stories/${storyId}/bookmark`),
  unbookmark: (storyId) => api.delete(`/api/stories/${storyId}/bookmark`),
  getCreatorStories: (creatorId, params = {}) =>
    api.get(`/api/stories/creator/${creatorId}?` + new URLSearchParams(params).toString()),
  getMyStories: (params = {}) => {
    const q = {};
    // IMPORTANT: Only send status if non-empty — empty string breaks PostgreSQL enum cast on backend
    if (params.status)    q.status   = params.status;
    if (params.page)      q.page     = params.page;
    if (params.page_size) q.pageSize = params.page_size;
    return api.get('/api/stories/my?' + new URLSearchParams(q).toString());
  },
  getBookmarked: (page = 1) => api.get(`/api/stories/bookmarked?page=${page}`),
  uploadThumbnail: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/stories/upload-thumbnail', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── COMMENTS ──────────────────────────────────────────────────────────────────
// CreateCommentRequest: { story_id (required), content, episode_id?, parent_comment_id? }
export const commentsAPI = {
  getStoryComments: (storyId, page = 1) =>
    api.get(`/api/stories/${storyId}/comments?page=${page}`),
  getReplies: (commentId) => api.get(`/api/comments/${commentId}/replies`),
  create: (storyId, { content, parent_comment_id, episode_id } = {}) =>
    api.post(`/api/stories/${storyId}/comments`, {
      story_id: storyId,
      content,
      ...(parent_comment_id && { parent_comment_id }),
      ...(episode_id && { episode_id }),
    }),
  delete: (commentId) => api.delete(`/api/comments/${commentId}`),
  like: (commentId) => api.post(`/api/comments/${commentId}/like`),
  unlike: (commentId) => api.delete(`/api/comments/${commentId}/like`),
  report: (commentId, data) => api.post(`/api/comments/${commentId}/report`, data),
  pin: (storyId, commentId) => api.post(`/api/stories/${storyId}/comments/${commentId}/pin`),
  unpin: (storyId, commentId) => api.delete(`/api/stories/${storyId}/comments/${commentId}/pin`),
};

// ── WALLET ────────────────────────────────────────────────────────────────────
// AppreciateRequest: { receiver_id (Guid), story_id?, coin_amount }
// WithdrawalRequest: { coin_amount (min 1000), payment_method, upi_id? }
// VerifyRechargeRequest: { transaction_id (Guid), gateway_transaction_id, gateway_signature? }
export const walletAPI = {
  getWallet: () => api.get('/api/wallet'),
  getTransactions: (page = 1, page_size = 20) =>
    api.get(`/api/wallet/transactions?page=${page}&page_size=${page_size}`),
  getRechargePacks: () => api.get('/api/wallet/recharge-packs'),
  initiateRecharge: ({ pack_id, payment_gateway = 'razorpay' }) =>
    api.post('/api/wallet/recharge/initiate', { pack_id, payment_gateway }),
  verifyRecharge: ({ transaction_id, gateway_transaction_id, gateway_signature }) =>
    api.post('/api/wallet/recharge/verify', {
      transaction_id,
      gateway_transaction_id,
      ...(gateway_signature && { gateway_signature }),
    }),
  appreciate: ({ receiver_id, story_id, coin_amount }) =>
    api.post('/api/wallet/appreciate', { receiver_id, story_id, coin_amount }),
  requestWithdrawal: ({ coin_amount, upi_id, payment_method = 'upi' }) =>
    api.post('/api/wallet/withdrawal/request', { coin_amount, payment_method, upi_id }),
  getWithdrawalHistory: () => api.get('/api/wallet/withdrawal/history'),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getList: (page = 1) => api.get(`/api/notifications?page=${page}`),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markAsRead: (id) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/mark-all-read'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
  getPreferences: () => api.get('/api/notifications/preferences'),
  updatePreferences: (data) => api.put('/api/notifications/preferences', data),
  getAnnouncements: () => api.get('/api/announcements'),
};

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
export const leaderboardAPI = {
  get: (type, period_type) =>
    api.get(`/api/leaderboard/${type}${period_type ? '?period_type=' + period_type : ''}`),
  getCompetitions: (active_only = true, page = 1) =>
    api.get(`/api/competitions?active_only=${active_only}&page=${page}`),
  getCompetition: (id) => api.get(`/api/competitions/${id}`),
  getEntries: (id, page = 1) => api.get(`/api/competitions/${id}/entries?page=${page}`),
  submitEntry: (id, { story_id }) => api.post(`/api/competitions/${id}/enter`, { story_id }),
  vote: (id, entryId) => api.post(`/api/competitions/${id}/entries/${entryId}/vote`),
};

// ── CHAT ──────────────────────────────────────────────────────────────────────
// SendMessageRequest: { message_type, content?, sticker_id? }
// StartPrivateChatRequest: { target_user_id (Guid) }
export const chatAPI = {
  getPublicRooms: () => api.get('/api/chat/rooms/public'),
  getPrivateChats: () => api.get('/api/chat/rooms/private'),
  startPrivateChat: ({ target_user_id }) =>
    api.post('/api/chat/rooms/private', { target_user_id }),
  getMessages: (roomId, page = 1, page_size = 50) =>
    api.get(`/api/chat/rooms/${roomId}/messages?page=${page}&page_size=${page_size}`),
  sendMessage: (roomId, { message_type = 'text', content, sticker_id, image_url, super_chat_coins }) =>
    api.post(`/api/chat/rooms/${roomId}/messages`, {
      message_type,
      ...(content !== undefined && content !== null && { content }),
      ...(sticker_id && { sticker_id }),
      ...(image_url && { image_url }),
      ...(super_chat_coins > 0 && { super_chat_coins }),
    }),
  deleteMessage: (messageId) => api.delete(`/api/chat/messages/${messageId}`),
  joinRoom: (roomId) => api.post(`/api/chat/rooms/${roomId}/join`),
  leaveRoom: (roomId) => api.post(`/api/chat/rooms/${roomId}/leave`),
  getStickerPacks: () => api.get('/api/chat/sticker-packs'),
  buyStickerPack: (id) => api.post(`/api/chat/sticker-packs/${id}/buy`),
  uploadChatImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/chat/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  reportMessage: (messageId, data) => api.post(`/api/chat/messages/${messageId}/report`, data),
};

// ── SUPPORT ───────────────────────────────────────────────────────────────────
// AddTicketMessageRequest: { message } (NOT content!)
export const supportAPI = {
  getCategories: () => api.get('/api/support/categories'),
  createTicket: ({ category_id, subject, description, priority = 'medium' }) =>
    api.post('/api/support/tickets', { category_id, subject, description, priority }),
  getMyTickets: (status, page = 1) =>
    api.get(`/api/support/tickets?page=${page}${status ? '&status=' + status : ''}`),
  getTicket: (id) => api.get(`/api/support/tickets/${id}`),
  getTicketMessages: (id) => api.get(`/api/support/tickets/${id}/messages`),
  addMessage: (id, message) => api.post(`/api/support/tickets/${id}/messages`, { message }),
  closeTicket: (id) => api.post(`/api/support/tickets/${id}/close`),
  rateTicket: (id, { rating, feedback = '' }) =>
    api.post(`/api/support/tickets/${id}/rate`, { rating, feedback }),
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getWarRoom: () => api.get('/api/admin/war-room'),
  getUsers: (params = {}) => api.get('/api/admin/users?' + new URLSearchParams(params).toString()),
  banUser: (id, { reason, duration_days = 30 }) =>
    api.post(`/api/admin/users/${id}/ban`, { reason, duration_days }),
  unbanUser: (id) => api.post(`/api/admin/users/${id}/unban`),
  addStrike: (id, data) => api.post(`/api/admin/users/${id}/strike`, data),
  creditCoins: (id, data) => api.post(`/api/admin/users/${id}/credit-coins`, data),
  getPendingCreators: () => api.get('/api/admin/creators/pending'),
  approveCreator: (id, data) => api.post(`/api/admin/creators/${id}/approve`, data),
  rejectCreator: (id, data) => api.post(`/api/admin/creators/${id}/reject`, data),
  verifyCreator: (id) => api.post(`/api/admin/creators/${id}/verify`),
  getStories: (params = {}) => api.get('/api/admin/stories?' + new URLSearchParams(params).toString()),
  featureStory: (id, data) => api.post(`/api/admin/stories/${id}/feature`, data),
  removeStory: (id, data) => api.post(`/api/admin/stories/${id}/remove`, data),
  restoreStory: (id) => api.post(`/api/admin/stories/${id}/restore`),
  getReports: (params = {}) => api.get('/api/admin/reports?' + new URLSearchParams(params).toString()),
  resolveReport: (id, data) => api.post(`/api/admin/reports/${id}/resolve`, data),
  getWithdrawals: (params = {}) => api.get('/api/admin/withdrawals?' + new URLSearchParams(params).toString()),
  approveWithdrawal: (id, data) => api.post(`/api/admin/withdrawals/${id}/approve`, data),
  rejectWithdrawal: (id, data) => api.post(`/api/admin/withdrawals/${id}/reject`, data),
  getAnnouncements: () => api.get('/api/admin/announcements'),
  createAnnouncement: (data) => api.post('/api/admin/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/api/admin/announcements/${id}`),
  getFraudAlerts: (params = {}) => api.get('/api/admin/fraud-alerts?' + new URLSearchParams(params).toString()),
  resolveFraudAlert: (id, data) => api.post(`/api/admin/fraud-alerts/${id}/resolve`, data),
  getAnalytics: () => api.get('/api/admin/analytics'),
  getAlgorithmConfig: () => api.get('/api/admin/algorithm-config'),
  updateAlgorithmConfig: (data) => api.put('/api/admin/algorithm-config', data),
  getEmergencyOverrides: () => api.get('/api/admin/emergency-overrides'),
  toggleOverride: (id, data) => api.post(`/api/admin/emergency-overrides/${id}/toggle`, data),
};

// ── CREATOR ────────────────────────────────────────────────────────────────────
export const creatorAPI = {
  getStats: () => api.get('/api/creator/stats'),
};

export default api;
