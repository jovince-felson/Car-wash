import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Role-based navigation — each item only renders for listed roles
const NAV = [
  {
    section: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard',   icon: '⬡', roles: ['admin','staff','accountant','customer'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { path: '/bookings',  label: 'Bookings',        icon: '📋', roles: ['admin','staff','accountant'] },
      { path: '/customers', label: 'Customers / CRM', icon: '👥', roles: ['admin','accountant'] },
      { path: '/staff',     label: 'Staff',            icon: '🧑‍🔧', roles: ['admin'] },
      { path: '/inventory', label: 'Inventory',        icon: '📦', roles: ['admin','staff'] },
    ],
  },
  {
    section: 'Finance',
    items: [
      { path: '/accounts', label: 'Accounts', icon: '💳', roles: ['admin','accountant'] },
      { path: '/reports',  label: 'Reports',  icon: '📊', roles: ['admin','accountant'] },
    ],
  },
  {
    section: 'My Account',
    items: [
      { path: '/my-bookings', label: 'My Bookings',   icon: '📋', roles: ['customer'] },
      { path: '/tracking',    label: 'Live Tracking', icon: '📍', roles: ['admin','staff','customer'] },
    ],
  },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/bookings':  'Bookings',
  '/customers': 'Customers',
  '/staff':     'Staff',
  '/inventory': 'Inventory',
  '/accounts':  'Accounts',
  '/reports':   'Reports',
  '/my-bookings':'My Bookings',
  '/tracking':  'Live Tracking',
};

export default function Layout() {
  const { user, logout, notifications, clearNotifications } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() { logout(); navigate('/login'); }

  const unread     = notifications.length;
  const pageTitle  = PAGE_TITLES[location.pathname] || 'SparkWash';
  const roleBadge  = { admin: '🔑', staff: '🧑‍🔧', accountant: '💼', customer: '👤' }[user?.role] || '';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'none' }}
          className="sidebar-overlay"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>✦ Spark<span>Wash</span></h1>
          <p>Management System</p>
        </div>

        {/* Role badge */}
        <div style={{
          margin: '0 16px 12px',
          padding: '6px 12px',
          background: 'var(--bg3)',
          borderRadius: 'var(--radius2)',
          fontSize: '0.72rem',
          color: 'var(--text2)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>{roleBadge}</span>
          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{user?.role}</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>access level</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(section => {
            const filtered = section.items.filter(i => i.roles.includes(user?.role));
            if (!filtered.length) return null;
            return (
              <div key={section.section}>
                <div className="nav-section">{section.section}</div>
                {filtered.map(item => (
                  <div
                    key={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {/* Live pulse for tracking */}
                    {item.path === '/tracking' && (
                      <span style={{
                        marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--green)', animation: 'pulse 2s infinite',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Admin-only quick links */}
          {user?.role === 'admin' && (
            <div>
              <div className="nav-section">Quick Links</div>
              <div className="nav-item" onClick={() => window.open('/booking', '_blank')}>
                <span style={{ fontSize: '1rem' }}>🚗</span>
                <span>Public Booking</span>
              </div>
              <div className="nav-item" onClick={() => window.open('/api/docs', '_blank')}>
                <span style={{ fontSize: '1rem' }}>📚</span>
                <span>API Docs</span>
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge" onClick={handleLogout} title="Click to logout">
            <div className="user-avatar">{user?.name?.[0] || 'U'}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role} · Logout</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        {/* Topbar */}
        <div style={{
          height: 52, background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 12, position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* Mobile menu button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSidebarOpen(v => !v)}
            style={{ display: 'none' }}
            id="mobile-menu-btn"
          >☰</button>

          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
            {pageTitle}
          </div>

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowNotifs(v => !v)}
              style={{ position: 'relative', fontSize: '1.1rem' }}
            >
              🔔
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 1, right: 1,
                  width: 17, height: 17, borderRadius: '50%',
                  background: 'var(--red)', color: 'white',
                  fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg2)',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', width: 320,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 200,
              }}>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    Notifications {unread > 0 && <span style={{ color: 'var(--red)' }}>({unread})</span>}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={clearNotifications} style={{ fontSize: '0.72rem' }}>
                    Clear all
                  </button>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '0.82rem' }}>
                      No notifications
                    </div>
                  ) : notifications.slice(0, 20).map(n => (
                    <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>
                          {n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : n.type === 'followup' ? '🔔' : 'ℹ️'}
                        </span>
                        <div>
                          <div>{n.message}</div>
                          <div style={{ color: 'var(--text2)', marginTop: 2, fontSize: '0.72rem' }}>
                            {new Date(n.time).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live socket indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
