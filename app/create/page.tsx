'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Camera, MapPin, Tag, LayoutGrid, 
  Warehouse, Castle, Trees, Info, Users, DoorOpen, 
  Maximize, CheckCircle2, ChevronRight, X, DollarSign,
  CalendarDays, ShieldCheck, Phone, User as UserIcon,
  Dog, PartyPopper, Cigarette, Clock, AlertCircle,
  Bed, Bath, Ruler, Trash2, GripVertical, Save, Rocket
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { categories } from '@/lib/mock';
import CalendarManager from '@/components/CalendarManager';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center rounded-3xl text-gray-400 font-bold italic">Загрузка карты...</div>
});

type AdType = 'rent' | 'sale';

const amenitiesList = [
  "Бассейн", "Сауна", "Бильярд", "Зона барбекю",
  "Wi-Fi", "Кондиционер", "Парковка", "Детская площадка"
];

const rulesList = [
  { id: 'pets', name: 'Можно с животными', icon: Dog },
  { id: 'events', name: 'Разрешены мероприятия', icon: PartyPopper },
  { id: 'smoking', name: 'Можно курить', icon: Cigarette },
  { id: 'no_corporate', name: 'Корпоративы нельзя', icon: X },
  { id: 'no_alcohol', name: 'Алкоголь нельзя', icon: AlertCircle },
  { id: 'no_unmarried', name: 'Без ЗАГСа нельзя', icon: ShieldCheck },
];

