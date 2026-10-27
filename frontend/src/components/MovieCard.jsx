import { Link } from 'react-router-dom';
import Poster from './Poster';
import { fmtDuration } from '../utils/format';

export default function MovieCard({ movie }) {
  return (
    <Link to={`/movies/${movie._id}`} className="movie-card">
      <Poster movie={movie} />
      <h3>{movie.title}</h3>
      <div className="meta d-flex flex-wrap gap-2 align-items-center">
        <span className="cert">{movie.certificate}</span>
        <span>{movie.language}</span>
        <span>{fmtDuration(movie.durationMins)}</span>
      </div>
      {movie.genre?.length > 0 && <div className="meta mt-1">{movie.genre.join(', ')}</div>}
    </Link>
  );
}
