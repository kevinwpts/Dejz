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
  ArrowBendUpLeft,
  Trash,
  X,
  MagnifyingGlass,
  ChatCircleDots,
  DotsThree,
  ThumbsUp,
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
  hasConnectedHouseholdPartner,
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
  onSelectFriendKey?: (key: string | null) => void;
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
  onSelectFriendKey,
  onOpenHousehold,
}) => {
  const myKey = useMemo(
    () => normalizeSocialUserKey(userEmail, userName),
    [userEmail, userName]
  );
  const myDisplayName = (userName || userEmail?.split('@')[0] || 'Jag').trim();

  const [friends, setFriends] = useState<SocialFriend[]>(() => getStoredFriends());
  const [myFriendCode, setMyFriendCode] = useState<string>(() => getStoredMyFriendCode());
  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(
    initialSelectedFriendKey
  );

  const selectedFriendKey =
    initialSelectedFriendKey !== undefined ? initialSelectedFriendKey : internalSelectedKey;

  const updateSelectedFriendKey = (nextKey: string | null) => {
    setInternalSelectedKey(nextKey);
    if (onSelectFriendKey) {
      onSelectFriendKey(nextKey);
    }
  };

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
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [isAttachSheetOpen, setIsAttachSheetOpen] = useState(false);
  const [isFriendOptionsOpen, setIsFriendOptionsOpen] = useState(false);
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
    setInternalSelectedKey(initialSelectedFriendKey);
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
    updateSelectedFriendKey(res.friend.key);
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

    setStatusBanner(`${friend.name} är nu kopplad till er delade budget`);
    setTimeout(() => setStatusBanner(null), 3000);
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
  // VIEW A: CLEAN 1-ON-1 CHAT CONVERSATION
  // ============================================================================
  if (selectedFriend) {
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
      <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+var(--safe-top,env(safe-area-inset-top,0px))+8px)] z-40 bg-[var(--bg-color)] flex flex-col max-w-md mx-auto overflow-hidden animate-slide-in-right">
        {/* Compact Status & Quick Action Bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-color)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => updateSelectedFriendKey(null)}
              className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
              title="Tillbaka till vänner"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center font-display font-semibold text-xs text-[var(--text-primary)] uppercase shrink-0 relative">
              {selectedFriend.name.slice(0, 2)}
              <span
                className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[var(--surface-color)] ${
                  selectedFriend.online !== false ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
            </div>
            <div className="min-w-0">
              <span className="font-display font-semibold text-xs text-[var(--text-primary)] truncate block leading-tight">
                {selectedFriend.name}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] truncate block leading-tight">
                {typingInfo.isTyping
                  ? 'Skriver...'
                  : selectedFriend.online !== false
                  ? 'Aktiv nu'
                  : 'Frånkopplad'}
                {isSelectedFriendInHousehold ? ' · Delad budget' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isSelectedFriendInHousehold) {
                  onOpenHousehold();
                } else {
                  void handleInviteFriendToHousehold(selectedFriend);
                }
              }}
              className="px-2.5 py-1 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Users size={12} />
              <span>{isSelectedFriendInHousehold ? 'Delad budget' : 'Dela budget'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFriendOptionsOpen(true)}
              className="w-7 h-7 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              title="Alternativ"
            >
              <DotsThree size={16} weight="bold" />
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="m-2.5 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center shrink-0 animate-fade-in">
            {statusBanner}
          </div>
        )}

        {/* Scrollable Messages Stream */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 overscroll-contain"
          onClick={() => {
            if (activeActionMsgId) setActiveActionMsgId(null);
          }}
        >
          {groupedMessages.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto font-display font-semibold text-xs text-[var(--text-primary)] uppercase">
                {selectedFriend.name.slice(0, 2)}
              </div>
              <div className="space-y-1">
                <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
                   Säg hej till {selectedFriend.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-[220px] mx-auto">
                  Skicka ett meddelande eller tryck på + för att dela ett köp.
                </p>
              </div>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.dateLabel} className="space-y-2">
                <div className="flex justify-center py-1">
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
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
                  const isActionOpen = activeActionMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="max-w-[82%] sm:max-w-[76%] space-y-1">
                        {/* Reply quote if present */}
                        {msg.replyTo && (
                          <div
                            className={`px-3 py-1.5 rounded-xl text-[11px] border-l-2 bg-[var(--surface-color)] border-[var(--border-control)] text-[var(--text-secondary)]`}
                          >
                            <span className="font-semibold text-[var(--text-primary)] block">
                              {msg.replyTo.senderName}
                            </span>
                            <span className="line-clamp-1">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Shared Rich Card (Expense Split / Household Invite / Savings Goal) */}
                        {msg.sharedPayload && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMsgId((prev) =>
                                prev === msg.id ? null : msg.id
                              );
                            }}
                            className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5 shadow-subtle cursor-pointer"
                          >
                            {msg.sharedPayload.kind === 'expense_split' && (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                    Delat utlägg · 50/50
                                  </span>
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      msg.sharedPayload.settled
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {msg.sharedPayload.settled ? 'Betald ✓' : 'Att betala'}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                                      {msg.sharedPayload.title}
                                    </span>
                                    {msg.sharedPayload.totalAmount && (
                                      <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                                        Totalt {formatKr(msg.sharedPayload.totalAmount)}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-display font-bold text-base text-[var(--text-primary)] tabular-nums shrink-0">
                                    {formatKr(msg.sharedPayload.amount || 0)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleMessageSplitSettled({
                                      myKey,
                                      friendKey: selectedFriend.key,
                                      messageId: msg.id,
                                    });
                                  }}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    msg.sharedPayload.settled
                                      ? 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                      : 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                                  }`}
                                >
                                  <Check size={13} weight="bold" />
                                  <span>
                                    {msg.sharedPayload.settled
                                      ? 'Markerad som betald'
                                      : 'Markera som betald'}
                                  </span>
                                </button>
                              </>
                            )}

                            {msg.sharedPayload.kind === 'household_invite' && (
                              <>
                                <div>
                                  <span className="text-[11px] text-[var(--text-secondary)] block">
                                    Delad budget
                                  </span>
                                  <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                                    {msg.sharedPayload.householdName || 'Gemensamt hushåll'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleJoinHouseholdFromInviteCard(
                                      msg.sharedPayload?.inviteCode
                                    );
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>Öppna delad budget</span>
                                  <CaretRight size={12} weight="bold" />
                                </button>
                              </>
                            )}

                            {msg.sharedPayload.kind === 'savings_goal' && (
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="text-[11px] text-[var(--text-secondary)] block">
                                    Sparmål
                                  </span>
                                  <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                                    {msg.sharedPayload.goalName || msg.sharedPayload.title}
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)] tabular-nums block">
                                    {formatKr(msg.sharedPayload.goalCurrent || 0)} av{' '}
                                    {formatKr(msg.sharedPayload.goalTarget || 0)}
                                  </span>
                                </div>
                                <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
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
                            )}
                          </div>
                        )}

                        {/* Clean Text Bubble (Omits duplicate fallback summary if rich card is present) */}
                        {(() => {
                          const isRedundantCardText = Boolean(
                            msg.sharedPayload &&
                              msg.text &&
                              (msg.text.startsWith('Delar utlägg för') ||
                                msg.text.startsWith('Jag har bjudit in dig') ||
                                msg.text.startsWith('Delar sparmål:') ||
                                msg.text === msg.sharedPayload.title)
                          );
                          if (!msg.text || isRedundantCardText) return null;

                          if (msg.text === '👍') {
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMsgId((prev) =>
                                    prev === msg.id ? null : msg.id
                                  );
                                }}
                                className="text-3xl py-1 cursor-pointer select-none hover:scale-110 active:scale-95 transition-transform"
                                title="Tumme upp"
                              >
                                👍
                              </div>
                            );
                          }

                          return (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMsgId((prev) =>
                                  prev === msg.id ? null : msg.id
                                );
                              }}
                              className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed break-words cursor-pointer transition-opacity active:opacity-85 ${
                                isMine
                                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] rounded-br-sm'
                                  : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-bl-sm'
                              }`}
                            >
                              <span>{msg.text}</span>
                            </div>
                          );
                        })()}

                        {/* Tap-triggered Reaction & Reply Popover */}
                        {isActionOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 p-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle w-fit animate-scale-in ${
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
                                  setActiveActionMsgId(null);
                                }}
                                className="w-7 h-7 rounded-full hover:bg-[var(--surface-hover)] flex items-center justify-center text-sm cursor-pointer transition-transform active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyToMsg({
                                  id: msg.id,
                                  senderName: isMine ? myDisplayName : selectedFriend.name,
                                  text: msg.text || msg.sharedPayload?.title || 'Delat kort',
                                });
                                setActiveActionMsgId(null);
                              }}
                              className="px-2.5 h-7 rounded-full hover:bg-[var(--surface-hover)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer border-l border-[var(--border-subtle)]"
                            >
                              <ArrowBendUpLeft size={12} />
                              <span>Svara</span>
                            </button>
                          </div>
                        )}

                        {/* Minimal Metadata Row: Reactions + Time */}
                        <div
                          className={`flex items-center gap-1.5 px-1 text-[10.5px] text-[var(--text-muted)] ${
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

                          <span className="tabular-nums">{formatTimeShort(msg.createdAt)}</span>

                          {isMine && (
                            <Checks
                              size={12}
                              weight="bold"
                              className={
                                isReadByFriend
                                  ? 'text-emerald-500'
                                  : 'text-[var(--text-muted)]'
                              }
                            />
                          )}
                        </div>
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
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Docked Messenger-Style Bottom Composer Bar */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-color)]/95 backdrop-blur-xl px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
          <div className="space-y-2 max-w-md mx-auto">
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
                className="w-9 h-9 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] transition-all active:scale-95 cursor-pointer shrink-0"
                title="Dela köp, utlägg eller sparmål"
              >
                <Plus size={16} weight="bold" />
              </button>

              <div className="flex-1 min-w-0 flex items-center bg-[var(--bg-color)] border border-[var(--border-subtle)] focus-within:border-[var(--text-primary)] rounded-full px-3.5 py-1.5 transition-colors">
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
                  placeholder={`Meddelande till ${selectedFriend.name}...`}
                  className="w-full bg-transparent border-0 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
              </div>

              {messageText.trim() ? (
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center transition-all active:scale-90 hover:opacity-90 cursor-pointer shrink-0 shadow-sm animate-scale-in"
                  title="Skicka"
                >
                  <PaperPlaneTilt size={16} weight="fill" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void sendChatMessage({
                      myKey,
                      myName: myDisplayName,
                      myAvatar: userAvatar,
                      friendKey: selectedFriend.key,
                      text: '👍',
                    });
                  }}
                  className="w-9 h-9 rounded-full text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-color)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
                  title="Skicka tumme upp"
                >
                  <ThumbsUp size={18} weight="fill" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Friend Options Sheet */}
        <BottomSheet
          isOpen={isFriendOptionsOpen}
          onClose={() => setIsFriendOptionsOpen(false)}
          title={selectedFriend.name}
        >
          <div className="space-y-3">
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => {
                  setIsFriendOptionsOpen(false);
                  if (isSelectedFriendInHousehold) {
                    onOpenHousehold();
                  } else {
                    void handleInviteFriendToHousehold(selectedFriend);
                  }
                }}
                className="ui-row-btn"
              >
                <div className="flex items-center gap-3">
                  <Users size={17} className="text-[var(--text-secondary)]" />
                  <span className="font-medium text-[var(--text-primary)]">
                    {isSelectedFriendInHousehold
                      ? 'Öppna delad budget'
                      : 'Koppla ihop delad budget'}
                  </span>
                </div>
                <CaretRight size={14} className="text-[var(--text-muted)]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFriendOptionsOpen(false);
                  setFriendToRemove(selectedFriend);
                }}
                className="ui-row-btn"
              >
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <Trash size={17} />
                  <span className="font-medium">Ta bort vän</span>
                </div>
              </button>
            </div>
          </div>
        </BottomSheet>

        {/* BottomSheet for sharing Expense Split, Household Invite, or Savings Goal */}
        <BottomSheet
          isOpen={isAttachSheetOpen}
          onClose={() => setIsAttachSheetOpen(false)}
          title={
            attachMode === 'split_tx'
              ? 'Välj köp att dela'
              : attachMode === 'split_custom'
              ? 'Dela valfritt belopp'
              : attachMode === 'goal'
              ? 'Dela sparmål'
              : `Dela med ${selectedFriend.name}`
          }
        >
          {attachMode === 'menu' && (
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
                      Dela ett köp
                    </span>
                    <span className="text-[11.5px] text-[var(--text-secondary)] block">
                      Välj från dina transaktioner
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
                      Valfritt belopp
                    </span>
                    <span className="text-[11.5px] text-[var(--text-secondary)] block">
                      Ange summa att dela 50/50
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
                      Delad budget
                    </span>
                    <span className="text-[11.5px] text-[var(--text-secondary)] block">
                      Synka era gemensamma utgifter
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
                        Sparmål
                      </span>
                      <span className="text-[11.5px] text-[var(--text-secondary)] block">
                        Visa status för ett sparmål
                      </span>
                    </div>
                  </div>
                  <CaretRight size={14} className="text-[var(--text-muted)]" />
                </button>
              )}
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
                  Inga utgifter hittades. Välj &quot;Valfritt belopp&quot; istället.
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
                          {formatKr(half)} var
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
                    placeholder="T.ex. Middag"
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
                  Skicka (
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
                        `Sparmål: ${g.name}`
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
              updateSelectedFriendKey(null);
            }
          }}
          onCancel={() => setFriendToRemove(null)}
        />
      </div>
    );
  }

  // ============================================================================
  // VIEW B: CLEAN, MINIMAL CONVERSATION LIST (MODERN MESSENGER / REVOLUT STYLE)
  // ============================================================================
  return (
    <div className="ui-page">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHousehold}
            className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users size={13} className="text-[var(--text-secondary)]" />
            <span>Delad budget</span>
            {hasConnectedHouseholdPartner(currentHousehold) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddError(null);
            setIsAddFriendOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <UserPlus size={14} weight="bold" />
          <span>Lägg till vän</span>
        </button>
      </div>

      {friends.length > 3 && (
        <div className="ui-search-box">
          <MagnifyingGlass size={15} className="text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök vän..."
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

      {/* Conversations List or Minimal Empty State */}
      {filteredFriends.length === 0 ? (
        <section className="ui-empty-state-page animate-fade-in">
          <div className="w-11 h-11 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-secondary)] mb-3">
            <ChatCircleDots size={22} weight="duotone" />
          </div>
          <p className="ui-empty-title">
            Inga konversationer än
          </p>
          <p className="ui-empty-sub max-w-[230px] mx-auto mb-5">
            Lägg till din partner eller vänner för att chatta och dela på utgifter.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setAddError(null);
                setIsAddFriendOpen(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            >
              <UserPlus size={14} weight="bold" />
              <span>Lägg till vän</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="ui-list-card">
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
                onClick={() => updateSelectedFriendKey(friend.key)}
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
                            : 'font-medium text-[var(--text-primary)]'
                        }`}
                      >
                        {friend.name}
                      </span>
                      {inSameHh && (
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          · Hushåll
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
                        : 'Skicka ett meddelande'}
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
        </section>
      )}

      {/* BottomSheet: Lägg till vän (Inkluderar din egen vänkod + snabbförslag) */}
      <BottomSheet
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        title="Lägg till vän"
      >
        <div className="space-y-4">
          {/* Din egen vänkod i en clean rad */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-[var(--text-secondary)] block">
                Din personliga vänkod
              </span>
              <span className="font-display font-bold text-sm tracking-wider text-[var(--text-primary)] tabular-nums">
                {formatFriendCodeDisplay(myFriendCode)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(myFriendCode);
                setCopiedMyCode(true);
                setTimeout(() => setCopiedMyCode(false), 2000);
              }}
              className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
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

          <form onSubmit={handleAddFriendSubmit} className="space-y-3">
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
                <span className="ui-info-label">Namn</span>
                <input
                  type="text"
                  value={addInputName}
                  onChange={(e) => {
                    setAddInputName(e.target.value);
                    setAddError(null);
                  }}
                  placeholder="T.ex. Moa"
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
              <span>{addingFriend ? 'Lägger till...' : 'Lägg till vän'}</span>
            </button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
};
