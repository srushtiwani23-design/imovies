import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { dayBounds, dayLabel, nextDays } from '../utils/format';

export default function Movies() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [query, setQuery] = useState(get('search'));
  const [filters, setFilters] = useState({ genres: [], languages: [], cities: [] });
  const [theatres, setTheatres] = useState([]);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    if (key === 'city') next.delete('theatre');
    setParams(next);
  };

  useEffect(() => {
    api.get('/movies/filters').then(({ data: d }) => setFilters(d)).catch(() => {});
  }, []);

  useEffect(() => {
    const city = params.get('city');
    api
      .get('/theatres', { params: city ? { city } : {} })
      .then(({ data: d }) => setTheatres(d.theatres))
      .catch(() => {});
  }, [params]);

  // Debounced search box
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim() !== get('search')) update('search', query.trim());
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const p = Object.fromEntries(params.entries());
    if (p.date) Object.assign(p, dayBounds(p.date));
    delete p.date;
    setLoading(true);
    setError('');
    api
      .get('/movies', { params: { ...p, limit: 12 } })
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [params]);

  const hasFilters = ['search', 'genre', 'language', 'city', 'theatre', 'date'].some((k) => params.get(k));

  return (
    <div className="container py-5">
      <h1 className="mb-4" style={{ fontSize: '3rem' }}>Movies</h1>

      <div className="panel p-3 mb-4">
        <div className="row g-2">
          <div className="col-12 col-lg-4">
            <label htmlFor="q" className="visually-hidden">Search</label>
            <input id="q" className="form-control" placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="col-6 col-lg-2">
            <select className="form-select" aria-label="Genre" value={get('genre')} onChange={(e) => update('genre', e.target.value)}>
              <option value="">All genres</option>
              {filters.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <select className="form-select" aria-label="Language" value={get('language')} onChange={(e) => update('language', e.target.value)}>
              <option value="">All languages</option>
              {filters.languages.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <select className="form-select" aria-label="City" value={get('city')} onChange={(e) => update('city', e.target.value)}>
              <option value="">All cities</option>
              {filters.cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <select className="form-select" aria-label="Theatre" value={get('theatre')} onChange={(e) => update('theatre', e.target.value)}>
              <option value="">All theatres</option>
              {theatres.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <span className="meta me-1">Showing on</span>
          <button className={`chip ${!get('date') ? 'active' : ''}`} onClick={() => update('date', '')}>Any day</button>
          {nextDays(5).map((d) => (
            <button key={d} className={`chip ${get('date') === d ? 'active' : ''}`} onClick={() => update('date', d)}>
              {dayLabel(d)}
            </button>
          ))}
          {hasFilters && (
            <button className="btn btn-link btn-sm ms-auto" onClick={() => { setQuery(''); setParams({}); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <Loader text="Finding movies" />
      ) : (
        <>
          <p className="meta">{data.total} {data.total === 1 ? 'movie' : 'movies'} found</p>
          {data.items.length === 0 && (
            <div className="panel p-5 text-center">
              <h2 style={{ fontSize: '2rem' }}>No movies match these filters</h2>
              <p className="meta mb-0">Try another day, city or genre.</p>
            </div>
          )}
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-4">
            {data.items.map((m) => <div className="col" key={m._id}><MovieCard movie={m} /></div>)}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => update('page', String(p))} />
        </>
      )}
    </div>
  );
}
