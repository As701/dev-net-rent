'use client';

import { 
  MapPin, 
  Star, 
  Heart,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const XIcon = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

function MapEvents({ onMove }: { onMove: () => void }) {
  useMapEvents({
    moveend: () => onMove(),
  });
  return null;
}

export default function RealMap() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = async () => {
    try {
      const res = await fetch('http://localhost:5005/api/listings');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const selectedProperty = properties.find(p => p.id === selectedId);

  const createCustomIcon = (property: any) => {
    const isSelected = selectedId === property.id;
    const priceFormatted = property.price >= 1000000 
      ? (property.price / 1000000).toFixed(1) + 'м' 
      : (property.price / 1000).toFixed(0) + 'к';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center transition-all duration-300 ${isSelected ? 'scale-110 z-[1000]' : 'scale-100'}">
          <div class="px-3 py-1.5 rounded-2xl font-black text-[10px] shadow-xl border-2 transition-colors ${
            isSelected ? 'bg-brand-blue text-white border-white' : 'bg-white text-gray-900 border-transparent'
          }">
            ${priceFormatted}
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 shadow-lg ${
            isSelected ? 'bg-brand-blue' : 'bg-white'
          }"></div>
        </div>
      `,
      iconSize: [60, 30],
      iconAnchor: [30, 30],
    });
  };

  if (isLoading) return null;

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={[41.2995, 69.2401]} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEvents onMove={fetchListings} />

        {properties.map((prop) => (
          <Marker 
            key={prop.id} 
            position={[prop.lat || 41.2995, prop.lng || 69.2401]} 
            icon={createCustomIcon(prop)}
            eventHandlers={{
              click: () => setSelectedId(prop.id),
            }}
          />
        ))}
      </MapContainer>

      {/* Selected Property Bottom Panel */}
      <AnimatePresence mode="wait">
        {selectedId && (
          <motion.div
            key={selectedId}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-10 left-6 right-6 z-[1000]"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-4 flex gap-4 shadow-2xl border border-white max-w-md mx-auto relative overflow-hidden">
              <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0">
                <img 
                  src={selectedProperty.image} 
                  className="w-full h-full object-cover" 
                  alt={selectedProperty.title} 
                />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{selectedProperty.title}</h4>
                    <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-300">
                      <XIcon size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-[10px] mt-1">
                    <MapPin size={12} className="text-brand-blue" />
                    <span>{selectedProperty.location}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-bold text-gray-700">{selectedProperty.rating}</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400">{selectedProperty.beds} сп. • {selectedProperty.baths} ванн.</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-brand-blue">${selectedProperty.price.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400">/{selectedProperty.priceUnit}</span>
                  </div>
                  <Link 
                    href={`/details/${selectedId}`}
                    className="p-3 bg-brand-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20"
                  >
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
