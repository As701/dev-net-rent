'use client';

import { ArrowLeft, Heart, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PropertyCard from '../../components/PropertyCard';

export default function FavoritesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    setRecentlyViewed(JSON.parse(localStorage.getItem('recentlyViewed') || '[]'));
    if (!session) {
      router.push('/auth');
      return;
    }

    const fetchFavorites = async () => {
      try {
        const userId = 'admin-id-fixed'; // В реальном приложении session.user.id
        const res = await fetch(`http://localhost:5005/api/favorites/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setFavorites(data);
        }
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [session]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24">
      <header className="bg-white px-6 pt-16 pb-6 rounded-b-[40px] shadow-sm flex items-center gap-4 sticky top-0 z-40">
        <button onClick={() => router.back()} className="p-3 bg-soft-gray rounded-2xl">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-2xl font-black text-gray-900">Избранное</h1>
      </header>

      <main className="px-6 mt-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {favorites.map((prop) => (
              <PropertyCard key={prop.id} property={prop} isFavoritedInitial={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={40} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Пусто</h3>
            <p className="text-gray-400 font-bold text-sm px-10">
              Вы еще не добавили ни одного объекта в избранное.
            </p>
            <button 
              onClick={() => router.push('/')}
              className="mt-8 px-8 py-4 bg-brand-blue text-white rounded-2xl font-black shadow-lg shadow-blue-200"
            >
              Найти что-то
            </button>
          </div>
        )}
      </main>

      {recentlyViewed.length > 0 && (
        <section className="px-6 mt-12 mb-12">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Вы недавно смотрели</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
            {recentlyViewed.map((prop) => (
              <div 
                key={prop.id} 
                onClick={() => router.push(`/details/${prop.id}`)}
                className="w-48 shrink-0 bg-white p-3 rounded-[28px] shadow-soft border border-gray-50 cursor-pointer"
              >
                <img src={prop.image} className="w-full h-28 object-cover rounded-2xl mb-3" alt={prop.title} />
                <h4 className="font-bold text-gray-900 text-xs truncate">{prop.title}</h4>
                <p className="text-[10px] font-black text-brand-blue mt-1">{prop.price.toLocaleString()} сум</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
