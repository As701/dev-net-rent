'use client';

import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  MoreVertical,
  Users,
  LayoutGrid,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { properties } from '@/lib/mock';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('moderation');
  const [pendingAds, setPendingAds] = useState([
    {
      id: 101,
      title: "Эко-дом в горах Хумсана",
      owner: "Джамшид Б.",
      date: "Сегодня, 14:20",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400",
      price: "1 500 000 сум",
      type: "Аренда"
    },
    {
      id: 102,
      title: "Современный коттедж в Ташкенте",
      owner: "Нигора А.",
      date: "Вчера, 18:45",
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=400",
      price: "3 200 000 000 сум",
      type: "Продажа"
    }
  ]);

  const handleApprove = (id: number) => {
    setPendingAds(prev => prev.filter(ad => ad.id !== id));
    alert('Объявление опубликовано!');
  };

  const handleReject = (id: number) => {
    setPendingAds(prev => prev.filter(ad => ad.id !== id));
    alert('Объявление отклонено.');
  };

  return (
    <div className="min-h-screen bg-soft-gray pb-12">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white px-6 pt-12 pb-8 rounded-b-[40px] shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <button onClick={() => router.push('/profile')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
               <ChevronLeft size={24} />
             </button>
             <div>
               <h1 className="text-xl font-bold">Панель управления</h1>
               <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-widest">
                 <Shield size={10} />
                 <span>Администратор</span>
               </div>
             </div>
          </div>
          <button className="p-3 bg-white/10 rounded-2xl relative">
            <AlertCircle size={20} />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-gray-900 rounded-full"></span>
          </button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('moderation')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'moderation' ? 'bg-white text-gray-900 shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <LayoutGrid size={16} />
            Модерация
            {pendingAds.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-md text-[8px]">
                {pendingAds.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-white text-gray-900 shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <Users size={16} />
            Пользователи
          </button>
        </div>
      </header>

      <main className="px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'moderation' && (
            <motion.div 
              key="moderation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 font-bold">Очередь проверки</h3>
                <div className="flex gap-2">
                  <button className="p-2 bg-white rounded-lg border border-gray-100"><Search size={16} className="text-gray-400" /></button>
                  <button className="p-2 bg-white rounded-lg border border-gray-100"><Filter size={16} className="text-gray-400" /></button>
                </div>
              </div>

              {pendingAds.length > 0 ? (
                <div className="space-y-4">
                  {pendingAds.map((ad) => (
                    <div key={ad.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="relative shrink-0">
                        <img src={ad.image} className="w-20 h-20 rounded-2xl object-cover" alt="Preview" />
                        <div className="absolute top-1 left-1 px-2 py-0.5 bg-gray-900/80 text-white text-[8px] font-bold rounded-md">
                          {ad.type}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{ad.title}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Владелец: <span className="text-gray-600 font-bold">{ad.owner}</span></p>
                        <p className="text-[10px] text-brand-blue font-bold mt-1">{ad.price}</p>
                        <p className="text-[8px] text-gray-300 mt-2">{ad.date}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleApprove(ad.id)}
                          className="p-2 bg-green-50 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(ad.id)}
                          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <XCircle size={18} />
                        </button>
                        <button className="p-2 bg-soft-gray text-gray-400 rounded-xl">
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <h4 className="font-bold text-gray-900">Очередь пуста</h4>
                  <p className="text-xs text-gray-400 mt-1">Все объявления проверены</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                <Users size={40} className="text-brand-blue mx-auto mb-4" />
                <h3 className="font-bold text-gray-900">Управление пользователями</h3>
                <p className="text-xs text-gray-400 mt-2">Здесь вы сможете блокировать нарушителей и управлять ролями пользователей.</p>
                <button className="mt-6 w-full py-4 bg-soft-gray text-gray-600 rounded-2xl font-bold text-xs">
                  Загрузить список пользователей
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
