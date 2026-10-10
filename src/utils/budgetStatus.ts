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
      colorHex: 'var(--danger-color)',
      labelSv: 'Överskriden',
      labelEn: 'Overspent',
      descriptionSv: 'Budgeten är överskriden för den här perioden.',
      descriptionEn: 'Budget has been exceeded for this period.',
      badgeBgClass: 'bg-[var(--danger-container)]',
      badgeTextClass: 'text-[var(--danger-color)]',
    };
  }

  if (disposablePotCents <= 0) {
    if (remainingCents === 0) {
      return {
        level: 'amber',
        colorHex: 'var(--warning-color)',
        labelSv: 'Ingen pott',
        labelEn: 'No pot',
        descriptionSv: 'Ingen rörlig pott är inställd för perioden.',
        descriptionEn: 'No disposable budget set for this period.',
        badgeBgClass: 'bg-[var(--warning-container)]',
        badgeTextClass: 'text-[var(--warning-color)]',
      };
    }
    return {
      level: 'green',
      colorHex: 'var(--success-color)',
      labelSv: 'God marginal',
      labelEn: 'Good margin',
      descriptionSv: 'Du har pengar kvar att spendera.',
      descriptionEn: 'You have funds remaining to spend.',
      badgeBgClass: 'bg-[var(--success-container)]',
      badgeTextClass: 'text-[var(--success-color)]',
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
      colorHex: 'var(--success-color)',
      labelSv: 'God marginal',
      labelEn: 'Good margin',
      descriptionSv: 'Din rörliga budget är i god fas i förhållande till återstående tid i perioden.',
      descriptionEn: 'Your variable budget is well on track relative to the remaining days in the period.',
      badgeBgClass: 'bg-[var(--success-container)]',
      badgeTextClass: 'text-[var(--success-color)]',
    };
  }

  if (pacingRatio >= 0.35 || budgetRatio >= 0.08) {
    return {
      level: 'amber',
      colorHex: 'var(--warning-color)',
      labelSv: 'Smal marginal',
      labelEn: 'Tight margin',
      descriptionSv: 'Du spenderar något snabbare än takten för perioden, men har fortfarande utrymme kvar.',
      descriptionEn: 'You are spending slightly faster than the pace for the period, but still have room left.',
      badgeBgClass: 'bg-[var(--warning-container)]',
      badgeTextClass: 'text-[var(--warning-color)]',
    };
  }

  return {
    level: 'red',
    colorHex: 'var(--danger-color)',
    labelSv: 'Risk för underskott',
    labelEn: 'Risk of deficit',
    descriptionSv: 'Pengarna riskerar att ta slut före periodens slut med nuvarande mönster.',
    descriptionEn: 'Funds risk running out before payday at the current spending pace.',
    badgeBgClass: 'bg-[var(--danger-container)]',
    badgeTextClass: 'text-[var(--danger-color)]',
  };
}
