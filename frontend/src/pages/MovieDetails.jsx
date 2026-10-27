import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import Poster from '../components/Poster';
import Loader from '../components/Loader';
import { dayBounds, dayLabel, fmtDate, fmtDuration, fmtTime, money, nextDays } from '../utils/format';

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const days = useMemo(() => nextDays(5), []);
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState('');
  const [day, setDay] = useState(days[0]);
  const [loading, setLoading] = useState(true);
  const [showsLoading, setShowsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/movies/${id}`), api.get('/movies/filters')])
      .then(([m, f]) => {
        setMovie(m.data.movie);
        setCities(f.data.cities);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setShowsLoading(true);
    api
      .get(`/movies/${id}/shows`, { params: { ...dayBounds(day), ...(city ? { city } : {}) } })
      .then(({ data }) => setShows(data.shows))
      .catch(() => setShows([]))
      .finally(() => setShowsLoading(false));
  }, [id, day, city]);

  const byTheatre = useMemo(() => {
    const map = new Map();
    shows.forEach((s) => {
      const key = s.theatre._id;
      if (!map.has(key)) map.set(key, { theatre: s.theatre, shows: [] });
      map.get(key).shows.push(s);
    });
    return [...map.values()];
  }, [shows]);

  if (loading) return <Loader text="Loading movie" />;
  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;
  if (!movie) return null;

  return (
    <div className="container py-5">
      <div className="row g-5 mb-5">
        <div className="col-6 col-md-4 col-lg-3"><Poster movie={movie} /></div>
        <div className="col-12 col-md-8 col-lg-9">
          <h1 style={{ fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', textTransform: 'uppercase' }}>{movie.title}</h1>
          <div className="d-flex flex-wrap gap-3 align-items-center meta mb-3">
            <span className="cert">{movie.certificate}</span>
            <span>{movie.language}</span>
            <span>{fmtDuration(movie.durationMins)}</span>
            {movie.releaseDate && <span>Released {fmtDate(movie.releaseDate)}</span>}
          </div>
          <div className="d-flex flex-wrap gap-2 mb-4">
            {movie.genre.map((g) => <span key={g} className="chip">{g}</span>)}
          </div>
          <p style={{ maxWidth: '62ch', fontSize: '1.05rem' }}>{movie.description}</p>
          {movie.director && <p className="mb-1"><span className="meta">Director</span> {movie.director}</p>}
          {movie.cast?.length > 0 && <p><span className="meta">Cast</span> {movie.cast.join(', ')}</p>}
          {movie.trailerUrl && (
            <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">Watch trailer</a>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: '2.4rem' }}>Book tickets</h2>
      <div className="d-flex flex-wrap gap-2 align-items-center my-3">
        {days.map((d) => (
          <button key={d} className={`chip ${d === day ? 'active' : ''}`} onClick={() => setDay(d)}>{dayLabel(d)}</button>
        ))}
        <select
          className="form-select ms-md-auto"
          style={{ width: 'auto' }}
          aria-label="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {showsLoading ? (
        <Loader text="Loading showtimes" />
      ) : byTheatre.length === 0 ? (
        <div className="panel p-4">
          <p className="mb-0">No shows on {dayLabel(day).toLowerCase() === 'today' ? 'today' : dayLabel(day)}{city ? ` in ${city}` : ''}. Try another day.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {byTheatre.map(({ theatre, shows: list }) => (
            <div key={theatre._id} className="panel p-3 p-md-4">
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <div>
                  <h3 className="mb-0" style={{ fontSize: '1.6rem' }}>{theatre.name}</h3>
                  <div className="meta">{theatre.address}, {theatre.city}</div>
                </div>
                {theatre.amenities?.length > 0 && <div className="meta small">{theatre.amenities.join(', ')}</div>}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {list.map((s) => {
                  const ratio = s.availableSeats / (s.totalSeats || 1);
                  return (
                    <button
                      key={s._id}
                      className={`time-btn ${ratio < 0.3 ? 'filling' : ''}`}
                      disabled={s.availableSeats === 0}
                      onClick={() => navigate(`/shows/${s._id}/seats`)}
                      title={`${s.availableSeats} seats left, from ${money(s.prices.regular)}`}
                    >
                      {fmtTime(s.startTime)}
                      <small>{s.format} · {s.availableSeats === 0 ? 'Sold out' : `${s.availableSeats} left`}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="meta small">Green times have plenty of seats. Gold times are filling fast.</p>
        </div>
      )}
    </div>
  );
}
