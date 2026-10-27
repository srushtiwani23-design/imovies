import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/axios';
import Loader from '../../components/Loader';

const EMPTY = { name: '', city: '', address: '', screens: 3, amenities: '' };

export default function AdminTheatres() {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/theatres');
      setTheatres(data.theatres);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/theatres/${editingId}`, form);
      else await api.post('/theatres', form);
      toast.success(editingId ? 'Theatre updated' : 'Theatre added');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.name}?`)) return;
    try {
      await api.delete(`/theatres/${t._id}`);
      toast.success('Theatre deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      {form ? (
        <form onSubmit={save} className="panel p-4 mb-4">
          <h2 style={{ fontSize: '2rem' }}>{editingId ? 'Edit theatre' : 'Add theatre'}</h2>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label" htmlFor="t-name">Name</label><input id="t-name" className="form-control" required value={form.name} onChange={set('name')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="t-city">City</label><input id="t-city" className="form-control" required value={form.city} onChange={set('city')} /></div>
            <div className="col-md-3"><label className="form-label" htmlFor="t-screens">Screens</label><input id="t-screens" type="number" min="1" max="20" className="form-control" required value={form.screens} onChange={set('screens')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="t-addr">Address</label><input id="t-addr" className="form-control" value={form.address} onChange={set('address')} /></div>
            <div className="col-md-6"><label className="form-label" htmlFor="t-amen">Amenities (comma separated)</label><input id="t-amen" className="form-control" placeholder="Dolby Atmos, Parking" value={form.amenities} onChange={set('amenities')} /></div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button className="btn btn-brass">{editingId ? 'Save changes' : 'Add theatre'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-brass mb-3" onClick={() => { setForm(EMPTY); setEditingId(null); }}>Add theatre</button>
      )}

      {loading ? <Loader /> : (
        <div className="table-responsive panel">
          <table className="table align-middle mb-0">
            <thead><tr><th>Theatre</th><th>City</th><th>Screens</th><th>Amenities</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {theatres.map((t) => (
                <tr key={t._id}>
                  <td><div className="fw-semibold">{t.name}</div><div className="meta small">{t.address}</div></td>
                  <td>{t.city}</td>
                  <td>{t.screens}</td>
                  <td className="small">{t.amenities.join(', ')}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-ghost btn-sm me-2" onClick={() => { setForm({ ...t, amenities: t.amenities.join(', ') }); setEditingId(t._id); }}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
              {theatres.length === 0 && <tr><td colSpan="5" className="meta py-4 text-center">No theatres yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
