import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { register } from '../store/authSlice';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', city: '' });
  const { user, loading } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  if (user) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    try {
      const { confirm, ...details } = form;
      await dispatch(register(details)).unwrap();
      toast.success('Account created');
      navigate(from, { replace: true });
    } catch (msg) {
      toast.error(msg);
    }
    return null;
  };

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <h1 className="mb-1" style={{ fontSize: '3rem' }}>Create account</h1>
      <p className="meta mb-4">It takes a minute. You’ll need it to book seats.</p>
      <form onSubmit={submit} className="panel p-4">
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Full name</label>
          <input id="name" className="form-control" required value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div className="mb-3">
          <label htmlFor="r-email" className="form-label">Email</label>
          <input id="r-email" type="email" className="form-control" required value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div className="row g-3 mb-3">
          <div className="col-sm-6">
            <label htmlFor="r-pass" className="form-label">Password</label>
            <input id="r-pass" type="password" className="form-control" required minLength={6} value={form.password} onChange={set('password')} autoComplete="new-password" />
          </div>
          <div className="col-sm-6">
            <label htmlFor="r-confirm" className="form-label">Confirm password</label>
            <input id="r-confirm" type="password" className="form-control" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </div>
        </div>
        <div className="row g-3 mb-4">
          <div className="col-sm-6">
            <label htmlFor="r-phone" className="form-label">Phone (optional)</label>
            <input id="r-phone" className="form-control" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </div>
          <div className="col-sm-6">
            <label htmlFor="r-city" className="form-label">City (optional)</label>
            <input id="r-city" className="form-control" value={form.city} onChange={set('city')} />
          </div>
        </div>
        <button className="btn btn-brass w-100" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="meta mt-3 mb-0 text-center">Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
      </form>
    </div>
  );
}
