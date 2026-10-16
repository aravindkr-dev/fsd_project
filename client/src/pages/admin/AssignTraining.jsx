import { useState } from 'react';
import { Badge, ErrorBox, PageHeader, Table, fmtDate } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function AssignTraining() {
  const trainings = useFetch('/trainings?status=published');
  const depts = useFetch('/departments');
  const users = useFetch('/users?role=employee');
  const assignments = useFetch('/assignments');
  const [mode, setMode] = useState('department');
  const [form, setForm] = useState({ trainingId: '', departmentId: '', role: 'employee', employeeId: '', dueDate: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const body = { trainingId: form.trainingId };
    if (form.dueDate) body.dueDate = form.dueDate;
    if (mode === 'department') body.departmentId = form.departmentId;
    if (mode === 'role') body.role = form.role;
    if (mode === 'employee') body.employeeIds = [form.employeeId];
    try {
      const { data } = await api.post('/assignments', body);
      setMsg(`Assigned to ${data.created} employee(s); ${data.skipped} already had it.`);
      assignments.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Assign training" />
      <ErrorBox message={error} />
      {msg && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}
      <form onSubmit={submit} className="card mb-6 grid gap-3 md:grid-cols-4">
        <div><label className="label">Course</label>
          <select required className="input" value={form.trainingId} onChange={set('trainingId')}>
            <option value="">Select…</option>
            {trainings.data?.trainings.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select></div>
        <div><label className="label">Assign to</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="department">Department</option><option value="role">Role</option><option value="employee">Single employee</option>
          </select></div>
        <div><label className="label">Target</label>
          {mode === 'department' && (
            <select required className="input" value={form.departmentId} onChange={set('departmentId')}>
              <option value="">Select…</option>
              {depts.data?.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          )}
          {mode === 'role' && (
            <select className="input" value={form.role} onChange={set('role')}>
              {['employee', 'manager', 'trainer'].map((r) => <option key={r}>{r}</option>)}
            </select>
          )}
          {mode === 'employee' && (
            <select required className="input" value={form.employeeId} onChange={set('employeeId')}>
              <option value="">Select…</option>
              {users.data?.users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}
        </div>
        <div><label className="label">Due date (optional)</label><input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} /></div>
        <div className="md:col-span-4"><button className="btn">Assign</button></div>
      </form>

      <h2 className="mb-2 font-medium">Recent assignments</h2>
      <Table head={['Employee', 'Training', 'Status', 'Progress', 'Due']}>
        {assignments.data?.assignments.map((a) => (
          <tr key={a._id}>
            <td className="td">{a.employeeId?.name}</td><td className="td">{a.trainingId?.title}</td>
            <td className="td"><Badge value={a.status} /></td><td className="td">{a.progress}%</td><td className="td">{fmtDate(a.dueDate)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
