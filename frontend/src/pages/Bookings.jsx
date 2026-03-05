import { useState, useEffect } from 'react';
import { bookingsApi, staffApi } from '../api';
import { fmt, fmtDate, today, TIME_SLOTS, PACKAGES, VEHICLE_TYPES, calcLoyaltyPoints, MEMBERSHIP_TIERS } from '../utils/helpers';
import { getSocket } from '../api/socket';
import InvoiceModal from '../components/InvoiceModal';
import { useAuth } from '../context/AuthContext';

export default function Bookings() {
  const { user } = useAuth();
  // Accountants can only VIEW bookings — no approve/reject/assign/bill actions
  const readOnly = user?.role === 'accountant';

  const [bookings, setBookings] = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [date, setDate]         = useState('');
  const [billingModal, setBillingModal]   = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [invoiceData, setInvoiceData]     = useState(null);

  async function load() {
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (date) params.date = date;
      if (search) params.search = search;
      const [bRes, sRes] = await Promise.all([bookingsApi.getAll(params), staffApi.getAll()]);
      setBookings(bRes.bookings || []);
      setStaff(sRes.staff || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter, date, search]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('booking:new', load);
    socket.on('booking:updated', load);
    socket.on('booking:completed', load);
    return () => {
      socket.off('booking:new', load);
      socket.off('booking:updated', load);
      socket.off('booking:completed', load);
    };
  }, []);

  async function updateBooking(id, data) {
    try { await bookingsApi.update(id, data); load(); } catch (e) { alert(e.message); }
  }

  const counts = { all: bookings.length };
  bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>Bookings</h2>
          <p>
            {readOnly
              ? <span>View-only access <span className="badge badge-pending" style={{ marginLeft: 6 }}>👁 Accountant view</span></span>
              : 'Manage all car wash appointments in real-time'
            }
          </p>
        </div>
        {!readOnly && (
          <button className="btn btn-primary" onClick={() => window.open('/booking', '_blank')}>+ New Booking</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {['all','pending','approved','completed','cancelled'].map(s => (
              <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
              </button>
            ))}
          </div>
          <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
            <span className="search-icon">🔍</span>
            <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
          {date && <button className="btn btn-ghost btn-sm" onClick={() => setDate('')}>Clear</button>}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div><h3>No bookings found</h3><p>Try changing filters</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Customer</th><th>Vehicle</th><th>Package</th><th>Date & Time</th><th>Price</th><th>Staff</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td>
                      <div className="font-bold text-sm">{b.customerName}</div>
                      <div className="text-xs text-muted">{b.phone}</div>
                    </td>
                    <td>
                      <div className="text-sm">{b.vehicleNumber}</div>
                      <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{b.vehicle}</div>
                    </td>
                    <td><div className="text-sm font-bold text-accent" style={{ textTransform: 'capitalize' }}>{b.package}</div></td>
                    <td>
                      <div className="text-sm">{b.date}</div>
                      <div className="text-xs text-muted">{b.time}</div>
                    </td>
                    <td className="font-bold text-sm">{fmt(b.price)}</td>
                    <td>
                      {!readOnly && (b.status === 'pending' || b.status === 'approved') ? (
                        <select className="form-control" style={{ padding: '4px 8px', fontSize: '0.78rem', width: 120 }}
                          value={b.staffId?._id || b.staffId || ''}
                          onChange={e => updateBooking(b._id, { staffId: e.target.value || null })}
                        >
                          <option value="">— Assign —</option>
                          {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted">{b.staffId?.name || '—'}</span>
                      )}
                    </td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {!readOnly && b.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => updateBooking(b._id, { status: 'approved' })}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => updateBooking(b._id, { status: 'cancelled' })}>Reject</button>
                          </>
                        )}
                        {!readOnly && b.status === 'approved' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => setBillingModal(b)}>Complete & Bill</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setRescheduleModal(b)}>Reschedule</button>
                            <button className="btn btn-danger btn-sm" onClick={() => updateBooking(b._id, { status: 'cancelled' })}>Cancel</button>
                          </>
                        )}
                        {b.status === 'completed' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setInvoiceData({ booking: b })}>Invoice</button>
                        )}
                        {readOnly && b.status !== 'completed' && (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {billingModal && (
        <BillingModal booking={billingModal} onClose={() => setBillingModal(null)}
          onComplete={(txn) => { setBillingModal(null); setInvoiceData({ booking: billingModal, txn }); load(); }} />
      )}
      {rescheduleModal && (
        <RescheduleModal booking={rescheduleModal} onClose={() => setRescheduleModal(null)}
          onSave={async (date, time) => { await updateBooking(rescheduleModal._id, { date, time }); setRescheduleModal(null); }} />
      )}
      {invoiceData && <InvoiceModal data={invoiceData} onClose={() => setInvoiceData(null)} />}
    </div>
  );
}

