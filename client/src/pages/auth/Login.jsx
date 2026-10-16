import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { ErrorBox } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { errMsg } from '../../services/api';
import { HOME } from './home';

const POINTS = [
  ['book', 'Assigned training in one place'],
  ['award', 'Certificates tracked and renewed on time'],
  ['shield', 'Compliance gaps flagged automatically'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) return <Navigate to={HOME[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(form.email, form.password);
      navigate(HOME[u.role], { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15"><Icon name="shield" /></div>ComplianceHub
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Training, certification and compliance — without the spreadsheets.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><Icon name={icon} className="h-4 w-4" /></span>{text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-100/70">Employee Training &amp; Compliance Management</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/5" />
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <form onSubmit={submit} className="w-full max-w-sm animate-slide-up space-y-5">
          <div>
            <div className="mb-6 flex items-center gap-2 font-semibold text-brand-700 lg:hidden"><Icon name="shield" />ComplianceHub</div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue to your training dashboard.</p>
          </div>
          <ErrorBox message={error} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoFocus autoComplete="username" placeholder="you@company.com" className="input"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" className="input pr-16"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-800" aria-pressed={show}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button className="btn w-full py-2.5" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-center text-xs text-slate-400">Accounts are created by your HR administrator.</p>
        </form>
      </main>
    </div>
  );
}
