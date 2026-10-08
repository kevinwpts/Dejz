export type BudgetStatusLevel = 'green' | 'amber' | 'red';

export interface BudgetStatusResult {
  level: BudgetStatusLevel;
  colorHex: string;
  labelSv: string;
  labelEn: string;
  descriptionSv: string;
  descriptionEn: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

export function getBudgetStatus({
  remainingCents,
  disposablePotCents,
  remainingDays,
  totalDays,
}: {
  remainingCents: number;
  disposablePotCents: number;
  remainingDays: number;
  totalDays: number;
}): BudgetStatusResult {
  // Handle edge cases: negative remaining, or zero/negative disposable pot
  if (remainingCents < 0) {
    return {
      level: 'red',
      colorHex: '#EF4444',
      labelSv: 'Överskriden',
      labelEn: 'Overspent',
      descriptionSv: 'Budgeten är överskriden för den här perioden.',
      descriptionEn: 'Budget has been exceeded for this period.',
      badgeBgClass: 'bg-rose-500/15 dark:bg-rose-500/25',
      badgeTextClass: 'text-rose-600 dark:text-rose-400',
    };
  }

  if (disposablePotCents <= 0) {
    if (remainingCents === 0) {
      return {
        level: 'amber',
        colorHex: '#F59E0B',
        labelSv: 'Ingen pott',
        labelEn: 'No pot',
        descriptionSv: 'Ingen rörlig pott är inställd för perioden.',
        descriptionEn: 'No disposable budget set for this period.',
        badgeBgClass: 'bg-amber-500/15 dark:bg-amber-500/25',
        badgeTextClass: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      level: 'green',
      colorHex: '#10B981',
      labelSv: 'God marginal',
      labelEn: 'Good margin',
      descriptionSv: 'Du har pengar kvar att spendera.',
      descriptionEn: 'You have funds remaining to spend.',
      badgeBgClass: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      badgeTextClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  const safeTotalDays = Math.max(1, totalDays || 30);
  const safeRemainingDays = Math.max(0, remainingDays);

  const budgetRatio = remainingCents / disposablePotCents;
  const timeRatio = safeRemainingDays / safeTotalDays;

  // Compare remaining budget ratio to remaining time ratio
  const pacingRatio = timeRatio > 0 ? budgetRatio / timeRatio : (budgetRatio > 0 ? 1 : 0);

  if (pacingRatio >= 0.75 || budgetRatio >= 0.25) {
    return {
      level: 'green',
      colorHex: '#10B981',
      labelSv: 'God marginal',
      labelEn: 'Good margin',
      descriptionSv: 'Din rörliga budget är i god fas i förhållande till återstående tid i perioden.',
      descriptionEn: 'Your variable budget is well on track relative to the remaining days in the period.',
      badgeBgClass: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      badgeTextClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  if (pacingRatio >= 0.35 || budgetRatio >= 0.08) {
    return {
      level: 'amber',
      colorHex: '#F59E0B',
      labelSv: 'Smal marginal',
      labelEn: 'Tight margin',
      descriptionSv: 'Du spenderar något snabbare än takten för perioden, men har fortfarande utrymme kvar.',
      descriptionEn: 'You are spending slightly faster than the pace for the period, but still have room left.',
      badgeBgClass: 'bg-amber-500/15 dark:bg-amber-500/25',
      badgeTextClass: 'text-amber-600 dark:text-amber-400',
    };
  }

  return {
    level: 'red',
    colorHex: '#EF4444',
    labelSv: 'Risk för underskott',
    labelEn: 'Risk of deficit',
    descriptionSv: 'Pengarna riskerar att ta slut före periodens slut med nuvarande mönster.',
    descriptionEn: 'Funds risk running out before payday at the current spending pace.',
    badgeBgClass: 'bg-rose-500/15 dark:bg-rose-500/25',
    badgeTextClass: 'text-rose-600 dark:text-rose-400',
  };
}
