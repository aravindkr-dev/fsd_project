import { useState } from 'react';
import { ErrorBox, PageHeader, Table } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function Requirements() {
  const reqs = useFetch('/compliance/requirements');
  const depts = useFetch('/departments');
  const trainings = useFetch('/trainings?status=published');
  const [form, setForm] = useState({ name: '', departmentId: '', role: '', requiredTrainingIds: [] });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { name: form.name, requiredTrainingIds: form.requiredTrainingIds };
      if (form.departmentId) body.departmentId = form.departmentId;
      if (form.role) body.role = form.role;
      await api.post('/compliance/requirements', body);
      setForm({ name: '', departmentId: '', role: '', requiredTrainingIds: [] });
      reqs.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const toggleTraining = (id) =>
    setForm((f) => ({
      ...f,
      requiredTrainingIds: f.requiredTrainingIds.includes(id) ? f.requiredTrainingIds.filter((x) => x !== id) : [...f.requiredTrainingIds, id],
    }));

  return (
    <>
      <PageHeader title="Compliance requirements" />
      <ErrorBox message={error} />
      <form onSubmit={submit} className="card mb-6 grid gap-3 md:grid-cols-3">
        <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Department</label>
          <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">Any</option>{depts.data?.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select></div>
        <div><label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">Any</option>{['employee', 'manager', 'trainer'].map((r) => <option key={r}>{r}</option>)}
          </select></div>
        <fieldset className="md:col-span-3">
          <legend className="label">Required training (applies to a department and/or role — pick at least one above)</legend>
          <div className="flex flex-wrap gap-3">
            {trainings.data?.trainings.map((t) => (
              <label key={t._id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={form.requiredTrainingIds.includes(t._id)} onChange={() => toggleTraining(t._id)} /> {t.title}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-3"><button className="btn" disabled={!form.requiredTrainingIds.length || (!form.departmentId && !form.role)}>Add requirement</button></div>
      </form>

      <Table head={['Name', 'Department', 'Role', 'Required training']} empty={reqs.data?.requirements.length ? '' : 'No requirements defined.'}>
        {reqs.data?.requirements.map((r) => (
          <tr key={r._id}>
            <td className="td">{r.name}</td><td className="td">{r.departmentId?.name ?? 'Any'}</td><td className="td">{r.role ?? 'Any'}</td>
            <td className="td">{r.requiredTrainingIds.map((t) => t.title).join(', ')}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
