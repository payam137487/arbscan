export function findArb(odds) {
  const inv = odds.reduce((sum, odd) => sum + 1 / odd, 0);

  if (inv >= 1) return null;

  return {
    margin: ((1 - inv) * 100).toFixed(2),
    profit: ((1 / inv - 1) * 100).toFixed(2)
  };
}
