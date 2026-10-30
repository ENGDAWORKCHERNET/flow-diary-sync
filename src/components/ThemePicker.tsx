import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/context/ThemeContext';
import { type Theme, type ResolvedTheme } from '@/lib/theme';
import {
  Laptop,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Waves,
  TreePine,
  Flower2,
  Zap,
} from 'lucide-react';

interface ThemeOption {
  id: Theme;
  label: string;
  bgHex: string;
  primaryHex: string;
  icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'system',
    label: 'System',
    bgHex: '#94a3b8',
    primaryHex: '#0284c7',
    icon: Laptop,
  },
  {
    id: 'light',
    label: 'Light',
    bgHex: '#fbf9f5',
    primaryHex: '#117b8f',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    bgHex: '#0d111a',
    primaryHex: '#26bcd7',
    icon: Moon,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    bgHex: '#05070d',
    primaryHex: '#3b82f6',
    icon: Sparkles,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    bgHex: '#f5ebd7',
    primaryHex: '#8f4f14',
    icon: BookOpen,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    bgHex: '#0a1526',
    primaryHex: '#14b8a6',
    icon: Waves,
  },
  {
    id: 'forest',
    label: 'Forest',
    bgHex: '#0a1811',
    primaryHex: '#22c55e',
    icon: TreePine,
  },
  {
    id: 'rose',
    label: 'Rose',
    bgHex: '#fdf2f4',
    primaryHex: '#db2777',
    icon: Flower2,
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    bgHex: '#08080c',
    primaryHex: '#ff2a85',
    icon: Zap,
  },
];

function getThemeIcon(theme: Theme, resolved: ResolvedTheme): typeof Sun {
  if (theme === 'system') return Laptop;
  switch (resolved) {
    case 'light':
      return Sun;
    case 'dark':
      return Moon;
    case 'midnight':
      return Sparkles;
    case 'sepia':
      return BookOpen;
    case 'ocean':
      return Waves;
    case 'forest':
      return TreePine;
    case 'rose':
      return Flower2;
    case 'cyberpunk':
      return Zap;
    default:
      return Sun;
  }
}

export function ThemePicker() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const ActiveIcon = getThemeIcon(theme, resolvedTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${theme === 'system' ? `System (${resolvedTheme})` : theme}. Choose theme.`}
          title={`Theme: ${theme === 'system' ? `System (${resolvedTheme})` : theme}`}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ActiveIcon className="w-4 h-4 text-foreground transition-transform" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 glass-card-solid rounded-xl p-1.5 shadow-xl border border-border/50 z-50 max-h-[85vh] overflow-y-auto"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Theme Preference
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-border/50" />

        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(val) => setTheme(val as Theme)}
        >
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSystem = opt.id === 'system';
            return (
              <DropdownMenuRadioItem
                key={opt.id}
                value={opt.id}
                aria-label={
                  isSystem
                    ? `System theme, currently resolves to ${resolvedTheme}`
                    : `${opt.label} theme`
                }
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer focus:bg-secondary focus:text-foreground outline-none transition-colors"
              >
                {/* Visual Swatch with border */}
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full border border-border shadow-xs shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: opt.bgHex }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: opt.primaryHex }}
                  />
                </span>

                <span className="flex-1 truncate">
                  {opt.label}
                  {isSystem && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({resolvedTheme})
                    </span>
                  )}
                </span>

                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default ThemePicker;
