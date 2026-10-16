import { useState } from 'react';
import { ErrorBox, Loading, PageHeader, Table } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function Departments() {
  const depts = useFetch('/departments');
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/departments', form);
      setForm({ name: '', description: '' });
      depts.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Departments" />
      <ErrorBox message={error || depts.error} />
      <form onSubmit={add} className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><label className="label">Name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="min-w-48 flex-[2]"><label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <button className="btn">Add</button>
      </form>
      {depts.loading ? <Loading /> : (
        <Table head={['Name', 'Description', 'Manager']}>
          {depts.data.departments.map((d) => (
            <tr key={d._id}><td className="td">{d.name}</td><td className="td">{d.description || '—'}</td><td className="td">{d.managerId?.name ?? '—'}</td></tr>
          ))}
        </Table>
      )}
    </>
  );
}
