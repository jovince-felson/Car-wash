import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QUICK = [
  { label: '🔑 Admin',      username: 'admin',      password: 'admin123' },
  { label: '🧑‍🔧 Staff',      username: 'staff1',     password: 'staff123' },
  { label: '💼 Accountant', username: 'accountant', password: 'acct123' },
  { label: '👤 Customer',   username: 'customer',   password: 'cust123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  async function quickLogin(creds) {
    setError(''); setLoading(true);
    try { await login(creds); navigate('/dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>✦ Spark<span>Wash</span></h1>
          <p>Professional Car Wash Management System</p>
        </div>

        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>

          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="quick-logins">
            <p>Quick Login (Demo)</p>
            <div className="quick-btns">
              {QUICK.map(q => (
                <button key={q.username} className="quick-btn" onClick={() => quickLogin(q)} disabled={loading}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
