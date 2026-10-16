import Donut from '../../components/Donut';
import { Badge, ErrorBox, Loading, PageHeader, Stat, Table } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';

export default function ManagerDashboard() {
  const summary = useFetch('/compliance/summary');
  const t = summary.data?.totals;

  return (
    <>
      <PageHeader title="Team compliance" subtitle="Status of your direct reports." />
      <ErrorBox message={summary.error} />
      {summary.loading ? <Loading rows={5} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card">
              <Donut center={`${t.complianceRate}%`} sub="compliant" segments={[
                { label: 'Compliant', value: t.compliant, color: '#22c55e' },
                { label: 'At risk', value: t.at_risk, color: '#f59e0b' },
                { label: 'Non-compliant', value: t.non_compliant, color: '#ef4444' },
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <Stat label="Team size" value={t.total} icon="users" />
              <Stat label="Compliant" value={t.compliant} icon="check" tone="green" />
              <Stat label="At risk" value={t.at_risk} icon="clock" tone="amber" />
              <Stat label="Non-compliant" value={t.non_compliant} icon="alert" tone="red" />
            </div>
          </div>
          <Table head={['Employee', 'Department', 'Status', 'Open gaps']} emptyIcon="users" emptyTitle="No direct reports"
            empty={summary.data.employees.length ? '' : 'Employees assigned to you will appear here.'}>
            {summary.data.employees.map((e) => (
              <tr key={e.employeeId}>
                <td className="td font-medium">{e.name}</td><td className="td">{e.department}</td>
                <td className="td"><Badge value={e.status} /></td><td className="td">{e.gapCount}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
