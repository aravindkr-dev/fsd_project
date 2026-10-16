import Icon from '../../components/Icon';
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, daysUntil, fmtDate } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';

export default function MyCertificates() {
  const { data, error, loading } = useFetch('/certificates/me');
  return (
    <>
      <PageHeader title="My certificates" subtitle="Download proof of your completed training." />
      <ErrorBox message={error} />
      {loading ? <Loading /> : !data.certificates.length ? (
        <div className="card"><EmptyState icon="award" title="No certificates yet">Pass an assessment to earn your first certificate.</EmptyState></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.certificates.map((c) => {
            const d = c.expiryDate ? daysUntil(c.expiryDate) : null;
            return (
              <div key={c._id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Icon name="award" /></div>
                    <div><h2 className="font-medium">{c.trainingId?.title}</h2><p className="text-xs text-slate-500">{c.certificateNumber}</p></div>
                  </div>
                  <Badge value={c.status} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-slate-500">Issued</dt><dd>{fmtDate(c.issueDate)}</dd></div>
                  <div><dt className="text-xs text-slate-500">Expires</dt>
                    <dd>{c.expiryDate ? fmtDate(c.expiryDate) : 'Never'}
                      {c.status === 'active' && d !== null && d <= 60 && <span className="ml-1 text-amber-600">({d}d left)</span>}</dd></div>
                </dl>
                <a className="btn-secondary mt-auto" href={c.fileUrl} target="_blank" rel="noreferrer"><Icon name="download" className="h-4 w-4" />Download PDF</a>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
