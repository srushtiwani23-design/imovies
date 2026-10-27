import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/axios';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { fmtDateTime, money } from '../../utils/format';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(({ data: d }) => setData(d)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <Loader />;

  const { stats, recentBookings } = data;
  const cards = [
    ['Revenue from confirmed bookings', money(stats.revenue)],
    ['Confirmed bookings', stats.confirmedBookings],
    ['Cancelled bookings', stats.cancelledBookings],
    ['Upcoming shows', stats.upcomingShows],
    ['Movies', stats.movies],
    ['Theatres', stats.theatres],
    ['Registered users', stats.users],
  ];

  return (
    <>
      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3 mb-5">
        {cards.map(([label, value]) => (
          <div className="col" key={label}>
            <div className="panel stat h-100">
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '2rem' }}>Latest bookings</h2>
      {recentBookings.length === 0 ? (
        <p className="meta">No bookings yet.</p>
      ) : (
        <div className="table-responsive panel">
          <table className="table align-middle mb-0">
            <thead><tr><th>Code</th><th>Customer</th><th>Movie</th><th>Show</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.bookingCode}</td>
                  <td>{b.user?.name}<div className="meta small">{b.user?.email}</div></td>
                  <td>{b.movie?.title}<div className="meta small">{b.theatre?.name}</div></td>
                  <td className="small">{fmtDateTime(b.showTime)}</td>
                  <td>{b.seats.join(', ')}</td>
                  <td>{money(b.totalAmount)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
