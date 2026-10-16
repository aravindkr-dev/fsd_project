import { useState } from 'react';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import { useToast } from '../../components/toastContext';
import { Badge, ErrorBox, Loading, PageHeader, Table } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

const EMPTY = { name: '', email: '', password: '', role: 'employee', departmentId: '', managerId: '', jobTitle: '' };

export default function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (roleFilter) params.set('role', roleFilter);
  const users = useFetch(`/users?${params}`);
  const all = useFetch('/users');
  const depts = useFetch('/departments');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/users', { ...form, departmentId: form.departmentId || null, managerId: form.managerId || null });
      toast(`${form.name} was added`);
      setForm(null);
      users.reload();
      all.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (u) => {
    try {
      await api.patch(`/users/${u._id}`, { status: u.status === 'active' ? 'inactive' : 'active' });
      toast(`${u.name} ${u.status === 'active' ? 'deactivated' : 'activated'}`);
      users.reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const managers = all.data?.users.filter((u) => u.role === 'manager') ?? [];

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts and manage who can access the system.">
        <button className="btn" onClick={() => { setError(''); setForm(EMPTY); }}><Icon name="plus" className="h-4 w-4" />Add user</button>
      </PageHeader>

      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input max-w-xs" type="search" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
          <option value="">All roles</option>
          {['employee', 'manager', 'trainer', 'admin'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <ErrorBox message={users.error} />

      {users.loading && !users.data ? <Loading /> : (
        <Table head={['Name', 'Role', 'Department', 'Status', '']} emptyIcon="users" emptyTitle="No users found"
          empty={users.data.users.length ? '' : 'Try a different search or add a user.'}>
          {users.data.users.map((u) => (
            <tr key={u._id}>
              <td className="td"><div className="font-medium">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td>
              <td className="td capitalize">{u.role}</td>
              <td className="td">{u.departmentId?.name ?? '—'}</td>
              <td className="td"><Badge value={u.status} /></td>
              <td className="td text-right"><button className="btn-secondary btn-sm" onClick={() => toggle(u)}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
        </Table>
      )}

      {form && (
        <Modal title="Add user" onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><ErrorBox message={error} /></div>
            <div><label className="label" htmlFor="u-name">Full name</label><input id="u-name" required autoFocus className="input" value={form.name} onChange={set('name')} /></div>
            <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" required type="email" className="input" value={form.email} onChange={set('email')} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="u-pw">Temporary password</label>
              <input id="u-pw" required minLength={8} type="password" className="input" value={form.password} onChange={set('password')} />
              <p className="hint">At least 8 characters. Share it securely with the user.</p></div>
            <div><label className="label" htmlFor="u-role">Role</label>
              <select id="u-role" className="input" value={form.role} onChange={set('role')}>{['employee', 'manager', 'trainer', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className="label" htmlFor="u-dept">Department</label>
              <select id="u-dept" className="input" value={form.departmentId} onChange={set('departmentId')}>
                <option value="">None</option>{depts.data?.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="u-mgr">Reports to</label>
              <select id="u-mgr" className="input" value={form.managerId} onChange={set('managerId')}>
                <option value="">No manager</option>{managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
