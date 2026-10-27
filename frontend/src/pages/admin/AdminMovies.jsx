import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/axios';
import Poster from '../../components/Poster';
import Loader from '../../components/Loader';
import Pagination from '../../components/Pagination';
import { fmtDuration } from '../../utils/format';

const EMPTY = {
  title: '', language: '', durationMins: '', certificate: 'UA', releaseDate: '', genre: '', cast: '',
  director: '', posterUrl: '', trailerUrl: '', description: '', isActive: true,
};

export default function AdminMovies() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/movies', { params: { includeInactive: true, page, limit: 10, search } });
      setData(d);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setForm(EMPTY);
    setEditingId(null);
    setPosterFile(null);
  };

  const startEdit = (m) => {
    setForm({
      ...EMPTY,
      ...m,
      genre: (m.genre || []).join(', '),
      cast: (m.cast || []).join(', '),
      releaseDate: m.releaseDate ? m.releaseDate.slice(0, 10) : '',
    });
    setEditingId(m._id);
    setPosterFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const body = new FormData();
    Object.keys(EMPTY).forEach((k) => body.append(k, form[k] ?? ''));
    if (posterFile) body.append('poster', posterFile);
    setSaving(true);
    try {
      if (editingId) await api.put(`/movies/${editingId}`, body);
      else await api.post('/movies', body);
      toast.success(editingId ? 'Movie updated' : 'Movie added');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/movies/${m._id}`);
      toast.success('Movie deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      {form ? (
        <form onSubmit={save} className="panel p-4 mb-4">
          <h2 style={{ fontSize: '2rem' }}>{editingId ? 'Edit movie' : 'Add movie'}</h2>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="m-title">Title</label><input id="m-title" className="form-control" required value={form.title} onChange={set('title')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-lang">Language</label><input id="m-lang" className="form-control" required value={form.language} onChange={set('language')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-dur">Duration (minutes)</label><input id="m-dur" type="number" min="30" max="400" className="form-control" required value={form.durationMins} onChange={set('durationMins')} /></div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="m-cert">Certificate</label>
              <select id="m-cert" className="form-select" value={form.certificate} onChange={set('certificate')}>
                {['U', 'UA', 'A', 'S'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-3"><label className="form-label" htmlFor="m-rel">Release date</label><input id="m-rel" type="date" className="form-control" value={form.releaseDate} onChange={set('releaseDate')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-genre">Genres (comma separated)</label><input id="m-genre" className="form-control" placeholder="Action, Thriller" value={form.genre} onChange={set('genre')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-dir">Director</label><input id="m-dir" className="form-control" value={form.director} onChange={set('director')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-cast">Cast (comma separated)</label><input id="m-cast" className="form-control" value={form.cast} onChange={set('cast')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-poster">Poster image URL</label><input id="m-poster" className="form-control" placeholder="https://…" value={form.posterUrl} onChange={set('posterUrl')} /></div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="m-file">Or upload a poster (max 2 MB)</label>
              <input id="m-file" type="file" accept="image/*" className="form-control" onChange={(e) => setPosterFile(e.target.files[0] || null)} />
            </div>
            <div className="col-md-6"><label className="form-label" htmlFor="m-trailer">Trailer URL</label><input id="m-trailer" className="form-control" value={form.trailerUrl} onChange={set('trailerUrl')} /></div>
            <div className="col-md-6 d-flex align-items-end">
              <div className="form-check">
                <input id="m-active" type="checkbox" className="form-check-input" checked={form.isActive} onChange={set('isActive')} />
                <label htmlFor="m-active" className="form-check-label">Visible to customers</label>
              </div>
            </div>
            <div className="col-12"><label className="form-label" htmlFor="m-desc">Description</label><textarea id="m-desc" rows="3" className="form-control" value={form.description} onChange={set('description')} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-brass" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add movie'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button className="btn btn-brass" onClick={startNew}>Add movie</button>
          <input className="form-control ms-auto" style={{ maxWidth: 280 }} placeholder="Search movies" aria-label="Search movies"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      )}

      {loading ? <Loader /> : (
        <div className="table-responsive panel">
          <table className="table align-middle mb-0">
            <thead><tr><th>Movie</th><th>Language</th><th>Length</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <Poster movie={m} className="poster-sm" />
                      <div><div className="fw-semibold">{m.title}</div><div className="meta small">{m.genre.join(', ')}</div></div>
                    </div>
                  </td>
                  <td>{m.language}</td>
                  <td>{fmtDuration(m.durationMins)}</td>
                  <td>{m.isActive ? <span className="status status-confirmed">Visible</span> : <span className="status status-pending">Hidden</span>}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-ghost btn-sm me-2" onClick={() => startEdit(m)}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(m)}>Delete</button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="5" className="meta py-4 text-center">No movies found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}
