'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, DollarSign, Clock, AlertCircle, 
  CheckCircle2, X, ChevronLeft, ChevronRight, Lock, Ban, 
  Activity, TrendingUp, Sparkles, Plus, Minus
} from 'lucide-react';

type DayStatus = 'available' | 'busy' | 'blocked' | 'buffer';

interface CalendarDay {
  date: string;
  price: number;
  status: DayStatus;
}

interface CalendarManagerProps {
  value: Record<string, CalendarDay>;
  onChange: (data: Record<string, CalendarDay>) => void;
  checkIn: string;
  setCheckIn: (val: string) => void;
  checkOut: string;
  setCheckOut: (val: string) => void;
  paymentPolicy: 'deposit' | 'full';
  setPaymentPolicy: (val: 'deposit' | 'full') => void;
}

export default function CalendarManager({
  value,
  onChange,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  paymentPolicy,
  setPaymentPolicy
}: CalendarManagerProps) {
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<DayStatus>('available');
  const [weekendMarkup, setWeekendMarkup] = useState(20);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const formatDate = (day: number) => {
    return `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (dateStr: string) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(null);
    } else {
      if (new Date(dateStr) < new Date(rangeStart)) {
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    }
  };

  const selectedDates = useMemo(() => {
    if (!rangeStart) return [];
    if (!rangeEnd) return [rangeStart];
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    const dates = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [rangeStart, rangeEnd]);

  const applySettings = () => {
    const updatedValue = { ...value };
    const basePrice = parseInt(tempPrice) || 1000000;

    selectedDates.forEach(date => {
      let finalPrice = basePrice;
      const d = new Date(date);
      // Weekend markup (Fri, Sat)
      if (targetStatus === 'available' && (d.getDay() === 5 || d.getDay() === 6)) {
        finalPrice = Math.round(basePrice * (1 + weekendMarkup / 100));
      }

      updatedValue[date] = {
        date,
        price: targetStatus === 'available' ? finalPrice : 0,
        status: targetStatus
      };
    });

    onChange(updatedValue);
    setRangeStart(null);
    setRangeEnd(null);
    setTempPrice('');
  };

  const applyWeekendRules = () => {
    const updatedValue = { ...value };
    Object.keys(updatedValue).forEach(date => {
      const d = new Date(date);
      if (updatedValue[date].status === 'available' && (d.getDay() === 5 || d.getDay() === 6)) {
        updatedValue[date].price = Math.round(updatedValue[date].price * (1 + weekendMarkup / 100));
      }
    });
    onChange(updatedValue);
  };

  const getStatusInfo = (status: DayStatus) => {
    switch (status) {
      case 'available': return { color: 'bg-green-50 text-green-600 border-green-100', icon: null, label: 'Доступно' };
      case 'busy': return { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Activity size={10} />, label: 'Занято' };
      case 'blocked': return { color: 'bg-red-50 text-red-600 border-red-100', icon: <Lock size={10} />, label: 'Заблокировано' };
      case 'buffer': return { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Ban size={10} />, label: 'Буфер' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Background Sparkle for "Smart" feel */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Sparkles size={120} className="text-brand-blue" />
        </div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon size={18} className="text-brand-blue" />
              Календарь управления
            </h3>
            <p className="text-[10px] text-gray-400 font-medium">Настройте цены и доступность для гостей</p>
          </div>
          <div className="flex items-center gap-2 bg-soft-gray p-1.5 rounded-2xl">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronLeft size={16} /></button>
            <span className="text-[10px] font-black w-28 text-center uppercase tracking-widest text-gray-700">
              {viewDate.toLocaleString('ru', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 text-center mb-6 relative z-10">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <span key={d} className="text-[10px] text-gray-300 font-black uppercase py-2">{d}</span>
          ))}
          
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(day);
            const data = value[dateStr];
            const isStart = dateStr === rangeStart;
            const isEnd = dateStr === rangeEnd;
            const selected = rangeStart && rangeEnd ? (dateStr >= rangeStart && dateStr <= rangeEnd) : isStart;
            const statusInfo = getStatusInfo(data?.status || 'available');
            const isOld = new Date(dateStr) < new Date(today.setHours(0,0,0,0));
            const isWeekend = new Date(dateStr).getDay() === 5 || new Date(dateStr).getDay() === 6;
            
            return (
              <button
                key={day}
                type="button"
                disabled={isOld}
                onClick={() => handleDateClick(dateStr)}
                className={`
                  relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border
                  ${selected ? 'ring-2 ring-brand-blue ring-offset-2 z-10 scale-105 bg-white border-brand-blue' : 'border-transparent'}
                  ${isOld ? 'opacity-20 grayscale pointer-events-none' : ''}
                  ${!data ? (isWeekend ? 'bg-orange-50/30' : 'bg-soft-gray hover:bg-gray-200') : statusInfo.color}
                  ${isStart || isEnd ? 'font-black' : ''}
                `}
              >
                <span className="text-[10px] font-bold">{day}</span>
                {data?.status === 'available' && data.price > 0 && (
                  <span className={`text-[7px] font-bold mt-0.5 ${isWeekend ? 'text-orange-500' : ''}`}>
                    {(data.price / 1000).toFixed(0)}k
                  </span>
                )}
                {data?.status !== 'available' && data && (
                  <div className="mt-0.5">{statusInfo.icon}</div>
                )}
                {isWeekend && !data && <div className="absolute top-1 right-1 w-1 h-1 bg-orange-400 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-6 border-t border-gray-50 relative z-10">
          {(['available', 'busy', 'blocked', 'buffer'] as DayStatus[]).map(s => {
            const info = getStatusInfo(s);
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${info.color.split(' ')[0]} border ${info.color.split(' ')[2]}`} />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{info.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Выходные</span>
          </div>
        </div>

        <AnimatePresence>
          {rangeStart && (
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="mt-6 p-6 bg-gray-900 rounded-[32px] space-y-5 shadow-2xl relative z-20"
            >
              <div className="flex justify-between items-center text-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-brand-blue rounded-lg text-[8px] font-black uppercase">Выбрано</div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedDates.length} дня(ей)</p>
                  </div>
                  <p className="text-xs font-bold text-gray-200">
                    {rangeStart} {rangeEnd ? `— ${rangeEnd}` : '(выберите конец)'}
                  </p>
                </div>
                <button type="button" onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['available', 'busy', 'blocked', 'buffer'] as DayStatus[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTargetStatus(s)}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${targetStatus === s ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/30' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'}`}
                  >
                    {getStatusInfo(s).label}
                  </button>
                ))}
              </div>

              {targetStatus === 'available' && (
                <div className="space-y-4">
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" />
                    <input
                      type="number"
                      placeholder="Базовая цена за сутки"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white font-bold outline-none focus:border-brand-blue focus:bg-white/10 transition-all"
                      value={tempPrice}
                      onChange={(e) => setTempPrice(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase">Наценка на выходные</p>
                        <p className="text-[10px] text-gray-500">Пятница и суббота</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setWeekendMarkup(m => Math.max(0, m - 5))} className="p-1 text-gray-400 hover:text-white"><Minus size={16} /></button>
                      <span className="text-sm font-black text-orange-500">+{weekendMarkup}%</span>
                      <button onClick={() => setWeekendMarkup(m => Math.min(100, m + 5))} className="p-1 text-gray-400 hover:text-white"><Plus size={16} /></button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={applySettings}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Сохранить настройки
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Rules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <Clock size={20} />
            </div>
            <h4 className="font-black text-[11px] uppercase tracking-wider text-gray-400">Тайминг</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Заезд после</label>
              <input type="time" className="w-full bg-soft-gray px-4 py-3 rounded-xl font-bold text-gray-900 outline-none" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Выезд до</label>
              <input type="time" className="w-full bg-soft-gray px-4 py-3 rounded-xl font-bold text-gray-900 outline-none" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <AlertCircle size={20} />
            </div>
            <h4 className="font-black text-[11px] uppercase tracking-wider text-gray-400">Оплата</h4>
          </div>
          <div className="flex gap-2 p-1 bg-soft-gray rounded-2xl">
            <button
              onClick={() => setPaymentPolicy('deposit')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${paymentPolicy === 'deposit' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400'}`}
            >
              Аванс 10%
            </button>
            <button
              onClick={() => setPaymentPolicy('full')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${paymentPolicy === 'full' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400'}`}
            >
              100% Оплата
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
