'use client';

import { 
  MapPin, 
  Star, 
  Heart,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function RealMap() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch('http://localhost:5000/api/listings');
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          if (data.length > 0) setSelectedId(data[0].id);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  const selectedProperty = properties.find(p => p.id === selectedId);

  const createCustomIcon = (property: any) => {
    const isSelected = selectedId === property.id;
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative group">
          <div class="w-12 h-12 rounded-full border-4 ${isSelected ? 'border-brand-blue scale-125' : 'border-white'} shadow-xl overflow-hidden transition-all duration-300">
            <img src="${property.image}" class="w-full h-full object-cover" />
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand-blue text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
            ${(property.price / 1000).toFixed(0)}k
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
    });
  };

  if (loading) return (
    <div className="w-full h-full bg-soft-gray flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
    </div>
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={[41.2995, 69.2401]} 
        zoom={10} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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
        {selectedId && selectedProperty && (
          <motion.div
            key={selectedId}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-20 left-6 right-6 z-[1000]"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-4 flex gap-4 shadow-2xl border border-white max-w-md mx-auto relative overflow-hidden">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
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
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-[10px] mt-1">
                    <MapPin size={12} className="text-brand-blue" />
                    <span>{selectedProperty.location}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-bold text-gray-700">{selectedProperty.rating || '5.0'}</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400">{selectedProperty.rooms || '0'} комн. • {selectedProperty.area || '0'} м²</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-lg font-black text-brand-blue">{selectedProperty.price.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400">/{selectedProperty.priceUnit || 'день'}</span>
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
