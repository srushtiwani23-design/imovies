import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { login } from '../store/authSlice';

const DEMO = {
  user: { email: 'user@imovies.com', password: 'User@123' },
  admin: { email: 'admin@imovies.com', password: 'Admin@123' },
};

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { user, loading } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(login(form)).unwrap();
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      navigate(from, { replace: true });
    } catch (msg) {
      toast.error(msg);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 460 }}>
      <h1 className="mb-1" style={{ fontSize: '3rem' }}>Sign in</h1>
      <p className="meta mb-4">Sign in to book seats and see your tickets.</p>
      <form onSubmit={submit} className="panel p-4">
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input id="email" type="email" className="form-control" required autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="form-label">Password</label>
          <input id="password" type="password" className="form-control" required autoComplete="current-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn btn-brass w-100" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <p className="meta mt-3 mb-0 text-center">New here? <Link to="/register" state={location.state}>Create an account</Link></p>
      </form>

      <div className="panel p-3 mt-3">
        <div className="small mb-2">Demo accounts</div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(DEMO.user)}>Fill user login</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(DEMO.admin)}>Fill admin login</button>
        </div>
      </div>
    </div>
  );
}
