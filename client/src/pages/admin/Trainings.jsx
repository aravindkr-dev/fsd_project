import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import { useToast } from '../../components/toastContext';
import { Badge, ErrorBox, Loading, PageHeader, Table } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

const EMPTY = { title: '', description: '', category: '', mandatory: false, deadlineDays: '', validityMonths: '', status: 'published' };

export default function Trainings() {
  const { user } = useAuth();
  const base = user.role === 'admin' ? '/admin' : '/trainer';
  const trainings = useFetch('/trainings');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
      files.forEach((f) => fd.append('files', f));
      await api.post('/trainings', fd);
      toast('Course created');
      setForm(null);
      setFiles([]);
      trainings.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Training courses" subtitle="Build courses, attach materials and add assessments.">
        <button className="btn" onClick={() => { setError(''); setFiles([]); setForm(EMPTY); }}><Icon name="plus" className="h-4 w-4" />New course</button>
      </PageHeader>
      <ErrorBox message={trainings.error} />

      {trainings.loading ? <Loading /> : (
        <Table head={['Course', 'Category', 'Materials', 'Validity', 'Status', '']} emptyIcon="book" emptyTitle="No courses yet"
          empty={trainings.data.trainings.length ? '' : 'Create your first course to start assigning training.'}>
          {trainings.data.trainings.map((t) => (
            <tr key={t._id}>
              <td className="td"><div className="font-medium">{t.title}</div>
                {t.mandatory && <span className="text-xs font-medium text-red-600">Mandatory</span>}</td>
              <td className="td">{t.category || '—'}</td>
              <td className="td"><span className="inline-flex items-center gap-1"><Icon name="file" className="h-4 w-4 text-slate-400" />{t.materials.length}</span></td>
              <td className="td">{t.validityMonths ? `${t.validityMonths} mo` : 'No expiry'}</td>
              <td className="td"><Badge value={t.status} /></td>
              <td className="td text-right"><Link className="link" to={`${base}/trainings/${t._id}/assessment`}>Assessment →</Link></td>
            </tr>
          ))}
        </Table>
      )}

      {form && (
        <Modal title="New course" wide onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><ErrorBox message={error} /></div>
            <div><label className="label" htmlFor="t-title">Title</label><input id="t-title" required autoFocus className="input" value={form.title} onChange={set('title')} /></div>
            <div><label className="label" htmlFor="t-cat">Category</label><input id="t-cat" placeholder="e.g. Safety" className="input" value={form.category} onChange={set('category')} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="t-desc">Description</label><textarea id="t-desc" className="input" rows={3} value={form.description} onChange={set('description')} /></div>
            <div><label className="label" htmlFor="t-dl">Deadline (days)</label><input id="t-dl" type="number" min="1" className="input" value={form.deadlineDays} onChange={set('deadlineDays')} />
              <p className="hint">Days after assignment. Leave blank for none.</p></div>
            <div><label className="label" htmlFor="t-val">Certificate valid for (months)</label><input id="t-val" type="number" min="0" className="input" value={form.validityMonths} onChange={set('validityMonths')} />
              <p className="hint">Leave blank if it never expires.</p></div>
            <div><label className="label" htmlFor="t-st">Status</label>
              <select id="t-st" className="input" value={form.status} onChange={set('status')}><option>published</option><option>draft</option></select>
              <p className="hint">Only published courses can be assigned.</p></div>
            <label className="flex items-center gap-2 self-center text-sm font-medium"><input type="checkbox" className="h-4 w-4 rounded" checked={form.mandatory} onChange={set('mandatory')} /> Mandatory course</label>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="t-files">Materials</label>
              <label htmlFor="t-files" className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-brand-500 hover:bg-brand-50/40">
                <Icon name="download" className="mb-1 h-6 w-6 rotate-180" />
                {files.length ? <span className="font-medium text-slate-700">{files.map((f) => f.name).join(', ')}</span> : 'Click to choose PDFs, videos or documents'}
              </label>
              <input id="t-files" type="file" multiple className="sr-only" onChange={(e) => setFiles([...e.target.files])} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Uploading…' : 'Create course'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
