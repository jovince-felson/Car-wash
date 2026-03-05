// ─── Customers Page ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { customersApi } from '../api';
import { fmt, fmtDate, PACKAGES, MEMBERSHIP_TIERS } from '../utils/helpers';

export default function Customers() {
  const [customers, setCustomers]       = useState([]);
  const [selected, setSelected]         = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [editNotes, setEditNotes]       = useState('');
  const [notesMode, setNotesMode]       = useState(false);

  async function load() {
    try {
      const params = {};
      if (memberFilter !== 'all') params.membership = memberFilter;
      if (search) params.search = search;
      const res = await customersApi.getAll(params);
      setCustomers(res.customers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadDetail(id) {
    try {
      const res = await customersApi.getOne(id);
      setSelectedData(res);
      setEditNotes(res.customer.notes || '');
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, [search, memberFilter]);

  async function saveNotes() {
    await customersApi.update(selected, { notes: editNotes });
    setSelectedData(prev => ({ ...prev, customer: { ...prev.customer, notes: editNotes } }));
    setNotesMode(false);
  }

  const c = selectedData?.customer;
  const tier = c ? MEMBERSHIP_TIERS[c.membership] : null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>Customers — CRM</h2>
          <p>{customers.length} customers</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
        <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <span className="search-icon">🔍</span>
              <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" value={memberFilter} onChange={e => setMemberFilter(e.target.value)} style={{ width: 110 }}>
              <option value="all">All</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
          {loading ? <div className="text-muted text-sm">Loading...</div> : customers.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No customers</h3></div>
          ) : customers.map(cu => (
            <div key={cu._id} className="card" style={{ cursor: 'pointer', border: selected === cu._id ? '1px solid var(--accent)' : '1px solid var(--border)' }}
              onClick={() => { setSelected(cu._id); loadDetail(cu._id); setNotesMode(false); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="user-avatar" style={{ width: 38, height: 38, flexShrink: 0 }}>{cu.name?.[0]}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="font-bold text-sm">{cu.name}</div>
                  <div className="text-xs text-muted">{cu.phone}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span className={`badge badge-${cu.membership}`}>{cu.membership}</span>
                    <span className="text-xs text-muted">{cu.totalVisits || 0} visits</span>
                    <span className="text-xs text-accent">{fmt(cu.totalSpent || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!c ? (
            <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state"><div className="icon">👈</div><h3>Select a customer</h3></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div className="user-avatar" style={{ width: 54, height: 54, fontSize: '1.2rem', flexShrink: 0 }}>{c.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{c.name}</h3>
                    <p className="text-muted text-sm">{c.phone}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <span className={`badge badge-${c.membership}`}>{c.membership?.toUpperCase()} MEMBER</span>
                      {c.vehicleNumbers?.map(v => (
                        <span key={v} className="badge" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)' }}>{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid-3" style={{ gap: 12, marginTop: 20 }}>
                  {[
                    { label: 'Visits', value: c.totalVisits || 0, color: 'var(--text)' },
                    { label: 'Total Spent', value: fmt(c.totalSpent || 0), color: 'var(--green)' },
                    { label: 'Points', value: c.points || 0, color: 'var(--accent2)' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius2)', padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
                      <div className="text-xs text-muted">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {tier && (
                  <div className="alert alert-info mt-3">
                    🏆 <strong>{tier.name}</strong> member — {tier.discount}% discount on all services
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">📝 Notes</span>
                  {!notesMode
                    ? <button className="btn btn-ghost btn-sm" onClick={() => setNotesMode(true)}>Edit</button>
                    : <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-success btn-sm" onClick={saveNotes}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setNotesMode(false)}>Cancel</button>
                      </div>
                  }
                </div>
                {notesMode ? (
                  <textarea className="form-control" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Notes about this customer..." />
                ) : (
                  <p className="text-sm" style={{ color: c.notes ? 'var(--text)' : 'var(--text2)' }}>{c.notes || 'No notes added.'}</p>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">🚗 Wash History</span>
                  <span className="text-sm text-muted">{c.washHistory?.length || 0} visits</span>
                </div>
                {!c.washHistory?.length ? (
                  <div className="empty-state" style={{ padding: 24 }}><p>No wash history</p></div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>Package</th><th>Vehicle</th><th>Amount</th></tr></thead>
                      <tbody>
                        {[...c.washHistory].reverse().map((h, i) => (
                          <tr key={i}>
                            <td className="text-sm">{fmtDate(h.date)}</td>
                            <td className="text-sm text-accent" style={{ textTransform: 'capitalize' }}>{h.package}</td>
                            <td className="text-sm">{h.vehicle}</td>
                            <td className="font-bold text-sm">{fmt(h.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
