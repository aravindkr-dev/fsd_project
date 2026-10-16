import Icon from './Icon';

const BADGE = {
  compliant: ['bg-green-50 text-green-700 ring-green-600/20', 'bg-green-500'],
  completed: ['bg-green-50 text-green-700 ring-green-600/20', 'bg-green-500'],
  active: ['bg-green-50 text-green-700 ring-green-600/20', 'bg-green-500'],
  published: ['bg-green-50 text-green-700 ring-green-600/20', 'bg-green-500'],
  at_risk: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  in_progress: ['bg-amber-50 text-amber-800 ring-amber-600/20', 'bg-amber-500'],
  draft: ['bg-slate-100 text-slate-700 ring-slate-500/20', 'bg-slate-400'],
  inactive: ['bg-slate-100 text-slate-700 ring-slate-500/20', 'bg-slate-400'],
  assigned: ['bg-blue-50 text-blue-700 ring-blue-600/20', 'bg-blue-500'],
  non_compliant: ['bg-red-50 text-red-700 ring-red-600/20', 'bg-red-500'],
  expired: ['bg-red-50 text-red-700 ring-red-600/20', 'bg-red-500'],
  revoked: ['bg-red-50 text-red-700 ring-red-600/20', 'bg-red-500'],
  renewed: ['bg-slate-100 text-slate-700 ring-slate-500/20', 'bg-slate-400'],
};

export function Badge({ value }) {
  const [tone, dot] = BADGE[value] || BADGE.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Loading({ rows = 4 }) {
  return (
    <div className="card space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-5" style={{ width: `${95 - i * 12}%` }} />)}
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{message}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400"><Icon name={icon} className="h-6 w-6" /></div>
      <p className="font-medium text-slate-700">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}

const TONES = {
  green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600', brand: 'bg-brand-50 text-brand-600',
};

export function Stat({ label, value, icon = 'chart', tone = 'brand', hint }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`rounded-lg p-2.5 ${TONES[tone]}`}><Icon name={icon} className="h-5 w-5" /></div>
      <div>
        <div className="text-2xl font-semibold leading-tight tabular-nums">{value}</div>
        <div className="text-xs text-slate-500">{label}{hint && <span className="text-slate-400"> · {hint}</span>}</div>
      </div>
    </div>
  );
}

/** Responsive table card. `empty` renders an EmptyState when there are no rows. */
export function Table({ head, children, empty, emptyTitle = 'Nothing here yet', emptyIcon }) {
  return (
    <div className="card overflow-hidden p-0">
      {empty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle}>{empty}</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/70">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${value >= 100 ? 'bg-green-500' : 'bg-brand-600'}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-500">{value}%</span>
    </div>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Days until a date (negative = past). */
export const daysUntil = (d) => Math.ceil((new Date(d) - Date.now()) / 86400000);
