// Belopp i kronor för Analys-fliken, t.ex. "1 234 kr"
export const formatKr = (amount: number) => {
  return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
};
