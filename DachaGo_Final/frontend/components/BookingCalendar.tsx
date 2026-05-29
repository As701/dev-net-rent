'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, X, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingCalendarProps {
  calendarConfig: Record<string, { price: number; isAvailable: boolean }>;
  onSelectionChange: (dates: string[], totalPrice: number) => void;
  paymentPolicy: string;
}

export default function BookingCalendar({ calendarConfig, onSelectionChange, paymentPolicy }: BookingCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const toggleDate = (dateStr: string) => {
    const config = calendarConfig[dateStr];
    if (config && !config.isAvailable) return;

    let newSelection = [...selectedDates];
    if (newSelection.includes(dateStr)) {
      newSelection = newSelection.filter(d => d !== dateStr);
    } else {
      newSelection.push(dateStr);
    }
    
    // Sort dates
    newSelection.sort();
    setSelectedDates(newSelection);

    // Calculate total
    const total = newSelection.reduce((sum, date) => {
      return sum + (calendarConfig[date]?.price || 1000000);
    }, 0);

    onSelectionChange(newSelection, total);
  };

  return (
    <div className="bg-soft-gray p-6 rounded-3xl border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon size={18} className="text-brand-blue" />
          Выберите даты
        </h3>
        {selectedDates.length > 0 && (
          <button onClick={() => { setSelectedDates([]); onSelectionChange([], 0); }} className="text-[10px] font-bold text-brand-blue">
            Сбросить
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
          <span key={d} className="text-[8px] text-gray-400 font-bold">{d}</span>
        ))}
        {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={i} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const config = calendarConfig[dateStr];
          const isSelected = selectedDates.includes(dateStr);
          const isUnavailable = config && !config.isAvailable;

          return (
            <button
              key={day}
              onClick={() => toggleDate(dateStr)}
              disabled={isUnavailable}
              className={`
                aspect-square rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-center
                ${isSelected ? 'bg-brand-blue text-white shadow-lg' : isUnavailable ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}
              `}
            >
              <span>{day}</span>
              {!isUnavailable && config?.price && (
                <span className={`text-[6px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                  {(config.price / 1000).toFixed(0)}k
                </span>
              )}
              {isUnavailable && <X size={8} />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-[8px] font-bold text-gray-400">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-white border border-gray-100 rounded-sm"></div> Свободно</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-200 rounded-sm"></div> Занято</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-brand-blue rounded-sm"></div> Выбрано</div>
      </div>
    </div>
  );
}
