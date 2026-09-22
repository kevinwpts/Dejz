export const formatAmount = (amount: number | string, language: string = 'sv-SE') => {
  const str = (amount || 0).toString();
  const digits = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(digits) || 0;
  return Math.round(num)
    .toLocaleString(language === 'en' ? 'en-US' : 'sv-SE')
    .replace(/\s/g, ' ');
};
