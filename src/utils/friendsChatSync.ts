export interface SocialFriend {
  key: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  friendCode?: string;
  addedAt: string;
  online?: boolean;
  lastSeen?: string;
}

export interface ChatSharedPayload {
  kind: 'expense_split' | 'household_invite' | 'savings_goal';
  title: string;
  amount?: number;
  totalAmount?: number;
  category?: string;
  inviteCode?: string;
  householdName?: string;
  goalName?: string;
  goalCurrent?: number;
  goalTarget?: number;
  settled?: boolean;
  settledAt?: string;
  swishPhone?: string;
}

export interface SocialChatMessage {
  id: string;
  roomId: string;
  senderKey: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  createdAt: string;
  readBy: string[];
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  sharedPayload?: ChatSharedPayload;
}

const FRIENDS_STORAGE_KEY = 'dejz_friends_v1';
const ROOMS_STORAGE_KEY = 'dejz_chat_rooms_v1';
const MY_CODE_STORAGE_KEY = 'dejz_my_friend_code_v1';

let activeSocket: WebSocket | null = null;
let activeUserKey: string = '';
let activeUserName: string = '';
let activeUserEmail: string = '';
let activeUserAvatar: string | null = null;
let reconnectTimer: number | null = null;

// Live typing state per roomId -> { senderKey, senderName, expiresAt }
const typingStateByRoom: Record<
  string,
  { senderKey: string; senderName: string; expiresAt: number }
> = {};

export function normalizeSocialUserKey(
  email?: string | null,
  name?: string | null
): string {
  const e = (email || '').trim().toLowerCase();
  if (e) return e;
  const n = (name || '').trim().toLowerCase();
  if (n) return `${n.replace(/\s+/g, '.')}@dejz.local`;
  let fallback = '';
  try {
    fallback = localStorage.getItem('dejz_device_social_key') || '';
    if (!fallback) {
      fallback = `user.${Math.floor(1000 + Math.random() * 9000)}@dejz.local`;
      localStorage.setItem('dejz_device_social_key', fallback);
    }
  } catch {
    fallback = 'jag@dejz.local';
  }
  return fallback;
}

export function getRoomIdForKeys(keyA: string, keyB: string): string {
  const a = (keyA || '').trim().toLowerCase();
  const b = (keyB || '').trim().toLowerCase();
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function formatFriendCodeDisplay(code: string): string {
  const clean = (code || '').replace(/\s+/g, '').toUpperCase();
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return clean;
}

export function getStoredMyFriendCode(): string {
  try {
    const existing = localStorage.getItem(MY_CODE_STORAGE_KEY);
    if (existing && existing.trim().length >= 4) return existing.trim().toUpperCase();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    localStorage.setItem(MY_CODE_STORAGE_KEY, code);
    return code;
  } catch {
    return 'DJZ248';
  }
}

export function getMyFriendInviteCode(_email?: string | null): string {
  return formatFriendCodeDisplay(getStoredMyFriendCode());
}

export function saveStoredMyFriendCode(code: string): void {
  if (!code) return;
  try {
    localStorage.setItem(MY_CODE_STORAGE_KEY, code.trim().toUpperCase());
  } catch {
    // ignore
  }
}

export function getStoredFriends(): SocialFriend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredFriends(friends: SocialFriend[]): void {
  try {
    localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
  } catch {
    // ignore
  }
  notifySocialUpdated();
}

export function getStoredChatRooms(): Record<string, SocialChatMessage[]> {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStoredChatRooms(rooms: Record<string, SocialChatMessage[]>): void {
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
  notifySocialUpdated();
}

export function notifySocialUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dejz:social-updated'));
  }
}

export function getRoomMessages(myKey: string, friendKey: string): SocialChatMessage[] {
  const roomId = getRoomIdForKeys(myKey, friendKey);
  const rooms = getStoredChatRooms();
  return rooms[roomId] || [];
}

