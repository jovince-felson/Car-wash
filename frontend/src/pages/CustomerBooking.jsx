import { useState, useEffect } from 'react';
import { bookingsApi } from '../api';
import { calcPrice, PACKAGES, VEHICLE_TYPES, TIME_SLOTS, today, fmt } from '../utils/helpers';

export default function CustomerBooking() {
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState({ package: '', vehicle: '', date: today(), time: '', customerName: '', phone: '', vehicleNumber: '' });
  const [bookedSlots, setBookedSlots] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const price = form.package && form.vehicle ? calcPrice(form.package, form.vehicle) : 0;

  useEffect(() => {
    if (!form.date) return;
    bookingsApi.getSlots(form.date)
      .then(res => setBookedSlots(res.slots || []))
      .catch(() => {});
  }, [form.date]);

  async function handleSubmit() {
    if (!form.customerName || !form.phone || !form.vehicleNumber) { setError('Please fill all fields'); return; }
    if (!/^[0-9]{10}$/.test(form.phone)) { setError('Enter valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await bookingsApi.create({ ...form, vehicleNumber: form.vehicleNumber.toUpperCase() });
      setSubmitted(res.booking);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (submitted) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Booking Confirmed!</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Your booking is pending approval. We'll reach out to confirm your slot.
            </p>
            <div className="card" style={{ textAlign: 'left', background: 'var(--bg3)', maxWidth: 400, margin: '0 auto 24px' }}>
              <div className="grid-2" style={{ gap: 10 }}>
                <div><div className="text-xs text-muted">Package</div><div className="font-bold text-accent" style={{ textTransform: 'capitalize' }}>{form.package}</div></div>
                <div><div className="text-xs text-muted">Vehicle</div><div className="font-bold">{form.vehicle}</div></div>
                <div><div className="text-xs text-muted">Date</div><div className="font-bold">{form.date}</div></div>
                <div><div className="text-xs text-muted">Time</div><div className="font-bold">{form.time}</div></div>
                <div><div className="text-xs text-muted">Est. Price</div><div className="font-bold text-green">{fmt(price)}</div></div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setSubmitted(null); setStep(1); setForm({ package: '', vehicle: '', date: today(), time: '', customerName: '', phone: '', vehicleNumber: '' }); }}>
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>✦ Spark<span style={{ color: 'var(--accent)' }}>Wash</span></h1>
          <p className="text-muted">Book your car wash appointment in minutes</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: 20, fontFamily: 'var(--font-display)' }}>Step 1 — Choose Package & Vehicle</h3>
              <div className="form-group">
                <label className="form-label">Select Wash Package</label>
                <div className="package-grid">
                  {PACKAGES.map(pkg => (
                    <div key={pkg.id} className={`package-card ${form.package === pkg.id ? 'selected' : ''}`} onClick={() => setForm({ ...form, package: pkg.id })}>
                      <div className="package-name">{pkg.name}</div>
                      <div className="package-price">{fmt(pkg.price)}</div>
                      <div className="package-desc">{pkg.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Select Vehicle Type</label>
                <div className="vehicle-grid">
                  {VEHICLE_TYPES.map(v => (
                    <div key={v.id} className={`vehicle-card ${form.vehicle === v.id ? 'selected' : ''}`} onClick={() => setForm({ ...form, vehicle: v.id })}>
                      <div className="vehicle-icon">{v.icon}</div>
                      <div>{v.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              {price > 0 && <div className="alert alert-info">💡 Estimated price: <strong>{fmt(price)}</strong></div>}
              <div className="flex justify-between mt-4">
                <div />
                <button className="btn btn-primary" disabled={!form.package || !form.vehicle} onClick={() => setStep(2)}>Next: Schedule →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: 20, fontFamily: 'var(--font-display)' }}>Step 2 — Choose Date & Time</h3>
              <div className="form-group">
                <label className="form-label">Select Date</label>
                <input type="date" className="form-control" value={form.date} min={today()} onChange={e => setForm({ ...form, date: e.target.value, time: '' })} style={{ maxWidth: 260 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Select Time Slot</label>
                <div className="time-grid">
                  {TIME_SLOTS.map(slot => (
                    <div key={slot} className={`time-slot ${form.time === slot ? 'selected' : ''} ${bookedSlots.includes(slot) ? 'booked' : ''}`} onClick={() => !bookedSlots.includes(slot) && setForm({ ...form, time: slot })}>
                      {slot}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" disabled={!form.date || !form.time} onClick={() => setStep(3)}>Next: Your Details →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: 20, fontFamily: 'var(--font-display)' }}>Step 3 — Your Details</h3>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" maxLength={10} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Number</label>
                  <input className="form-control" value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} placeholder="TN01AB1234" />
                </div>
              </div>
              <div className="card" style={{ background: 'var(--bg3)', marginBottom: 16 }}>
                <div className="text-xs text-muted mb-3" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking Summary</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <div><span className="text-xs text-muted">Package: </span><span className="text-sm font-bold" style={{ textTransform: 'capitalize' }}>{form.package}</span></div>
                  <div><span className="text-xs text-muted">Vehicle: </span><span className="text-sm font-bold" style={{ textTransform: 'capitalize' }}>{form.vehicle}</span></div>
                  <div><span className="text-xs text-muted">Date: </span><span className="text-sm font-bold">{form.date}</span></div>
                  <div><span className="text-xs text-muted">Time: </span><span className="text-sm font-bold">{form.time}</span></div>
                  <div><span className="text-xs text-muted">Price: </span><span className="font-bold text-accent">{fmt(price)}</span></div>
                </div>
              </div>
              <div className="flex justify-between">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Booking...' : 'Confirm Booking ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
