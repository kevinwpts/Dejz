import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  PaperPlaneTilt,
  Plus,
  Copy,
  Check,
  CaretLeft,
  CaretRight,
  Checks,
  Receipt,
  PiggyBank,
  HandCoins,
  Smiley,
  ArrowBendUpLeft,
  Trash,
  X,
  MagnifyingGlass,
  Sparkle,
  ChatCircleDots,
} from '@phosphor-icons/react';
import { TransactionItem, FixedExpenseItem, IncomeItem } from './HomeTab';
import { PeriodInfo } from '../utils/periodEngine';
import {
  SocialFriend,
  SocialChatMessage,
  ChatSharedPayload,
  normalizeSocialUserKey,
  getRoomIdForKeys,
  formatFriendCodeDisplay,
  getStoredMyFriendCode,
  getStoredFriends,
  getRoomMessages,
  getUnreadCountForFriend,
  getActiveTypingForRoom,
  addFriendRequest,
  removeFriendRequest,
  sendChatMessage,
  toggleMessageReaction,
  toggleMessageSplitSettled,
  markRoomMessagesAsRead,
  sendLiveTypingSignal,
  syncFriendsAndChatFromServer,
} from '../utils/friendsChatSync';
import {
  HouseholdState,
  getHouseholdState,
  saveHouseholdStateLocal,
  generateInviteCode,
  computeMyHouseholdSummary,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import { getSavingsGoals, SavingsGoalItem } from '../utils/appCache';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { CategoryIcon } from './CategoryIcon';

interface FriendsChatViewProps {
  period: PeriodInfo;
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  transactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  initialSelectedFriendKey?: string | null;
  onOpenHousehold: () => void;
  onOpenGoals?: () => void;
}

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '🎉', '😂'];

function formatTimeShort(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDayHeading(iso: string): string {
  if (!iso) return 'Idag';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Idag';
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const dayStr = d.toISOString().slice(0, 10);
    if (dayStr === todayStr) return 'Idag';
    if (dayStr === yesterday) return 'Igår';
    return d.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return 'Idag';
  }
}

