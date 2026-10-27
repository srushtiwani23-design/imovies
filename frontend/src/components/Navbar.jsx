import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { logout } from '../store/authSlice';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = () => {
    dispatch(logout());
    toast.info('Signed out');
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg topbar sticky-top">
      <div className="container">
        <Link to="/" className="brand navbar-brand">IMovies</Link>

        <div className="d-flex align-items-center gap-2 order-lg-last">
          {user && <NotificationBell />}
          <button
            className="navbar-toggler border-0"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="navbar-toggler-icon" />
          </button>
        </div>

        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto gap-lg-2">
            <li className="nav-item"><NavLink to="/movies" className="nav-link">Movies</NavLink></li>
            {user && <li className="nav-item"><NavLink to="/dashboard" className="nav-link">My bookings</NavLink></li>}
            {user?.role === 'admin' && <li className="nav-item"><NavLink to="/admin" className="nav-link">Admin</NavLink></li>}
          </ul>
          <div className="d-flex gap-2 align-items-center py-2 py-lg-0 me-lg-2">
            {user ? (
              <>
                <span className="meta d-none d-lg-inline">Hi, {user.name.split(' ')[0]}</span>
                <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-brass btn-sm">Create account</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
