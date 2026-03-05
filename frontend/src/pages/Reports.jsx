import { useState, useEffect } from 'react';
import { reportsApi } from '../api';
import { fmt, PACKAGES, VEHICLE_TYPES } from '../utils/helpers';

export default function Reports() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.getDashboard(), reportsApi.getAnalytics()])
      .then(([dash, analytics]) => setData({ ...dash, ...analytics }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><div className="text-muted">Loading reports...</div></div>;
  if (!data) return null;

  const { byPackage = [], byVehicle = [], byMethod = [], monthlyRevenue = [], expByMonth = {}, topCustomers = [], staffPerf = [] } = data;
  const totalRev = byMethod.reduce((s, m) => s + m.total, 0);

  const maxMonthRev = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
  const completedBookings = data.todayBookings?.length || 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info"><h2>Reports & Analytics</h2><p>Business performance overview</p></div>
      </div>

      {/* 6-Month Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">📊 6-Month Revenue Trend</span></div>
        {monthlyRevenue.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}><p>No data yet</p></div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
            {monthlyRevenue.map((m, i) => {
              const exp = expByMonth[m._id] || 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 120 }}>
                    <div title={`Revenue: ${fmt(m.revenue)}`} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: 'var(--green)', height: `${(m.revenue / maxMonthRev) * 100}%`, minHeight: m.revenue > 0 ? 4 : 0 }} />
                    <div title={`Expenses: ${fmt(exp)}`} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: 'var(--red)', height: `${(exp / maxMonthRev) * 100}%`, minHeight: exp > 0 ? 4 : 0 }} />
                  </div>
                  <div className="text-xs text-muted">{m._id?.slice(5)}</div>
                  <div className="text-xs text-green">{fmt(m.revenue)}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--green)' }} /><span className="text-xs text-muted">Revenue</span></div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--red)' }} /><span className="text-xs text-muted">Expenses</span></div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* By Package */}
        <div className="card">
          <div className="card-header"><span className="card-title">🚿 Revenue by Package</span></div>
          {PACKAGES.map(pkg => {
            const d = byPackage.find(p => p._id === pkg.id) || { revenue: 0, count: 0 };
            return (
              <div key={pkg.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="text-sm font-bold">{pkg.name}</span>
                  <span className="text-sm text-muted">{d.count} · <span className="text-green">{fmt(d.revenue)}</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--cyan))', borderRadius: 3, width: `${totalRev > 0 ? (d.revenue / totalRev) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* By Vehicle */}
        <div className="card">
          <div className="card-header"><span className="card-title">🚗 Revenue by Vehicle</span></div>
          {VEHICLE_TYPES.map(v => {
            const d = byVehicle.find(x => x._id === v.id) || { revenue: 0, count: 0 };
            return (
              <div key={v.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="text-sm font-bold">{v.icon} {v.name}</span>
                  <span className="text-sm text-muted">{d.count} · <span className="text-green">{fmt(d.revenue)}</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--cyan), var(--accent))', borderRadius: 3, width: `${totalRev > 0 ? (d.revenue / totalRev) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="card-header"><span className="card-title">💳 Payment Methods</span></div>
          {byMethod.map(m => (
            <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem' }}>{m._id === 'cash' ? '💵' : m._id === 'upi' ? '📱' : '💳'}</span>
                <span className="font-bold" style={{ textTransform: 'uppercase' }}>{m._id}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-bold text-sm text-green">{fmt(m.total)}</div>
                <div className="text-xs text-muted">{totalRev > 0 ? ((m.total / totalRev) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          ))}
          {byMethod.length === 0 && <div className="empty-state" style={{ padding: 24 }}><p>No payment data</p></div>}
        </div>

        {/* Top Customers */}
        <div className="card">
          <div className="card-header"><span className="card-title">🏆 Top Customers</span></div>
          {topCustomers.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><p>No customers yet</p></div>
          ) : topCustomers.map((c, i) => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 24, fontWeight: 700, fontSize: '0.8rem', color: i === 0 ? 'var(--yellow)' : 'var(--text2)' }}>#{i + 1}</span>
              <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.85rem' }}>{c.name?.[0]}</div>
              <div style={{ flex: 1 }}>
                <div className="text-sm font-bold">{c.name}</div>
                <div className="text-xs text-muted">{c.totalVisits} visits</div>
              </div>
              <span className="font-bold text-sm text-green">{fmt(c.totalSpent)}</span>
              <span className={`badge badge-${c.membership}`}>{c.membership}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="card">
        <div className="card-header"><span className="card-title">🧑‍🔧 Staff Performance</span></div>
        {staffPerf.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><p>No staff data</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Washes</th><th>Commission</th><th>Salary</th><th>Total Cost</th></tr></thead>
              <tbody>
                {staffPerf.map(s => (
                  <tr key={s._id}>
                    <td className="font-bold text-sm">{s.name}</td>
                    <td className="text-sm text-muted">{s.role}</td>
                    <td className="text-sm">{s.washes}</td>
                    <td className="text-sm text-accent">{fmt(s.monthlyEarnings || 0)}</td>
                    <td className="text-sm">{fmt(0)}</td>
                    <td className="font-bold text-sm text-red">{fmt(s.monthlyEarnings || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
