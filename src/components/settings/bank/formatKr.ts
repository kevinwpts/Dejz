// Belopp i kronor för bankinställningarna, t.ex. "1 234 kr"
export const formatKr = (amount: number) =>
  `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;
