'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Check, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function MapPicker({ onSelect, onClose, initialLat, initialLng }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLat && initialLng ? L.latLng(initialLat, initialLng) : L.latLng(41.2995, 69.2401)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col"
    >
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
          <X size={20} />
        </button>
        <h3 className="font-bold text-gray-900">Выберите локацию</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative">
        <MapContainer 
          center={position || [41.2995, 69.2401]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white z-[1000] flex items-center gap-2">
          <MapPin size={14} className="text-brand-blue" />
          <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">Нажмите на карту, чтобы поставить маркер</span>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <button 
          onClick={() => {
            if (position) {
              onSelect(position.lat, position.lng);
              onClose();
            }
          }}
          className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Check size={20} />
          Подтвердить выбор
        </button>
      </div>
    </motion.div>
  );
}
