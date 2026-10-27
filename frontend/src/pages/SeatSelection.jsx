import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/axios';
import socket from '../socket';
import Loader from '../components/Loader';
import { fmtDateTime, money } from '../utils/format';

const MAX_SEATS = 10;

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = useSelector((s) => s.auth.user?._id);
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const selectedRef = useRef([]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const loadSeats = useCallback(async () => {
    const { data } = await api.get(`/shows/${id}/seats`);
    setSeats(data.seats);
    // Keep seats this user is already holding (for example after coming back from checkout)
    setSelected(data.seats.filter((s) => s.status === 'locked' && s.lockedBy === userId).map((s) => s.label));
  }, [id, userId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/shows/${id}`), loadSeats()])
      .then(([s]) => setShow(s.data.show))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, loadSeats]);

  // Real-time seat updates for this show
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const join = () => socket.emit('show:join', id);
    join();
    socket.on('connect', join);

    const onUpdate = ({ showId, labels, status, userId: by }) => {
      if (showId !== id) return;
      setSeats((prev) =>
        prev.map((seat) =>
          labels.includes(seat.label) ? { ...seat, status, lockedBy: status === 'locked' ? by : null } : seat
        )
      );
      if (by !== userId && status !== 'available') {
        const lost = selectedRef.current.filter((l) => labels.includes(l));
        if (lost.length) {
          toast.warn(`Seat ${lost.join(', ')} was just taken by someone else`);
          setSelected((prev) => prev.filter((l) => !labels.includes(l)));
        }
      }
    };
    socket.on('seats:update', onUpdate);

    return () => {
      socket.emit('show:leave', id);
      socket.off('connect', join);
      socket.off('seats:update', onUpdate);
    };
  }, [id, userId]);

  const rows = useMemo(() => {
    const map = new Map();
    seats.forEach((s) => {
      if (!map.has(s.row)) map.set(s.row, []);
      map.get(s.row).push(s);
    });
    return [...map.entries()].map(([row, list]) => ({
      row,
      type: list[0]?.type,
      price: list[0]?.price,
      seats: list.sort((a, b) => a.number - b.number),
    }));
  }, [seats]);

  const priceOf = useMemo(() => Object.fromEntries(seats.map((s) => [s.label, s.price])), [seats]);
  const total = selected.reduce((sum, l) => sum + (priceOf[l] || 0), 0);
  const aisleAfter = show ? Math.floor(show.seatsPerRow / 2) : 0;

  const toggle = (seat) => {
    const mine = seat.status === 'locked' && seat.lockedBy === userId;
    if (seat.status === 'booked' || (seat.status === 'locked' && !mine)) return;
    if (selected.includes(seat.label)) {
      setSelected(selected.filter((l) => l !== seat.label));
    } else if (selected.length >= MAX_SEATS) {
      toast.info(`You can book up to ${MAX_SEATS} seats at a time`);
    } else {
      setSelected([...selected, seat.label]);
    }
  };

  const proceed = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/shows/${id}/lock`, { seatLabels: selected });
      navigate('/checkout', { state: { showId: id, seats: data.labels, lockedUntil: data.lockedUntil } });
    } catch (e) {
      toast.error(errMsg(e));
      loadSeats().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading seats" />;
  if (!show) return <div className="container py-5"><div className="alert alert-danger">Show not found.</div></div>;

  let lastType = null;

  return (
    <>
      <div className="container py-4">
        <h1 className="mb-1" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', textTransform: 'uppercase' }}>{show.movie.title}</h1>
        <p className="meta mb-4">
          {show.theatre.name}, {show.theatre.city} · Screen {show.screen} · {show.format} · {fmtDateTime(show.startTime)}
        </p>

        <div className="panel p-3 p-md-4">
          <div className="screen-wrap">
            <div className="screen" />
            <div className="screen-label">Screen this way</div>
          </div>

          <div className="seat-map">
            <div className="seat-grid">
              {rows.map(({ row, type, price, seats: list }) => {
                const showTier = type !== lastType;
                lastType = type;
                return (
                  <div key={row} className="w-100 d-flex flex-column align-items-center">
                    {showTier && (
                      <div className="tier-label">
                        {type === 'premium' ? 'Premium' : 'Regular'} {money(price)}
                      </div>
                    )}
                    <div className="seat-row">
                      <span className="row-label">{row}</span>
                      {list.map((seat) => {
                        const mine = selected.includes(seat.label);
                        const heldByOther = seat.status === 'locked' && seat.lockedBy !== userId;
                        let cls = 'available';
                        if (mine) cls = 'selected';
                        else if (seat.status === 'booked') cls = 'booked';
                        else if (heldByOther) cls = 'held';
                        const unavailable = seat.status === 'booked' || heldByOther;
                        return (
                          <span key={seat.label} className="d-inline-flex">
                            <button
                              type="button"
                              className={`seat ${seat.type} ${cls}`}
                              disabled={unavailable}
                              onClick={() => toggle(seat)}
                              aria-pressed={mine}
                              aria-label={`Seat ${seat.label}, ${seat.type}, ${money(seat.price)}${unavailable ? ', unavailable' : ''}`}
                            >
                              {seat.number}
                            </button>
                            {seat.number === aisleAfter && <span className="aisle" />}
                          </span>
                        );
                      })}
                      <span className="row-label">{row}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="legend mt-4">
            <span><span className="seat available" />Available</span>
            <span><span className="seat selected" />Your selection</span>
            <span><span className="seat held" />Someone is paying</span>
            <span><span className="seat booked" />Booked</span>
          </div>
        </div>
      </div>

      <div className="summary-bar py-3">
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            {selected.length ? (
              <>
                <div className="fw-bold">{selected.length} {selected.length === 1 ? 'seat' : 'seats'}: {[...selected].sort().join(', ')}</div>
                <div className="meta">Total {money(total)}</div>
              </>
            ) : (
              <div className="meta">Tap a seat to select it. You can pick up to {MAX_SEATS}.</div>
            )}
          </div>
          <button className="btn btn-brass btn-lg" disabled={!selected.length || submitting} onClick={proceed}>
            {submitting ? 'Holding seats…' : `Pay ${money(total)}`}
          </button>
        </div>
      </div>
    </>
  );
}
