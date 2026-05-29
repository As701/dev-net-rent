'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Camera, MapPin, Tag, LayoutGrid, 
  Warehouse, Castle, Trees, Info, Users, DoorOpen, 
  Maximize, CheckCircle2, ChevronRight, X, DollarSign,
  CalendarDays, ShieldCheck, Phone, User as UserIcon,
  Dog, PartyPopper, Cigarette, Clock, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    type: 'rent' as AdType,
    title: '',
    description: '',
    category: 'dachas',
    location: '',
    lat: null as number | null,
    lng: null as number | null,
    images: [] as string[],
    rooms: '',
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
  });

  const [isMapOpen, setIsMapOpen] = useState(false);

  // Для продажи убираем шаг с правилами и календарем
  const totalSteps = formData.type === 'rent' ? 7 : 6;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleItem = (list: 'amenities' | 'rules', item: string) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].includes(item)
        ? prev[list].filter(a => a !== item)
        : [...prev[list], item]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price) || 0,
        }),
      });
      if (response.ok) {
        alert('Ваше объявление опубликовано!');
        router.push('/');
      } else {
        alert('Ошибка при публикации');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Сервер недоступен');
    }
  };

  const progressWidth = `${(step / totalSteps) * 100}%`;

  return (
    <div className="min-h-screen bg-soft-gray pb-32">
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={step === 1 ? () => router.back() : prevStep}
            className="p-2 hover:bg-soft-gray rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Новое объявление</h1>  
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Шаг {step} из {totalSteps}</p>
          </div>
          {step > 1 && (
            <button onClick={() => router.push('/')} className="text-gray-400 p-2">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: progressWidth }} className="h-full bg-brand-blue" />
        </div>
      </header>

      <main className="px-6 mt-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Тип объявления</h2>
                <p className="text-gray-400 text-sm">Выберите, как вы хотите сдавать дачу</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => { setFormData({...formData, type: 'rent'}); nextStep(); }} className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-6 ${formData.type === 'rent' ? 'border-brand-blue bg-brand-blue/5' : 'border-white bg-white shadow-sm'}`}>
                  <div className={`p-4 rounded-2xl ${formData.type === 'rent' ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-400'}`}><CalendarDays size={32} /></div>
                  <div className="text-left"><h3 className="font-bold text-gray-900 text-lg">Сдать в аренду</h3><p className="text-xs text-gray-400 mt-1">Посуточно или на длительный срок</p></div>
                  <ChevronRight size={20} className="ml-auto text-gray-300" />
                </button>
                <button onClick={() => { setFormData({...formData, type: 'sale'}); nextStep(); }} className={`p-6 rounded-3xl border-2 transition-all flex items-center gap-6 ${formData.type === 'sale' ? 'border-brand-blue bg-brand-blue/5' : 'border-white bg-white shadow-sm'}`}>
                  <div className={`p-4 rounded-2xl ${formData.type === 'sale' ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-400'}`}><Tag size={32} /></div>
                  <div className="text-left"><h3 className="font-bold text-gray-900 text-lg">Продать дачу</h3><p className="text-xs text-gray-400 mt-1">Полная продажа недвижимости</p></div>
                  <ChevronRight size={20} className="ml-auto text-gray-300" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <section className="space-y-4">
                <label className="block text-sm font-bold text-gray-900">Название и описание</label>
                <input type="text" placeholder="Название объекта" className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100 outline-none focus:border-brand-blue" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <textarea rows={6} placeholder="Подробное описание..." className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100 outline-none focus:border-brand-blue resize-none" value={formData.description} minLength={10} onChange={e => setFormData({...formData, description: e.target.value})} />
              </section>
              <section>
                <label className="block text-sm font-bold text-gray-900 mb-3">Фотографии (вставьте URL для теста)</label>
                <input type="text" placeholder="https://..." className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100" onChange={e => setFormData({...formData, images: [e.target.value]})} />
              </section>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <section>
                <label className="block text-sm font-bold text-gray-900 mb-3">Местоположение</label>
                <div className="relative mb-4">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" size={20} />     
                  <input type="text" placeholder="Введите адрес..." className="w-full bg-white pl-12 pr-5 py-4 rounded-2xl border border-gray-100 outline-none focus:border-brand-blue" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                
                <div 
                  onClick={() => setIsMapOpen(true)}
                  className="relative aspect-video bg-gray-100 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-blue/50 transition-all group"
                >
                  {formData.lat && formData.lng ? (
                    <div className="absolute inset-0 bg-brand-blue/5 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 bg-brand-blue text-white rounded-full flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="font-bold text-gray-900">Координаты выбраны</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}</p>
                      <button className="mt-4 px-4 py-2 bg-white rounded-xl text-xs font-bold text-brand-blue shadow-sm border border-gray-100">Изменить на карте</button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white text-gray-400 rounded-full flex items-center justify-center shadow-sm group-hover:text-brand-blue transition-colors">
                        <MapPin size={24} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-900">Выбрать на карте</p>
                        <p className="text-[10px] text-gray-400 font-medium">Нажмите, чтобы указать точное место</p>
                      </div>
                    </>
                  )}
                </div>
              </section>

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
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Комнаты" className="bg-white px-5 py-4 rounded-2xl border border-gray-100" value={formData.rooms} onChange={e => setFormData({...formData, rooms: e.target.value})} /> 
                <input type="number" placeholder="Вместимость" className="bg-white px-5 py-4 rounded-2xl border border-gray-100" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
              </div>
              <input type="number" placeholder="Площадь м²" className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
              <label className="block text-sm font-bold text-gray-900 mb-2">Удобства</label>
              <div className="grid grid-cols-2 gap-2">
                {amenitiesList.map(a => (
                  <button key={a} onClick={() => toggleItem('amenities', a)} className={`p-3 rounded-xl border text-xs font-bold transition-all ${formData.amenities.includes(a) ? 'bg-brand-blue text-white' : 'bg-white text-gray-400'}`}>{a}</button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {formData.type === 'rent' ? (
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
              ) : (
                <div className="space-y-4">
                  <section>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Общая стоимость</label>
                    <input type="number" placeholder="1 500 000 000" className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </section>
                  <button onClick={() => setFormData({...formData, isNegotiable: !formData.isNegotiable})} className={`w-full p-4 rounded-2xl border flex items-center justify-between ${formData.isNegotiable ? 'border-brand-blue bg-brand-blue/5' : 'bg-white'}`}>
                    <span className="font-bold text-sm">Возможен торг</span>
                    <div className={`w-10 h-5 rounded-full relative ${formData.isNegotiable ? 'bg-brand-blue' : 'bg-gray-200'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.isNegotiable ? 'left-6' : 'left-1'}`} /></div>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 6 && formData.type === 'rent' && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <section>
                <label className="block text-sm font-bold text-gray-900 mb-4">Правила и условия</label>
                <div className="grid grid-cols-1 gap-3">
                  {rulesList.map(rule => (
                    <button key={rule.id} onClick={() => toggleItem('rules', rule.id)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${formData.rules.includes(rule.id) ? 'border-brand-blue bg-brand-blue/5' : 'bg-white border-gray-100'}`}>
                      <div className={`p-2 rounded-lg ${formData.rules.includes(rule.id) ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-400'}`}><rule.icon size={20} /></div>
                      <span className="font-bold text-sm text-gray-700">{rule.name}</span>
                      {formData.rules.includes(rule.id) && <CheckCircle2 size={20} className="ml-auto text-brand-blue" />}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <label className="block text-sm font-bold text-gray-900 mb-2">Цена за день</label>
                <input type="number" placeholder="1 500 000" className="w-full bg-white px-5 py-4 rounded-2xl border border-gray-100" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </section>
            </motion.div>
          )}

          {(step === totalSteps) && (
            <motion.div key="step-final" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4 text-center">
                <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-2 text-white"><CheckCircle2 size={32} /></div>
                <h3 className="text-xl font-bold text-gray-900">Готово к публикации!</h3>
                <p className="text-sm text-gray-400">Проверьте данные перед отправкой</p>
                <div className="bg-soft-gray p-4 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between font-bold text-sm"><span>Объявление:</span> <span className="text-brand-blue">{formData.title || 'Дача'}</span></div>
                  <div className="flex justify-between font-bold text-sm"><span>Тип:</span> <span>{formData.type === 'rent' ? 'Аренда' : 'Продажа'}</span></div>
                  {formData.type === 'rent' && (
                    <>
                      <div className="flex justify-between font-bold text-sm"><span>Аванс:</span> <span>{formData.paymentPolicy === 'deposit' ? '10%' : '100%'}</span></div>
                      <div className="flex justify-between font-bold text-sm"><span>Заезд/Выезд:</span> <span>{formData.checkIn} - {formData.checkOut}</span></div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 z-40">
        <div className="max-w-screen-xl mx-auto flex gap-4">
          <button onClick={step === 1 ? () => router.back() : prevStep} className="px-6 py-4 rounded-2xl bg-soft-gray text-gray-700 font-bold text-sm">
            {step === 1 ? 'Отмена' : 'Назад'}
          </button>
          <button onClick={step === totalSteps ? handleSubmit : nextStep} className="flex-1 py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2">
            {step === totalSteps ? 'Опубликовать' : 'Далее'}
            {step !== totalSteps && <ChevronRight size={18} />}
          </button>
        </div>
      </footer>
    </div>
  );
}
