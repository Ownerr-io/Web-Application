import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const KEY = 'trustmrr-theme';

export function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    try { window.localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
