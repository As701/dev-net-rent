'use client';

import { 
  ArrowLeft, Heart, Share2, MapPin, Star, Bed, Bath, Maximize, 
  Phone, MessageCircle, ShieldCheck, CheckCircle2, Info, Clock, AlertCircle,
  Lock, ArrowRight, ChevronRight, ChevronLeft, Eye, Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import BookingCalendar from '@/components/BookingCalendar';
import PropertyCard from '@/components/PropertyCard';

export default function PropertyDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [authorListings, setAuthorListings] = useState<any[]>([]);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const API_URL = 'http://localhost:5005/api';

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Property Details
        const response = await fetch(`${API_URL}/listings/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data);
          
          // 2. Fetch Author's other listings (only if verified)
          if (data.owner?.verified === 1) {
            const authorRes = await fetch(`${API_URL}/listings/author/${data.owner_id}?exclude_id=${id}`);
            if (authorRes.ok) setAuthorListings(await authorRes.json());
          }

          // 3. Fetch Similar listings
          const similarRes = await fetch(`${API_URL}/listings/similar/${id}`);
          if (similarRes.ok) setSimilarListings(await similarRes.json());

          // 4. Check Follow status if verified
          if (session?.user && data.owner?.verified === 1) {
             const currentUserId = (session.user as any).id || 'admin-id-fixed';
             const followRes = await fetch(`${API_URL}/follow/status?follower_id=${currentUserId}&following_id=${data.owner_id}`);
             if (followRes.ok) {
               const { isFollowing: status } = await followRes.json();
               setIsFollowing(status);
             }
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, session]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push('/auth');
      return;
    }
    
    const currentUserId = (session.user as any).id || 'admin-id-fixed';
    try {
      const res = await fetch(`${API_URL}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: currentUserId,
          following_id: property.owner_id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.status === 'followed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChat = () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    const datesQuery = selectedDates.length > 0 ? `&msg=Здравствуйте! Хочу забронировать на ${selectedDates[0]} - ${selectedDates[selectedDates.length-1]}` : '';
    router.push(`/messages/${id}?ownerId=${property.owner_id}${datesQuery}`);
  };

  const handleBook = async () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    if (property.type === 'rent' && selectedDates.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: (session.user as any).id || 'admin-id-fixed',
          listing_id: property.id,
          start_date: selectedDates[0] || new Date().toISOString(),
          end_date: selectedDates[selectedDates.length - 1] || new Date().toISOString(),
          total_price: totalPrice || property.price
        })
      });
      if (res.ok) {
        alert('Заявка на бронирование отправлена!');
        router.push('/profile/bookings');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
    </div>
  );

  if (!property) return <div className="p-10 text-center text-gray-400">Объявление не найдено</div>;

  const allImages = property.all_images && property.all_images.length > 0 ? property.all_images : [property.image];
  const isVerified = property.owner?.verified === 1;

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-12 flex items-center justify-between pointer-events-none">
        <button onClick={() => router.back()} className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft pointer-events-auto text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-3 pointer-events-auto">
          <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft text-gray-900"><Share2 size={20} /></button>
          <button 
            onClick={() => setIsFavorited(!isFavorited)}
            className={`p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-400'}`}
          >
            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* ФОТОГАЛЕРЕЯ */}
      <div className="relative h-[45vh] w-full overflow-hidden rounded-b-[40px] shadow-lg group">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImageIndex}
            src={allImages[currentImageIndex]} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full object-cover" 
          />
        </AnimatePresence>
        
        {/* Индикатор количества */}
        <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold">
          {currentImageIndex + 1} / {allImages.length}
        </div>

        {/* Навигация */}
        {allImages.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      <div className="px-6 mt-8">
        {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
               <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                 property.type === 'rent' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
               }`}>
                 {property.type === 'rent' ? 'Аренда' : 'Продажа'}
               </span>
               <span className="text-[10px] text-gray-400 font-bold uppercase">Опубликовано сегодня</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{property.title}</h1>
            <div className="flex items-center gap-1 text-gray-500 mt-2">
              <MapPin size={16} className="text-brand-blue" />
              <span className="text-sm">{property.location}</span>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="flex items-center gap-1 justify-end mb-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-lg font-black text-gray-900">{property.rating || '5.0'}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 justify-end">
              <Eye size={12} /> {property.views || 0} просмотров
            </p>
          </div>
        </div>

        {/* ЦЕНА */}
        <div className="mt-8 p-6 bg-soft-gray rounded-[32px] flex justify-between items-center border border-gray-100/50">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">
              {property.type === 'rent' ? 'Стоимость в сутки' : 'Стоимость объекта'}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-blue">{property.price.toLocaleString()}</span>
              <span className="text-xs text-gray-400 font-bold">сум{property.type === 'rent' && '/день'}</span>
            </div>
          </div>
          {property.type === 'rent' && selectedDates.length > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Итого за {selectedDates.length} дн.</p>
              <p className="text-xl font-black text-gray-900">{totalPrice.toLocaleString()} сум</p>
            </div>
          )}
        </div>

        {/* БЛОК АВТОРА */}
        <div className="mt-10 p-5 border border-gray-100 rounded-3xl shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={property.owner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${property.owner?.name}`} className="w-14 h-14 rounded-2xl bg-accent-blue" alt="Owner" />
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow-sm">
                    <CheckCircle2 size={16} className="text-green-500 fill-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <h4 className="font-bold text-gray-900">{property.owner?.name || 'Владелец'}</h4>
                   {isVerified && <span className="text-[8px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">Про</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">На платформе с 2023</p>
              </div>
            </div>
            
            {isVerified && (
              <Link href={`/users/${property.owner_id}`} className="p-2 text-brand-blue bg-accent-blue rounded-xl">
                 <ChevronRight size={20} />
              </Link>
            )}
          </div>
          
          <div className="flex gap-3">
             {isVerified && (
               <button 
                onClick={handleFollow}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${
                  isFollowing ? 'bg-soft-gray text-gray-400' : 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                }`}
               >
                  {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                  {isFollowing ? 'Вы подписаны' : 'Подписаться'}
               </button>
             )}
             <button 
              onClick={handleChat}
              className={`flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all ${!isVerified ? 'flex-[2]' : ''}`}
             >
                <MessageCircle size={18} />
                Написать
             </button>
          </div>
        </div>

        {/* ОПИСАНИЕ */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900">Описание</h3>
            <button className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase hover:text-red-500 transition-colors">
              <Flag size={12} /> Пожаловаться
            </button>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            {showFullDescription ? property.description : `${property.description.slice(0, 150)}...`}
          </p>
          <button 
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="mt-3 text-brand-blue text-xs font-bold uppercase tracking-wider flex items-center gap-1"
          >
            {showFullDescription ? 'Скрыть' : 'Подробнее'}
          </button>
        </div>

        {/* УДОБСТВА */}
        <div className="mt-10 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Удобства</h3>
          <div className="grid grid-cols-2 gap-4">
            {property.amenities && property.amenities.map((a: string) => (
              <div key={a} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <CheckCircle2 size={16} className="text-brand-blue" />
                <span>{a}</span>
              </div>
            ))}
            {(!property.amenities || property.amenities.length === 0) && (
              <p className="text-xs text-gray-400 italic">Удобства не указаны</p>
            )}
          </div>
        </div>

        {/* КАЛЕНДАРЬ (ТОЛЬКО АРЕНДА) */}
        {property.type === 'rent' && (
          <div className="mt-10">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Наличие мест</h3>
            <div className={session ? "" : "pointer-events-none opacity-60 grayscale-[0.5]"}>
              <BookingCalendar 
                calendarConfig={property.calendar_config || {}} 
                paymentPolicy={property.payment_policy}
                onSelectionChange={(dates, total) => {
                  setSelectedDates(dates);
                  setTotalPrice(total);
                }} 
              />
            </div>
            {!session && (
              <div className="mt-4 p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/10 flex items-center gap-3">
                <Info size={18} className="text-brand-blue" />
                <p className="text-[10px] font-bold text-brand-blue">Чтобы выбрать даты и забронировать, пожалуйста, войдите в аккаунт.</p>
              </div>
            )}
          </div>
        )}

        {/* ЛОКАЦИЯ */}
        <div className="mt-10">
           <h3 className="font-bold text-lg text-gray-900 mb-4">Локация</h3>
           <div className="h-48 w-full bg-soft-gray rounded-[32px] relative overflow-hidden flex flex-col items-center justify-center p-6 text-center border border-gray-100">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue mb-3">
                 <MapPin size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-4">{property.location}</p>
              <button 
                onClick={() => router.push(`/map?lat=${property.lat}&lng=${property.lng}`)}
                className="px-6 py-2.5 bg-white text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-xl shadow-soft border border-gray-100"
              >
                Посмотреть на карте
              </button>
           </div>
        </div>

        {/* ОБЪЯВЛЕНИЯ АВТОРА (ТОЛЬКО ВЕРИФИЦИРОВАННЫЕ) */}
        {isVerified && authorListings.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-lg text-gray-900">Еще у автора</h3>
               <Link href={`/users/${property.owner_id}`} className="text-brand-blue text-xs font-bold uppercase">Все</Link>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {authorListings.map(item => <PropertyCard key={item.id} property={item} />)}
            </div>
          </div>
        )}

        {/* ПОХОЖИЕ ОБЪЯВЛЕНИЯ */}
        <div className="mt-16 pb-10">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Похожие предложения</h3>
          <div className="grid grid-cols-1 gap-6">
            {similarListings.map(item => <PropertyCard key={item.id} property={item} />)}
            {similarListings.length === 0 && <p className="text-gray-400 text-xs italic">Похожих объявлений пока нет</p>}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[32px]">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
             <p className="text-[10px] text-gray-400 font-bold uppercase">
               {property.type === 'rent' ? `за ${selectedDates.length || 1} дн.` : 'Итого'}
             </p>
             <p className="text-xl font-black text-gray-900">
               {(totalPrice || property.price).toLocaleString()} сум
             </p>
          </div>
          <button 
            onClick={handleBook}
            disabled={property.type === 'rent' && selectedDates.length === 0}
            className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] ${
              property.type === 'rent' && selectedDates.length === 0 
              ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' 
              : 'bg-brand-blue text-white shadow-brand-blue/30'
            }`}
          >
            {property.type === 'rent' ? 'Забронировать' : 'Купить объект'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Добавим недостающие иконки в импорт
import { UserPlus, UserCheck } from 'lucide-react';