function BillingModal({ booking, onClose, onComplete }) {
  const [customer, setCustomer] = useState(null);
  const [points, setPoints]     = useState(0);
  const [method, setMethod]     = useState('cash');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (booking.customerId) {
      import('../api').then(({ customersApi }) =>
        customersApi.getOne(booking.customerId?._id || booking.customerId)
          .then(r => setCustomer(r.customer)).catch(() => {})
      );
    }
  }, [booking.customerId]);

  const discount = customer ? (MEMBERSHIP_TIERS[customer.membership]?.discount || 0) : 0;
  const memberDiscount = Math.round(booking.price * discount / 100);
  const maxPoints = customer ? Math.min(customer.points || 0, booking.price - memberDiscount) : 0;
  const pointsValue = points;
  const total = Math.max(0, booking.price - memberDiscount - pointsValue);

  async function confirm() {
    setLoading(true); setError('');
    try {
      const res = await bookingsApi.complete(booking._id, { pointsToRedeem: points, method });
      onComplete(res.transaction);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>💳 Bill Generation</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="card" style={{ background: 'var(--bg3)', marginBottom: 16 }}>
            <div className="grid-2" style={{ gap: 10 }}>
              <div><span className="text-xs text-muted">Customer: </span><span className="text-sm font-bold">{booking.customerName}</span></div>
              <div><span className="text-xs text-muted">Package: </span><span className="text-sm font-bold text-accent" style={{ textTransform: 'capitalize' }}>{booking.package}</span></div>
              {customer && <div><span className="text-xs text-muted">Tier: </span><span className={`badge badge-${customer.membership}`}>{customer.membership}</span></div>}
              {customer && <div><span className="text-xs text-muted">Points: </span><span className="text-sm font-bold">{customer.points}</span></div>}
            </div>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>Subtotal</span><span className="font-bold">{fmt(booking.price)}</span>
            </div>
            {memberDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-green">Membership ({discount}%)</span>
                <span className="text-green">- {fmt(memberDiscount)}</span>
              </div>
            )}
            {customer && customer.points > 0 && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Redeem Points</span>
                  <span className="text-xs text-muted">Available: {customer.points} pts</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="range" min={0} max={maxPoints} value={points} onChange={e => setPoints(Number(e.target.value))} style={{ flex: 1 }} />
                  <span className="text-sm font-bold text-accent">{points} pts = {fmt(pointsValue)}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '1.1rem' }}>
              <span className="font-bold">Total</span>
              <span className="font-bold text-green">{fmt(total)}</span>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div className="form-label">Payment Method</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['cash','upi','card'].map(m => (
                  <button key={m} className={`btn ${method === m ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMethod(m)} style={{ flex: 1 }}>
                    {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="alert alert-info">🎁 Will earn <strong>{calcLoyaltyPoints(total)}</strong> points</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={confirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ booking, onClose, onSave }) {
  const [newDate, setNewDate] = useState(booking.date);
  const [newTime, setNewTime] = useState('');
  const [taken, setTaken]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bookingsApi.getSlots(newDate).then(r => setTaken(r.slots || [])).catch(() => {});
  }, [newDate]);

  async function save() {
    if (!newDate || !newTime) return;
    setLoading(true);
    await onSave(newDate, newTime);
    setLoading(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>📅 Reschedule Booking</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">New Date</label>
            <input type="date" className="form-control" value={newDate} min={today()} onChange={e => { setNewDate(e.target.value); setNewTime(''); }} />
          </div>
          <div className="form-group">
            <label className="form-label">New Time Slot</label>
            <div className="time-grid">
              {TIME_SLOTS.map(slot => (
                <div key={slot} className={`time-slot ${newTime === slot ? 'selected' : ''} ${taken.includes(slot) ? 'booked' : ''}`}
                  onClick={() => !taken.includes(slot) && setNewTime(slot)}>
                  {slot}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!newDate || !newTime || loading} onClick={save}>Reschedule</button>
        </div>
      </div>
    </div>
  );
}