export function getTotalUnreadChatCount(myKey: string): number {
  if (!myKey) return 0;
  const friends = getStoredFriends();
  const rooms = getStoredChatRooms();
  let total = 0;
  for (const friend of friends) {
    const roomId = getRoomIdForKeys(myKey, friend.key);
    const msgs = rooms[roomId] || [];
    for (const m of msgs) {
      if (
        m.senderKey !== myKey &&
        (!Array.isArray(m.readBy) || !m.readBy.includes(myKey))
      ) {
        total += 1;
      }
    }
  }
  return total;
}

export function getUnreadCountForFriend(myKey: string, friendKey: string): number {
  const msgs = getRoomMessages(myKey, friendKey);
  let count = 0;
  for (const m of msgs) {
    if (
      m.senderKey !== myKey &&
      (!Array.isArray(m.readBy) || !m.readBy.includes(myKey))
    ) {
      count += 1;
    }
  }
  return count;
}

export function getActiveTypingForRoom(
  roomId: string,
  myKey: string
): { isTyping: boolean; senderName: string } {
  const entry = typingStateByRoom[roomId];
  if (!entry || entry.senderKey === myKey || Date.now() > entry.expiresAt) {
    return { isTyping: false, senderName: '' };
  }
  return { isTyping: true, senderName: entry.senderName };
}

function upsertMessageInLocalRoom(msg: SocialChatMessage): void {
  if (!msg || !msg.roomId) return;
  const rooms = getStoredChatRooms();
  const list = [...(rooms[msg.roomId] || [])];
  const idx = list.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    list[idx] = msg;
  } else {
    list.push(msg);
  }
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  rooms[msg.roomId] = list.slice(-200);
  saveStoredChatRooms(rooms);
}

export async function syncFriendsAndChatFromServer(params: {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  userPhone?: string | null;
}): Promise<void> {
  const userKey = normalizeSocialUserKey(params.userEmail, params.userName);
  const localFriends = getStoredFriends();
  const localRooms = getStoredChatRooms();

  try {
    const res = await fetch('/api/friends/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey,
        name: params.userName || 'Jag',
        email: params.userEmail || userKey,
        phone: params.userPhone || '',
        avatar: params.userAvatar || null,
        localFriends,
        localRooms,
      }),
    });

    if (!res.ok) return;
    const data = await res.json();
    if (data?.me?.friendCode) {
      saveStoredMyFriendCode(data.me.friendCode);
    }
    if (Array.isArray(data?.friends)) {
      const latestLocalFriends = getStoredFriends();
      const byKey = new Map<string, SocialFriend>();
      for (const f of latestLocalFriends) {
        const k = (f?.key || (f as any)?.userKey || '').trim().toLowerCase();
        if (k) byKey.set(k, { ...f, key: k });
      }
      for (const f of data.friends) {
        const k = (f?.key || f?.userKey || '').trim().toLowerCase();
        if (!k) continue;
        const prev = byKey.get(k);
        byKey.set(k, {
          ...(prev || {}),
          ...f,
          key: k,
          addedAt: f.addedAt || prev?.addedAt || new Date().toISOString(),
        });
      }
      saveStoredFriends(Array.from(byKey.values()));
    }
    if (data?.rooms && typeof data.rooms === 'object') {
      const latestLocalRooms = getStoredChatRooms();
      const mergedRooms: Record<string, SocialChatMessage[]> = { ...latestLocalRooms };
      for (const [rId, serverMsgs] of Object.entries(data.rooms)) {
        if (!Array.isArray(serverMsgs)) continue;
        const existing = mergedRooms[rId] || [];
        const byId = new Map<string, SocialChatMessage>();
        for (const m of existing) {
          if (m && m.id) byId.set(m.id, m);
        }
        for (const m of serverMsgs as SocialChatMessage[]) {
          if (m && m.id) byId.set(m.id, m);
        }
        mergedRooms[rId] = Array.from(byId.values()).sort((a, b) =>
          String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
        );
      }
      saveStoredChatRooms(mergedRooms);
    }
  } catch {
    // Offline fallback uses local storage
  }
}