export default function CreateAd() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    type: 'rent' as AdType,
    title: '',
    description: '',
    category: 'dachas',
    region: '',
    city: '',
    location: '',
    lat: null as number | null,
    lng: null as number | null,
    images: [] as string[],
    rooms: '',
    bedrooms: '',
    bathrooms: '',
    capacity: '',
    area: '',
    amenities: [] as string[],
    rules: [] as string[],
    price: '',
    weekendPrice: '',
    deposit: '',
    isNegotiable: false,
    calendarData: {} as Record<string, any>,
    checkIn: '14:00',
    checkOut: '11:00',
    paymentPolicy: 'deposit' as 'deposit' | 'full',
    minStay: '1',
    maxStay: '',
    bufferDays: '0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const refs = {
    images: useRef<HTMLDivElement>(null),
    type: useRef<HTMLDivElement>(null),
    title: useRef<HTMLDivElement>(null),
    description: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    characteristics: useRef<HTMLDivElement>(null),
    price: useRef<HTMLDivElement>(null),
  };

  // Auto-save logic
  useEffect(() => {
    const saved = localStorage.getItem('ad_draft');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load draft');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('ad_draft', JSON.stringify(formData));
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.images.length < 3) newErrors.images = "Минимум 3 фотографии";
    if (!formData.title.trim()) newErrors.title = "Укажите название";
    else if (formData.title.length < 5) newErrors.title = "Слишком короткое название";
    
    if (formData.description.length < 50) newErrors.description = `Опишите подробнее (еще ${50 - formData.description.length} симв.)`;
    
    if (!formData.region.trim()) newErrors.region = "Укажите область";
    if (!formData.city.trim()) newErrors.city = "Укажите город";
    if (!formData.lat || !formData.lng) newErrors.location = "Выберите точку на карте";
    
    if (!formData.rooms) newErrors.rooms = "Укажите кол-во комнат";
    if (!formData.price) newErrors.price = "Укажите стоимость";

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstError = errorKeys[0];
      const refKey = (['rooms', 'bedrooms', 'bathrooms', 'capacity', 'area', 'region', 'city'].includes(firstError)) 
        ? (['region', 'city'].includes(firstError) ? 'location' : 'characteristics')
        : firstError as keyof typeof refs;
      
      const targetRef = refs[refKey as keyof typeof refs];
      if (targetRef?.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const toggleItem = (list: 'amenities' | 'rules', item: string) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].includes(item)
        ? prev[list].filter(a => a !== item)
        : [...prev[list], item]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 20)
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (!session?.user) {
      router.push('/auth');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price) || 0,
        owner_id: (session.user as any).id || 'admin-id-fixed',
        images: formData.images.length > 0 ? formData.images : ["https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800"]
      };
      
      const response = await fetch('http://localhost:5005/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        localStorage.removeItem('ad_draft');
        alert('Ваше объявление успешно опубликовано!');
        router.push('/');
      } else {
        alert('Ошибка при публикации на сервере');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Сервер временно недоступен');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isComplete = formData.title.length >= 5 && formData.description.length >= 50 && formData.images.length >= 3 && formData.price && formData.lat && formData.region && formData.city;

  return (
    <div className="min-h-screen bg-soft-gray pb-40">
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-[40px] shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-soft-gray hover:bg-gray-200 rounded-2xl transition-all"
            >
              <ChevronLeft size={24} className="text-gray-900" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">Новое объявление</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Автосохранение {lastSaved}</p>
              </div>
            </div>
          </div>
          <button onClick={() => localStorage.removeItem('ad_draft')} className="p-2.5 text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="px-6 mt-10 space-y-12 max-w-2xl mx-auto">
        {/* Photo Section */}
        <section ref={refs.images} className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <label className={`text-[11px] font-black uppercase tracking-wider ${errors.images ? 'text-red-500' : 'text-gray-400'}`}>
              Фотографии <span className="ml-1 text-gray-200">/ {formData.images.length} из 20</span>
            </label>
            {errors.images && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {errors.images}</span>}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <label className="aspect-square bg-white border-2 border-dashed border-gray-100 rounded-[28px] flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all group">
              <div className="p-3 bg-soft-gray rounded-2xl group-hover:bg-white transition-colors">
                <Camera size={24} />
              </div>
              <span className="text-[9px] font-black mt-3 uppercase tracking-widest">Добавить</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            
            <Reorder.Group axis="x" values={formData.images} onReorder={(newOrder) => setFormData({...formData, images: newOrder})} className="contents">
              <AnimatePresence>
                {formData.images.map((img, index) => (
                  <Reorder.Item 
                    key={img} 
                    value={img} 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square rounded-[28px] overflow-hidden group shadow-sm bg-white"
                  >
                    <img src={img} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-brand-blue text-white text-[8px] font-black rounded-lg shadow-lg uppercase tracking-tighter">Обложка</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={() => removeImage(index)}
                        className="p-2 bg-white text-red-500 rounded-xl shadow-lg hover:scale-110 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="p-2 bg-white text-gray-900 rounded-xl shadow-lg cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        </section>

        {/* Type Section */}
        <section ref={refs.type} className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">Тип объявления</label>
          <div className="grid grid-cols-2 gap-3 bg-white p-2 rounded-[30px] shadow-sm border border-gray-50">
            <button 
              onClick={() => setFormData({...formData, type: 'rent'})}
              className={`py-4 rounded-[22px] font-black text-sm transition-all flex items-center justify-center gap-2 ${formData.type === 'rent' ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/30' : 'text-gray-400 hover:bg-soft-gray'}`}
            >
              <CalendarDays size={18} /> Аренда
            </button>
            <button 
              onClick={() => setFormData({...formData, type: 'sale'})}
              className={`py-4 rounded-[22px] font-black text-sm transition-all flex items-center justify-center gap-2 ${formData.type === 'sale' ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/30' : 'text-gray-400 hover:bg-soft-gray'}`}
            >
              <Tag size={18} /> Продажа
            </button>
          </div>
        </section>

        {/* Name & Description */}
        <div className="space-y-8">
          <section ref={refs.title} className="space-y-3">
            <div className="flex justify-between px-1">
              <label className={`text-[11px] font-black uppercase tracking-wider ${errors.title ? 'text-red-500' : 'text-gray-400'}`}>Название объекта</label>
              {errors.title && <span className="text-[10px] font-bold text-red-500">{errors.title}</span>}
            </div>
            <div className={`group bg-white rounded-[28px] p-1 border transition-all ${errors.title ? 'border-red-100 shadow-sm shadow-red-50/50' : 'border-gray-50 focus-within:border-brand-blue focus-within:shadow-xl focus-within:shadow-brand-blue/5'}`}>
              <input 
                type="text" 
                placeholder="Например: Горная дача в Чимгане с бассейном" 
                className="w-full bg-transparent px-6 py-4 outline-none font-bold text-gray-900 placeholder:text-gray-200"
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </div>
          </section>

          <section ref={refs.description} className="space-y-3">
            <div className="flex justify-between px-1">
              <label className={`text-[11px] font-black uppercase tracking-wider ${errors.description ? 'text-red-500' : 'text-gray-400'}`}>Подробное описание</label>
              <span className={`text-[9px] font-black uppercase ${formData.description.length < 50 ? 'text-amber-500' : 'text-green-500'}`}>
                {formData.description.length} / 50+ симв.
              </span>
            </div>
            <div className={`bg-white rounded-[32px] p-1 border transition-all ${errors.description ? 'border-red-100 shadow-sm shadow-red-50/50' : 'border-gray-50 focus-within:border-brand-blue focus-within:shadow-xl focus-within:shadow-brand-blue/5'}`}>
              <textarea 
                rows={6} 
                placeholder="Опишите количество спален, удобства, наличие охраны, расстояние до города и другие важные детали..." 
                className="w-full bg-transparent px-6 py-5 outline-none font-medium text-gray-700 leading-relaxed placeholder:text-gray-200 resize-none"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </div>
          </section>
        </div>

        {/* Location Section */}
        <section ref={refs.location} className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">Местоположение</label>
          <div className="grid grid-cols-2 gap-4">
            <div className={`bg-white rounded-[24px] p-1 border transition-all ${errors.region ? 'border-red-100' : 'border-gray-50'}`}>
              <input type="text" placeholder="Область" className="w-full bg-transparent px-5 py-3 outline-none font-bold text-gray-900 text-sm" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
            </div>
            <div className={`bg-white rounded-[24px] p-1 border transition-all ${errors.city ? 'border-red-100' : 'border-gray-50'}`}>
              <input type="text" placeholder="Город" className="w-full bg-transparent px-5 py-3 outline-none font-bold text-gray-900 text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>
          </div>
          
          <div 
            onClick={() => setIsMapOpen(true)}
            className={`relative aspect-[16/7] rounded-[35px] overflow-hidden border-2 border-dashed transition-all group cursor-pointer ${errors.location ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white hover:border-brand-blue/50 hover:shadow-lg'}`}
          >
            {formData.lat && formData.lng ? (
              <div className="absolute inset-0 bg-brand-blue/5 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 bg-brand-blue text-white rounded-2xl flex items-center justify-center mb-3 shadow-xl group-hover:scale-110 transition-transform">
                  <MapPin size={28} />
                </div>
                <p className="font-black text-gray-900 text-sm uppercase tracking-tight">Точка на карте зафиксирована</p>
                <div className="mt-4 px-5 py-2 bg-white rounded-xl text-[10px] font-black text-brand-blue shadow-sm border border-gray-100 uppercase tracking-widest">Изменить локацию</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-14 h-14 bg-soft-gray text-gray-400 rounded-2xl flex items-center justify-center transition-colors group-hover:text-brand-blue">
                  <MapPin size={28} />
                </div>
                <div className="text-center">
                  <p className="font-black text-gray-900 text-sm uppercase tracking-tight">Выбрать на карте</p>
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">Нажмите, чтобы указать адрес</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Characteristics */}
        <section ref={refs.characteristics} className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">Характеристики объекта</label>
          <div className="grid grid-cols-2 gap-4">
            <div className={`bg-white rounded-[24px] p-3 border flex items-center gap-3 transition-all ${errors.rooms ? 'border-red-100 shadow-sm' : 'border-gray-50'}`}>
              <div className="w-10 h-10 bg-soft-gray rounded-xl flex items-center justify-center text-gray-400"><LayoutGrid size={18} /></div>
              <input type="number" placeholder="Комнаты" className="bg-transparent w-full outline-none font-bold text-gray-900" value={formData.rooms} onChange={e => setFormData({...formData, rooms: e.target.value})} />
            </div>
            <div className="bg-white rounded-[24px] p-3 border border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-soft-gray rounded-xl flex items-center justify-center text-gray-400"><Bed size={18} /></div>
              <input type="number" placeholder="Спальни" className="bg-transparent w-full outline-none font-bold text-gray-900" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} />
            </div>
            <div className="bg-white rounded-[24px] p-3 border border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-soft-gray rounded-xl flex items-center justify-center text-gray-400"><Bath size={18} /></div>
              <input type="number" placeholder="Санузлы" className="bg-transparent w-full outline-none font-bold text-gray-900" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: e.target.value})} />
            </div>
            <div className="bg-white rounded-[24px] p-3 border border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-soft-gray rounded-xl flex items-center justify-center text-gray-400"><Ruler size={18} /></div>
              <input type="number" placeholder="Площадь м²" className="bg-transparent w-full outline-none font-bold text-gray-900" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 border border-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-soft-gray rounded-2xl flex items-center justify-center text-gray-400"><Users size={22} /></div>
            <div className="flex-1">
              <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-1">Макс. вместимость</label>
              <input type="number" placeholder="Количество гостей" className="bg-transparent w-full outline-none font-bold text-gray-900" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Price Section */}
        <section ref={refs.price} className="space-y-4">
          <label className={`text-[11px] font-black uppercase tracking-wider ${errors.price ? 'text-red-500' : 'text-gray-400'} px-1`}>
            {formData.type === 'rent' ? 'Стоимость аренды (сутки)' : 'Полная стоимость продажи'}
          </label>
          <div className={`bg-white rounded-[32px] p-1 border transition-all ${errors.price ? 'border-red-100 shadow-xl shadow-red-50/50' : 'border-gray-50 focus-within:border-brand-blue focus-within:shadow-2xl focus-within:shadow-brand-blue/5'}`}>
            <div className="flex items-center px-6 py-5">
              <DollarSign size={24} className="text-brand-blue mr-4" />
              <input 
                type="number" 
                placeholder="Сум" 
                className="w-full bg-transparent outline-none font-black text-2xl text-gray-900 placeholder:text-gray-100"
                value={formData.price} 
                onChange={e => setFormData({...formData, price: e.target.value})} 
              />
            </div>
          </div>
          {formData.type === 'sale' && (
            <button 
              onClick={() => setFormData({...formData, isNegotiable: !formData.isNegotiable})} 
              className={`w-full p-5 rounded-[28px] border flex items-center justify-between transition-all ${formData.isNegotiable ? 'bg-brand-blue/5 border-brand-blue shadow-lg shadow-brand-blue/5' : 'bg-white border-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${formData.isNegotiable ? 'bg-brand-blue animate-ping' : 'bg-gray-200'}`} />
                <span className={`font-black text-xs uppercase tracking-widest ${formData.isNegotiable ? 'text-brand-blue' : 'text-gray-400'}`}>Возможен торг</span>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.isNegotiable ? 'bg-brand-blue' : 'bg-gray-100'}`}>
                <motion.div 
                  animate={{ x: formData.isNegotiable ? 26 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" 
                />
              </div>
            </button>
          )}
        </section>

        {/* Smart Calendar Block */}
        <AnimatePresence>
          {formData.type === 'rent' && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-6"
            >
              <div className="flex justify-between items-end px-1 pt-4">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Умный календарь и правила</label>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-blue/10 rounded-lg text-[8px] font-black text-brand-blue uppercase">Smart Mode</div>
              </div>
              
              <CalendarManager
                value={formData.calendarData}
                onChange={(data) => setFormData({...formData, calendarData: data})}
                checkIn={formData.checkIn}
                setCheckIn={(val) => setFormData({...formData, checkIn: val})}
                checkOut={formData.checkOut}
                setCheckOut={(val) => setFormData({...formData, checkOut: val})}
                paymentPolicy={formData.paymentPolicy}
                setPaymentPolicy={(val) => setFormData({...formData, paymentPolicy: val})}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-gray-50">
                  <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2">Мин. ночи</label>
                  <input type="number" className="w-full bg-transparent font-black text-gray-900 outline-none" value={formData.minStay} onChange={e => setFormData({...formData, minStay: e.target.value})} />
                </div>
                <div className="bg-white p-4 rounded-3xl border border-gray-50">
                  <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2">Макс. ночи</label>
                  <input type="number" className="w-full bg-transparent font-black text-gray-900 outline-none" value={formData.maxStay} onChange={e => setFormData({...formData, maxStay: e.target.value})} />
                </div>
                <div className="bg-white p-4 rounded-3xl border border-gray-50">
                  <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest block mb-2">Буфер (дни)</label>
                  <input type="number" className="w-full bg-transparent font-black text-gray-900 outline-none" value={formData.bufferDays} onChange={e => setFormData({...formData, bufferDays: e.target.value})} />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Amenities & Rules */}
        <section className="space-y-6">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">Удобства и правила</label>
          <div className="grid grid-cols-2 gap-3">
            {amenitiesList.map(a => (
              <button 
                key={a} 
                onClick={() => toggleItem('amenities', a)} 
                className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between ${formData.amenities.includes(a) ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-white text-gray-400 border-gray-50'}`}
              >
                {a}
                {formData.amenities.includes(a) && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
          
          <div className="space-y-3">
            {rulesList.map(rule => (
              <button 
                key={rule.id} 
                onClick={() => toggleItem('rules', rule.id)} 
                className={`w-full p-4 rounded-[28px] border flex items-center gap-4 transition-all ${formData.rules.includes(rule.id) ? 'border-brand-blue bg-brand-blue/5' : 'bg-white border-gray-50'}`}
              >
                <div className={`p-3 rounded-2xl ${formData.rules.includes(rule.id) ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-300'}`}>
                  <rule.icon size={20} />
                </div>
                <span className={`font-black text-xs uppercase tracking-widest ${formData.rules.includes(rule.id) ? 'text-gray-900' : 'text-gray-400'}`}>{rule.name}</span>
                {formData.rules.includes(rule.id) && <CheckCircle2 size={20} className="ml-auto text-brand-blue" />}
              </button>
            ))}
          </div>
        </section>

        {/* Improved Preview Section */}
        <section className="bg-gray-900 rounded-[45px] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Rocket size={120} className="text-white" />
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Предпросмотр</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Так ваше объявление увидят миллионы</p>
            </div>
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">DachaGo Draft</div>
          </div>

          <div className="aspect-[16/10] rounded-[32px] overflow-hidden relative shadow-2xl">
            {formData.images[0] ? (
              <img src={formData.images[0]} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-gray-500 gap-2">
                <Camera size={40} className="opacity-20" />
                <span className="italic text-xs font-bold uppercase tracking-widest opacity-20">Нет фотографий</span>
              </div>
            )}
            <div className="absolute top-5 right-5 bg-white px-4 py-2 rounded-2xl text-gray-900 font-black text-sm shadow-xl">
              {formData.price ? Number(formData.price).toLocaleString() : '0'} сум
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <h4 className="text-2xl font-black tracking-tight line-clamp-1">{formData.title || 'Укажите название...'}</h4>
            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <MapPin size={14} className="text-brand-blue" />
              <span>{formData.city || 'Город'}, {formData.region || 'Область'}</span>
            </div>
            <div className="h-[1px] w-full bg-white/5" />
            <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed font-medium">
              {formData.description || 'Напишите захватывающее описание, чтобы привлечь больше клиентов...'}
            </p>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-50 p-6 z-50">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={`w-full py-5 rounded-[30px] font-black text-sm uppercase tracking-[3px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isComplete ? 'bg-brand-blue text-white shadow-brand-blue/30 hover:bg-brand-blue/90' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
          > 
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Опубликовать</span>
                <Rocket size={20} />
              </>
            )}
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {isMapOpen && (
          <MapPicker
            initialLat={formData.lat}
            initialLng={formData.lng}
            onSelect={(lat, lng) => setFormData({...formData, lat, lng})}
            onClose={() => setIsMapOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
