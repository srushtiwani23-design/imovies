import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errMsg } from '../api/axios';
import Poster from '../components/Poster';
import Loader from '../components/Loader';
import { fmtDateTime, money } from '../utils/format';

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [prices, setPrices] = useState({});
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState('');
  const [paying, setPaying] = useState(false);
  const [remaining, setRemaining] = useState(null);

  const showId = state?.showId;
  const seats = useMemo(() => state?.seats || [], [state]);

  useEffect(() => {
    if (!showId) return;
    Promise.all([api.get(`/shows/${showId}`), api.get(`/shows/${showId}/seats`)])
      .then(([s, st]) => {
        setShow(s.data.show);
        setPrices(Object.fromEntries(st.data.seats.map((x) => [x.label, x.price])));
      })
      .catch((e) => toast.error(errMsg(e)));
  }, [showId]);

  // Countdown for the seat hold
  useEffect(() => {
    if (!state?.lockedUntil) return undefined;
    const end = new Date(state.lockedUntil).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        toast.error('Your seat hold expired. Please choose your seats again.');
        navigate(`/shows/${showId}/seats`, { replace: true });
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state, showId, navigate]);

  if (!showId || !seats.length) return <Navigate to="/movies" replace />;
  if (!show) return <Loader text="Preparing checkout" />;

  const total = seats.reduce((sum, l) => sum + (prices[l] || 0), 0);
  const mm = String(Math.floor((remaining ?? 0) / 60)).padStart(2, '0');
  const ss = String((remaining ?? 0) % 60).padStart(2, '0');

  const validate = () => {
    if (method === 'card') {
      if (card.number.replace(/\s/g, '').length !== 16) return 'Enter the 16 digit card number';
      if (!card.name.trim()) return 'Enter the name on the card';
      const m = card.expiry.match(/^(\d{2})\/(\d{2})$/);
      if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Enter expiry as MM/YY';
      const exp = new Date(2000 + Number(m[2]), Number(m[1]));
      if (exp <= new Date()) return 'This card has expired';
      if (!/^\d{3}$/.test(card.cvv)) return 'Enter the 3 digit CVV';
    }
    if (method === 'upi' && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) return 'Enter a valid UPI ID, like name@bank';
    if (method === 'netbanking' && !bank) return 'Choose your bank';
    return null;
  };

  const pay = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return toast.error(problem);

    const paymentDetails =
      method === 'card' ? { cardNumber: card.number } : method === 'upi' ? { upiId } : { bank };
    setPaying(true);
    try {
      const { data } = await api.post('/bookings', { showId, seatLabels: seats, paymentMethod: method, paymentDetails });
      toast.success('Payment successful. Enjoy the show!');
      navigate(`/bookings/${data.booking._id}`, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
      if (err.response?.status === 409) navigate(`/shows/${showId}/seats`, { replace: true });
    } finally {
      setPaying(false);
    }
    return null;
  };

  const cancel = async () => {
    try {
      await api.post(`/shows/${showId}/unlock`);
    } catch {
      /* the hold will expire on its own */
    }
    navigate(`/shows/${showId}/seats`, { replace: true });
  };

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <h1 className="mb-0" style={{ fontSize: '3rem' }}>Payment</h1>
        <div className="text-end">
          <div className="meta small">Seats held for</div>
          <div className="countdown" aria-live="polite">{mm}:{ss}</div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <form onSubmit={pay} className="panel p-4">
            <div className="alert alert-warning small">
              This is a demo payment and no money is charged. To see a failed payment, use card
              4000 0000 0000 0002 or UPI ID fail@upi.
            </div>

            <ul className="nav nav-pills gap-2 mb-4" role="tablist">
              {[['card', 'Card'], ['upi', 'UPI'], ['netbanking', 'Net banking']].map(([key, label]) => (
                <li key={key} className="nav-item">
                  <button type="button" role="tab" aria-selected={method === key}
                    className={`nav-link ${method === key ? 'active' : ''}`} onClick={() => setMethod(key)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>

            {method === 'card' && (
              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="cc" className="form-label">Card number</label>
                  <input id="cc" className="form-control" inputMode="numeric" placeholder="4111 1111 1111 1111" autoComplete="cc-number"
                    value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} />
                </div>
                <div className="col-12">
                  <label htmlFor="ccname" className="form-label">Name on card</label>
                  <input id="ccname" className="form-control" autoComplete="cc-name"
                    value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                </div>
                <div className="col-6">
                  <label htmlFor="ccexp" className="form-label">Expiry (MM/YY)</label>
                  <input id="ccexp" className="form-control" placeholder="08/29" autoComplete="cc-exp"
                    value={card.expiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                    }} />
                </div>
                <div className="col-6">
                  <label htmlFor="cvv" className="form-label">CVV</label>
                  <input id="cvv" className="form-control" type="password" inputMode="numeric" autoComplete="cc-csc"
                    value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div>
                <label htmlFor="upi" className="form-label">UPI ID</label>
                <input id="upi" className="form-control" placeholder="yourname@okbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
            )}

            {method === 'netbanking' && (
              <div>
                <label htmlFor="bank" className="form-label">Bank</label>
                <select id="bank" className="form-select" value={bank} onChange={(e) => setBank(e.target.value)}>
                  <option value="">Choose your bank</option>
                  {BANKS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-brass btn-lg flex-grow-1" disabled={paying}>
                {paying ? 'Processing payment…' : `Pay ${money(total)}`}
              </button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={cancel} disabled={paying}>Change seats</button>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="panel p-4">
            <div className="d-flex gap-3 mb-3">
              <Poster movie={show.movie} className="poster-sm" />
              <div>
                <h2 className="mb-1" style={{ fontSize: '1.7rem' }}>{show.movie.title}</h2>
                <div className="meta small">{show.movie.language} · {show.format}</div>
              </div>
            </div>
            <dl className="row small mb-0">
              <dt className="col-4 meta fw-normal">Theatre</dt><dd className="col-8">{show.theatre.name}, {show.theatre.city}</dd>
              <dt className="col-4 meta fw-normal">Screen</dt><dd className="col-8">{show.screen}</dd>
              <dt className="col-4 meta fw-normal">When</dt><dd className="col-8">{fmtDateTime(show.startTime)}</dd>
              <dt className="col-4 meta fw-normal">Seats</dt><dd className="col-8">{[...seats].sort().join(', ')}</dd>
            </dl>
            <hr style={{ borderColor: 'var(--seam)' }} />
            {seats.map((l) => (
              <div key={l} className="d-flex justify-content-between small">
                <span>Seat {l}</span><span>{money(prices[l])}</span>
              </div>
            ))}
            <div className="d-flex justify-content-between fw-bold fs-5 mt-3">
              <span>Total</span><span>{money(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
