import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/movies', { params: { limit: 8 } }), api.get('/movies/filters')])
      .then(([m, f]) => {
        setMovies(m.data.items);
        setGenres(f.data.genres);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/movies?search=${encodeURIComponent(q)}` : '/movies');
  };

  return (
    <>
      <section className="marquee">
        <div className="container py-5 py-lg-6" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <h1 className="marquee-title mb-4">Tonight’s show starts here</h1>
          <p className="marquee-sub mb-4">
            Find what’s playing near you, pick a showtime and choose the exact seats you want. Your ticket is ready
            the moment you pay.
          </p>
          <form onSubmit={search} className="d-flex gap-2" style={{ maxWidth: 560 }} role="search">
            <label htmlFor="home-search" className="visually-hidden">Search movies</label>
            <input
              id="home-search"
              className="form-control form-control-lg"
              placeholder="Search by movie title"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-brass btn-lg px-4">Search</button>
          </form>
        </div>
      </section>

      <section className="container py-5">
        {genres.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-5">
            {genres.map((g) => (
              <Link key={g} to={`/movies?genre=${encodeURIComponent(g)}`} className="chip">{g}</Link>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-end mb-4">
          <h2 className="mb-0" style={{ fontSize: '2.6rem' }}>Now showing</h2>
          <Link to="/movies">See all movies</Link>
        </div>

        {loading && <Loader text="Loading movies" />}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && movies.length === 0 && (
          <p className="meta">No movies are listed yet. Sign in as admin to add the first one.</p>
        )}
        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-4">
          {movies.map((m) => (
            <div className="col" key={m._id}><MovieCard movie={m} /></div>
          ))}
        </div>
      </section>
    </>
  );
}
