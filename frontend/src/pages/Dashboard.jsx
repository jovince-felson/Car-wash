import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api';
import { fmt, fmtDate, fmtDateTime } from '../utils/helpers';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    try {
      const res = await reportsApi.getDashboard();
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('dashboard:refresh', load);
    socket.on('booking:new', load);
    socket.on('booking:completed', load);
    return () => {
      socket.off('dashboard:refresh', load);
      socket.off('booking:new', load);
      socket.off('booking:completed', load);
    };
  }, []);

  if (loading) return <div className="page-content"><div className="text-muted">Loading dashboard...</div></div>;
  if (error)   return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!data)   return null;

  const {
    todayBookings = [], pendingCount = 0, monthRevenue = 0,
    totalCustomers = 0, lowStockAlerts = 0, lowStockItems = [],
    staff = [], recentTransactions = [], topPackage,
  } = data;

  const isAdmin      = user?.role === 'admin';
  const isStaff      = user?.role === 'staff';
  const isAccountant = user?.role === 'accountant';
  const isCustomer   = user?.role === 'customer';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>Dashboard</h2>
          <p>Welcome back, <strong>{user?.name}</strong> · {fmtDate(new Date().toISOString())}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* ── Customer view ─────────────────────────────────────────── */}
      {isCustomer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚗</div>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              Ready for a Wash?
            </h3>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Book your next car wash appointment online — takes less than 2 minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => window.open('/booking', '_blank')}>
                🗓 Book Appointment
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/tracking')}>
                📍 Track My Wash
              </button>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Premium Service</div>
              <p className="text-muted text-sm" style={{ marginTop: 6 }}>Interior + Exterior cleaning with wax finish</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Loyalty Rewards</div>
              <p className="text-muted text-sm" style={{ marginTop: 6 }}>Earn points with every wash and unlock discounts</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff view ────────────────────────────────────────────── */}
      {isStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="stats-grid">
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/bookings')}>
              <div className="stat-icon">📋</div>
              <div className="stat-value">{todayBookings.length}</div>
              <div className="stat-label">Today's Jobs</div>
              <div className="stat-change up">↑ {pendingCount} pending approval</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🧑‍🔧</div>
              <div className="stat-value">{staff.filter(s => s.attendance).length}/{staff.length}</div>
              <div className="stat-label">Staff Present</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>
              <div className="stat-icon">📦</div>
              <div className="stat-value" style={{ color: lowStockAlerts > 0 ? 'var(--red)' : undefined }}>
                {lowStockAlerts}
              </div>
              <div className="stat-label">Low Stock Alerts</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/tracking')}>
              <div className="stat-icon">📍</div>
              <div className="stat-value" style={{ fontSize: '1rem', color: 'var(--green)' }}>Share</div>
              <div className="stat-label">Live Location</div>
            </div>
          </div>

          {/* Today's bookings summary — click to go to full Bookings page */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 Today's Jobs</span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/bookings')}>
                Manage Bookings →
              </button>
            </div>
            {todayBookings.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="icon">☀️</div><p>No jobs scheduled today</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer</th><th>Time</th><th>Package</th><th>Vehicle</th><th>Status</th></tr></thead>
                  <tbody>
                    {todayBookings.slice(0, 6).map(b => (
                      <tr key={b._id}>
                        <td><div className="font-bold text-sm">{b.customerName}</div></td>
                        <td className="text-sm">{b.time}</td>
                        <td className="text-sm text-accent" style={{ textTransform: 'capitalize' }}>{b.package}</td>
                        <td className="text-sm">{b.vehicleNumber}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {todayBookings.length > 6 && (
                  <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bookings')}>
                      View all {todayBookings.length} bookings →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Accountant view ───────────────────────────────────────── */}
      {isAccountant && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="stats-grid">
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/bookings')}>
              <div className="stat-icon">📋</div>
              <div className="stat-value">{todayBookings.length}</div>
              <div className="stat-label">Today's Bookings</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/accounts')}>
              <div className="stat-icon">💰</div>
              <div className="stat-value">{fmt(monthRevenue)}</div>
              <div className="stat-label">Monthly Revenue</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/customers')}>
              <div className="stat-icon">👥</div>
              <div className="stat-value">{totalCustomers}</div>
              <div className="stat-label">Total Customers</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/reports')}>
              <div className="stat-icon">📊</div>
              <div className="stat-value" style={{ fontSize: '1rem', color: 'var(--accent)', textTransform: 'capitalize' }}>{topPackage || '—'}</div>
              <div className="stat-label">Top Package</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">💳 Recent Payments</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/accounts')}>View All →</button>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><div className="icon">💳</div><p>No transactions yet</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Customer</th><th>Date</th><th>Package</th><th>Amount</th><th>Method</th></tr></thead>
                  <tbody>
                    {recentTransactions.slice(0, 8).map(t => (
                      <tr key={t._id}>
                        <td className="font-bold text-sm">{t.customerName}</td>
                        <td className="text-sm text-muted">{fmtDate(t.createdAt)}</td>
                        <td className="text-sm text-accent" style={{ textTransform: 'capitalize' }}>{t.package}</td>
                        <td className="font-bold text-sm text-green">{fmt(t.amount)}</td>
                        <td><span className="badge badge-approved">{t.method?.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin view ────────────────────────────────────────────── */}
      {isAdmin && (
        <>
          <div className="stats-grid">
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/bookings')}>
              <div className="stat-icon">📋</div>
              <div className="stat-value">{todayBookings.length}</div>
              <div className="stat-label">Today's Bookings</div>
              <div className="stat-change up">↑ {pendingCount} pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{fmt(monthRevenue)}</div>
              <div className="stat-label">Monthly Revenue</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/customers')}>
              <div className="stat-icon">👥</div>
              <div className="stat-value">{totalCustomers}</div>
              <div className="stat-label">Total Customers</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>
              <div className="stat-icon">📦</div>
              <div className="stat-value" style={{ color: lowStockAlerts > 0 ? 'var(--red)' : undefined }}>
                {lowStockAlerts}
              </div>
              <div className="stat-label">Low Stock Alerts</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff')}>
              <div className="stat-icon">🧑‍🔧</div>
              <div className="stat-value">{staff.filter(s => s.attendance).length}/{staff.length}</div>
              <div className="stat-label">Staff Present</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{topPackage || '—'}</div>
              <div className="stat-label">Top Package</div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 20 }}>
            {/* Low stock */}
            {lowStockItems.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">⚠️ Low Stock Alerts</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/inventory')}>Restock →</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th>Current</th><th>Min</th></tr></thead>
                    <tbody>
                      {lowStockItems.map(item => (
                        <tr key={item._id}>
                          <td className="font-bold text-sm">{item.name}</td>
                          <td className="text-sm text-red font-bold">{item.quantity} {item.unit}</td>
                          <td className="text-sm text-muted">{item.threshold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Staff overview */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🧑‍🔧 Staff Today</span>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/staff')}>Manage →</button>
              </div>
              {staff.map(s => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>{s.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div className="text-sm font-bold">{s.name}</div>
                    <div className="text-xs text-muted">{s.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-sm text-accent">{fmt(s.monthlyEarnings || 0)}</div>
                    <div className={`text-xs ${s.attendance ? 'text-green' : 'text-muted'}`}>
                      {s.attendance ? '● Present' : '○ Absent'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent transactions */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">💳 Recent Payments</span>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/accounts')}>View All →</button>
              </div>
              {recentTransactions.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><div className="icon">💳</div><p>No transactions yet</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Customer</th><th>Amount</th><th>Method</th></tr></thead>
                    <tbody>
                      {recentTransactions.map(t => (
                        <tr key={t._id}>
                          <td>
                            <div className="text-sm font-bold">{t.customerName}</div>
                            <div className="text-xs text-muted">{fmtDateTime(t.createdAt)}</div>
                          </td>
                          <td className="text-sm text-green font-bold">{fmt(t.amount)}</td>
                          <td><span className="badge badge-approved">{t.method?.toUpperCase()}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick nav tiles */}
            <div className="card">
              <div className="card-header"><span className="card-title">⚡ Quick Actions</span></div>
              <div className="grid-2" style={{ gap: 10 }}>
                {[
                  { icon: '📋', label: 'Manage Bookings',  path: '/bookings',  color: 'var(--accent)' },
                  { icon: '👥', label: 'View Customers',   path: '/customers', color: 'var(--cyan)' },
                  { icon: '📦', label: 'Check Inventory',  path: '/inventory', color: 'var(--yellow)' },
                  { icon: '📍', label: 'Live Tracking',    path: '/tracking',  color: 'var(--green)' },
                ].map(tile => (
                  <div
                    key={tile.path}
                    onClick={() => navigate(tile.path)}
                    style={{
                      background: 'var(--bg3)', borderRadius: 'var(--radius)',
                      padding: '14px 16px', cursor: 'pointer',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = tile.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{tile.icon}</span>
                    <span className="text-sm font-bold">{tile.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
