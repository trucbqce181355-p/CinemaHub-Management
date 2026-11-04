import { ChevronDown, Filter, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PublicListFilters({ label, search, onSearchChange, searchPlaceholder, searchLabel, filters, onClear }) {
  return <motion.div
    role="search"
    aria-label={label}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="glass-panel mb-10 flex flex-col flex-wrap items-center gap-4 rounded-2xl border border-white/10 p-6 md:flex-row"
  >
    <div className="flex w-full items-center gap-2 font-bold text-primary md:w-auto md:pr-4"><Filter className="h-5 w-5" />BỘ LỌC</div>
    <div className="grid w-full flex-1 grid-cols-1 gap-4 md:grid-cols-12">
      <div className="relative md:col-span-5"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input type="search" aria-label={searchLabel} placeholder={searchPlaceholder} value={search} onChange={event => onSearchChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-all focus:border-primary/50" /></div>
      {filters.map(filter => <div key={filter.key} className="relative md:col-span-3"><select aria-label={filter.label} value={filter.value} onChange={event => filter.onChange(event.target.value)} className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-[#1a1a1a] py-2.5 pl-4 pr-9 text-sm text-white outline-none transition-all focus:border-primary/50">{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /></div>)}
      <div className="flex justify-end md:col-span-1 md:justify-center"><button type="button" onClick={onClear} title="Xóa bộ lọc" aria-label="Xóa bộ lọc" className="flex w-full items-center justify-center rounded-xl border border-white/10 p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div>
    </div>
  </motion.div>;
}
