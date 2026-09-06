import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// `onColor`: use on a saturated/colored header (white pill) instead of the neutral surface style
export default function ThemeToggle({ onColor = false, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const colorClasses = onColor
    ? 'bg-white/15 text-white border border-white/30 hover:bg-white/25'
    : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-smooth ${colorClasses} ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
