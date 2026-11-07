export const presetLimit = 12;

export function parsePresetValue(input, { min, max, decimals = 0 }) {
  const text = String(input).trim().replace(',', '.');
  const pattern = decimals ? new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`) : /^\d+$/;
  const value = Number(text);
  if (!pattern.test(text) || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Nhập ${decimals ? 'giá trị' : 'số nguyên'} từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}${decimals ? `, tối đa ${decimals} chữ số thập phân` : ''}.`);
  return value;
}

export function readPresets(storage, key, defaults, limits, parseValue = value => parsePresetValue(value, limits)) {
  try {
    const saved = storage.getItem(key);
    if (saved === null) return [...defaults];
    const values = JSON.parse(saved);
    if (!Array.isArray(values) || values.length > presetLimit) return [...defaults];
    return [...new Set(values.map(parseValue))].sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b));
  } catch {
    return [...defaults];
  }
}
