import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, AlertCircle, Info } from 'lucide-react';
import { Button } from './Button.jsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export function LocationPicker({
  value = { coordinates: [77.5946, 12.9716], address: '' },
  onChange,
  error = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [lng, setLng] = useState(value?.coordinates?.[0] ?? 77.5946);
  const [lat, setLat] = useState(value?.coordinates?.[1] ?? 12.9716);
  const [address, setAddress] = useState(value?.address || '');

  const [geoPromptOpen, setGeoPromptOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = typeof lat === 'number' && !isNaN(lat) ? lat : 12.9716;
      const initialLng = typeof lng === 'number' && !isNaN(lng) ? lng : 77.5946;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        handleCoordinateUpdate(pos.lng, pos.lat);
      });

      map.on('click', (e) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        marker.setLatLng([clickedLat, clickedLng]);
        handleCoordinateUpdate(clickedLng, clickedLat);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCoordinateUpdate = (newLng, newLat) => {
    const parsedLng = parseFloat(newLng);
    const parsedLat = parseFloat(newLat);

    setLng(parsedLng);
    setLat(parsedLat);

    if (mapInstanceRef.current && markerRef.current) {
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        markerRef.current.setLatLng([parsedLat, parsedLng]);
        mapInstanceRef.current.panTo([parsedLat, parsedLng]);
      }
    }

    onChange({
      type: 'Point',
      coordinates: [parsedLng, parsedLat],
      address
    });
  };

  const handleAddressChange = (e) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    onChange({
      type: 'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)],
      address: newAddress
    });
  };

  // Explicit user-triggered browser geolocation request
  const requestBrowserLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setGeoPromptOpen(false);
        const userLng = pos.coords.longitude;
        const userLat = pos.coords.latitude;
        handleCoordinateUpdate(userLng, userLat);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please enter coordinates manually.');
        } else {
          setGeoError('Unable to retrieve location. Please enter coordinates manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          <span>Incident Location & Coordinates</span>
          <span className="required" title="Required field">*</span>
        </label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setGeoPromptOpen(true)}
          style={{ gap: '0.35rem' }}
        >
          <Navigation size={14} />
          <span>Detect My Location</span>
        </Button>
      </div>

      {/* Geolocation Explanation / Permission Modal Prompt */}
      {geoPromptOpen && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <Info size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <strong>Browser Location Request Notice</strong>
              <p style={{ color: 'var(--color-navy-700)', marginTop: '0.2rem', marginBottom: 0 }}>
                CivicFix uses your device GPS strictly to set the coordinates of this civic issue on municipal maps.
                We never track your ongoing location.
              </p>
            </div>
          </div>

          {geoError && (
            <div style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertCircle size={15} />
              <span>{geoError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGeoPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={geoLoading}
              onClick={requestBrowserLocation}
            >
              Confirm & Allow GPS Detection
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          height: '240px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-slate-300)',
          zIndex: 1
        }}
        aria-label="Map location picker"
      />

      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
        Click anywhere on the map or drag the pin to set the exact incident position.
      </span>

      {/* Accessible Coordinate Numeric Inputs (Fallbacks & Precision controls) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="latitude-input" className="form-label" style={{ fontSize: '0.8rem' }}>
            Latitude (-90 to 90)
          </label>
          <input
            id="latitude-input"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => handleCoordinateUpdate(lng, e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="longitude-input" className="form-label" style={{ fontSize: '0.8rem' }}>
            Longitude (-180 to 180)
          </label>
          <input
            id="longitude-input"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => handleCoordinateUpdate(e.target.value, lat)}
            className="form-input"
            required
          />
        </div>
      </div>

      {/* Address / Landmark Description */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="address-input" className="form-label" style={{ fontSize: '0.8rem' }}>
          Street Address or Nearest Landmark (Optional)
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="address-input"
            type="text"
            placeholder="e.g. Near City Hospital Gate 2, Ring Road"
            value={address}
            onChange={handleAddressChange}
            className="form-input"
            style={{ paddingLeft: '2rem' }}
          />
          <MapPin
            size={16}
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-slate-400)'
            }}
          />
        </div>
      </div>

      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
