import { useEffect, useMemo, useRef, useState } from 'react';

export type CommandAction = {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  actions: CommandAction[];
  onClose: () => void;
};

function matchAction(action: CommandAction, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const haystack = [action.label, ...(action.keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(term);
}

export default function CommandPalette({ open, actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => actions.filter((action) => matchAction(action, query)), [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === 'Enter') {
        const action = filtered[activeIndex];
        if (!action) return;
        event.preventDefault();
        action.onSelect();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24">
      <div className="w-full max-w-xl rounded-2xl border border-ink/10 bg-surface shadow-xl">
        <div className="border-b border-ink/10 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca comando..."
            className="w-full rounded-lg border border-ink/10 px-3 py-2 text-sm"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 && <div className="px-4 py-6 text-sm text-ink/50">Nessun comando.</div>}
          {filtered.map((action, index) => (
            <button
              key={action.id}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                index === activeIndex ? 'bg-ink/5' : 'hover:bg-ink/5'
              }`}
              onClick={() => {
                action.onSelect();
                onClose();
              }}
            >
              <span>{action.label}</span>
              {action.shortcut && <span className="text-xs text-ink/50">{action.shortcut}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
