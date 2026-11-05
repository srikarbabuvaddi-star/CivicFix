import { useEffect, useRef } from 'react';
import { Shield } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_LABELS } from '../utils/constants.js';

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

export function IssueMapView({ issues = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map);

      markersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    const validIssues = issues.filter(
      (iss) =>
        iss.location?.coordinates &&
        Array.isArray(iss.location.coordinates) &&
        iss.location.coordinates.length === 2 &&
        !isNaN(iss.location.coordinates[0]) &&
        !isNaN(iss.location.coordinates[1])
    );

    if (validIssues.length > 0) {
      validIssues.forEach((iss) => {
        const [lng, lat] = iss.location.coordinates;
        const categoryLabel = CATEGORY_LABELS[iss.category] || iss.category;
        const statusLabel = iss.status.replace('_', ' ').toUpperCase();

        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '200px';
        popupContent.style.fontFamily = 'inherit';
        popupContent.innerHTML = `
          <div style="font-size: 0.75rem; font-weight: 700; color: #0284c7; margin-bottom: 2px;">
            #${iss.issueNumber || 'ISSUE'} • ${categoryLabel}
          </div>
          <div style="font-size: 0.9rem; font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.2;">
            ${iss.title}
          </div>
          <div style="font-size: 0.75rem; color: #475569; margin-bottom: 8px;">
            Status: <span style="font-weight: 600; text-transform: uppercase;">${statusLabel}</span>
          </div>
          <a href="/issues/${iss.id || iss._id}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; color: #2563eb; text-decoration: none;">
            View Full Report &rarr;
          </a>
        `;

        const marker = L.marker([lat, lng]);
        marker.bindPopup(popupContent);
        markersGroup.addLayer(marker);
      });

      try {
        mapInstanceRef.current.fitBounds(markersGroup.getBounds(), {
          padding: [40, 40],
          maxZoom: 15
        });
      } catch {
        // Fallback if bounds collapse
      }
    }

    window.setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
  }, [issues]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Privacy Indicator Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.85rem',
          fontSize: '0.8rem',
          color: '#1e40af',
          marginBottom: '0.75rem'
        }}
      >
        <Shield size={16} className="text-blue-600 flex-shrink-0" />
        <span>
          <strong>Citizen Privacy Protected:</strong> Public map coordinates are generalized to neighborhood grid precision (~100m) to safeguard reporter residences.
        </span>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          height: '520px',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-slate-200)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          zIndex: 1
        }}
      />
    </div>
  );
}
