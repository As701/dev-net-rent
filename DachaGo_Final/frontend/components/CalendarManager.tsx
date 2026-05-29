'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, DollarSign, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface CalendarDay {
  date: string;
  price: number;
  isAvailable: boolean;
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
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [isSettingUnavailable, setIsSettingUnavailable] = useState(false);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const toggleDateSelection = (dateStr: string) => {
    setSelectedRange(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  const applySettings = () => {
    const updatedValue = { ...value };
    const price = parseInt(tempPrice) || 1000000;

    selectedRange.forEach(date => {
      updatedValue[date] = {
        date,
        price: isSettingUnavailable ? 0 : price,
        isAvailable: !isSettingUnavailable
      };
    });

    onChange(updatedValue);
    setSelectedRange([]);
    setTempPrice('');
  };

  const getDayStatus = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const data = value[dateStr];
    const isSelected = selectedRange.includes(dateStr);

    return { dateStr, data, isSelected };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon size={18} className="text-brand-blue" />
          Управление ценами и доступностью
        </h3>
        
        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
            <span key={d} className="text-[10px] text-gray-400 font-bold uppercase">{d}</span>
          ))}
          
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const { dateStr, data, isSelected } = getDayStatus(day);
            
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDateSelection(dateStr)}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all border
                  ${isSelected ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-transparent'}
                  ${!data ? 'bg-soft-gray' : data.isAvailable ? 'bg-green-50' : 'bg-red-50'}
                `}
              >
                <span className={`text-xs font-bold ${data?.isAvailable === false ? 'text-red-400' : 'text-gray-700'}`}>
                  {day}
                </span>
                {data && data.isAvailable && (
                  <span className="text-[8px] text-green-600 font-medium leading-none mt-0.5">
                    {(data.price / 1000000).toFixed(1)}M
                  </span>
                )}
                {data && !data.isAvailable && (
                  <X size={10} className="text-red-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {selectedRange.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-soft-gray rounded-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600">
                Выбрано дней: {selectedRange.length}
              </span>
              <button 
                type="button"
                onClick={() => setSelectedRange([])}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSettingUnavailable(false)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${!isSettingUnavailable ? 'bg-brand-blue text-white' : 'bg-white text-gray-400'}`}
              >
                Установить цену
              </button>
              <button
                type="button"
                onClick={() => setIsSettingUnavailable(true)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${isSettingUnavailable ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}
              >
                Недоступно
              </button>
            </div>

            {!isSettingUnavailable && (
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  placeholder="Цена за день (сум)"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:border-brand-blue"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                />
              </div>
            )}

            <button
              type="button"
              onClick={applySettings}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg"
            >
              Применить
            </button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-100">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
            <Clock size={12} /> Заезд
          </label>
          <input
            type="time"
            className="w-full bg-transparent font-bold text-gray-900 outline-none"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-3xl border border-gray-100">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
            <Clock size={12} /> Выезд
          </label>
          <input
            type="time"
            className="w-full bg-transparent font-bold text-gray-900 outline-none"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="text-amber-500" />
          Условия оплаты (аванс)
        </h4>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setPaymentPolicy('deposit')}
            className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${paymentPolicy === 'deposit' ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-100'}`}
          >
            <div className={`p-2 rounded-lg ${paymentPolicy === 'deposit' ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-400'}`}>
              <CheckCircle2 size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-gray-900">Аванс 10%</p>
              <p className="text-[10px] text-gray-400 italic">Остальное на месте</p>
            </div>
            {paymentPolicy === 'deposit' && <CheckCircle2 size={20} className="ml-auto text-brand-blue" />}
          </button>

          <button
            type="button"
            onClick={() => setPaymentPolicy('full')}
            className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${paymentPolicy === 'full' ? 'border-brand-blue bg-brand-blue/5' : 'border-gray-100'}`}
          >
            <div className={`p-2 rounded-lg ${paymentPolicy === 'full' ? 'bg-brand-blue text-white' : 'bg-soft-gray text-gray-400'}`}>
              <DollarSign size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-gray-900">Полная 100%</p>
              <p className="text-[10px] text-gray-400 italic">Оплата полностью</p>
            </div>
            {paymentPolicy === 'full' && <CheckCircle2 size={20} className="ml-auto text-brand-blue" />}
          </button>
        </div>
      </div>
    </div>
  );
}
