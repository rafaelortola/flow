'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CalendarClock,
  PiggyBank,
  Wallet,
  Tags,
  BarChart3,
  User,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from './ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/receitas', label: 'Receitas', icon: TrendingUp },
  { href: '/despesas', label: 'Despesas', icon: TrendingDown },
  { href: '/dividas', label: 'Dívidas', icon: CreditCard },
  { href: '/parcelamentos', label: 'Parcelamentos', icon: CalendarClock },
  { href: '/investimentos', label: 'Investimentos', icon: PiggyBank },
  { href: '/caixa', label: 'Caixa', icon: Wallet },
  { href: '/categorias', label: 'Categorias', icon: Tags },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/perfil', label: 'Perfil', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="mb-8 px-4">
        <h1 className="text-xl font-bold text-primary">FinanceFlow</h1>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-2 border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-3 md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">FinanceFlow</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
