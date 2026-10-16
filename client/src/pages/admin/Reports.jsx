import { useState } from 'react';
import { ErrorBox, PageHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function Reports() {
  const depts = useFetch('/departments');
  const [dept, setDept] = useState('');
  const [error, setError] = useState('');

  // Download via axios so the Authorization header is sent.
  const download = async (kind) => {
    setError('');
    try {
      const { data } = await api.get(`/reports/${kind}`, { params: { format: 'csv', departmentId: dept || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${kind}-report.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Reports" />
      <ErrorBox message={error} />
      <div className="card max-w-xl space-y-4">
        <div><label className="label">Department</label>
          <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {depts.data?.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select></div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => download('training')}>Download training CSV</button>
          <button className="btn" onClick={() => download('compliance')}>Download compliance CSV</button>
        </div>
      </div>
    </>
  );
}
