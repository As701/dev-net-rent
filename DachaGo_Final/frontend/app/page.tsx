'use client';

import { 
  Bell, MapPin, Search, SlidersHorizontal, Heart, 
  MessageCircle, User, Home as HomeIcon, Warehouse, 
  Castle, Trees, LayoutGrid, Plus, X, ChevronDown
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import LocationSelector from '../components/LocationSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const iconMap: { [key: string]: any } = {
  all: LayoutGrid,
  cottages: Warehouse,
  villas: Castle,
  dachas: Trees,
};

export default function Home() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Ташкент, УЗ');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState({
    type: 'all',
    minPrice: '',
    maxPrice: '',
    rooms: 'all',
  });

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setError(null);
        const res = await fetch('http://localhost:5000/api/listings');
        if (!res.ok) throw new Error('Бэкенд не отвечает');
        const data = await res.json();
        setProperties(data);
      } catch (err: any) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить объявления. Убедитесь, что бэкенд запущен.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter(prop => {
      const matchesCategory = activeCategory === 'all' || prop.category === activeCategory;
      const matchesSearch = prop.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           prop.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filters.type === 'all' || (filters.type === 'rent' ? prop.type === 'rent' : prop.type === 'sale');
      
      // Бэкенд возвращает 'rooms', а не 'beds'
      const roomsCount = parseInt(prop.rooms) || 0;
      const matchesRooms = filters.rooms === 'all' || roomsCount >= parseInt(filters.rooms);
      
      return matchesCategory && matchesSearch && matchesType && matchesRooms;
    });
  }, [activeCategory, searchQuery, filters, properties]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-32">
      <LocationSelector 
        isOpen={isLocationOpen} 
        onClose={() => setIsLocationOpen(false)} 
        onSelect={(loc) => setSelectedLocation(loc)} 
      />

      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[32px] shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer group" onClick={() => setIsLocationOpen(true)}>
            <p className="text-gray-400 text-xs font-medium">Ваша локация</p>
            <div className="flex items-center gap-1 mt-0.5 group-hover:text-[#2599C8] transition-colors">
              <MapPin size={14} className="text-[#2599C8]" />
              <span className="font-bold text-gray-900">{selectedLocation}</span>
            </div>
          </div>
          <button className="p-3 bg-[#F7F9FC] rounded-2xl relative border border-gray-50">
            <Bell size={20} className="text-gray-700" />
            <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-[#F7F9FC] px-4 py-3.5 rounded-2xl border border-transparent focus-within:border-[#2599C8] focus-within:bg-white transition-all shadow-inner">
            <Search size={20} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Искать дачу, виллу..." 
              className="bg-transparent outline-none w-full text-sm text-gray-700 font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFiltersOpen(true)}
            className="p-4 bg-[#2599C8] text-white rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="flex gap-4 overflow-x-auto px-6 mt-8 no-scrollbar">
        {['all', 'dachas', 'villas', 'cottages'].map((catId) => {
          const Icon = iconMap[catId] || LayoutGrid;
          const names: any = { all: 'Все', dachas: 'Дачи', villas: 'Виллы', cottages: 'Коттеджи' };
          return (
            <button 
              key={catId}
              onClick={() => setActiveCategory(catId)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all whitespace-nowrap font-bold text-xs ${
                activeCategory === catId ? 'bg-[#2599C8] text-white border-[#2599C8] shadow-md' : 'bg-white text-gray-400 border-gray-100'
              }`}
            >
              <Icon size={16} />
              {names[catId]}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <main className="px-6 mt-8">
        <h3 className="font-bold text-gray-900 text-lg mb-6">Популярные предложения</h3>
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2599C8]"></div></div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-red-100">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-bold text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold"
            >
              Попробовать снова
            </button>
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
            <Search size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold text-sm">Ничего не нашли...</p>
          </div>
        )}
      </main>
    </div>
  );
}
