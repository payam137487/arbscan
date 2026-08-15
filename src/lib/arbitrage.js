export function findArb(home1, away2) {
  const inv = 1 / home1 + 1 / away2;
  if (inv >= 1) return null;

  return {
    profit: ((1 / inv - 1) * 100).toFixed(2),
    home: home1,
    away: away2
  };
}

