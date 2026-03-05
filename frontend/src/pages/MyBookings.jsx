import { useState, useEffect } from 'react';
import { bookingsApi } from '../api';
import { fmt, fmtDate, PACKAGES, VEHICLE_TYPES } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../api/socket';

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  async function load() {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const res = await bookingsApi.getAll(params);
      setBookings(res.bookings || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('booking:updated', load);
    socket.on('booking:completed', load);
    return () => { socket.off('booking:updated', load); socket.off('booking:completed', load); };
  }, []);

  const statusCounts = { all: bookings.length };
  bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });

  const STATUS_ICONS = { pending: '⏳', approved: '✅', completed: '🏁', cancelled: '❌' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>My Bookings</h2>
          <p>Your car wash appointment history</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.open('/booking', '_blank')}>
          + New Booking
        </button>
      </div>

      {/* Filter tabs */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {['all', 'pending', 'approved', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              className={`tab ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {STATUS_ICONS[s] || '📋'} {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] || 0})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading your bookings…</p></div></div>
      ) : bookings.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '48px 32px' }}>
            <div className="icon">🚗</div>
            <h3>No bookings {filter !== 'all' ? `with status "${filter}"` : 'yet'}</h3>
            <p>Book your first car wash appointment!</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.open('/booking', '_blank')}>
              Book Now
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => {
            const pkg  = PACKAGES.find(p => p.id === b.package);
            const veh  = VEHICLE_TYPES.find(v => v.id === b.vehicle);
            return (
              <div key={b._id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  {/* Package icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius)',
                    background: 'linear-gradient(135deg, var(--accent), var(--cyan))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0,
                  }}>
                    {veh?.icon || '🚗'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className="font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                        {pkg?.name || b.package}
                      </span>
                      <span className={`badge badge-${b.status}`}>
                        {STATUS_ICONS[b.status]} {b.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div><span className="text-xs text-muted">Date: </span><span className="text-sm font-bold">{b.date}</span></div>
                      <div><span className="text-xs text-muted">Time: </span><span className="text-sm font-bold">{b.time}</span></div>
                      <div><span className="text-xs text-muted">Vehicle: </span><span className="text-sm font-bold">{b.vehicleNumber}</span></div>
                      <div><span className="text-xs text-muted">Price: </span><span className="text-sm font-bold text-accent">{fmt(b.price)}</span></div>
                      {b.staffId && (
                        <div><span className="text-xs text-muted">Washer: </span><span className="text-sm font-bold">{b.staffId.name || 'Assigned'}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {b.status === 'approved' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/tracking')}
                      >
                        📍 Track Washer
                      </button>
                    )}
                    {b.status === 'pending' && (
                      <span className="text-xs text-muted" style={{ padding: '6px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius2)' }}>
                        Awaiting approval
                      </span>
                    )}
                    {b.status === 'completed' && (
                      <span className="text-xs text-green font-bold">✓ Done</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
