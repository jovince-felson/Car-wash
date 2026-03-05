import { useState, useEffect } from 'react';
import { staffApi } from '../api';
import { fmt } from '../utils/helpers';

function empty() { return { name: '', role: 'Washer', phone: '', salary: '', commission: '' }; }
const ROLES = ['Washer','Detailer','Supervisor','Cashier','Manager'];

export default function Staff() {
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(empty());
  const [deleteTarget, setDelete] = useState(null);
  const [saving, setSaving]       = useState(false);

  async function load() {
    try { const r = await staffApi.getAll(); setStaff(r.staff || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      const data = { ...form, salary: Number(form.salary), commission: Number(form.commission || 0) };
      if (modal === 'add') await staffApi.create(data);
      else await staffApi.update(modal._id, data);
      setModal(null); load();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  async function remove(id) {
    await staffApi.delete(id); setDelete(null); load();
  }

  async function toggleAttendance(id) {
    await staffApi.toggleAttendance(id); load();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info"><h2>Staff Management</h2><p>{staff.length} team members</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(empty()); setModal('add'); }}>+ Add Staff</button>
      </div>

      {loading ? <div className="text-muted">Loading...</div> : staff.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="icon">🧑‍🔧</div><h3>No staff added</h3>
          <button className="btn btn-primary mt-3" onClick={() => { setForm(empty()); setModal('add'); }}>+ Add Staff</button>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {staff.map(s => (
            <div key={s._id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <div className="user-avatar" style={{ width: 44, height: 44, fontSize: '1.1rem', flexShrink: 0 }}>{s.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-sm text-muted">{s.role}</div>
                  {s.phone && <div className="text-xs text-muted">{s.phone}</div>}
                </div>
                <div onClick={() => toggleAttendance(s._id)} style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: s.attendance ? 'var(--green)' : 'var(--border2)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: s.attendance ? 23 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>
              <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Base Salary', value: `${fmt(s.salary)}/mo` },
                  { label: 'Commission', value: `${s.commission}%` },
                  { label: 'Monthly Earned', value: fmt(s.monthlyEarnings || 0), color: 'var(--green)' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius2)', padding: 10 }}>
                    <div className="text-xs text-muted">{stat.label}</div>
                    <div className="font-bold text-sm" style={{ color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${s.attendance ? 'badge-approved' : 'badge-cancelled'}`}>
                  {s.attendance ? '● Present' : '○ Absent'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ name: s.name, role: s.role, phone: s.phone || '', salary: s.salary, commission: s.commission }); setModal(s); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDelete(s)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'add' ? '+ Add Staff' : '✏️ Edit Staff'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Full Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Salary (₹) *</label>
                  <input type="number" className="form-control" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Commission (%)</label>
                  <input type="number" className="form-control" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.name || !form.salary || saving} onClick={save}>
                {saving ? 'Saving...' : modal === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>⚠️ Confirm Delete</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDelete(null)}>✕</button></div>
            <div className="modal-body"><p>Remove <strong>{deleteTarget.name}</strong>? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(deleteTarget._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
