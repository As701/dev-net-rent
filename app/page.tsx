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

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.rooms !== 'all') params.append('rooms', filters.rooms);
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (selectedLocation && selectedLocation !== 'Ташкент, УЗ' && selectedLocation !== 'Все регионы') params.append('location', selectedLocation);

      const res = await fetch(`http://localhost:5005/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error('Backend not responding');
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [activeCategory, selectedLocation]);

  const filteredProperties = useMemo(() => {
    return properties.filter(prop => {
      const matchesSearch = prop.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           prop.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery, properties]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-32">
      <LocationSelector 
        isOpen={isLocationOpen} 
        onClose={() => setIsLocationOpen(false)} 
        onSelect={(loc) => setSelectedLocation(loc)} 
      />

      {/* Filters Modal */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900">Фильтры</h2>
                <button onClick={() => setIsFiltersOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Type */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Тип сделки</p>
                  <div className="flex gap-3">
                    {['all', 'rent', 'sale'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilters({ ...filters, type: t })}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${
                          filters.type === t ? 'bg-brand-blue text-white shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {t === 'all' ? 'Любой' : t === 'rent' ? 'Аренда' : 'Продажа'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Цена (сум)</p>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">ОТ</p>
                      <input 
                        type="number" 
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        placeholder="0" 
                        className="bg-transparent font-black text-gray-900 w-full outline-none"
                      />
                    </div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">ДО</p>
                      <input 
                        type="number" 
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        placeholder="10 000 000" 
                        className="bg-transparent font-black text-gray-900 w-full outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Rooms */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Количество комнат</p>
                  <div className="flex gap-2">
                    {['all', '1', '2', '3', '4', '5+'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setFilters({ ...filters, rooms: r })}
                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-all ${
                          filters.rooms === r ? 'bg-brand-blue text-white' : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter Placeholder */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Дата поездки</p>
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-brand-blue">
                      <ChevronDown size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-400">Выберите даты (для аренды)</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    fetchListings();
                    setIsFiltersOpen(false);
                  }}
                  className="w-full py-5 bg-brand-blue text-white rounded-[24px] font-black shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4"
                >
                  Показать результаты
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
