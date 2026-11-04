export function pricingRulePayload({ trigger, direction, amount, dates, showtimeIds, startHour, status, version }) {
  if (!['WEEKEND', 'HOLIDAY', 'LATE_NIGHT', 'SNEAK_SHOW'].includes(trigger)) throw new Error('Vui lòng chọn loại luật giá.');
  if (amount === '' || !Number.isInteger(Number(amount)) || Number(amount) < 0 || Number(amount) > 1000000)
    throw new Error('Mức điều chỉnh phải là số nguyên từ 0 đến 1.000.000đ.');
  if (!['increase', 'decrease'].includes(direction)) throw new Error('Vui lòng chọn tăng hoặc giảm giá.');
  let conditionParams = {};
  if (trigger === 'HOLIDAY') {
    const selected = [...new Set(dates || [])].sort();
    if (!selected.length || selected.length > 366) throw new Error('Chọn từ 1 đến 366 ngày áp dụng.');
    if (selected.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d))
      throw new Error('Ngày áp dụng không hợp lệ.');
    conditionParams = { dates: selected };
  } else if (trigger === 'SNEAK_SHOW') {
    const selected = [...new Set(showtimeIds || [])];
    if (!selected.length || selected.length > 366 || selected.some(id => typeof id !== 'string' || !id.trim()))
      throw new Error('Chọn từ 1 đến 366 suất chiếu.');
    conditionParams = { showtimeIds: selected };
  } else if (trigger === 'LATE_NIGHT') {
    if (startHour === '' || !Number.isInteger(Number(startHour)) || Number(startHour) < 0 || Number(startHour) > 23)
      throw new Error('Chọn giờ bắt đầu từ 00:00 đến 23:00.');
    conditionParams = { startHour: Number(startHour) };
  }
  if (!['Active', 'Disabled'].includes(status)) throw new Error('Trạng thái không hợp lệ.');
  return { triggerVariable: trigger, adjustmentValue: Number(amount) * (direction === 'decrease' ? -1 : 1), conditionParams, status, version };
}
