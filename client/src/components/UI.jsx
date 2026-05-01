// ── Shared UI primitives ─────────────────────────────────────────────────

export function Badge({ children, color = 'gray' }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-700 ring-blue-200',
    green:  'bg-emerald-100 text-emerald-700 ring-emerald-200',
    yellow: 'bg-amber-100 text-amber-700 ring-amber-200',
    red:    'bg-red-100 text-red-600 ring-red-200',
    purple: 'bg-purple-100 text-purple-700 ring-purple-200',
    orange: 'bg-orange-100 text-orange-700 ring-orange-200',
    gray:   'bg-slate-100 text-slate-600 ring-slate-200',
    teal:   'bg-teal-100 text-teal-700 ring-teal-200',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

export const STATUS_COLORS = {
  Registered: 'blue', Attended: 'teal', Completed: 'green', Absent: 'red',
  Planned: 'yellow', Active: 'indigo', Cancelled: 'red',
};
export const CATEGORY_COLORS = {
  'Hard Skill': 'blue', 'Soft Skill': 'purple', Compliance: 'orange', Leadership: 'teal',
};

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

const STAT_THEMES = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-500',   num: 'text-blue-700' },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', bar: 'bg-emerald-500', num: 'text-emerald-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', bar: 'bg-purple-500', num: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', bar: 'bg-orange-500', num: 'text-orange-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', bar: 'bg-indigo-500', num: 'text-indigo-700' },
};

export function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const t = STAT_THEMES[color] || STAT_THEMES.blue;
  return (
    <Card className="p-5 card-hover overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-1 h-full ${t.bar} rounded-l-2xl`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${t.num}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${t.bg} shrink-0`}>
          <span className={t.icon}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary:   'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-200',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200',
    danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-200',
    ghost:     'hover:bg-slate-100 active:bg-slate-200 text-slate-600',
    success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200',
  };
  const sizes = {
    xs: 'px-2.5 py-1 text-xs rounded-lg',
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-sm rounded-xl',
  };
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{label}</label>}
      <input
        className={`border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:bg-indigo-50/30 bg-slate-50 transition-all duration-150 ${error ? 'border-red-400 bg-red-50/30' : ''} ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</span>}
    </div>
  );
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{label}</label>}
      <select
        className={`border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 transition-all duration-150 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-500">⚠ {error}</span>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{label}</label>}
      <textarea
        className={`border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 resize-none transition-all duration-150 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">⚠ {error}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${width} rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]`}>
        {/* Handle bar (mobile) */}
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 shrink-0" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-3' };
  return <div className={`${s[size]} border-slate-200 border-t-indigo-600 rounded-full animate-spin`} />;
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="text-5xl">{icon}</div>
      <p className="font-bold text-slate-600 mt-1">{title}</p>
      {sub && <p className="text-sm text-slate-400 text-center max-w-xs">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Table({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-4 py-3.5 first:pl-5 last:pr-5 ${className}`}>{children}</td>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 fade-in-up">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">🗑️</span>
        </div>
        <h3 className="font-bold text-slate-800 text-center mb-1">{title}</h3>
        <p className="text-sm text-slate-500 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Batal</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1 justify-center">Hapus</Button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile card view for tables (shows on small screens) ─────────────────
export function MobileCard({ children, onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
