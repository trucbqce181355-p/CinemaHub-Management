import { useState } from 'react';

const CustomSelect = ({ value, onChange, options, icon: Icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className={`relative min-w-[180px] ${className}`} onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
    }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[#1a1a1a] border ${isOpen ? 'border-primary/50' : 'border-white/10'} hover:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-white transition-all shadow-lg focus:outline-none`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-primary' : 'text-gray-400'} transition-colors`} />}
          <span className={value !== 'All' ? 'text-white font-medium' : 'text-gray-300'}>{selectedOption?.label || value}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1f1f23] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                value === opt.value 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${value === opt.value ? 'bg-primary' : 'bg-transparent'}`}></div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
