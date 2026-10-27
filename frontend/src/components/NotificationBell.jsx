import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { fmtDateTime } from '../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* the bell stays quiet if the server is unreachable */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const markAll = async () => {
    await api.put('/notifications/read-all');
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="bell" ref={ref}>
      <button className="btn btn-ghost btn-sm" onClick={toggle} aria-label={`Notifications, ${unread} unread`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      {open && (
        <div className="bell-menu panel">
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style={{ borderColor: 'var(--seam)' }}>
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="btn btn-link btn-sm p-0" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 && <p className="meta px-3 py-4 mb-0">Booking updates will appear here.</p>}
          {items.map((n) => (
            <div key={n._id} className={`bell-item ${n.read ? '' : 'unread'}`}>
              <div className="fw-semibold">{n.title}</div>
              <div className="small">{n.message}</div>
              <div className="meta small mt-1">{fmtDateTime(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
