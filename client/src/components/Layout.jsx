import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, CalendarDays,
  BarChart3, LogOut, GraduationCap, Menu, X, ChevronRight,
  ClipboardList, TrendingUp
} from 'lucide-react';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees',   icon: Users,           label: 'Karyawan' },
  { to: '/programs',    icon: BookOpen,        label: 'Program Training' },
  { to: '/schedules',   icon: CalendarDays,    label: 'Penjadwalan' },
  { divider: true, label: 'English Storytelling' },
  { to: '/monitoring',  icon: ClipboardList,   label: 'Daily Monitoring' },
  { to: '/progress',    icon: TrendingUp,      label: 'Progress Summary' },
  { divider: true, label: 'Laporan' },
  { to: '/reports',     icon: BarChart3,       label: 'Laporan' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  const currentPage = NAV.find(n => !n.divider && n.to === location.pathname)?.label || 'Training Tracker';

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/50">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white leading-tight">Training Tracker</p>
            <p className="text-xs text-slate-400">HR L&D System</p>
          </div>
        </div>
        <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {NAV.map((item, i) => {
          if (item.divider) return (
            <p key={i} className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-2">{item.label}</p>
          );
          const { to, icon: Icon, label } = item;
          return (
            <NavLink key={to} to={to} end={to === '/'} onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/80">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-slate-700" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col shrink-0 z-30">
        <SidebarContent />
      </aside>
      <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-900 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-indigo-600 rounded-lg"><GraduationCap size={14} className="text-white" /></div>
            <span className="font-semibold text-slate-800 text-sm truncate">{currentPage}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
