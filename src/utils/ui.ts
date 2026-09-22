export const getIconBg = (name: string) => {
  const colors = [
    'bg-slate-500/10 text-slate-500',
    'bg-zinc-500/10 text-zinc-500',
    'bg-neutral-500/10 text-neutral-500',
    'bg-stone-500/10 text-stone-500',
    'bg-slate-600/10 text-slate-600',
    'bg-zinc-600/10 text-zinc-600',
    'bg-neutral-600/10 text-neutral-600',
    'bg-stone-600/10 text-stone-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getEmojiSolidColor = (emoji: string) => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', 
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < emoji.length; i++) {
    hash = emoji.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
