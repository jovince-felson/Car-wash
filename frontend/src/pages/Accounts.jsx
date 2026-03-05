import { useState, useEffect } from 'react';
import { accountsApi, bookingsApi } from '../api';
import { fmt, fmtDate, today } from '../utils/helpers';
import InvoiceModal from '../components/InvoiceModal';

export default function Accounts() {
  const [tab, setTab]             = useState('income');
  const [transactions, setTxns]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [pnl, setPnl]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expModal, setExpModal]   = useState(false);
  const [expForm, setExpForm]     = useState({ description: '', amount: '', category: 'supplies', date: today() });
  const [invoiceView, setInvoice] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [tRes, eRes] = await Promise.all([accountsApi.getTransactions(), accountsApi.getExpenses()]);
      setTxns(tRes.transactions || []);
      setExpenses(eRes.expenses || []);

      // Build pnl
      const revMap = {}, expMap = {};
      (tRes.transactions || []).forEach(t => {
        const m = new Date(t.createdAt).toISOString().slice(0, 7);
        revMap[m] = (revMap[m] || 0) + t.amount;
      });
      (eRes.expenses || []).forEach(e => {
        const m = e.date.slice(0, 7);
        expMap[m] = (expMap[m] || 0) + e.amount;
      });
      const allMonths = [...new Set([...Object.keys(revMap), ...Object.keys(expMap)])].sort().reverse();
      setPnl(allMonths.map(m => ({ month: m, revenue: revMap[m] || 0, expenses: expMap[m] || 0, profit: (revMap[m] || 0) - (expMap[m] || 0) })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function addExpense() {
    if (!expForm.description || !expForm.amount) return;
    await accountsApi.createExpense({ ...expForm, amount: Number(expForm.amount) });
    setExpModal(false); setExpForm({ description: '', amount: '', category: 'supplies', date: today() }); loadAll();
  }

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    await accountsApi.deleteExpense(id); loadAll();
  }

  const totalRev  = transactions.reduce((s, t) => s + t.amount, 0);
  const totalExp  = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info"><h2>Accounts</h2><p>Transaction history & financials</p></div>
        <button className="btn btn-primary" onClick={() => setExpModal(true)}>+ Add Expense</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: '💰', label: 'Total Revenue',  value: fmt(totalRev),  color: 'var(--green)', sub: `${transactions.length} transactions` },
          { icon: '💸', label: 'Total Expenses', value: fmt(totalExp),  color: 'var(--red)',   sub: `${expenses.length} entries` },
          { icon: '📈', label: 'Net Profit',      value: fmt(totalRev - totalExp), color: totalRev - totalExp >= 0 ? 'var(--green)' : 'var(--red)', sub: totalRev - totalExp >= 0 ? 'Profitable' : 'Loss' },
          { icon: '🧾', label: 'Transactions',    value: transactions.length, sub: 'All time' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'number' ? '1.8rem' : '1.4rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-change up">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>Income ({transactions.length})</button>
        <button className={`tab ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>Expenses ({expenses.length})</button>
        <button className={`tab ${tab === 'pnl' ? 'active' : ''}`} onClick={() => setTab('pnl')}>P&L Summary</button>
      </div>

      {tab === 'income' && (
        <div className="card">
          {loading ? <div className="empty-state"><p>Loading...</p></div> : transactions.length === 0 ? (
            <div className="empty-state"><div className="icon">💳</div><h3>No transactions yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Customer</th><th>Package</th><th>Subtotal</th><th>Discount</th><th>Paid</th><th>Method</th><th>Pts Earned</th><th></th></tr></thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t._id}>
                      <td className="text-sm">{fmtDate(t.createdAt)}</td>
                      <td className="font-bold text-sm">{t.customerName}</td>
                      <td className="text-sm text-accent" style={{ textTransform: 'capitalize' }}>{t.package}</td>
                      <td className="text-sm">{fmt(t.subtotal)}</td>
                      <td className="text-sm text-green">{(t.membershipDiscount || 0) + (t.pointsValue || 0) > 0 ? `- ${fmt((t.membershipDiscount || 0) + (t.pointsValue || 0))}` : '—'}</td>
                      <td className="font-bold text-sm text-green">{fmt(t.amount)}</td>
                      <td><span className="badge badge-approved">{t.method?.toUpperCase()}</span></td>
                      <td className="text-sm text-accent">+{t.earnedPoints || 0}</td>
                      <td>
                        {t.bookingId && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setInvoice({ booking: { ...t.bookingId, customerName: t.customerName, phone: '', package: t.package, vehicle: t.vehicle }, txn: t })}>
                            Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="card">
          {expenses.length === 0 ? (
            <div className="empty-state"><div className="icon">💸</div><h3>No expenses</h3>
              <button className="btn btn-primary mt-3" onClick={() => setExpModal(true)}>+ Add Expense</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e._id}>
                      <td className="text-sm">{fmtDate(e.date)}</td>
                      <td className="font-bold text-sm">{e.description}</td>
                      <td><span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                      <td className="font-bold text-sm text-red">{fmt(e.amount)}</td>
                      <td><button className="btn btn-ghost btn-sm text-red" onClick={() => deleteExpense(e._id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'pnl' && (
        <div className="card">
          {pnl.length === 0 ? (
            <div className="empty-state"><div className="icon">📊</div><h3>No P&L data yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr></thead>
                <tbody>
                  {pnl.map(row => {
                    const margin = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={row.month}>
                        <td className="font-bold text-sm">{new Date(row.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</td>
                        <td className="text-green font-bold text-sm">{fmt(row.revenue)}</td>
                        <td className="text-red text-sm">{fmt(row.expenses)}</td>
                        <td className="font-bold" style={{ color: row.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(row.profit)}</td>
                        <td className="text-sm" style={{ color: row.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {expModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>+ Add Expense</h3><button className="btn btn-ghost btn-sm btn-icon" onClick={() => setExpModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Description *</label>
                <input className="form-control" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Amount (₹) *</label>
                  <input type="number" className="form-control" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Date</label>
                  <input type="date" className="form-control" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="form-control" value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                  {['supplies','utilities','rent','salary','equipment','maintenance','marketing','other'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setExpModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!expForm.description || !expForm.amount} onClick={addExpense}>Add</button>
            </div>
          </div>
        </div>
      )}

      {invoiceView && <InvoiceModal data={invoiceView} onClose={() => setInvoice(null)} />}
    </div>
  );
}
