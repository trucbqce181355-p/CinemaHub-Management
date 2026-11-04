import { useEffect, useId, useRef, useState } from 'react';

const CustomSelect = ({ value, onChange, options, icon: Icon, className = '', id, ariaLabel, disabled = false, size = 'default', floating = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    const menu = menuRef.current;
    const position = () => {
      if (!floating || !triggerRef.current || !menu) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const below = Math.max(0, window.innerHeight - rect.bottom - 16);
      const above = Math.max(0, rect.top - 16);
      // Measure at the trigger width so wrapped options have their final height.
      menu.style.width = `${rect.width}px`;
      const menuHeight = Math.min(menu.scrollHeight + 2, 256);
      const openAbove = below < menuHeight && above > below;
      const height = Math.min(menuHeight, openAbove ? above : below);
      menu.style.left = `${rect.left}px`;
      menu.style.maxHeight = `${height}px`;
      menu.style.top = `${openAbove ? rect.top - height - 8 : rect.bottom + 8}px`;
    };
    if (floating) {
      menu.showPopover();
      position();
      window.addEventListener('resize', position);
      document.addEventListener('scroll', position, true);
    }
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
      if (floating && menu.matches(':popover-open')) menu.hidePopover();
    };
  }, [isOpen, floating]);

  return (
    <div ref={rootRef} className={`relative min-w-[180px] ${className}`} onKeyDown={event => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault(); event.stopPropagation(); setIsOpen(false); triggerRef.current?.focus();
      }
    }} onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
    }}>
      <button 
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 bg-[#1a1a1a] border ${isOpen ? 'border-primary/50' : 'border-white/10'} hover:border-primary/50 rounded-xl px-4 ${size === 'form' ? 'py-3' : 'py-2.5'} text-sm text-white transition-all shadow-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 shrink-0 ${isOpen ? 'text-primary' : 'text-gray-400'} transition-colors`} />}
          <span title={selectedOption?.label || value} className={`truncate ${value !== 'All' ? 'text-white font-medium' : 'text-gray-300'}`}>{selectedOption?.label || value}</span>
        </div>
        <svg className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      
      {isOpen && (
        <div ref={menuRef} id={menuId} role="listbox" aria-label={ariaLabel} popover={floating ? 'manual' : undefined} className={`${floating ? 'fixed inset-auto m-0' : 'absolute z-50 mt-2 w-full'} max-h-64 overflow-y-auto overscroll-contain bg-[#1f1f23] border border-white/10 rounded-xl shadow-2xl px-0 py-2 animate-in fade-in slide-in-from-top-2 origin-top`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              disabled={disabled || opt.disabled}
              onClick={() => {
                if (triggerRef.current?.matches(':disabled')) return;
                onChange(opt.value);
                setIsOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                value === opt.value 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${value === opt.value ? 'bg-primary' : 'bg-transparent'}`}></div>
              <span className="min-w-0 whitespace-normal break-words">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
