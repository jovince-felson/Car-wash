import { useState, useEffect } from 'react';
import { inventoryApi } from '../api';
import { fmt } from '../utils/helpers';
import { getSocket } from '../api/socket';

export default function Inventory() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [restock, setRestock]   = useState(null);
  const [restockQty, setRQty]   = useState('');
  const [form, setForm]         = useState({ name: '', unit: 'L', quantity: '', costPrice: '', threshold: '' });

  async function load() {
    try { const r = await inventoryApi.getAll(); setItems(r.items || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('inventory:low', load);
    socket.on('inventory:restocked', load);
    return () => { socket.off('inventory:low', load); socket.off('inventory:restocked', load); };
  }, []);

  const lowItems = items.filter(i => i.quantity <= i.threshold);

  async function save() {
    try {
      const data = { ...form, quantity: Number(form.quantity), costPrice: Number(form.costPrice || 0), threshold: Number(form.threshold || 5) };
      if (modal === 'add') await inventoryApi.create(data);
      else await inventoryApi.update(modal._id, data);
      setModal(null); load();
    } catch (e) { alert(e.message); }
  }

  async function doRestock() {
    if (!restockQty || Number(restockQty) <= 0) return;
    await inventoryApi.restock(restock._id, Number(restockQty));
    setRestock(null); setRQty(''); load();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info"><h2>Inventory</h2><p>{items.length} items · {lowItems.length} low</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', unit: 'L', quantity: '', costPrice: '', threshold: '' }); setModal('add'); }}>+ Add Item</button>
      </div>

      {lowItems.length > 0 && (
        <div className="alert alert-warning">⚠️ Low stock: {lowItems.map(i => `${i.name} (${i.quantity})`).join(', ')}</div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Unit</th><th>In Stock</th><th>Threshold</th><th>Cost/Unit</th><th>Usage (B/P/D)</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>Loading...</td></tr>
                : items.map(item => {
                  const isLow = item.quantity <= item.threshold;
                  return (
                    <tr key={item._id}>
                      <td className="font-bold text-sm">{item.name}</td>
                      <td className="text-sm text-muted">{item.unit}</td>
                      <td><span style={{ fontWeight: 700, color: isLow ? 'var(--red)' : 'var(--green)' }}>{item.quantity}</span></td>
                      <td className="text-sm text-muted">{item.threshold}</td>
                      <td className="text-sm">{fmt(item.costPrice)}</td>
                      <td className="text-xs text-muted">
                        {item.usagePerWash?.basic || 0} / {item.usagePerWash?.premium || 0} / {item.usagePerWash?.deluxe || 0}
                      </td>
                      <td><span className={`badge ${isLow ? 'badge-low' : 'badge-approved'}`}>{isLow ? '⚠ Low' : '✓ OK'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => { setRestock(item); setRQty(''); }}>+ Restock</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ name: item.name, unit: item.unit, quantity: item.quantity, costPrice: item.costPrice, threshold: item.threshold }); setModal(item); }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><span className="card-title">📊 Stock Value</span></div>
        <div className="grid-3" style={{ gap: 12 }}>
          {[
            { label: 'Total Products', value: items.length },
            { label: 'Total Value', value: fmt(items.reduce((s, i) => s + i.quantity * i.costPrice, 0)), color: 'var(--green)' },
            { label: 'Low Stock Alerts', value: lowItems.length, color: lowItems.length > 0 ? 'var(--red)' : 'var(--green)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius2)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'add' ? '+ Add Item' : '✏️ Edit Item'}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Unit</label>
                  <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['L','ml','kg','g','pcs','bottle'].map(u => <option key={u}>{u}</option>)}
                  </select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Quantity *</label>
                  <input type="number" className="form-control" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Cost Price (₹)</label>
                  <input type="number" className="form-control" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Low Stock Threshold</label>
                <input type="number" className="form-control" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!form.name || !form.quantity} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {restock && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>+ Restock: {restock.name}</h3>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setRestock(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">Current: <strong>{restock.quantity} {restock.unit}</strong></div>
              <div className="form-group"><label className="form-label">Quantity to Add</label>
                <input type="number" className="form-control" value={restockQty} onChange={e => setRQty(e.target.value)} autoFocus min="1" /></div>
              {restockQty && <div className="text-sm text-muted">New stock: <strong className="text-green">{restock.quantity + Number(restockQty)} {restock.unit}</strong></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRestock(null)}>Cancel</button>
              <button className="btn btn-success" disabled={!restockQty || Number(restockQty) <= 0} onClick={doRestock}>Add Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