export async function addFriendRequest(params: {
  myEmail?: string | null;
  myName?: string | null;
  myAvatar?: string | null;
  query: string;
  friendName?: string;
  friendPhone?: string;
  friendAvatar?: string | null;
}): Promise<{ ok: boolean; friend?: SocialFriend; error?: string }> {
  const myKey = normalizeSocialUserKey(params.myEmail, params.myName);
  const q = params.query.trim();
  if (!q && !params.friendName?.trim()) {
    return { ok: false, error: 'Ange vänkod, mobilnummer, e-post eller namn.' };
  }

  try {
    const res = await fetch('/api/friends/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: myKey,
        userName: params.myName || 'Jag',
        userEmail: params.myEmail || myKey,
        userAvatar: params.myAvatar || null,
        query: q || params.friendName,
        friendName: params.friendName,
        friendPhone: params.friendPhone,
        friendAvatar: params.friendAvatar,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.friend) {
      if (Array.isArray(data.friends)) {
        saveStoredFriends(data.friends);
      } else {
        const current = getStoredFriends();
        const next = [
          ...current.filter((f) => f.key !== data.friend.key),
          data.friend,
        ];
        saveStoredFriends(next);
      }
      if (Array.isArray(data.messages) && data.roomId) {
        const rooms = getStoredChatRooms();
        rooms[data.roomId] = data.messages;
        saveStoredChatRooms(rooms);
      }
      return { ok: true, friend: data.friend };
    }
    return { ok: false, error: data?.error || 'Kunde inte lägga till vän.' };
  } catch {
    // Local fallback
    const displayName = (params.friendName || q).trim();
    const fKey = normalizeSocialUserKey(
      q.includes('@') ? q : `${displayName.toLowerCase().replace(/\s+/g, '.')}@dejz.local`,
      displayName
    );
    const newFriend: SocialFriend = {
      key: fKey,
      name: displayName,
      email: fKey,
      phone: params.friendPhone || '',
      avatar: params.friendAvatar || null,
      friendCode: q.length === 6 ? q.toUpperCase() : 'DJZ812',
      addedAt: new Date().toISOString(),
      online: true,
      lastSeen: new Date().toISOString(),
    };
    const list = getStoredFriends().filter((f) => f.key !== newFriend.key);
    list.push(newFriend);
    saveStoredFriends(list);
    return { ok: true, friend: newFriend };
  }
}

export async function removeFriendRequest(myKey: string, friendKey: string): Promise<void> {
  const next = getStoredFriends().filter((f) => f.key !== friendKey);
  saveStoredFriends(next);
  try {
    await fetch('/api/friends/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey: myKey, friendKey }),
    });
  } catch {
    // ignore
  }
}

export async function sendChatMessage(params: {
  myKey: string;
  myName: string;
  myAvatar?: string | null;
  friendKey: string;
  text: string;
  replyTo?: { id: string; senderName: string; text: string };
  sharedPayload?: ChatSharedPayload;
}): Promise<SocialChatMessage | null> {
  const roomId = getRoomIdForKeys(params.myKey, params.friendKey);
  const optimisticMsg: SocialChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    senderKey: params.myKey,
    senderName: params.myName || 'Jag',
    senderAvatar: params.myAvatar || null,
    text: params.text.trim(),
    createdAt: new Date().toISOString(),
    readBy: [params.myKey],
    reactions: {},
    replyTo: params.replyTo,
    sharedPayload: params.sharedPayload,
  };

  upsertMessageInLocalRoom(optimisticMsg);

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderKey: params.myKey,
        senderName: params.myName || 'Jag',
        senderAvatar: params.myAvatar || null,
        recipientKey: params.friendKey,
        text: params.text.trim(),
        replyTo: params.replyTo,
        sharedPayload: params.sharedPayload,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.messages)) {
        const rooms = getStoredChatRooms();
        rooms[roomId] = data.messages;
        saveStoredChatRooms(rooms);
      } else if (data?.message) {
        upsertMessageInLocalRoom(data.message);
      }
      return data?.message || optimisticMsg;
    }
  } catch {
    // Keep optimistic message locally
  }
  return optimisticMsg;
}

