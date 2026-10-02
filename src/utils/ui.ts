export const getIconBg = (name: string) => {
  const colors = [
    'bg-black/5 text-[#1C1917] dark:bg-white/10 dark:text-white',
    'bg-[#EAE6DE] text-[#1C1917] dark:bg-white/[0.08] dark:text-white',
    'bg-black/[0.04] text-[#6E6961] dark:bg-white/[0.06] dark:text-[#A8A8A8]',
    'bg-[#DFD9CF] text-[#1C1917] dark:bg-white/[0.12] dark:text-white',
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
