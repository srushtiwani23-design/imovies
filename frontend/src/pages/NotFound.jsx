import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 style={{ fontSize: '5rem' }}>404</h1>
      <p className="meta">This page doesn’t exist. It may have moved, or the link is wrong.</p>
      <Link to="/" className="btn btn-brass">Go to home</Link>
    </div>
  );
}
