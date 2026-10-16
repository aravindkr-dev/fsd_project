import Icon from '../../components/Icon';
import { useToast } from '../../components/toastContext';
import { EmptyState, ErrorBox, Loading, PageHeader, fmtDate } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function Notifications() {
  const { data, error, loading, reload } = useFetch('/notifications/me');
  const toast = useToast();

  const read = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      reload();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle={data ? `${data.unread} unread` : ''} />
      <ErrorBox message={error} />
      {loading ? <Loading /> : !data.notifications.length ? (
        <div className="card"><EmptyState icon="bell" title="You're all caught up">Reminders about deadlines and expiring certificates will appear here.</EmptyState></div>
      ) : (
        <ul className="space-y-2">
          {data.notifications.map((n) => (
            <li key={n._id} className={`card flex items-start gap-3 ${n.read ? 'opacity-60' : 'border-l-4 border-l-brand-500'}`}>
              <Icon name={n.type.includes('expired') || n.type.includes('overdue') ? 'alert' : 'bell'}
                className={`mt-0.5 h-5 w-5 shrink-0 ${n.type.includes('expired') || n.type.includes('overdue') ? 'text-red-500' : 'text-amber-500'}`} />
              <div className="flex-1"><p className="text-sm">{n.message}</p><p className="mt-0.5 text-xs text-slate-500">{fmtDate(n.createdAt)}</p></div>
              {!n.read && <button className="btn-secondary btn-sm" onClick={() => read(n._id)}>Mark read</button>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
