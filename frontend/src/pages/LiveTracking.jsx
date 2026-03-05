import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../api/socket';
import { bookingsApi } from '../api';

// ─── Google Maps Loader ───────────────────────────────────────────────────────
const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

let gmapsLoading = false;
let gmapsLoaded  = false;
const gmapsCallbacks = [];

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (gmapsLoaded && window.google?.maps) { resolve(window.google.maps); return; }
    gmapsCallbacks.push(resolve);
    if (gmapsLoading) return;
    gmapsLoading = true;

    window.__gmapsInit = () => {
      gmapsLoaded = true;
      gmapsLoading = false;
      gmapsCallbacks.forEach(cb => cb(window.google.maps));
      gmapsCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&callback=__gmapsInit&libraries=marker`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps failed to load. Check your API key in frontend/.env'));
    document.head.appendChild(script);
  });
}

// ─── Shared map styles (dark) ─────────────────────────────────────────────────
// Clean light map style — minimal clutter
const DARK_STYLES = [
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road',    elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
];

const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 }; // Coimbatore

// ─── Root router ──────────────────────────────────────────────────────────────
export default function LiveTracking() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === 'admin')    return <AdminTrackingView    user={user} />;
  if (role === 'staff')    return <StaffTrackingView    user={user} />;
  if (role === 'customer') return <CustomerTrackingView user={user} />;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN VIEW — all staff on one Google Map
// ─────────────────────────────────────────────────────────────────────────────
function AdminTrackingView({ user }) {
  const mapRef    = useRef(null);
  const gmap      = useRef(null);
  const markers   = useRef({});            // staffId → google.maps.Marker
  const infoWins  = useRef({});            // staffId → google.maps.InfoWindow

  const [locations, setLocations] = useState({});
  const [mapError,  setMapError]  = useState('');
  const [mapReady,  setMapReady]  = useState(false);

  // Init Google Map
  useEffect(() => {
    if (!mapRef.current) return;
    loadGoogleMaps()
      .then(maps => {
        if (gmap.current) return;
        gmap.current = new maps.Map(mapRef.current, {
          center: DEFAULT_CENTER, zoom: 12,
          styles: DARK_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMapReady(true);
      })
      .catch(e => setMapError(e.message));
    return () => { gmap.current = null; };
  }, []);

  // Socket: staff location updates
  useEffect(() => {
    const socket = getSocket();

    function onUpdate({ staffId, location }) {
      setLocations(prev => ({ ...prev, [staffId]: location }));
      if (!gmap.current || !window.google) return;
      const pos = { lat: location.lat, lng: location.lng };

      if (markers.current[staffId]) {
        markers.current[staffId].setPosition(pos);
        infoWins.current[staffId]?.setContent(infoContent(location));
      } else {
        const marker = new window.google.maps.Marker({
          position: pos, map: gmap.current,
          title: location.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: '#6c63ff',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          label: { text: location.name.charAt(0), color: '#fff', fontWeight: 'bold', fontSize: '11px' },
          animation: window.google.maps.Animation.DROP,
        });
        const iw = new window.google.maps.InfoWindow({ content: infoContent(location) });
        marker.addListener('click', () => iw.open(gmap.current, marker));
        markers.current[staffId] = marker;
        infoWins.current[staffId] = iw;
      }
    }

    function onCleared({ staffId }) {
      setLocations(prev => { const n = { ...prev }; delete n[staffId]; return n; });
      if (markers.current[staffId]) { markers.current[staffId].setMap(null); delete markers.current[staffId]; }
      if (infoWins.current[staffId]) { infoWins.current[staffId].close(); delete infoWins.current[staffId]; }
    }

    socket.on('location:updated', onUpdate);
    socket.on('location:cleared', onCleared);
    return () => { socket.off('location:updated', onUpdate); socket.off('location:cleared', onCleared); };
  }, []);

  const activeCount = Object.keys(locations).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>📍 Live Staff Tracking</h2>
          <p>Real-time location of all active field staff</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: activeCount > 0 ? 'var(--green)' : 'var(--border)',
            display: 'inline-block',
            animation: activeCount > 0 ? 'pulse 2s infinite' : 'none',
          }} />
          <span className="text-sm text-muted">{activeCount} staff sharing live location</span>
        </div>
      </div>

      {mapError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {mapError} — Please add your Google Maps API key to <code>frontend/.env</code> as <code>VITE_GOOGLE_MAPS_KEY</code>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 200px)' }}>
        {/* Google Map */}
        <div style={{ flex: 1, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', background: 'var(--bg3)' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {mapReady && activeCount === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '20px 28px', textAlign: 'center',
              backdropFilter: 'blur(8px)', zIndex: 10,
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📍</div>
              <div className="font-bold text-sm">No staff sharing location</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>Staff pins will appear here in real-time</div>
            </div>
          )}
        </div>

        {/* Staff list sidebar */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Active Staff ({activeCount})
            </div>
            {activeCount === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>
                <div style={{ fontSize: '1.5rem' }}>😴</div>
                <p style={{ fontSize: '0.8rem', marginTop: 8 }}>No staff online</p>
              </div>
            ) : Object.values(locations).map(loc => (
              <div
                key={loc.staffId}
                onClick={() => {
                  if (gmap.current) gmap.current.panTo({ lat: loc.lat, lng: loc.lng });
                  if (markers.current[loc.staffId] && infoWins.current[loc.staffId]) {
                    infoWins.current[loc.staffId].open(gmap.current, markers.current[loc.staffId]);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--accent),var(--cyan))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
                }}>
                  {loc.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-bold text-sm">{loc.name}</div>
                  <div className="text-xs text-muted">
                    {loc.bookingId ? `On job #${loc.bookingId.slice(-6)}` : 'Available'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--green)', marginTop: 2 }}>
                    ● Live · {new Date(loc.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 2 }}>→</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', border: '2px solid white', flexShrink: 0 }} />
                <span>Staff member (live GPS)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                <span>Actively sharing location</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />
                <span>Offline / stopped sharing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF VIEW — share own GPS via Google Maps
// ─────────────────────────────────────────────────────────────────────────────
function StaffTrackingView({ user }) {
  const mapRef    = useRef(null);
  const gmap      = useRef(null);
  const myMarker  = useRef(null);
  const myCircle  = useRef(null);
  const watchId   = useRef(null);

  const [sharing, setSharing]   = useState(false);
  const [myPos,   setMyPos]     = useState(null);
  const [error,   setError]     = useState('');
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (!mapRef.current) return;
    loadGoogleMaps()
      .then(maps => {
        if (gmap.current) return;
        gmap.current = new maps.Map(mapRef.current, {
          center: DEFAULT_CENTER, zoom: 14,
          styles: DARK_STYLES,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        });
      })
      .catch(e => setMapError(e.message));
    return () => { gmap.current = null; };
  }, []);

  useEffect(() => {
    bookingsApi.getAll({ status: 'approved' })
      .then(r => {
        const mine = (r.bookings || []).filter(b => {
          const sid = b.staffId?._id || b.staffId;
          return sid?.toString() === user?._id?.toString();
        });
        setBookings(mine);
      })
      .catch(() => {});
  }, [user]);

  function startSharing() {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser'); return; }
    if (!GMAP_KEY) { setError('Google Maps API key not set in frontend/.env'); return; }
    setError('');
    const socket = getSocket();

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPos({ lat, lng });

        if (gmap.current && window.google) {
          const gPos = { lat, lng };
          gmap.current.panTo(gPos);
          if (myMarker.current) {
            myMarker.current.setPosition(gPos);
          } else {
            myMarker.current = new window.google.maps.Marker({
              position: gPos, map: gmap.current,
              title: `${user.name} (You)`,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 18,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              label: { text: '📍', fontSize: '14px' },
              animation: window.google.maps.Animation.BOUNCE,
            });
            // Accuracy circle
            myCircle.current = new window.google.maps.Circle({
              center: gPos, radius: 50,
              map: gmap.current,
              fillColor: '#22c55e', fillOpacity: 0.1,
              strokeColor: '#22c55e', strokeOpacity: 0.4, strokeWeight: 1,
            });
          }
          myCircle.current?.setCenter(gPos);
        }

        socket.emit('location:broadcast', {
          lat, lng,
          staffId: user._id,
          staffName: user.name,
          bookingId: selectedBooking || null,
        });
      },
      err => { setError(`GPS error: ${err.message}`); stopSharing(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
    setSharing(true);
  }

  function stopSharing() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    getSocket().emit('location:stop', { staffId: user._id });
    if (myMarker.current) { myMarker.current.setMap(null); myMarker.current = null; }
    if (myCircle.current) { myCircle.current.setMap(null); myCircle.current = null; }
    setSharing(false);
    setMyPos(null);
  }

  useEffect(() => () => stopSharing(), []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>📍 My Live Location</h2>
          <p>Share your GPS with customers and admin during active wash jobs</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: sharing ? 'var(--green)' : 'var(--border)',
            animation: sharing ? 'pulse 2s infinite' : 'none', display: 'inline-block',
          }} />
          <span className="text-sm" style={{ color: sharing ? 'var(--green)' : 'var(--text2)' }}>
            {sharing ? 'Broadcasting live' : 'Location off'}
          </span>
        </div>
      </div>

      {(error || mapError) && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {error || mapError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 220px)' }}>
        {/* Controls */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>🗂 Active Booking</div>
            <div className="form-group">
              <label className="form-label">Link to booking</label>
              <select className="form-control" value={selectedBooking} onChange={e => setSelectedBooking(e.target.value)} disabled={sharing}>
                <option value="">— None selected —</option>
                {bookings.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.customerName} · {b.date} {b.time}
                  </option>
                ))}
              </select>
              <div className="text-xs text-muted" style={{ marginTop: 5 }}>
                Link a booking so the customer can track your arrival
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>📡 Location Sharing</div>
            {!sharing ? (
              <button className="btn btn-success" style={{ width: '100%' }} onClick={startSharing}>
                ▶ Start Sharing
              </button>
            ) : (
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={stopSharing}>
                ■ Stop Sharing
              </button>
            )}
            {myPos && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius2)', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>● Live GPS</div>
                <div className="text-muted">Lat: {myPos.lat.toFixed(5)}</div>
                <div className="text-muted">Lng: {myPos.lng.toFixed(5)}</div>
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10 }}>ℹ️ How it works</div>
            <ol style={{ fontSize: '0.78rem', color: 'var(--text2)', paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Pick the booking you're heading to</li>
              <li>Tap <strong>Start Sharing</strong></li>
              <li>Customer and admin see you live on map</li>
              <li>Stop sharing when the job is done</li>
            </ol>
          </div>
        </div>

        {/* Google Map */}
        <div style={{ flex: 1, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', background: 'var(--bg3)' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!sharing && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '28px 36px', textAlign: 'center',
              backdropFilter: 'blur(8px)', zIndex: 10,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📍</div>
              <div className="font-bold">Press Start Sharing to go live</div>
              <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                Your browser will request location permission
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER VIEW — track assigned staff arrival via Google Maps
// ─────────────────────────────────────────────────────────────────────────────
function CustomerTrackingView({ user }) {
  const mapRef      = useRef(null);
  const gmap        = useRef(null);
  const staffMarker = useRef(null);
  const pathLine    = useRef(null);
  const pathCoords  = useRef([]);

  const [bookings,    setBookings]    = useState([]);
  const [selectedId,  setSelectedId]  = useState('');
  const [staffLoc,    setStaffLoc]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [mapError,    setMapError]    = useState('');

  useEffect(() => {
    if (!mapRef.current) return;
    loadGoogleMaps()
      .then(maps => {
        if (gmap.current) return;
        gmap.current = new maps.Map(mapRef.current, {
          center: DEFAULT_CENTER, zoom: 13,
          styles: DARK_STYLES,
          mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        });
      })
      .catch(e => setMapError(e.message));
    return () => { gmap.current = null; };
  }, []);

  useEffect(() => {
    bookingsApi.getAll({ status: 'approved' })
      .then(r => {
        setBookings(r.bookings || []);
        if (r.bookings?.length === 1) setSelectedId(r.bookings[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const socket = getSocket();
    socket.emit('tracking:subscribe', { bookingId: selectedId });

    // Reset path trail
    pathCoords.current = [];
    if (pathLine.current) { pathLine.current.setMap(null); pathLine.current = null; }

    function onUpdate({ staffId, location }) {
      if (location.bookingId !== selectedId) return;
      setStaffLoc(location);
      if (!gmap.current || !window.google) return;

      const pos = { lat: location.lat, lng: location.lng };
      gmap.current.panTo(pos);

      // Update or create staff marker
      if (staffMarker.current) {
        staffMarker.current.setPosition(pos);
      } else {
        staffMarker.current = new window.google.maps.Marker({
          position: pos, map: gmap.current,
          title: `${location.name} — Your Washer`,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7,
            fillColor: '#6c63ff',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: 0,
          },
          label: { text: '🧑‍🔧', fontSize: '16px' },
          animation: window.google.maps.Animation.DROP,
        });
        new window.google.maps.InfoWindow({
          content: `<div style="font-family:sans-serif"><strong>${location.name}</strong><br><span style="color:#666;font-size:12px">Your washer — on the way!</span></div>`,
        }).open(gmap.current, staffMarker.current);
      }

      // Draw breadcrumb trail
      pathCoords.current.push(pos);
      if (pathLine.current) {
        pathLine.current.setPath(pathCoords.current);
      } else if (pathCoords.current.length > 1) {
        pathLine.current = new window.google.maps.Polyline({
          path: pathCoords.current,
          geodesic: true,
          strokeColor: '#6c63ff',
          strokeOpacity: 0.6,
          strokeWeight: 3,
          map: gmap.current,
        });
      }
    }

    function onCleared({ staffId }) {
      if (staffMarker.current) { staffMarker.current.setMap(null); staffMarker.current = null; }
      if (pathLine.current)    { pathLine.current.setMap(null);    pathLine.current = null; }
      pathCoords.current = [];
      setStaffLoc(null);
    }

    socket.on('location:updated', onUpdate);
    socket.on('location:cleared', onCleared);
    return () => {
      socket.off('location:updated', onUpdate);
      socket.off('location:cleared', onCleared);
      if (staffMarker.current) { staffMarker.current.setMap(null); staffMarker.current = null; }
      if (pathLine.current)    { pathLine.current.setMap(null);    pathLine.current = null; }
    };
  }, [selectedId]);

  const selectedBooking = bookings.find(b => b._id === selectedId);

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-info">
          <h2>📍 Track My Wash</h2>
          <p>See your washer approaching in real-time on Google Maps</p>
        </div>
        {staffLoc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite', display: 'inline-block' }} />
            <span className="text-sm text-green font-bold">Washer is live!</span>
          </div>
        )}
      </div>

      {mapError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {mapError} — Add your Google Maps API key to <code>frontend/.env</code>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 240px)', flexWrap: 'wrap' }}>
        {/* Info panel */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12 }}>Your Bookings</div>
            {loading ? (
              <div className="text-sm text-muted">Loading...</div>
            ) : bookings.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <div className="icon">📋</div>
                <p style={{ fontSize: '0.82rem' }}>No active bookings</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => window.open('/booking', '_blank')}>
                  Book Now
                </button>
              </div>
            ) : bookings.map(b => (
              <div
                key={b._id}
                onClick={() => setSelectedId(b._id)}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius2)', cursor: 'pointer', marginBottom: 8,
                  border: `1px solid ${selectedId === b._id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedId === b._id ? 'var(--accent-bg)' : 'var(--bg3)',
                }}
              >
                <div className="font-bold text-sm" style={{ textTransform: 'capitalize' }}>{b.package} Wash</div>
                <div className="text-xs text-muted">{b.date} at {b.time}</div>
                <div className="text-xs text-muted">Vehicle: {b.vehicleNumber}</div>
                {b.staffId && <div className="text-xs text-accent" style={{ marginTop: 4 }}>Washer: {b.staffId.name || 'Assigned'}</div>}
              </div>
            ))}
          </div>

          {selectedBooking && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10 }}>Status</div>
              {staffLoc ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                    <span className="font-bold text-sm text-green">Washer is on the way!</span>
                  </div>
                  <div className="text-xs text-muted">Last update: {new Date(staffLoc.timestamp).toLocaleTimeString()}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>Purple trail = route taken</div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', animation: 'pulse 2s infinite' }} />
                  <span className="text-sm text-muted">Waiting for washer to share location…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Map */}
        <div style={{ flex: 1, minWidth: 300, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', background: 'var(--bg3)' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!selectedId && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '28px 36px', textAlign: 'center',
              backdropFilter: 'blur(8px)', zIndex: 10,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗺️</div>
              <div className="font-bold">Select a booking to start tracking</div>
              <div className="text-xs text-muted" style={{ marginTop: 6 }}>Your washer appears here once they go live</div>
            </div>
          )}
          {selectedId && !staffLoc && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '8px 16px', zIndex: 10,
              fontSize: '0.8rem', color: 'var(--text2)',
              display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(6px)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', animation: 'pulse 2s infinite' }} />
              Waiting for washer to go live…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Google Maps InfoWindow content ──────────────────────────────────────────
function infoContent(loc) {
  return `
    <div style="font-family:sans-serif;min-width:150px;padding:4px">
      <strong style="font-size:13px">${loc.name}</strong><br/>
      <span style="font-size:11px;color:#888">
        ${loc.bookingId ? `On job #${loc.bookingId.slice(-6)}` : 'Available'}<br/>
        Updated: ${new Date(loc.timestamp).toLocaleTimeString()}
      </span>
    </div>
  `;
}
