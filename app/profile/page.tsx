'use client';

import { 
  User, Settings, Bell, Shield, CreditCard, Globe, HelpCircle, 
  LogOut, ChevronRight, History, Camera, LayoutGrid, CalendarCheck,
  Heart as HeartIcon, CheckCircle2, Star, MessageSquare, BarChart3,
  Wallet, ArrowUpRight, MessageCircle, Activity, EyeOff, MapPin,
  LifeBuoy, Info, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id || 'admin-id-fixed';
      fetch(`http://localhost:5005/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [session]);

  const menuGroups = [
    {
      title: "ОСНОВНОЕ",
      items: [
        { icon: <LayoutGrid size={18} />, label: "Мои объявления", href: "/profile/ads", color: "text-brand-blue" },
        { icon: <CalendarCheck size={18} />, label: "Бронирования", href: "/profile/bookings", color: "text-green-500" },
        { icon: <HeartIcon size={18} />, label: "Избранное", href: "/favorites", color: "text-red-500" },
        { icon: <MessageCircle size={18} />, label: "Чаты", href: "/messages", color: "text-blue-500" },
        { icon: <BarChart3 size={18} />, label: "Статистика", href: "/profile/stats", color: "text-purple-500" },
      ]
    },
    {
      title: "ПЛАТЕЖИ",
      items: [
        { icon: <CreditCard size={18} />, label: "Мои карты", href: "/profile/payments/cards", color: "text-orange-500" },
        { icon: <Wallet size={18} />, label: "Баланс", value: `${(userData?.balance || 0).toLocaleString()} сум`, href: "/profile/payments/balance", color: "text-green-600" },
        { icon: <History size={18} />, label: "История операций", href: "/profile/payments/history", color: "text-gray-500" },
        { icon: <ArrowUpRight size={18} />, label: "Вывод средств", href: "/profile/payments/withdraw", color: "text-blue-600" },
      ]
    },
    {
      title: "АККАУНТ",
      items: [
        { icon: <MessageSquare size={18} />, label: "Отзывы обо мне", href: "/profile/reviews", color: "text-yellow-500" },
        { icon: <Activity size={18} />, label: "История действий", href: "/profile/activity", color: "text-cyan-500" },
      ]
    },
    {
      title: "НАСТРОЙКИ",
      items: [
        { icon: <EyeOff size={18} />, label: "Приватность", href: "/profile/settings/privacy", color: "text-indigo-500" },
        { icon: <Bell size={18} />, label: "Уведомления", href: "/profile/settings/notifications", color: "text-pink-500" },
        { icon: <Globe size={18} />, label: "Язык / регион", value: userData?.language || "Русский", href: "/profile/settings/language", color: "text-orange-400" },
        { icon: <Shield size={18} />, label: "Безопасность", href: "/profile/settings/security", color: "text-emerald-500" },
      ]
    },
    {
      title: "ДОПОЛНИТЕЛЬНО",
      items: [
        { icon: <MapPin size={18} />, label: "Сохранённые локации", href: "/profile/locations", color: "text-red-400" },
        { icon: <LifeBuoy size={18} />, label: "Поддержка", href: "/support", color: "text-blue-400" },
        { icon: <Info size={18} />, label: "О приложении", href: "/about", color: "text-gray-400" },
      ]
    }
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-soft-gray">
      <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-soft-gray pb-32">
      {/* 1. HEADER */}
      <header className="bg-white px-6 pt-16 pb-8 rounded-b-[40px] shadow-sm">
        <div className="flex flex-col items-center">
          {/* Avatar & Basic Info */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-[32px] bg-accent-blue p-1 shadow-lg shadow-brand-blue/10">
              <img 
                src={userData?.avatar || session?.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.name || 'Asilbek'}`} 
                className="w-full h-full rounded-[28px] object-cover" 
                alt="Profile" 
              />
            </div>
            {userData?.verified === 1 && (
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                <CheckCircle2 size={20} className="text-brand-blue fill-brand-blue/10" />
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black text-gray-900">{userData?.name || 'Гость'}</h2>
              {userData?.verified === 1 && (
                <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black uppercase tracking-wider rounded-full">
                  Верифицирован
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs font-bold">{userData?.phone || userData?.email || 'Нет данных'}</p>
            
            {/* Rating */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-black text-yellow-700">{userData?.rating || '4.7'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">• {userData?.reviewsCount || '0'} отзывов</span>
            </div>
          </div>

          {/* Edit Button */}
          <Link 
            href="/profile/edit" 
            className="mt-6 w-full max-w-[200px] py-3 bg-brand-blue text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-brand-blue/20 text-center active:scale-95 transition-transform"
          >
            Редактировать профиль
          </Link>
        </div>

        {/* 2. QUICK STATS */}
        <div className="grid grid-cols-3 gap-4 mt-10 px-4">
          <div className="text-center border-r border-gray-100 last:border-0">
            <p className="text-lg font-black text-gray-900">{userData?.adsCount || '0'}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Объявления</p>
          </div>
          <div className="text-center border-r border-gray-100 last:border-0">
            <p className="text-lg font-black text-gray-900">{userData?.followersCount || '0'}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Подписчики</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-900">{userData?.followingCount || '0'}</p>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Подписки</p>
          </div>
        </div>
      </header>

      {/* 3-7. MENU GROUPS */}
      <div className="px-6 mt-8 space-y-8">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] px-2">
              {group.title}
            </h3>
            <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100">
              {group.items.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between p-4 active:bg-soft-gray transition-colors ${
                    index !== group.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-soft-gray ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-xs font-black text-gray-400">{item.value}</span>}
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* 8. CRITICAL ACTIONS */}
        <div className="pt-4 space-y-4">
          <button 
            onClick={() => confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')}
            className="w-full p-5 bg-white border border-red-50 rounded-[32px] flex items-center justify-between text-red-500 active:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-500">
                <Trash2 size={18} />
              </div>
              <span className="text-sm font-bold">Удалить аккаунт</span>
            </div>
            <ChevronRight size={18} className="text-red-200 group-active:text-red-300" />
          </button>

          <button 
            onClick={() => signOut()}
            className="w-full p-5 bg-gray-900 rounded-[32px] flex items-center justify-between text-white active:bg-black transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/10">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-bold">Выйти из аккаунта</span>
            </div>
            <ChevronRight size={18} className="text-white/20" />
          </button>
        </div>
      </div>
    </div>
  );
}