export const FriendsChatView: React.FC<FriendsChatViewProps> = ({
  period,
  userEmail,
  userName,
  userAvatar,
  transactions,
  fixedExpenses,
  incomes,
  initialSelectedFriendKey = null,
  onOpenHousehold,
}) => {
  const myKey = useMemo(
    () => normalizeSocialUserKey(userEmail, userName),
    [userEmail, userName]
  );
  const myDisplayName = (userName || userEmail?.split('@')[0] || 'Jag').trim();

  const [friends, setFriends] = useState<SocialFriend[]>(() => getStoredFriends());
  const [myFriendCode, setMyFriendCode] = useState<string>(() => getStoredMyFriendCode());
  const [selectedFriendKey, setSelectedFriendKey] = useState<string | null>(
    initialSelectedFriendKey
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMyCode, setCopiedMyCode] = useState(false);

  // Add friend sheet state
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [addInputCodeOrEmail, setAddInputCodeOrEmail] = useState('');
  const [addInputName, setAddInputName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);

  // Chat composer & interactive sheets state
  const [messageText, setMessageText] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(
    null
  );
  const [isAttachSheetOpen, setIsAttachSheetOpen] = useState(false);
  const [attachMode, setAttachMode] = useState<
    'menu' | 'split_tx' | 'split_custom' | 'goal'
  >('menu');
  const [customSplitTitle, setCustomSplitTitle] = useState('');
  const [customSplitTotal, setCustomSplitTotal] = useState('');
  const [friendToRemove, setFriendToRemove] = useState<SocialFriend | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  useEffect(() => {
    if (initialSelectedFriendKey) {
      setSelectedFriendKey(initialSelectedFriendKey);
    }
  }, [initialSelectedFriendKey]);

  useEffect(() => {
    const onUpdate = () => {
      setFriends(getStoredFriends());
      setMyFriendCode(getStoredMyFriendCode());
      setTick((t) => t + 1);
    };
    window.addEventListener('dejz:social-updated', onUpdate);
    return () => window.removeEventListener('dejz:social-updated', onUpdate);
  }, []);

  useEffect(() => {
    void syncFriendsAndChatFromServer({
      userEmail,
      userName,
      userAvatar,
    });
  }, [userEmail, userName, userAvatar]);

  const selectedFriend = useMemo(
    () => friends.find((f) => f.key === selectedFriendKey) || null,
    [friends, selectedFriendKey]
  );

  const activeMessages: SocialChatMessage[] = useMemo(() => {
    void tick;
    if (!selectedFriend) return [];
    return getRoomMessages(myKey, selectedFriend.key);
  }, [myKey, selectedFriend, tick]);

  const activeRoomId = useMemo(
    () => (selectedFriend ? getRoomIdForKeys(myKey, selectedFriend.key) : ''),
    [myKey, selectedFriend]
  );

  const typingInfo = useMemo(() => {
    void tick;
    if (!activeRoomId) return { isTyping: false, senderName: '' };
    return getActiveTypingForRoom(activeRoomId, myKey);
  }, [activeRoomId, myKey, tick]);

  useEffect(() => {
    if (selectedFriend) {
      void markRoomMessagesAsRead(myKey, selectedFriend.key);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    }
  }, [selectedFriend?.key, activeMessages.length, myKey]);

  // Smart suggestions from household partner or Swish contacts in bank transactions
  const suggestedContacts = useMemo(() => {
    const existingNames = new Set(friends.map((f) => f.name.toLowerCase().trim()));
    const suggestions: Array<{ name: string; subtitle: string; phone?: string }> = [];

    const hh = getHouseholdState();
    if (hh?.members) {
      for (const [k, m] of Object.entries(hh.members)) {
        if (
          k !== myKey &&
          m.name &&
          !existingNames.has(m.name.toLowerCase().trim())
        ) {
          existingNames.add(m.name.toLowerCase().trim());
          suggestions.push({
            name: m.name,
            subtitle: 'Partner i din delade budget',
          });
        }
      }
    }

    for (const tx of transactions) {
      const isSwish =
        tx.category === 'Swish' ||
        (tx.paymentMethod || '').toLowerCase().includes('swish') ||
        tx.title.toLowerCase().startsWith('swish ');
      if (!isSwish) continue;
      const cleanName = tx.title
        .replace(/^swish\s+(till|från)\s+/i, '')
        .replace(/^swish\s+/i, '')
        .trim();
      if (
        cleanName.length >= 2 &&
        cleanName.length <= 28 &&
        !/\d{4,}/.test(cleanName) &&
        !existingNames.has(cleanName.toLowerCase())
      ) {
        existingNames.add(cleanName.toLowerCase());
        suggestions.push({
          name: cleanName,
          subtitle: 'Från tidigare Swish-händelse',
        });
      }
      if (suggestions.length >= 4) break;
    }

    return suggestions;
  }, [friends, transactions, myKey]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? [...friends]
      : friends.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q) ||
            (f.friendCode || '').toLowerCase().includes(q)
        );

    return list.sort((a, b) => {
      const msgsA = getRoomMessages(myKey, a.key);
      const msgsB = getRoomMessages(myKey, b.key);
      const lastA = msgsA[msgsA.length - 1]?.createdAt || a.addedAt || '';
      const lastB = msgsB[msgsB.length - 1]?.createdAt || b.addedAt || '';
      return lastB.localeCompare(lastA);
    });
  }, [friends, searchQuery, myKey, tick]);

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddingFriend(true);
    const res = await addFriendRequest({
      myEmail: userEmail,
      myName: myDisplayName,
      myAvatar: userAvatar,
      query: addInputCodeOrEmail,
      friendName: addInputName,
    });
    setAddingFriend(false);

    if (!res.ok || !res.friend) {
      setAddError(res.error || 'Kunde inte lägga till vän.');
      return;
    }

    setAddInputCodeOrEmail('');
    setAddInputName('');
    setIsAddFriendOpen(false);
    setSelectedFriendKey(res.friend.key);
  };

  const handleQuickAddSuggestion = async (name: string, phone?: string) => {
    const res = await addFriendRequest({
      myEmail: userEmail,
      myName: myDisplayName,
      myAvatar: userAvatar,
      query: name,
      friendName: name,
      friendPhone: phone,
    });
    if (res.ok && res.friend) {
      setSelectedFriendKey(res.friend.key);
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFriend || !messageText.trim()) return;
    const textToSend = messageText.trim();
    const replyRef = replyToMsg || undefined;
    setMessageText('');
    setReplyToMsg(null);
    sendLiveTypingSignal({
      myKey,
      myName: myDisplayName,
      friendKey: selectedFriend.key,
      isTyping: false,
    });

    await sendChatMessage({
      myKey,
      myName: myDisplayName,
      myAvatar: userAvatar,
      friendKey: selectedFriend.key,
      text: textToSend,
      replyTo: replyRef,
    });
  };

  const handleSendSharedCard = async (payload: ChatSharedPayload, summaryText: string) => {
    if (!selectedFriend) return;
    setIsAttachSheetOpen(false);
    setAttachMode('menu');
    await sendChatMessage({
      myKey,
      myName: myDisplayName,
      myAvatar: userAvatar,
      friendKey: selectedFriend.key,
      text: summaryText,
      sharedPayload: payload,
    });
  };

  const handleInviteFriendToHousehold = async (friend: SocialFriend) => {
    let hh: HouseholdState | null = getHouseholdState();
    const defaultCats = ['Mat & dryck', 'Boende', 'Räkningar'];
    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName: myDisplayName,
      userAvatar,
      period,
      incomes,
      fixedExpenses,
      transactions,
      sharedCategories: hh?.sharedCategories || defaultCats,
    });

    if (!hh) {
      const code = generateInviteCode();
      hh = {
        householdId: `hh-${code}`,
        inviteCode: code,
        name: `${myDisplayName} & ${friend.name}`,
        splitMode: 'equal',
        sharedCategories: defaultCats,
        members: {
          [myKey]: mySummary,
        },
        sharedFixedExpenses: fixedExpenses.filter((f) => f.isShared),
        sharedSavingsGoals: getSavingsGoals(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Add friend directly into the household members map if not already there
    if (!hh.members[friend.key]) {
      hh = {
        ...hh,
        members: {
          ...hh.members,
          [friend.key]: {
            email: friend.email || friend.key,
            name: friend.name,
            avatar: friend.avatar || null,
            totalIncome: 29500,
            sharedFixedPaid: 0,
            sharedVariableSpent: 0,
            sharedExpensesList: [],
            updatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };
    }

    saveHouseholdStateLocal(hh);
    await pushHouseholdSyncToServer(hh);

    await handleSendSharedCard(
      {
        kind: 'household_invite',
        title: hh.name || 'Gemensamt hushåll',
        inviteCode: hh.inviteCode,
        householdName: hh.name || 'Vårt hushåll',
      },
      `Jag har bjudit in dig till vår delade budget (${hh.name})!`
    );

    setStatusBanner(`${friend.name} är nu kopplad till er delade budget!`);
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleJoinHouseholdFromInviteCard = async (inviteCode?: string) => {
    if (!inviteCode) {
      onOpenHousehold();
      return;
    }
    try {
      const defaultCats = ['Mat & dryck', 'Boende', 'Räkningar'];
      const mySummary = computeMyHouseholdSummary({
        userEmail,
        userName: myDisplayName,
        userAvatar,
        period,
        incomes,
        fixedExpenses,
        transactions,
        sharedCategories: defaultCats,
      });

      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.replace(/\s+/g, '').toUpperCase(),
          memberSummary: mySummary,
          memberFixedExpenses: fixedExpenses.filter((f) => f.isShared),
          memberSavingsGoals: getSavingsGoals(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.household) {
        saveHouseholdStateLocal(data.household);
      }
    } catch {
      // ignore
    }
    onOpenHousehold();
  };

  const savingsGoals: SavingsGoalItem[] = useMemo(() => getSavingsGoals(), [tick]);

  const recentExpenseTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && Number(t.amount) > 0)
        .slice(0, 15),
    [transactions]
  );

  const currentHousehold = getHouseholdState();
  const isSelectedFriendInHousehold = Boolean(
    selectedFriend &&
      currentHousehold?.members &&
      (currentHousehold.members[selectedFriend.key] ||
        Object.values(currentHousehold.members).some(
          (m) => m.name.toLowerCase().trim() === selectedFriend.name.toLowerCase().trim()
        ))
  );

  // ============================================================================
  // VIEW A: FULL REAL-TIME CHAT CONVERSATION WITH SELECTED FRIEND
  // ============================================================================
  if (selectedFriend) {
    // Group messages by date
    const groupedMessages: Array<{ dateLabel: string; items: SocialChatMessage[] }> = [];
    for (const msg of activeMessages) {
      const label = formatDayHeading(msg.createdAt);
      const lastGroup = groupedMessages[groupedMessages.length - 1];
      if (!lastGroup || lastGroup.dateLabel !== label) {
        groupedMessages.push({ dateLabel: label, items: [msg] });
      } else {
        lastGroup.items.push(msg);
      }
    }

    return (
      <div className="flex flex-col min-h-[calc(100dvh-10.5rem)] pb-36 animate-slide-in-right">
        {/* Top Chat Header */}
        <div className="sticky top-14 z-20 bg-[var(--bg-color)]/95 backdrop-blur-xl pb-3 pt-1 border-b border-[var(--border-subtle)] mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setSelectedFriendKey(null);
                setReplyToMsg(null);
              }}
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all cursor-pointer shrink-0"
              title="Tillbaka till vänner"
            >
              <CaretLeft size={15} weight="bold" />
            </button>

            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center font-display font-semibold text-xs text-[var(--text-primary)] uppercase overflow-hidden">
                {selectedFriend.avatar ? (
                  <img
                    src={selectedFriend.avatar}
                    alt={selectedFriend.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedFriend.name.slice(0, 2)
                )}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-color)] ${
                  selectedFriend.online !== false ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-semibold text-sm text-[var(--text-primary)] truncate">
                  {selectedFriend.name}
                </span>
                {isSelectedFriendInHousehold && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium shrink-0">
                    Hushåll
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                {typingInfo.isTyping
                  ? 'Skriver...'
                  : selectedFriend.online !== false
                  ? 'Aktiv nu'
                  : 'Vän i Dejz'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isSelectedFriendInHousehold ? (
              <button
                type="button"
                onClick={onOpenHousehold}
                className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Users size={13} />
                <span>Delad budget</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleInviteFriendToHousehold(selectedFriend)}
                className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Koppla ihop gemensamt hushåll"
              >
                <Users size={13} />
                <span>Dela hushåll</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setFriendToRemove(selectedFriend)}
              className="w-8 h-8 rounded-full text-[var(--text-muted)] hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Ta bort vän"
            >
              <Trash size={15} />
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center animate-fade-in">
            {statusBanner}
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 space-y-4 py-2">
          {groupedMessages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                <ChatCircleDots size={24} weight="duotone" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                  Börja chatta med {selectedFriend.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-[260px] mx-auto leading-relaxed">
                  Skicka ett meddelande, dela på en nota direkt från dina köp eller bjud in till gemensamt hushåll.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAttachMode('split_tx');
                    setIsAttachSheetOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt size={13} />
                  <span>Dela ett köp</span>
                </button>
                {!isSelectedFriendInHousehold && (
                  <button
                    type="button"
                    onClick={() => handleInviteFriendToHousehold(selectedFriend)}
                    className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users size={13} />
                    <span>Bjud in till hushåll</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.dateLabel} className="space-y-2.5">
                <div className="flex justify-center">
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-secondary)]">
                    {group.dateLabel}
                  </span>
                </div>

                {group.items.map((msg) => {
                  const isMine = msg.senderKey === myKey;
                  const isReadByFriend =
                    isMine &&
                    Array.isArray(msg.readBy) &&
                    msg.readBy.includes(selectedFriend.key);
                  const reactionEntries = Object.entries(msg.reactions || {}).filter(
                    ([, users]) => Array.isArray(users) && users.length > 0
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMine ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="max-w-[84%] sm:max-w-[78%] space-y-1">
                        {/* Reply quote if present */}
                        {msg.replyTo && (
                          <div
                            className={`px-3 py-1.5 rounded-xl text-[11px] border-l-2 ${
                              isMine
                                ? 'bg-[var(--surface-color)] border-[var(--text-primary)] text-[var(--text-secondary)]'
                                : 'bg-[var(--surface-color)] border-emerald-500 text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {msg.replyTo.senderName}
                            </span>
                            <span className="line-clamp-1">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Shared Rich Card (Expense Split / Household Invite / Savings Goal) */}
                        {msg.sharedPayload && (
                          <div className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5 shadow-subtle">
                            {msg.sharedPayload.kind === 'expense_split' && (
                              <>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                                    <HandCoins size={14} className="text-emerald-500" />
                                    <span>Delat utlägg</span>
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                                      msg.sharedPayload.settled
                                        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {msg.sharedPayload.settled ? 'Swishad ✓' : 'Att betala'}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                                      {msg.sharedPayload.title}
                                    </span>
                                    {msg.sharedPayload.totalAmount && (
                                      <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                                        Totalt köp: {formatKr(msg.sharedPayload.totalAmount)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10.5px] text-[var(--text-secondary)] block">
                                      Andel (50 %)
                                    </span>
                                    <span className="font-display font-semibold text-base text-[var(--text-primary)] tabular-nums">
                                      {formatKr(msg.sharedPayload.amount || 0)}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleMessageSplitSettled({
                                      myKey,
                                      friendKey: selectedFriend.key,
                                      messageId: msg.id,
                                    })
                                  }
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    msg.sharedPayload.settled
                                      ? 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                      : 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                                  }`}
                                >
                                  <Check size={13} weight="bold" />
                                  <span>
                                    {msg.sharedPayload.settled
                                      ? 'Markerad som betald (Ångra)'
                                      : 'Markera som Swishad'}
                                  </span>
                                </button>
                              </>
                            )}

                            {msg.sharedPayload.kind === 'household_invite' && (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Users size={16} weight="duotone" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[11px] text-[var(--text-secondary)] block">
                                      Inbjudan till delad budget
                                    </span>
                                    <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                                      {msg.sharedPayload.householdName || 'Gemensamt hushåll'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleJoinHouseholdFromInviteCard(
                                      msg.sharedPayload?.inviteCode
                                    )
                                  }
                                  className="w-full py-2 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>Öppna gemensamt hushåll</span>
                                  <CaretRight size={12} weight="bold" />
                                </button>
                              </>
                            )}

                            {msg.sharedPayload.kind === 'savings_goal' && (
                              <>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                    <PiggyBank size={14} className="text-emerald-500" />
                                    <span>Gemensamt sparmål</span>
                                  </span>
                                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {msg.sharedPayload.goalTarget
                                      ? `${Math.min(
                                          100,
                                          Math.round(
                                            ((msg.sharedPayload.goalCurrent || 0) /
                                              msg.sharedPayload.goalTarget) *
                                              100
                                          )
                                        )} %`
                                      : ''}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-display font-semibold text-sm text-[var(--text-primary)] block">
                                    {msg.sharedPayload.goalName || msg.sharedPayload.title}
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)] tabular-nums block mt-0.5">
                                    {formatKr(msg.sharedPayload.goalCurrent || 0)} av{' '}
                                    {formatKr(msg.sharedPayload.goalTarget || 0)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        {msg.text && (
                          <div
                            className={`group relative px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed break-words ${
                              isMine
                                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] rounded-br-md'
                                : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-bl-md'
                            }`}
                          >
                            <span>{msg.text}</span>
                          </div>
                        )}

                        {/* Reactions & Meta Row */}
                        <div
                          className={`flex items-center gap-2 px-1 text-[10.5px] text-[var(--text-muted)] ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {reactionEntries.map(([emoji, users]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                toggleMessageReaction({
                                  myKey,
                                  friendKey: selectedFriend.key,
                                  messageId: msg.id,
                                  emoji,
                                })
                              }
                              className={`px-1.5 py-0.5 rounded-full border text-[11px] flex items-center gap-1 cursor-pointer ${
                                users.includes(myKey)
                                  ? 'bg-[var(--surface-color)] border-[var(--text-primary)] text-[var(--text-primary)]'
                                  : 'bg-[var(--surface-color)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span>{emoji}</span>
                              {users.length > 1 && <span>{users.length}</span>}
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionPickerMsgId((prev) =>
                                prev === msg.id ? null : msg.id
                              )
                            }
                            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Reagera"
                          >
                            <Smiley size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setReplyToMsg({
                                id: msg.id,
                                senderName: isMine ? myDisplayName : selectedFriend.name,
                                text: msg.text || msg.sharedPayload?.title || 'Delat kort',
                              })
                            }
                            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            title="Svara"
                          >
                            <ArrowBendUpLeft size={12} />
                          </button>

                          <span className="tabular-nums">{formatTimeShort(msg.createdAt)}</span>

                          {isMine && (
                            <Checks
                              size={13}
                              weight="bold"
                              className={
                                isReadByFriend
                                  ? 'text-emerald-500'
                                  : 'text-[var(--text-muted)]'
                              }
                            />
                          )}
                        </div>

                        {activeReactionPickerMsgId === msg.id && (
                          <div
                            className={`flex items-center gap-1 p-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle w-fit ${
                              isMine ? 'ml-auto' : ''
                            }`}
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  void toggleMessageReaction({
                                    myKey,
                                    friendKey: selectedFriend.key,
                                    messageId: msg.id,
                                    emoji,
                                  });
                                  setActiveReactionPickerMsgId(null);
                                }}
                                className="w-7 h-7 rounded-full hover:bg-[var(--surface-hover)] flex items-center justify-center text-sm cursor-pointer transition-transform active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {typingInfo.isTyping && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 animate-fade-in">
              <span className="inline-flex gap-1 px-3 py-2 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
              </span>
              <span>{selectedFriend.name} skriver...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Composer Bar above BottomNav */}
        <div className="sticky bottom-24 z-20 pt-2">
          <div className="rounded-2xl bg-[var(--surface-color)]/95 backdrop-blur-xl border border-[var(--border-subtle)] p-2 shadow-subtle space-y-2">
            {replyToMsg && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text-primary)] block">
                    Svarar {replyToMsg.senderName}
                  </span>
                  <span className="text-[var(--text-secondary)] truncate block">
                    {replyToMsg.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMsg(null)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttachMode('menu');
                  setIsAttachSheetOpen(true);
                }}
                className="w-9 h-9 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                title="Dela utlägg, sparmål eller hushåll"
              >
                <Plus size={16} weight="bold" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  sendLiveTypingSignal({
                    myKey,
                    myName: myDisplayName,
                    friendKey: selectedFriend.key,
                    isTyping: e.target.value.trim().length > 0,
                  });
                  if (typingTimeoutRef.current) {
                    window.clearTimeout(typingTimeoutRef.current);
                  }
                  typingTimeoutRef.current = window.setTimeout(() => {
                    sendLiveTypingSignal({
                      myKey,
                      myName: myDisplayName,
                      friendKey: selectedFriend.key,
                      isTyping: false,
                    });
                  }, 2500);
                }}
                placeholder={`Skriv till ${selectedFriend.name}...`}
                className="flex-1 min-w-0 bg-transparent border-0 px-2 py-1.5 text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />

              <button
                type="submit"
                disabled={!messageText.trim()}
                className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] disabled:opacity-35 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Skicka"
              >
                <PaperPlaneTilt size={15} weight="fill" />
              </button>
            </form>
          </div>
        </div>

        {/* BottomSheet for sharing Expense Split, Household Invite, or Savings Goal */}
        <BottomSheet
          isOpen={isAttachSheetOpen}
          onClose={() => setIsAttachSheetOpen(false)}
          title={
            attachMode === 'split_tx'
              ? 'Välj köp att dela på'
              : attachMode === 'split_custom'
              ? 'Dela valfritt belopp'
              : attachMode === 'goal'
              ? 'Dela sparmål i chatten'
              : `Dela med ${selectedFriend.name}`
          }
        >
          {attachMode === 'menu' && (
            <div className="space-y-2.5">
              <div className="ui-sheet-group">
                <button
                  type="button"
                  onClick={() => setAttachMode('split_tx')}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
                      <Receipt size={17} />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-[var(--text-primary)] block">
                        Dela ett köp från transaktioner
                      </span>
                      <span className="text-[11.5px] text-[var(--text-secondary)] block">
                        Skicka 50/50-förfrågan på ett nyligen genomfört köp
                      </span>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-[var(--text-muted)]" />
                </button>

                <button
                  type="button"
                  onClick={() => setAttachMode('split_custom')}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
                      <HandCoins size={17} />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-[var(--text-primary)] block">
                        Dela valfritt utlägg / Swish-belopp
                      </span>
                      <span className="text-[11.5px] text-[var(--text-secondary)] block">
                        Skriv in vad ni delade på och totalbelopp
                      </span>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-[var(--text-muted)]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAttachSheetOpen(false);
                    void handleInviteFriendToHousehold(selectedFriend);
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Users size={17} />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-[var(--text-primary)] block">
                        Koppla ihop gemensamt hushåll
                      </span>
                      <span className="text-[11.5px] text-[var(--text-secondary)] block">
                        Synka delade räkningar, matköp och utjämning
                      </span>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-[var(--text-muted)]" />
                </button>

                {savingsGoals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttachMode('goal')}
                    className="ui-row-btn"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
                        <PiggyBank size={17} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-[var(--text-primary)] block">
                          Dela ett sparmål
                        </span>
                        <span className="text-[11.5px] text-[var(--text-secondary)] block">
                          Visa hur långt ni har kommit mot målet
                        </span>
                      </div>
                    </div>
                    <CaretRight size={14} className="text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {attachMode === 'split_tx' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setAttachMode('menu')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <CaretLeft size={12} />
                <span>Tillbaka</span>
              </button>

              {recentExpenseTransactions.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
                  Inga utgifter hittades. Välj &quot;Dela valfritt utlägg&quot; istället.
                </p>
              ) : (
                <div className="ui-sheet-group max-h-[52dvh] overflow-y-auto">
                  {recentExpenseTransactions.map((tx) => {
                    const half = Math.round(Number(tx.amount) / 2);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() =>
                          handleSendSharedCard(
                            {
                              kind: 'expense_split',
                              title: tx.title,
                              amount: half,
                              totalAmount: Math.round(Number(tx.amount)),
                              category: tx.category,
                              settled: false,
                            },
                            `Delar utlägg för ${tx.title} (${formatKr(half)} var)`
                          )
                        }
                        className="ui-row-btn"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                            <CategoryIcon category={tx.category} size={14} />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <span className="font-medium text-[var(--text-primary)] block truncate">
                              {tx.title}
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                              {tx.date} · Totalt {formatKr(tx.amount)}
                            </span>
                          </div>
                        </div>
                        <span className="font-display font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                          Dela: {formatKr(half)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {attachMode === 'split_custom' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const total = Math.round(Number(customSplitTotal) || 0);
                if (total <= 0) return;
                const half = Math.round(total / 2);
                const title = customSplitTitle.trim() || 'Gemensamt utlägg';
                setCustomSplitTitle('');
                setCustomSplitTotal('');
                void handleSendSharedCard(
                  {
                    kind: 'expense_split',
                    title,
                    amount: half,
                    totalAmount: total,
                    settled: false,
                  },
                  `Delar utlägg för ${title} (${formatKr(half)} var)`
                );
              }}
              className="space-y-4"
            >
              <button
                type="button"
                onClick={() => setAttachMode('menu')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <CaretLeft size={12} />
                <span>Tillbaka</span>
              </button>

              <div className="ui-sheet-group">
                <label className="ui-input-row">
                  <span className="ui-info-label">Vad gäller utlägget?</span>
                  <input
                    type="text"
                    autoFocus
                    value={customSplitTitle}
                    onChange={(e) => setCustomSplitTitle(e.target.value)}
                    placeholder="T.ex. Middag eller storhandling"
                    className="ui-inline-input"
                  />
                </label>
                <label className="ui-input-row">
                  <span className="ui-info-label">Totalbelopp (kr)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customSplitTotal}
                    onChange={(e) =>
                      setCustomSplitTotal(e.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="0"
                    className="ui-inline-amount-input"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={!(Number(customSplitTotal) > 0)}
                className="ui-btn-primary"
              >
                <span>
                  Skicka delat utlägg (
                  {Number(customSplitTotal) > 0
                    ? `${formatKr(Math.round(Number(customSplitTotal) / 2))} var`
                    : '50/50'}
                  )
                </span>
              </button>
            </form>
          )}

          {attachMode === 'goal' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setAttachMode('menu')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <CaretLeft size={12} />
                <span>Tillbaka</span>
              </button>

              <div className="ui-sheet-group">
                {savingsGoals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      handleSendSharedCard(
                        {
                          kind: 'savings_goal',
                          title: g.name,
                          goalName: g.name,
                          goalCurrent: g.currentAmount,
                          goalTarget: g.targetAmount,
                        },
                        `Kolla vårt sparmål: ${g.name}!`
                      )
                    }
                    className="ui-row-btn"
                  >
                    <div className="text-left">
                      <span className="font-medium text-[var(--text-primary)] block">
                        {g.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                        {formatKr(g.currentAmount)} av {formatKr(g.targetAmount)}
                      </span>
                    </div>
                    <CaretRight size={13} className="text-[var(--text-muted)]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </BottomSheet>

        <ConfirmDialog
          isOpen={Boolean(friendToRemove)}
          title={`Ta bort ${friendToRemove?.name}?`}
          description="Er chatt och vänkoppling tas bort från din vänlista."
          confirmLabel="Ta bort"
          variant="danger"
          onConfirm={async () => {
            if (friendToRemove) {
              await removeFriendRequest(myKey, friendToRemove.key);
              setFriendToRemove(null);
              setSelectedFriendKey(null);
            }
          }}
          onCancel={() => setFriendToRemove(null)}
        />
      </div>
    );
  }

  // ============================================================================
  // VIEW B: FRIENDS LIST, PERSONAL FRIEND CODE & SHARED HOUSEHOLD SHORTCUT
  // ============================================================================
  return (
    <div className="ui-page">
      {/* 1. Din vänkod + Lägg till vän */}
      <section className="ui-card-p space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11.5px] text-[var(--text-secondary)] block">
              Din personliga vänkod
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-display font-semibold text-lg tracking-wider text-[var(--text-primary)] tabular-nums">
                {formatFriendCodeDisplay(myFriendCode)}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(myFriendCode);
                  setCopiedMyCode(true);
                  setTimeout(() => setCopiedMyCode(false), 2000);
                }}
                className="px-2.5 py-1 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedMyCode ? (
                  <>
                    <Check size={12} weight="bold" className="text-emerald-500" />
                    <span>Kopierad</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Kopiera</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setIsAddFriendOpen(true);
            }}
            className="px-3.5 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <UserPlus size={15} weight="bold" />
            <span>Lägg till vän</span>
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Lägg till vänner eller din partner för att chatta direkt i appen, dela på utlägg och enkelt koppla ihop ett gemensamt hushåll.
        </p>
      </section>

      {/* 2. Snabbförslag (från Hushåll eller Swish-historik) */}
      {suggestedContacts.length > 0 && (
        <section className="ui-section">
          <div className="ui-section-header">
            <h2 className="ui-section-title">
              <Sparkle size={14} weight="fill" className="text-emerald-500" />
              <span>Föreslagna kontakter</span>
            </h2>
          </div>

          <div className="ui-list-card">
            {suggestedContacts.map((sug) => (
              <div
                key={sug.name}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center font-display font-semibold text-xs text-[var(--text-primary)] uppercase shrink-0">
                    {sug.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title">{sug.name}</span>
                    <span className="ui-row-subtitle">{sug.subtitle}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAddSuggestion(sug.name, sug.phone)}
                  className="ui-btn-sm"
                >
                  <Plus size={12} weight="bold" />
                  <span>Lägg till</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Vänner & Meddelanden */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">
            Meddelanden ({friends.length})
          </h2>
          {currentHousehold && (
            <button
              type="button"
              onClick={onOpenHousehold}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <Users size={13} />
              <span>Delad budget</span>
            </button>
          )}
        </div>

        {friends.length > 2 && (
          <div className="ui-search-box">
            <MagnifyingGlass size={15} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök bland dina vänner..."
              className="ui-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {filteredFriends.length === 0 ? (
          <div className="ui-card-p py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
              <Users size={22} weight="duotone" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Inga vänner tillagda än
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-[250px] mx-auto leading-relaxed">
                Lägg till din partner eller kompisar med deras vänkod, namn eller e-post för att börja chatta och dela på utgifter.
              </p>
            </div>
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => setIsAddFriendOpen(true)}
                className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={14} weight="bold" />
                <span>Lägg till din första vän</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="ui-list-card">
            {filteredFriends.map((friend) => {
              const roomMsgs = getRoomMessages(myKey, friend.key);
              const lastMsg = roomMsgs[roomMsgs.length - 1];
              const unreadCount = getUnreadCountForFriend(myKey, friend.key);
              const roomTyping = getActiveTypingForRoom(
                getRoomIdForKeys(myKey, friend.key),
                myKey
              );
              const inSameHh = Boolean(
                currentHousehold?.members &&
                  (currentHousehold.members[friend.key] ||
                    Object.values(currentHousehold.members).some(
                      (m) =>
                        m.name.toLowerCase().trim() === friend.name.toLowerCase().trim()
                    ))
              );

              return (
                <button
                  key={friend.key}
                  type="button"
                  onClick={() => setSelectedFriendKey(friend.key)}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center font-display font-semibold text-xs text-[var(--text-primary)] uppercase overflow-hidden">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          friend.name.slice(0, 2)
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-color)] ${
                          friend.online !== false ? 'bg-emerald-500' : 'bg-zinc-400'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[13.5px] truncate ${
                            unreadCount > 0
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {friend.name}
                        </span>
                        {inSameHh && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium shrink-0">
                            Hushåll
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[12px] block truncate mt-0.5 ${
                          roomTyping.isTyping
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : unreadCount > 0
                            ? 'text-[var(--text-primary)] font-medium'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {roomTyping.isTyping
                          ? 'Skriver...'
                          : lastMsg
                          ? `${lastMsg.senderKey === myKey ? 'Du: ' : ''}${
                              lastMsg.text ||
                              lastMsg.sharedPayload?.title ||
                              'Delat kort'
                            }`
                          : 'Tryck för att skicka ett meddelande'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {lastMsg && (
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {formatTimeShort(lastMsg.createdAt)}
                      </span>
                    )}
                    {unreadCount > 0 ? (
                      <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-emerald-500 text-white text-[10.5px] font-semibold flex items-center justify-center tabular-nums">
                        {unreadCount}
                      </span>
                    ) : (
                      <CaretRight size={13} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* BottomSheet: Lägg till vän */}
      <BottomSheet
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        title="Lägg till vän"
      >
        <form onSubmit={handleAddFriendSubmit} className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Skriv in din väns 6-siffriga vänkod, e-postadress eller namn. När ni är vänner kan ni chatta och enkelt koppla ihop delad budget.
          </p>

          <div className="ui-sheet-group">
            <label className="ui-input-row">
              <span className="ui-info-label">Vänkod eller e-post</span>
              <input
                type="text"
                autoFocus
                value={addInputCodeOrEmail}
                onChange={(e) => {
                  setAddInputCodeOrEmail(e.target.value);
                  setAddError(null);
                }}
                placeholder="T.ex. DJZ 482 eller e-post"
                className="ui-inline-input"
              />
            </label>

            <label className="ui-input-row">
              <span className="ui-info-label">Visningsnamn</span>
              <input
                type="text"
                value={addInputName}
                onChange={(e) => {
                  setAddInputName(e.target.value);
                  setAddError(null);
                }}
                placeholder="T.ex. Moa eller Alex"
                className="ui-inline-input"
              />
            </label>
          </div>

          {addError && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 text-center">
              {addError}
            </p>
          )}

          <button
            type="submit"
            disabled={
              addingFriend ||
              (!addInputCodeOrEmail.trim() && !addInputName.trim())
            }
            className="ui-btn-primary"
          >
            <UserPlus size={15} weight="bold" />
            <span>{addingFriend ? 'Lägger till...' : 'Lägg till i vänner'}</span>
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
