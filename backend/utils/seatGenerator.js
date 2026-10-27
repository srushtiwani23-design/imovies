const rowLabel = (index) => String.fromCharCode(65 + index); // 0 -> A

// Builds the seat documents for a show. The last `premiumRows` rows are premium.
function buildSeats(show) {
  const seats = [];
  const premiumRows = show.premiumRows ?? 2;
  for (let r = 0; r < show.rows; r += 1) {
    const isPremium = r >= show.rows - premiumRows;
    for (let n = 1; n <= show.seatsPerRow; n += 1) {
      seats.push({
        show: show._id,
        label: `${rowLabel(r)}${n}`,
        row: rowLabel(r),
        number: n,
        type: isPremium ? 'premium' : 'regular',
        price: isPremium ? show.prices.premium : show.prices.regular,
      });
    }
  }
  return seats;
}

module.exports = { buildSeats, rowLabel };
