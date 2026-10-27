import { NavLink, Outlet } from 'react-router-dom';

const LINKS = [
  ['/admin', 'Overview', true],
  ['/admin/movies', 'Movies'],
  ['/admin/theatres', 'Theatres'],
  ['/admin/shows', 'Shows'],
  ['/admin/bookings', 'Bookings'],
];

export default function AdminLayout() {
  return (
    <div className="container py-5">
      <h1 className="mb-3" style={{ fontSize: '3rem' }}>Admin panel</h1>
      <ul className="nav nav-pills gap-2 mb-4 flex-wrap">
        {LINKS.map(([to, label, end]) => (
          <li className="nav-item" key={to}>
            <NavLink to={to} end={end} className="nav-link">{label}</NavLink>
          </li>
        ))}
      </ul>
      <Outlet />
    </div>
  );
}
