import { useRef } from 'react';
import { fmt, fmtDateTime, PACKAGES, VEHICLE_TYPES } from '../utils/helpers';

export default function InvoiceModal({ data, onClose }) {
  const { booking, txn } = data;
  const printRef = useRef();

  function handlePrint() {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Invoice</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', sans-serif; }
      body { padding: 40px; color: #1a1a2e; }
      .invoice { max-width: 600px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
      h2 { font-size: 1.5rem; font-weight: 800; color: #4a42dd; }
      p { font-size: 0.82rem; color: #6b7280; margin-top: 4px; }
      .meta { text-align: right; }
      .meta h3 { font-size: 1.1rem; font-weight: 700; color: #4a42dd; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
      h4 { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { padding: 8px 12px; text-align: left; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
      td { padding: 10px 12px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
      .totals { text-align: right; border-top: 2px solid #e5e7eb; padding-top: 16px; }
      .totals p { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 4px; }
      .total-row { font-size: 1.1rem; font-weight: 800; color: #1a1a2e; margin-top: 8px; padding-top: 8px; border-top: 2px solid #e5e7eb; }
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.print();
  }

  const amount = txn?.amount ?? booking.price;
  const pkgName = PACKAGES.find(p => p.id === booking.package)?.name || booking.package;
  const vehName = VEHICLE_TYPES.find(v => v.id === booking.vehicle)?.name || booking.vehicle;
  const txnId = txn?._id?.toString().slice(-8).toUpperCase() || txn?.id?.slice(-8).toUpperCase() || '——';

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>🧾 Invoice</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨 Print</button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div ref={printRef} className="invoice">
            <div className="invoice-header">
              <div className="invoice-company">
                <h2>✦ SparkWash</h2>
                <p>Professional Car Wash Services</p>
                <p>Phone: +91 9876543210</p>
              </div>
              <div className="invoice-meta">
                <h3>INVOICE</h3>
                <p>#{txnId}</p>
                <p>{fmtDateTime(txn?.createdAt || new Date().toISOString())}</p>
              </div>
            </div>
            <div className="invoice-customer">
              <div className="invoice-section">
                <h4>Billed To</h4>
                <p><strong>{booking.customerName}</strong></p>
                <p>{booking.phone}</p>
                <p>Vehicle: {booking.vehicleNumber}</p>
              </div>
              <div className="invoice-section">
                <h4>Service Info</h4>
                <p>Date: {booking.date}</p>
                <p>Time: {booking.time}</p>
                <p>Type: {vehName}</p>
              </div>
            </div>
            <div className="invoice-table">
              <table>
                <thead><tr><th>Service</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>{pkgName}</strong></td>
                    <td>{PACKAGES.find(p => p.id === booking.package)?.desc || ''}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(booking.price)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="invoice-totals">
              <p><span>Subtotal</span><span>{fmt(booking.price)}</span></p>
              {txn?.membershipDiscount > 0 && <p style={{ color: '#22c55e' }}><span>Membership Discount</span><span>- {fmt(txn.membershipDiscount)}</span></p>}
              {txn?.pointsValue > 0 && <p style={{ color: '#22c55e' }}><span>Points Redeemed ({txn.pointsUsed} pts)</span><span>- {fmt(txn.pointsValue)}</span></p>}
              <p className="total"><span>Total Paid</span><span>{fmt(amount)}</span></p>
              <p style={{ marginTop: 8 }}><span>Method</span><span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{txn?.method || '—'}</span></p>
              {txn?.earnedPoints > 0 && <p style={{ color: '#6c63ff' }}><span>Points Earned</span><span>+{txn.earnedPoints} pts</span></p>}
            </div>
            <div style={{ marginTop: 32, padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Thank you for choosing SparkWash! 🚗</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
