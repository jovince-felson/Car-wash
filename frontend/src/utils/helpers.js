export const PACKAGES = [
  { id: 'basic',   name: 'Basic Wash',   price: 200, duration: 30, desc: 'Exterior wash + rinse' },
  { id: 'premium', name: 'Premium Wash', price: 400, duration: 45, desc: 'Exterior + interior clean' },
  { id: 'deluxe',  name: 'Deluxe Wash',  price: 700, duration: 60, desc: 'Full detail + wax + polish' },
];

export const VEHICLE_TYPES = [
  { id: 'bike',  name: 'Bike',  icon: '🏍️', multiplier: 0.7 },
  { id: 'car',   name: 'Car',   icon: '🚗', multiplier: 1.0 },
  { id: 'suv',   name: 'SUV',   icon: '🚙', multiplier: 1.3 },
  { id: 'truck', name: 'Truck', icon: '🚛', multiplier: 1.6 },
];

export const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30',
];

export const MEMBERSHIP_TIERS = {
  silver:   { name: 'Silver',   minSpent: 0,     discount: 5  },
  gold:     { name: 'Gold',     minSpent: 5000,  discount: 10 },
  platinum: { name: 'Platinum', minSpent: 15000, discount: 15 },
};

export function calcPrice(packageId, vehicleId) {
  const pkg = PACKAGES.find(p => p.id === packageId);
  const veh = VEHICLE_TYPES.find(v => v.id === vehicleId);
  if (!pkg || !veh) return 0;
  return Math.round(pkg.price * veh.multiplier);
}

export function fmt(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function calcLoyaltyPoints(amount) {
  return Math.floor(amount / 100);
}
