import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import { fmtDate, fmtTime, money } from '../utils/format';

const METHOD = { card: 'Card', upi: 'UPI', netbanking: 'Net banking' };

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/bookings/${id}`).then(({ data }) => setBooking(data.booking)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;
  if (!booking) return <Loader text="Loading your ticket" />;

  const cancelled = booking.status === 'cancelled';

  return (
    <div className="container py-5">
      <p className="text-center mb-4 no-print">
        {cancelled ? 'This booking was cancelled and refunded.' : 'Your seats are booked. Show this code at the theatre.'}
      </p>

      <div className={`ticket ${cancelled ? 'cancelled' : ''}`}>
        <div className="ticket-main">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span className="ticket-label">{booking.movie.language} · {booking.show?.format} · {booking.movie.certificate}</span>
            <StatusBadge status={booking.status} />
          </div>
          <h1 className="mb-4">{booking.movie.title}</h1>
          <div className="row g-3">
            <div className="col-6 col-sm-4"><div className="ticket-label">Date</div><div className="ticket-value">{fmtDate(booking.showTime)}</div></div>
            <div className="col-6 col-sm-4"><div className="ticket-label">Time</div><div className="ticket-value">{fmtTime(booking.showTime)}</div></div>
            <div className="col-6 col-sm-4"><div className="ticket-label">Screen</div><div className="ticket-value">{booking.show?.screen}</div></div>
            <div className="col-12 col-sm-8"><div className="ticket-label">Theatre</div><div className="ticket-value">{booking.theatre.name}, {booking.theatre.address}, {booking.theatre.city}</div></div>
            <div className="col-6 col-sm-4"><div className="ticket-label">Seats</div><div className="ticket-value">{booking.seats.join(', ')}</div></div>
            <div className="col-6 col-sm-4"><div className="ticket-label">Amount paid</div><div className="ticket-value">{money(booking.totalAmount)}</div></div>
            {booking.payment && (
              <div className="col-12 col-sm-8">
                <div className="ticket-label">Payment</div>
                <div className="ticket-value">{METHOD[booking.payment.method]}, {booking.payment.reference}. Transaction {booking.payment.transactionId}</div>
              </div>
            )}
          </div>
        </div>
        <div className="ticket-stub">
          <div className="ticket-label" style={{ color: '#2a1420' }}>Booking code</div>
          <div className="ticket-code">{booking.bookingCode}</div>
          <div className="small mt-2">{booking.seats.length} {booking.seats.length === 1 ? 'ticket' : 'tickets'}</div>
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-center gap-2 mt-4 no-print">
        <button className="btn btn-ghost" onClick={() => window.print()}>Print ticket</button>
        <Link to="/dashboard" className="btn btn-brass">See all my bookings</Link>
        <Link to="/movies" className="btn btn-ghost">Book another movie</Link>
      </div>
    </div>
  );
}
