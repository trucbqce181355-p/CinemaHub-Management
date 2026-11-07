import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function ProgramModal({ title, subtitle, icon: Icon, busy = false, onClose, children, footer, compact = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className={`m-auto max-h-[90vh] w-[calc(100%_-_2rem)] ${compact ? 'max-w-md' : 'max-w-2xl'} overflow-hidden rounded-3xl border border-white/10 bg-[#121212] p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm`}>
    <div className="flex max-h-[90vh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/20 p-3 text-primary"><Icon className="h-6 w-6" /></div><div className="min-w-0"><h2 className="font-display text-2xl font-bold">{title}</h2>{subtitle && <p className="mt-1 break-words text-sm text-gray-400">{subtitle}</p>}</div></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng cửa sổ" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"><X className="h-6 w-6" /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">{children}</div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-4 sm:px-8">{footer}</footer>
    </div>
  </dialog>;
}