export async function toggleMessageReaction(params: {
  myKey: string;
  friendKey: string;
  messageId: string;
  emoji: string;
}): Promise<void> {
  const roomId = getRoomIdForKeys(params.myKey, params.friendKey);
  const rooms = getStoredChatRooms();
  const list = [...(rooms[roomId] || [])];
  const idx = list.findIndex((m) => m.id === params.messageId);
  if (idx >= 0) {
    const msg = { ...list[idx] };
    const reactions = { ...(msg.reactions || {}) };
    const users = new Set(reactions[params.emoji] || []);
    if (users.has(params.myKey)) {
      users.delete(params.myKey);
    } else {
      users.add(params.myKey);
    }
    if (users.size === 0) {
      delete reactions[params.emoji];
    } else {
      reactions[params.emoji] = Array.from(users);
    }
    msg.reactions = reactions;
    list[idx] = msg;
    rooms[roomId] = list;
    saveStoredChatRooms(rooms);
  }

  try {
    await fetch('/api/chat/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: params.myKey,
        recipientKey: params.friendKey,
        roomId,
        messageId: params.messageId,
        emoji: params.emoji,
      }),
    });
  } catch {
    // ignore
  }
}

export async function toggleMessageSplitSettled(params: {
  myKey: string;
  friendKey: string;
  messageId: string;
}): Promise<void> {
  const roomId = getRoomIdForKeys(params.myKey, params.friendKey);
  const rooms = getStoredChatRooms();
  const list = [...(rooms[roomId] || [])];
  const idx = list.findIndex((m) => m.id === params.messageId);
  if (idx >= 0 && list[idx].sharedPayload) {
    const msg = { ...list[idx] };
    const nextSettled = !msg.sharedPayload!.settled;
    msg.sharedPayload = {
      ...msg.sharedPayload!,
      settled: nextSettled,
      settledAt: nextSettled ? new Date().toISOString() : undefined,
    };
    list[idx] = msg;
    rooms[roomId] = list;
    saveStoredChatRooms(rooms);
  }

  try {
    await fetch('/api/chat/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: params.myKey,
        recipientKey: params.friendKey,
        roomId,
        messageId: params.messageId,
      }),
    });
  } catch {
    // ignore
  }
}

export async function markRoomMessagesAsRead(
  myKey: string,
  friendKey: string
): Promise<void> {
  const roomId = getRoomIdForKeys(myKey, friendKey);
  const rooms = getStoredChatRooms();
  const list = rooms[roomId] || [];
  let changed = false;
  const nextList = list.map((m) => {
    if (m.senderKey !== myKey && (!Array.isArray(m.readBy) || !m.readBy.includes(myKey))) {
      changed = true;
      return {
        ...m,
        readBy: [...(m.readBy || []), myKey],
      };
    }
    return m;
  });
  if (changed) {
    rooms[roomId] = nextList;
    saveStoredChatRooms(rooms);
  }

  try {
    await fetch('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: myKey,
        recipientKey: paramsOrKey(friendKey),
        roomId,
      }),
    });
  } catch {
    // ignore
  }
}

function paramsOrKey(key: string): string {
  return (key || '').trim().toLowerCase();
}

export function sendLiveTypingSignal(params: {
  myKey: string;
  myName: string;
  friendKey: string;
  isTyping: boolean;
}): void {
  const roomId = getRoomIdForKeys(params.myKey, params.friendKey);
  if (params.isTyping) {
    typingStateByRoom[roomId] = {
      senderKey: params.myKey,
      senderName: params.myName || 'Vän',
      expiresAt: Date.now() + 4000,
    };
  } else if (typingStateByRoom[roomId]?.senderKey === params.myKey) {
    delete typingStateByRoom[roomId];
  }
  notifySocialUpdated();

  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
  try {
    activeSocket.send(
      JSON.stringify({
        type: 'chat:typing',
        senderKey: params.myKey,
        senderName: params.myName || 'Vän',
        recipientKey: params.friendKey,
        roomId,
        isTyping: params.isTyping,
      })
    );
  } catch {
    // ignore
  }
}

