'use client';

import { 
  ArrowLeft, Heart, Share2, MapPin, Star, Bed, Bath, Maximize, 
  Phone, MessageCircle, ShieldCheck, CheckCircle2, Info, Clock, AlertCircle,
  Lock, ArrowRight, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '@/components/BookingCalendar';

export default function PropertyDetails({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const response = await fetch(`http://localhost:5000/api/listings/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2599C8]" />
    </div>
  );

  if (!property) return <div className="p-10 text-center text-gray-400">Объявление не найдено</div>;

  const depositAmount = Math.round(totalPrice * 0.1);
  const shortDesc = property.description?.slice(0, 100);
  const hasLongDesc = property.description?.length > 100;

  const handleAction = (e?: React.MouseEvent, target: string = '') => {
    if (e) e.stopPropagation();
    if (!session) {
      router.push(`/auth?callbackUrl=/details/${params.id}`);
    } else if (target) {
      router.push(target);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-12 flex items-center justify-between pointer-events-none">
        <Link href="/" className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft pointer-events-auto text-gray-900">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex gap-3 pointer-events-auto">
          <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft text-gray-900"><Share2 size={20} /></button>
          <button 
            onClick={(e) => handleAction(e)}
            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft text-gray-400 hover:text-red-500"
          >
            <Heart size={20} />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-[45vh] w-full overflow-hidden rounded-b-[40px] shadow-lg">
        <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
        <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl text-white text-[10px] font-bold flex items-center gap-2">
           <Star size={12} className="text-yellow-400 fill-yellow-400" />
           {property.rating || '5.0'} • {property.views || 0} просмотров
        </div>
      </div>

      <div className="px-6 mt-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{property.title}</h1>
            <div className="flex items-center gap-1 text-gray-500 mt-2">
              <MapPin size={16} className="text-[#2599C8]" />
              <span className="text-sm">{property.location}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#2599C8]">{property.price?.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium">/{property.priceUnit === 'день' ? 'день' : 'общая'}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-6 py-6 border-y border-gray-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-[#2599C8]"><Bed size={18} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Комнаты</p>
              <p className="font-bold text-sm text-gray-700">{property.rooms || property.beds || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-[#2599C8]"><Users size={18} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Человек</p>
              <p className="font-bold text-sm text-gray-700">{property.capacity || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-[#2599C8]"><Maximize size={18} /></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Площадь</p>
              <p className="font-bold text-sm text-gray-700">{property.area || 0} м²</p>
            </div>
          </div>
        </div>

        {/* Times & Check-in */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 bg-soft-gray rounded-2xl flex items-center gap-3">
            <Clock size={20} className="text-brand-blue" />
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Заезд</p>
              <p className="font-bold text-sm text-gray-700">{property.check_in || '14:00'}</p>
            </div>
          </div>
          <div className="p-4 bg-soft-gray rounded-2xl flex items-center gap-3">
            <Clock size={20} className="text-brand-blue" />
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Выезд</p>
              <p className="font-bold text-sm text-gray-700">{property.check_out || '11:00'}</p>
            </div>
          </div>
        </div>

        {/* Overview & Description */}
        <div className="mt-10">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Описание</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {isDescExpanded ? property.description : shortDesc}
            {hasLongDesc && !isDescExpanded && '...'}
          </p>
          {hasLongDesc && (
            <button 
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="text-[#2599C8] text-xs font-bold mt-2 underline"
            >
              {isDescExpanded ? 'Скрыть' : 'Подробнее'}
            </button>
          )}
        </div>

        {/* Amenities Section - OPEN TO ALL */}
        <div className="mt-10 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Удобства и правила</h3>
          <div className="grid grid-cols-2 gap-4">
            {property.amenities && property.amenities.map((a: string) => (
              <div key={a} className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <CheckCircle2 size={16} className="text-[#2599C8]" />
                <span>{a}</span>
              </div>
            ))}
            {(!property.amenities || property.amenities.length === 0) && (
              <p className="text-xs text-gray-400">Удобства не указаны</p>
            )}
          </div>
        </div>

        {/* Booking Calendar */}
        <div className="mt-10">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Наличие мест</h3>
          <div className="relative">
            <div className={session ? "" : "pointer-events-none opacity-60"}>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/10 backdrop-blur-[1px] rounded-3xl">
                <button 
                  onClick={(e) => handleAction(e)}
                  className="px-6 py-3 bg-[#2599C8] text-white rounded-2xl font-bold text-sm shadow-xl"
                >
                  Войти для бронирования
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Policy Details */}
        <div className="mt-6 p-4 bg-amber-50 rounded-2xl flex gap-3 border border-amber-100">
          <Info size={18} className="text-amber-500 shrink-0" />
          <div className="text-[10px] text-amber-700 leading-relaxed">
            <p className="font-bold mb-1">Условия бронирования:</p>
            {property.payment_policy === 'deposit' ? 
              'Нужен аванс 10%. В случае отмены менее чем за 24 часа аванс не возвращается.' : 
              'Оплата 100% при бронировании.'}
          </div>
        </div>

        {/* Owner Profile */}
        <div className="mt-10 p-5 border border-gray-100 rounded-3xl flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-4">
            <img src={property.owner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${property.owner?.name || 'Owner'}`} className="w-14 h-14 rounded-2xl bg-accent-blue" alt="Owner" />
            <div>
              <h4 className="font-bold text-gray-900">{property.owner?.name || 'Владелец'}</h4>
              <p className="text-xs text-gray-400">Владелец недвижимости</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={(e) => handleAction(e, '/messages')}
              className="p-3 bg-blue-50 text-[#2599C8] rounded-xl hover:bg-[#2599C8] hover:text-white transition-colors"
            >
              <MessageCircle size={20} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedDates.length > 0 && session && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Итого за {selectedDates.length} дн.</p>
                <p className="text-xl font-black text-gray-900">{totalPrice.toLocaleString()} сум</p>
              </div>
              {property.payment_policy === 'deposit' && (
                <div className="text-right">
                  <p className="text-[10px] text-brand-blue font-bold uppercase">Аванс 10%</p>
                  <p className="text-lg font-black text-brand-blue">{depositAmount.toLocaleString()} сум</p>
                </div>
              )}
            </div>
            <button className="w-full bg-brand-blue text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-blue/30 active:scale-[0.98] transition-transform">
              Забронировать
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
