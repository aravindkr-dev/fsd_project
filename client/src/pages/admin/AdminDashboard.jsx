import { useState } from 'react';
import Donut from '../../components/Donut';
import { Badge, ErrorBox, Loading, PageHeader, Stat, Table, daysUntil, fmtDate } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';

export default function AdminDashboard() {
  const [dept, setDept] = useState('');
  const q = dept ? `?departmentId=${dept}` : '';
  const depts = useFetch('/departments');
  const summary = useFetch(`/compliance/summary${q}`);
  const training = useFetch(`/reports/training${q}`);
  const expiring = useFetch(`/reports/expiring-certificates${q ? `${q}&` : '?'}days=60`);

  const t = summary.data?.totals;
  const gaps = summary.data?.employees.filter((e) => e.status !== 'compliant') ?? [];

  return (
    <>
      <PageHeader title="Compliance dashboard" subtitle="Where your organisation stands today.">
        <select className="input w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {depts.data?.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </PageHeader>
      <ErrorBox message={summary.error || training.error} />

      {summary.loading ? <Loading rows={6} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-1">
              <h2 className="mb-3 text-sm font-medium text-slate-500">Compliance status</h2>
              <Donut center={`${t.complianceRate}%`} sub="compliant" segments={[
                { label: 'Compliant', value: t.compliant, color: '#22c55e' },
                { label: 'At risk', value: t.at_risk, color: '#f59e0b' },
                { label: 'Non-compliant', value: t.non_compliant, color: '#ef4444' },
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <Stat label="Employees" value={t.total} icon="users" />
              <Stat label="Training completion" value={`${training.data?.summary.completionRate ?? 0}%`} icon="check" tone="green" />
              <Stat label="Overdue assignments" value={training.data?.summary.overdue ?? 0} icon="clock" tone="red" />
              <Stat label="Certificates expiring" value={expiring.data?.certificates.length ?? 0} icon="award" tone="amber" hint="60 days" />
            </div>
          </div>

          <section>
            <h2 className="mb-2 font-medium">By department</h2>
            <Table head={['Department', 'Employees', 'Compliant', 'At risk', 'Non-compliant', 'Rate']}
              empty={summary.data.departments.length ? '' : 'No employees yet.'}>
              {summary.data.departments.map((d) => (
                <tr key={d.department}>
                  <td className="td font-medium">{d.department}</td><td className="td">{d.total}</td><td className="td">{d.compliant}</td>
                  <td className="td">{d.at_risk}</td><td className="td">{d.non_compliant}</td>
                  <td className="td w-40">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-green-500" style={{ width: `${d.complianceRate}%` }} /></div>
                      <span className="w-9 text-right text-xs tabular-nums">{d.complianceRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-2 font-medium">Needs attention</h2>
              <Table head={['Employee', 'Department', 'Status', 'Gaps']} emptyIcon="check" emptyTitle="All clear"
                empty={gaps.length ? '' : 'Every employee is compliant.'}>
                {gaps.map((e) => (
                  <tr key={e.employeeId}>
                    <td className="td font-medium">{e.name}</td><td className="td">{e.department}</td>
                    <td className="td"><Badge value={e.status} /></td><td className="td">{e.gapCount}</td>
                  </tr>
                ))}
              </Table>
            </section>
            <section>
              <h2 className="mb-2 font-medium">Certificates expiring within 60 days</h2>
              <Table head={['Employee', 'Training', 'Expires']} emptyIcon="award" emptyTitle="Nothing expiring"
                empty={expiring.data?.certificates.length ? '' : 'No certificates expire in the next 60 days.'}>
                {expiring.data?.certificates.map((c) => {
                  const d = daysUntil(c.expiryDate);
                  return (
                    <tr key={c._id}>
                      <td className="td font-medium">{c.employee}</td><td className="td">{c.training}</td>
                      <td className="td">{fmtDate(c.expiryDate)} <span className={d <= 14 ? 'text-red-600' : 'text-amber-600'}>({d}d)</span></td>
                    </tr>
                  );
                })}
              </Table>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
