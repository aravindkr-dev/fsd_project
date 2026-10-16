import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { NAV } from './nav';

const ROLE_LABEL = { admin: 'HR Admin', trainer: 'Trainer', manager: 'Manager', employee: 'Employee' };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Icon name="shield" className="h-5 w-5" /></div>
        <span className="text-lg font-semibold tracking-tight">ComplianceHub</span>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {NAV[user.role].map(([to, label, icon]) => (
          <NavLink key={to} to={to} end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
            <Icon name={icon} className="h-[18px] w-[18px]" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
          </div>
          <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Sign out" aria-label="Sign out"
            onClick={() => { logout(); navigate('/login'); }}>
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white md:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-up bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <button className="rounded p-1.5 hover:bg-slate-100" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <span className="font-semibold">ComplianceHub</span>
        </header>
        <main id="main" className="mx-auto max-w-6xl animate-fade-in p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
