import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/axios';
import Loader from '../../components/Loader';
import Pagination from '../../components/Pagination';
import { fmtDateTime, money } from '../../utils/format';

const EMPTY = {
  movie: '', theatre: '', screen: 1, startTime: '', format: '2D', language: '',
  regularPrice: 180, premiumPrice: 290, rows: 8, seatsPerRow: 12, premiumRows: 2,
};

export default function AdminShows() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [page, setPage] = useState(1);
  const [upcoming, setUpcoming] = useState(true);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/shows', { params: { page, limit: 15, upcoming } });
      setData(d);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, upcoming]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api.get('/movies', { params: { limit: 50, sort: 'title' } }), api.get('/theatres')])
      .then(([m, t]) => {
        setMovies(m.data.items);
        setTheatres(t.data.theatres);
      })
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const theatre = theatres.find((t) => t._id === form?.theatre);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/shows/${editing._id}`, {
          regularPrice: form.regularPrice, premiumPrice: form.premiumPrice, format: form.format, isActive: form.isActive,
        });
        toast.success('Show updated');
      } else {
        await api.post('/shows', { ...form, startTime: new Date(form.startTime).toISOString() });
        toast.success('Show added');
      }
      setForm(null);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const startEdit = (s) => {
    setEditing(s);
    setForm({ regularPrice: s.prices.regular, premiumPrice: s.prices.premium, format: s.format, isActive: s.isActive });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete the ${fmtDateTime(s.startTime)} show of ${s.movie?.title}?`)) return;
    try {
      await api.delete(`/shows/${s._id}`);
      toast.success('Show deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      {form && editing && (
        <form onSubmit={save} className="panel p-4 mb-4">
          <h2 style={{ fontSize: '2rem' }}>Edit show</h2>
          <p className="meta">{editing.movie?.title} at {editing.theatre?.name}, screen {editing.screen}, {fmtDateTime(editing.startTime)}. The seat layout and time can’t change after creation.</p>
          <div className="row g-3">
            <div className="col-md-3"><label className="form-label" htmlFor="e-reg">Regular price (₹)</label><input id="e-reg" type="number" min="0" className="form-control" value={form.regularPrice} onChange={set('regularPrice')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="e-pre">Premium price (₹)</label><input id="e-pre" type="number" min="0" className="form-control" value={form.premiumPrice} onChange={set('premiumPrice')} /></div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="e-fmt">Format</label>
              <select id="e-fmt" className="form-select" value={form.format} onChange={set('format')}>{['2D', '3D', 'IMAX'].map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input id="e-active" type="checkbox" className="form-check-input" checked={form.isActive} onChange={set('isActive')} />
                <label htmlFor="e-active" className="form-check-label">Open for booking</label>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-brass">Save changes</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setForm(null); setEditing(null); }}>Cancel</button>
          </div>
        </form>
      )}

      {form && !editing && (
        <form onSubmit={save} className="panel p-4 mb-4">
          <h2 style={{ fontSize: '2rem' }}>Add show</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="s-movie">Movie</label>
              <select id="s-movie" className="form-select" required value={form.movie} onChange={set('movie')}>
                <option value="">Choose a movie</option>
                {movies.map((m) => <option key={m._id} value={m._id}>{m.title} ({m.language})</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="s-theatre">Theatre</label>
              <select id="s-theatre" className="form-select" required value={form.theatre} onChange={(e) => setForm({ ...form, theatre: e.target.value, screen: 1 })}>
                <option value="">Choose a theatre</option>
                {theatres.map((t) => <option key={t._id} value={t._id}>{t.name}, {t.city}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="s-screen">Screen</label>
              <select id="s-screen" className="form-select" value={form.screen} onChange={set('screen')}>
                {Array.from({ length: theatre?.screens || 1 }, (_, i) => <option key={i + 1} value={i + 1}>Screen {i + 1}</option>)}
              </select>
            </div>
            <div className="col-md-5"><label className="form-label" htmlFor="s-time">Start time</label><input id="s-time" type="datetime-local" className="form-control" required value={form.startTime} onChange={set('startTime')} /></div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="s-fmt">Format</label>
              <select id="s-fmt" className="form-select" value={form.format} onChange={set('format')}>{['2D', '3D', 'IMAX'].map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <div className="col-md-2"><label className="form-label" htmlFor="s-lang">Language</label><input id="s-lang" className="form-control" placeholder="Same as movie" value={form.language} onChange={set('language')} /></div>
            <div className="col-6 col-md-2"><label className="form-label" htmlFor="s-reg">Regular ₹</label><input id="s-reg" type="number" min="0" className="form-control" required value={form.regularPrice} onChange={set('regularPrice')} /></div>
            <div className="col-6 col-md-2"><label className="form-label" htmlFor="s-pre">Premium ₹</label><input id="s-pre" type="number" min="0" className="form-control" required value={form.premiumPrice} onChange={set('premiumPrice')} /></div>
            <div className="col-4 col-md-2"><label className="form-label" htmlFor="s-rows">Rows</label><input id="s-rows" type="number" min="1" max="26" className="form-control" value={form.rows} onChange={set('rows')} /></div>
            <div className="col-4 col-md-2"><label className="form-label" htmlFor="s-per">Seats per row</label><input id="s-per" type="number" min="1" max="30" className="form-control" value={form.seatsPerRow} onChange={set('seatsPerRow')} /></div>
            <div className="col-4 col-md-2"><label className="form-label" htmlFor="s-prem">Premium rows</label><input id="s-prem" type="number" min="0" className="form-control" value={form.premiumRows} onChange={set('premiumRows')} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-brass">Add show</button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!form && (
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          <button className="btn btn-brass" onClick={() => { setEditing(null); setForm(EMPTY); }}>Add show</button>
          <div className="form-check ms-auto">
            <input id="only-up" type="checkbox" className="form-check-input" checked={upcoming} onChange={(e) => { setUpcoming(e.target.checked); setPage(1); }} />
            <label htmlFor="only-up" className="form-check-label">Only upcoming shows</label>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <div className="table-responsive panel">
          <table className="table align-middle mb-0">
            <thead><tr><th>Movie</th><th>Theatre</th><th>Time</th><th>Format</th><th>Seats left</th><th>Prices</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s._id}>
                  <td className="fw-semibold">{s.movie?.title}</td>
                  <td>{s.theatre?.name}<div className="meta small">{s.theatre?.city}, screen {s.screen}</div></td>
                  <td className="small">{fmtDateTime(s.startTime)}</td>
                  <td>{s.format}</td>
                  <td>{s.availableSeats} / {s.totalSeats}</td>
                  <td className="small">{money(s.prices.regular)} / {money(s.prices.premium)}</td>
                  <td>{s.isActive ? <span className="status status-confirmed">Open</span> : <span className="status status-pending">Closed</span>}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-ghost btn-sm me-2" onClick={() => startEdit(s)}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="8" className="meta py-4 text-center">No shows found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}
