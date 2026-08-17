'use client';

import { Heart, MapPin, Star, Bed, Bath, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface PropertyCardProps {
  property: any;
  onDelete?: (id: string) => void;
}

export default function PropertyCard({ property, onDelete }: PropertyCardProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isOwner = session?.user && (session.user as any).id === property.owner_id;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Вы уверены, что хотите удалить это объявление?')) {
      try {
        const res = await fetch(`http://localhost:5000/api/listings/${property.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          if (onDelete) onDelete(property.id);
          else window.location.reload();
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/details/${property.id}`)}
      className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 group cursor-pointer w-full relative"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-brand-blue shadow-sm uppercase tracking-wider">
          {property.category === 'villas' ? 'Вилла' : property.category === 'cottages' ? 'Коттедж' : 'Дача'}
        </div>
        
        <div className="absolute top-4 right-4 flex gap-2">
          {isOwner && (
            <button 
              onClick={handleDelete}
              className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-red-500 hover:bg-red-50 transition-colors shadow-sm"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); /* handle favorite */ }}
            className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-gray-300 hover:text-red-500 transition-colors shadow-sm"
          >
            <Heart size={18} />
          </button>
        </div>
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
          <span className="text-[10px] font-medium truncate">{property.location}</span>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-gray-400">
              <Bed size={14} />
              <span className="text-[10px] font-bold text-gray-900">{property.rooms || property.beds || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Bath size={14} />
              <span className="text-[10px] font-bold text-gray-900">{property.baths || 0}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-brand-blue">{property.price.toLocaleString()} сум</p>
            <p className="text-[8px] text-gray-400 uppercase font-black">/{property.priceUnit === 'день' ? 'день' : 'общая'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
