const ruleLabels = {
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Ngày lễ / ngày đặc biệt',
  LATE_NIGHT: 'Theo khung giờ',
  SNEAK_SHOW: 'Suất chiếu sớm',
};

// Use the server quote / held snapshot, never current admin rules or browser time.
export function dynamicPricingSummary(seats = []) {
  if (!Array.isArray(seats) || !seats.length || seats.some(seat => !seat || !Number.isFinite(seat.basePrice)
    || !Number.isFinite(seat.rawPrice) || !Array.isArray(seat.pricingRuleTypes))) return null;
  const types = [...new Set(seats.flatMap(seat => seat.pricingRuleTypes))];
  if (!types.length) return null;
  return {
    labels: types.map(type => ruleLabels[type] || type),
    adjustment: seats.reduce((sum, seat) => sum + seat.rawPrice - seat.basePrice, 0),
  };
}
