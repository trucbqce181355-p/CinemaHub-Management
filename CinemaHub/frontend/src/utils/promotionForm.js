const numericConditionKeys = ['minSpend', 'maxDiscount', 'usageLimit', 'perUserLimit'];

export function promotionPayload(form) {
  const code = String(form.code || '').trim().toUpperCase();
  const title = String(form.title || '').trim();
  const type = form.discountType;
  const value = Number(form.discountValue);
  if (!/^[A-Z0-9_%-]{1,64}$/.test(code)) throw new Error('Mã gồm 1–64 chữ in hoa, số hoặc ký tự _, -, %.');
  if (!title || title.length > 200) throw new Error('Tiêu đề phải có từ 1 đến 200 ký tự.');
  if (!['Percentage', 'Fixed'].includes(type)) throw new Error('Hãy chọn loại giảm giá.');
  if (form.discountValue === '' || !Number.isFinite(value) || value < 0 || (type === 'Percentage' && value > 100) || (type === 'Fixed' && (value > 1_000_000_000 || !Number.isInteger(value))))
    throw new Error(type === 'Percentage' ? 'Phần trăm giảm phải từ 0 đến 100.' : 'Số tiền giảm phải là số nguyên VND không âm.');
  const start = new Date(form.startDate), end = new Date(form.endDate);
  if (!form.startDate || !form.endDate || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
    throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
  if (!['Active', 'Disabled', 'Used'].includes(form.status)) throw new Error('Trạng thái không hợp lệ.');
  const banner = String(form.bannerImage || '').trim();
  if (banner && !/^https?:\/\/\S{1,2000}$/i.test(banner)) throw new Error('Banner phải là URL HTTP hoặc HTTPS.');
  const conditions = { ...form.conditions };
  for (const key of numericConditionKeys) {
    if (conditions[key] === '' || conditions[key] == null) { delete conditions[key]; continue; }
    const n = Number(conditions[key]);
    if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000) throw new Error('Các điều kiện tiền và lượt dùng phải là số nguyên từ 0 đến 1 tỷ.');
    conditions[key] = n;
  }
  // Keep membership voucher restrictions on edit; the management form cannot change them.
  return { code, title, description: String(form.description || '').trim(), discountType: type,
    discountValue: value, startDate: form.startDate, endDate: form.endDate,
    status: form.status, bannerImage: banner, conditions, version: form.version ?? null };
}

export function previewPromotion(form, subtotal) {
  const amount = Number(subtotal);
  if (!Number.isSafeInteger(amount) || amount < 0) return { discount: 0, total: 0, eligible: false };
  const minSpend = Number(form.conditions?.minSpend || 0);
  const eligible = amount >= minSpend;
  const value = Number(form.discountValue || 0);
  const raw = form.discountType === 'Percentage' ? Math.round(amount * value / 100) : value;
  const cap = form.conditions?.maxDiscount;
  const discount = eligible ? Math.min(amount, Math.max(0, cap == null || cap === '' ? raw : Math.min(raw, Number(cap)))) : 0;
  return { discount, total: amount - discount, eligible };
}
