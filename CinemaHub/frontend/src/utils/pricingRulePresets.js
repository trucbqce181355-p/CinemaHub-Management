export function parseAnnualDate(input) {
  const text = String(input).trim();
  const local = /^(\d{1,2})\/(\d{1,2})$/.exec(text);
  const stored = /^(\d{2})-(\d{2})$/.exec(text);
  if (!local && !stored) throw new Error('Nhập ngày theo định dạng DD/MM, ví dụ 25/12.');
  const month = Number(local ? local[2] : stored[1]);
  const day = Number(local ? local[1] : stored[2]);
  const date = new Date(Date.UTC(2000, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    throw new Error('Ngày hoặc tháng không hợp lệ.');
  return String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}
export const annualDateLabel = value => value.slice(3) + '/' + value.slice(0, 2);
export function dateForYear(year, monthDay) {
  const value = year + '-' + parseAnnualDate(monthDay);
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Ngày đã chọn không tồn tại trong năm ' + year + '.');
  return value;
}
