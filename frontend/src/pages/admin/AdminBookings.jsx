import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errMsg } from '../../api/axios';
import Loader from '../../components/Loader';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { fmtDateTime, money } from '../../utils/format';

export default function AdminBookings() {
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/bookings', { params: { page, limit: 20, ...(status ? { status } : {}) } });
      setData(d);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <span className="meta">{data.total} bookings</span>
        <select className="form-select ms-auto" style={{ width: 'auto' }} aria-label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Payment failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      {loading ? <Loader /> : (
        <div className="table-responsive panel">
          <table className="table align-middle mb-0">
            <thead><tr><th>Code</th><th>Customer</th><th>Movie</th><th>Show time</th><th>Seats</th><th>Amount</th><th>Status</th><th>Booked on</th></tr></thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b._id}>
                  <td>{b.bookingCode}</td>
                  <td>{b.user?.name}<div className="meta small">{b.user?.email}</div></td>
                  <td>{b.movie?.title}<div className="meta small">{b.theatre?.name}, {b.theatre?.city}</div></td>
                  <td className="small">{fmtDateTime(b.showTime)}</td>
                  <td>{b.seats.join(', ')}</td>
                  <td>{money(b.totalAmount)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="small">{fmtDateTime(b.createdAt)}</td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="8" className="meta py-4 text-center">No bookings found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}
