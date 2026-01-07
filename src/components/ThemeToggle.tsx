import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-full justify-start">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "default"}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`w-full ${collapsed ? '' : 'justify-start'}`}
      title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
    >
      {theme === 'dark' ? (
        <>
          <Sun className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
          {!collapsed && <span className="text-sm">Modo Claro</span>}
        </>
      ) : (
        <>
          <Moon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
          {!collapsed && <span className="text-sm">Modo Escuro</span>}
        </>
      )}
    </Button>
  );
}
