export const normalizeSearch = value => String(value ?? '').trim().toLocaleLowerCase('vi-VN')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export function listFilterOptions(items, field) {
  const options = new Map();
  items.forEach(item => {
    if (!Array.isArray(item[field])) return;
    item[field].forEach(value => {
      if (typeof value !== 'string' || !value.trim()) return;
      const key = normalizeSearch(value);
      if (!options.has(key)) options.set(key, value.trim());
    });
  });
  return [...options.values()].sort((a, b) => a.localeCompare(b, 'vi'));
}

export function matchesCinemaFilters(cinema, { search = '', facility = '', service = '' }) {
  const hasItem = (items, selected) => !selected || (Array.isArray(items) && items.some(item => normalizeSearch(item) === normalizeSearch(selected)));
  return normalizeSearch(cinema.name).includes(normalizeSearch(search))
    && hasItem(cinema.facilities, facility) && hasItem(cinema.services, service);
}

export function matchesPromotionFilters(promotion, { search = '', discountType = '', minSpend = '' }) {
  const term = normalizeSearch(search);
  const matchesSearch = [promotion.title, promotion.code].some(value => normalizeSearch(value).includes(term));
  const matchesType = !discountType || promotion.discountType?.toUpperCase() === discountType;
  const minimum = Number(promotion.minSpend ?? 0);
  const matchesMinimum = !minSpend || (minSpend === 'none' ? minimum === 0 : minimum <= Number(minSpend));
  return matchesSearch && matchesType && matchesMinimum;
}
