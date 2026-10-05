export function sortVisits(visits, sortBy = 'date', ascending = false) {
  const field = { vibe: 'vibe_rating', coffee: 'coffee_rating', composite: 'composite_score' }[sortBy];
  return [...visits].sort((a, b) => {
    const difference = field ? Number(a[field]) - Number(b[field]) : String(a.date).localeCompare(String(b.date));
    return (ascending ? 1 : -1) * difference;
  });
}
