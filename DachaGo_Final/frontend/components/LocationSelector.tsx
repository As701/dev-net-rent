'use client';

import { X, Search, ChevronRight, MapPin } from 'lucide-react';
import { uzbekistanLocations } from '@/lib/locations';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
}

export default function LocationSelector({ isOpen, onClose, onSelect }: LocationSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredLocations = uzbekistanLocations.map(loc => ({
    ...loc,
    cities: loc.cities.filter(city => 
      city.toLowerCase().includes(search.toLowerCase()) || 
      loc.region.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(loc => loc.cities.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] max-h-[90vh] overflow-hidden z-[101] shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Select Location</h3>
                <button onClick={onClose} className="p-2 bg-soft-gray rounded-full">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-soft-gray px-4 py-4 rounded-2xl border border-transparent focus-within:border-brand-blue focus-within:bg-white transition-all mb-6">
                <Search size={20} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search city or region..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm font-medium"
                />
              </div>

              <div className="overflow-y-auto max-h-[60vh] pb-10 no-scrollbar">
                {filteredLocations.map((loc) => (
                  <div key={loc.region} className="mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 px-2">
                      {loc.region}
                    </h4>
                    <div className="space-y-1">
                      {loc.cities.map((city) => (
                        <button
                          key={city}
                          onClick={() => {
                            onSelect(`${city}, ${loc.region}`);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl hover:bg-accent-blue group transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-soft-gray rounded-xl group-hover:bg-white text-gray-400 group-hover:text-brand-blue transition-colors">
                              <MapPin size={18} />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">{city}</span>
                          </div>
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-blue" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