export function connectFriendsChatWebSocket(params: {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}): () => void {
  if (typeof window === 'undefined') return () => {};
  const nextKey = normalizeSocialUserKey(params.userEmail, params.userName);
  activeUserKey = nextKey;
  activeUserName = params.userName || 'Jag';
  activeUserEmail = params.userEmail || nextKey;
  activeUserAvatar = params.userAvatar || null;

  let isDisposed = false;

  const openSocket = () => {
    if (isDisposed) return;
    if (
      activeSocket &&
      (activeSocket.readyState === WebSocket.OPEN ||
        activeSocket.readyState === WebSocket.CONNECTING)
    ) {
      if (activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.send(
          JSON.stringify({
            type: 'user:identify',
            userKey: activeUserKey,
            name: activeUserName,
            email: activeUserEmail,
            avatar: activeUserAvatar,
          })
        );
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      activeSocket = ws;

      ws.onopen = () => {
        if (isDisposed) {
          ws.close();
          return;
        }
        ws.send(
          JSON.stringify({
            type: 'user:identify',
            userKey: activeUserKey,
            name: activeUserName,
            email: activeUserEmail,
            avatar: activeUserAvatar,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data));
          if (!payload || typeof payload !== 'object') return;

          if (payload.type === 'user:identified' && payload.friendCode) {
            saveStoredMyFriendCode(payload.friendCode);
            notifySocialUpdated();
          } else if (payload.type === 'chat:message' && payload.message) {
            upsertMessageInLocalRoom(payload.message);
          } else if (payload.type === 'chat:message:updated' && payload.message) {
            upsertMessageInLocalRoom(payload.message);
          } else if (payload.type === 'chat:typing' && payload.roomId) {
            if (payload.isTyping) {
              typingStateByRoom[payload.roomId] = {
                senderKey: payload.senderKey,
                senderName: payload.senderName || 'Vän',
                expiresAt: Date.now() + 4000,
              };
            } else {
              delete typingStateByRoom[payload.roomId];
            }
            notifySocialUpdated();
          } else if (payload.type === 'chat:read' && payload.roomId && payload.readerKey) {
            const rooms = getStoredChatRooms();
            const list = rooms[payload.roomId] || [];
            rooms[payload.roomId] = list.map((m) => {
              const r = Array.isArray(m.readBy) ? m.readBy : [];
              if (!r.includes(payload.readerKey)) {
                return { ...m, readBy: [...r, payload.readerKey] };
              }
              return m;
            });
            saveStoredChatRooms(rooms);
          } else if (payload.type === 'presence:update' && payload.userKey) {
            const friends = getStoredFriends();
            const updated = friends.map((f) =>
              f.key === payload.userKey
                ? {
                    ...f,
                    online: Boolean(payload.online),
                    lastSeen: payload.lastSeen || f.lastSeen,
                  }
                : f
            );
            saveStoredFriends(updated);
          } else if (payload.type === 'friend:added' && payload.friend) {
            const friends = getStoredFriends();
            const exists = friends.some((f) => f.key === payload.friend.key);
            if (!exists) {
              saveStoredFriends([...friends, payload.friend]);
            }
          }
        } catch {
          // ignore malformed WS frames
        }
      };

      ws.onclose = () => {
        if (activeSocket === ws) {
          activeSocket = null;
        }
        if (!isDisposed) {
          if (reconnectTimer) window.clearTimeout(reconnectTimer);
          reconnectTimer = window.setTimeout(openSocket, 3500);
        }
      };
    } catch {
      // ignore
    }
  };

  openSocket();
  void syncFriendsAndChatFromServer(params);

  return () => {
    isDisposed = true;
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
}
