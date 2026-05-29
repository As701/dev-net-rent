'use client';

import { Heart, MapPin, Star, Bed, Bath } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface PropertyCardProps {
  property: any;
  isFavoritedInitial?: boolean;
}

export default function PropertyCard({ property, isFavoritedInitial = false }: PropertyCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isFavorited, setIsFavorited] = useState(isFavoritedInitial);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.user) {
      router.push('/auth');
      return;
    }

    const userId = (session.user as any).id || 'admin-id-fixed';
    
    try {
      if (isFavorited) {
        await fetch(`http://localhost:5005/api/favorites/${userId}/${property.id}`, { method: 'DELETE' });
      } else {
        await fetch(`http://localhost:5005/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, listing_id: property.id })
        });
      }
      setIsFavorited(!isFavorited);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/details/${property.id}`)}
      className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 group cursor-pointer w-full"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className={`px-3 py-1.5 backdrop-blur-md rounded-xl text-[10px] font-black shadow-sm uppercase tracking-wider ${
            property.type === 'rent' ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white'
          }`}>
            {property.type === 'rent' ? 'Аренда' : 'Продажа'}
          </div>
          <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-brand-blue shadow-sm uppercase tracking-wider">
            {property.category === 'villas' ? 'Вилла' : property.category === 'cottages' ? 'Коттедж' : 'Дача'}
          </div>
        </div>
        <button 
          onClick={toggleFavorite}
          className={`absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-xl transition-colors shadow-sm ${
            isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
          }`}
        >
          <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-bold text-gray-900">{property.rating || '5.0'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-gray-400 mb-4">
          <MapPin size={12} className="text-brand-blue" />
          <span className="text-[10px] font-medium truncate">
            {property.location.split(',')[0]} • <span className="text-gray-900 font-bold">{property.location.split(',')[1] || 'Район'}</span>
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-gray-400">
              <Bed size={14} />
              <span className="text-[10px] font-bold text-gray-900">{property.rooms || property.beds || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Bath size={14} />
              <span className="text-[10px] font-bold text-gray-900">{property.capacity || property.baths || 0}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-brand-blue">{(property.price || 0).toLocaleString()} сум</p>
            <p className="text-[8px] text-gray-400 uppercase font-black">
              {property.type === 'rent' ? `за ${property.priceUnit || 'день'}` : 'Общая цена'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
