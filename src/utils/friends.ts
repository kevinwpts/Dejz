/**
 * Personer du kopplat ihop dig med (används av delad budget / hushåll).
 * Sparas lokalt på enheten. Chatten som fanns här tidigare är borttagen.
 */
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

const FRIENDS_STORAGE_KEY = 'dejz_friends_v1';
const MY_CODE_STORAGE_KEY = 'dejz_my_friend_code_v1';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function formatFriendCodeDisplay(code: string): string {
  const clean = (code || '').replace(/\s+/g, '').toUpperCase();
  return clean.length === 6 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
}

function getStoredMyFriendCode(): string {
  try {
    const existing = localStorage.getItem(MY_CODE_STORAGE_KEY);
    if (existing && existing.trim().length >= 4) return existing.trim().toUpperCase();
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    localStorage.setItem(MY_CODE_STORAGE_KEY, code);
    return code;
  } catch {
    return 'DJZ248';
  }
}

/** Din personliga kod som en partner anger för att koppla ihop er. */
export function getMyFriendInviteCode(): string {
  return formatFriendCodeDisplay(getStoredMyFriendCode());
}

export function getStoredFriends(): SocialFriend[] {
  try {
    const raw = localStorage.getItem(FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SocialFriend[]) : [];
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dejz:social-updated'));
  }
}
