import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/axios';
import { setUser } from '../store/authSlice';
import Poster from '../components/Poster';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { fmtDateTime, money } from '../utils/format';

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', city: user?.city || '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/bookings/my', { params: { type: tab, page, limit: 6 } });
      setData(d);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.bookingCode}? ${money(b.totalAmount)} will be refunded.`)) return;
    try {
      await api.put(`/bookings/${b._id}/cancel`);
      toast.success('Booking cancelled. Refund started.');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data: d } = await api.put('/auth/me', profile);
      dispatch(setUser(d.user));
      toast.success('Profile saved');
      setEditing(false);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="panel p-4">
            <h1 className="mb-1" style={{ fontSize: '2.4rem' }}>{user?.name}</h1>
            <p className="meta mb-3">{user?.email}</p>
            {!editing ? (
              <>
                <p className="mb-1"><span className="meta">Phone</span> {user?.phone || 'Not added'}</p>
                <p className="mb-3"><span className="meta">City</span> {user?.city || 'Not added'}</p>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit profile</button>
              </>
            ) : (
              <form onSubmit={saveProfile}>
                <div className="mb-2">
                  <label htmlFor="p-name" className="form-label small">Name</label>
                  <input id="p-name" className="form-control form-control-sm" required value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label htmlFor="p-phone" className="form-label small">Phone</label>
                  <input id="p-phone" className="form-control form-control-sm" value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label htmlFor="p-city" className="form-label small">City</label>
                  <input id="p-city" className="form-control form-control-sm" value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-brass btn-sm">Save profile</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="col-lg-8">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="mb-0" style={{ fontSize: '2.4rem' }}>My bookings</h2>
            <ul className="nav nav-pills gap-2">
              <li className="nav-item">
                <button className={`nav-link ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => switchTab('upcoming')}>Upcoming</button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${tab === 'past' ? 'active' : ''}`} onClick={() => switchTab('past')}>Past and cancelled</button>
              </li>
            </ul>
          </div>

          {loading ? (
            <Loader text="Loading bookings" />
          ) : data.items.length === 0 ? (
            <div className="panel p-5 text-center">
              <p className="mb-3">{tab === 'upcoming' ? 'You have no upcoming shows.' : 'Past bookings will show up here.'}</p>
              <Link to="/movies" className="btn btn-brass">Find a movie</Link>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {data.items.map((b) => (
                <div key={b._id} className="panel p-3 d-flex gap-3">
                  <Poster movie={b.movie} className="poster-sm" />
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap justify-content-between gap-2">
                      <h3 className="mb-0" style={{ fontSize: '1.5rem' }}>{b.movie?.title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="meta small">{b.theatre?.name}, {b.theatre?.city}</div>
                    <div className="small mt-1">{fmtDateTime(b.showTime)} · Seats {b.seats.join(', ')} · {money(b.totalAmount)}</div>
                    <div className="meta small">Code {b.bookingCode}</div>
                    <div className="d-flex gap-2 mt-2">
                      <Link to={`/bookings/${b._id}`} className="btn btn-ghost btn-sm">View ticket</Link>
                      {tab === 'upcoming' && b.status === 'confirmed' && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => cancel(b)}>Cancel booking</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
