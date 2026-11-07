import { useId, useState } from 'react';
import { Check, Edit2, Plus, Settings2, X } from 'lucide-react';
import { parsePresetValue, presetLimit, readPresets } from '../utils/promotionPresets';

export default function QuickPresets({ storageKey, defaults, limits, label, unit, format, selectedValue, selectedValues, onApply, disabled = false, parseValue, formatInput = String, placeholder, inputMode }) {
  const inputId = useId();
  const [values, setValues] = useState(() => {
    try { return readPresets(window.localStorage, storageKey, defaults, limits, parseValue); }
    catch { return [...defaults]; }
  });
  const [configuring, setConfiguring] = useState(false);
  const [editing, setEditing] = useState(null), [draft, setDraft] = useState('');
  const [error, setError] = useState(''), [storageNotice, setStorageNotice] = useState('');
  function persist(next) {
    setValues(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); setStorageNotice(''); }
    catch { setStorageNotice('Trình duyệt không cho phép lưu. Lựa chọn chỉ được giữ trong lần mở này.'); }
  }
  function resetDraft() { setEditing(null); setDraft(''); setError(''); }
  function save() {
    if (disabled) return;
    try {
      const value = parseValue ? parseValue(draft) : parsePresetValue(draft, limits);
      if (values.some(existing => existing === value && existing !== editing)) throw new Error('Giá trị này đã có trong danh sách.');
      if (editing === null && values.length >= presetLimit) throw new Error(`Chỉ lưu tối đa ${presetLimit} lựa chọn nhanh.`);
      persist([...values.filter(existing => existing !== editing), value].sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b)));
      resetDraft();
    } catch (cause) { setError(cause.message); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-gray-400">{label}</span><button type="button" disabled={disabled} aria-expanded={configuring} onClick={() => { setConfiguring(value => !value); resetDraft(); }} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50"><Settings2 className="h-3.5 w-3.5" />{configuring ? 'Xong' : 'Tùy chỉnh'}</button></div>
    <div className="flex flex-wrap gap-2">
      {values.map(value => <div key={value} className={'inline-flex items-center rounded-lg border text-xs '+((selectedValues ? selectedValues.includes(value) : selectedValue !== '' && selectedValue != null && String(selectedValue) === String(value)) ? 'border-primary text-primary' : 'border-white/10 text-gray-400')}>
        <button type="button" disabled={disabled} onClick={() => onApply(value)} className="rounded-lg px-3 py-2 hover:bg-white/5 disabled:opacity-50">{format(value)}</button>
        {configuring && <><button type="button" disabled={disabled} onClick={() => { setEditing(value); setDraft(formatInput(value)); setError(''); }} title="Sửa lựa chọn nhanh" aria-label={'Sửa '+format(value)} className="rounded p-1.5 text-blue-400 hover:bg-blue-400/10 disabled:opacity-50"><Edit2 className="h-3 w-3" /></button><button type="button" disabled={disabled} onClick={() => { persist(values.filter(existing => existing !== value)); if (editing === value) resetDraft(); }} title="Bỏ lựa chọn nhanh" aria-label={'Bỏ '+format(value)} className="mr-1 rounded p-1.5 text-red-400 hover:bg-red-400/10 disabled:opacity-50"><X className="h-3 w-3" /></button></>}
      </div>)}
      {!values.length && <p className="text-xs text-gray-500">Chưa có lựa chọn nhanh. Chọn Tùy chỉnh để thêm.</p>}
    </div>
    {configuring && <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <label htmlFor={inputId} className="block text-xs text-gray-400">{editing === null ? 'Thêm giá trị nhanh' : 'Chỉnh sửa giá trị nhanh'} ({unit})</label>
      <div className="flex flex-wrap items-center gap-2"><input id={inputId} type="text" inputMode={inputMode || (limits.decimals ? 'decimal' : 'numeric')} value={draft} disabled={disabled} onChange={event => { setDraft(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); save(); } }} placeholder={placeholder || 'Nhập giá trị ('+unit+')'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-50" />
        <button type="button" disabled={disabled || !draft.trim()} onClick={save} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold hover:bg-red-700 disabled:opacity-50">{editing === null ? <Plus className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{editing === null ? 'Thêm' : 'Lưu'}</button>
        {editing !== null && <button type="button" disabled={disabled} onClick={resetDraft} className="rounded-lg px-2 py-2 text-xs text-gray-400 hover:text-white">Hủy sửa</button>}
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-gray-500">Các lựa chọn được lưu trên trình duyệt này.</p>
    </div>}
    {storageNotice && <p role="status" className="text-xs text-orange-300">{storageNotice}</p>}
  </div>;
}
