import { useState } from 'react';
import { assetUrl } from '../api/axios';

// Shows the poster image, or a generated title card if there is no image
export default function Poster({ movie, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(movie?.posterUrl);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${movie.title} poster`}
        className={`poster ${className}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const title = movie?.title || '';
  const h1 = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);
  return (
    <div
      className={`poster poster-fallback ${className}`}
      style={{ '--h1': h1, '--h2': (h1 + 40) % 360 }}
      role="img"
      aria-label={`${title} poster`}
    >
      {movie?.genre?.[0] && <span className="p-genre">{movie.genre[0]}</span>}
      <span className="p-title">{title}</span>
    </div>
  );
}
