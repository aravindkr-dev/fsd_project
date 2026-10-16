import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, ProgressBar, daysUntil, fmtDate } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';

const BANNER = {
  compliant: ['border-green-200 bg-green-50 text-green-900', 'check', "You're fully compliant. Nice work."],
  at_risk: ['border-amber-200 bg-amber-50 text-amber-900', 'alert', 'Some items need your attention soon.'],
  non_compliant: ['border-red-200 bg-red-50 text-red-900', 'alert', 'You have outstanding compliance items.'],
};

function Due({ a }) {
  if (!a.dueDate || a.status === 'completed') return <span className="text-slate-500">{a.status === 'completed' ? `Completed ${fmtDate(a.completedAt)}` : 'No deadline'}</span>;
  const d = daysUntil(a.dueDate);
  const tone = d < 0 ? 'text-red-600 font-medium' : d <= 7 ? 'text-amber-600 font-medium' : 'text-slate-500';
  return <span className={tone}>{d < 0 ? `Overdue by ${-d}d` : d === 0 ? 'Due today' : `Due ${fmtDate(a.dueDate)} (${d}d)`}</span>;
}

export default function MyTraining() {
  const { user } = useAuth();
  const { data, error, loading } = useFetch('/assignments/me');
  const compliance = useFetch('/compliance/me');
  const blocking = compliance.data?.gaps.filter((g) => g.type !== 'pending_training') ?? [];
  const b = BANNER[compliance.data?.status];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Your assigned training and compliance status." />
      <ErrorBox message={error} />

      {b && compliance.data.requiredCount > 0 && (
        <div className={`mb-5 rounded-xl border px-4 py-3 ${b[0]}`}>
          <div className="flex items-center gap-2 font-medium"><Icon name={b[1]} className="h-5 w-5" />{b[2]}</div>
          {blocking.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-9 text-sm">{blocking.map((g, i) => <li key={i}>{g.detail}</li>)}</ul>}
        </div>
      )}

      {loading ? <Loading /> : data.assignments.length === 0 ? (
        <div className="card"><EmptyState icon="book" title="Nothing assigned yet">When HR assigns you training, it will show up here.</EmptyState></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.assignments.map((a) => (
            <Link key={a._id} to={`/employee/trainings/${a._id}`} className="card group flex flex-col gap-3 transition hover:border-brand-500 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium group-hover:text-brand-700">{a.trainingId?.title}</h2>
                <Badge value={a.status} />
              </div>
              {a.trainingId?.mandatory && <span className="w-fit rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">Mandatory</span>}
              <ProgressBar value={a.progress} label={`${a.trainingId?.title} progress`} />
              <div className="mt-auto flex items-center gap-1.5 text-xs"><Icon name="clock" className="h-3.5 w-3.5 text-slate-400" /><Due a={a} /></div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
