'use client';

import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  History,
  Camera,
  LayoutGrid,
  CalendarCheck,
  Heart as HeartIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";

const sections = [
  {
    title: "Управление",
    items: [
      { icon: <LayoutGrid size={20} />, label: "Мои объявления", color: "text-brand-blue", href: "/profile/ads" },
      { icon: <CalendarCheck size={20} />, label: "Бронирования", color: "text-green-500", href: "/profile/bookings" },
      { icon: <HeartIcon size={20} />, label: "Избранное", color: "text-red-500", href: "/favorites" },
    ]
  },
  {
    title: "Аккаунт",
    items: [
      { icon: <History size={20} />, label: "История активности", color: "text-blue-500" },
      { icon: <CreditCard size={20} />, label: "Способы оплаты", color: "text-green-500" },
      { icon: <Shield size={20} />, label: "Безопасность", color: "text-purple-500" },
    ]
  },
  {
    title: "Настройки",
    items: [
      { icon: <Globe size={20} />, label: "Язык", value: "Русский", color: "text-orange-500" },
      { icon: <Bell size={20} />, label: "Уведомления", value: "Вкл", color: "text-pink-500" },
    ]
  }
];

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-soft-gray pb-24">
      {/* Profile Header */}
      <header className="bg-white px-6 pt-16 pb-10 rounded-b-[40px] shadow-sm text-center">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-[32px] bg-accent-blue p-1 mb-4 shadow-lg shadow-brand-blue/10">
            <img 
              src={session?.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.name || 'Asilbek'}`} 
              className="w-full h-full rounded-[28px] object-cover" 
              alt="Profile" 
            />
          </div>
          <button className="absolute bottom-6 -right-2 p-2 bg-brand-blue text-white rounded-xl border-4 border-white shadow-md">
            <Camera size={16} />
          </button>
        </div>
        <h2 className="text-2xl font-black text-gray-900">{session?.user?.name || 'Асилбек Р.'}</h2>
        <p className="text-gray-400 text-sm font-medium">{session?.user?.email || 'asilbek.dev@gmail.com'}</p>
        
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/auth" className="px-6 py-2 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-blue/20">
            {session ? 'Изменить профиль' : 'Войти'}
          </Link>
          {session?.user?.email === 'admin@dachago.uz' && (
            <Link href="/admin" className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-lg">
              Админ-панель
            </Link>
          )}
        </div>
      </header>

      {/* Settings Sections */}
      <div className="px-6 mt-8 space-y-8">
        {sections.map((section, sIndex) => (
          <div key={section.title}>
            <h3 className="text-gray-400 text-[10px] uppercase tracking-widest font-black mb-4 px-2">
              {section.title}
            </h3>
            <div className="bg-white rounded-3xl overflow-hidden shadow-soft border border-gray-100">
              {section.items.map((item, iIndex) => (
                <Link
                  key={item.label}
                  href={item.href || "#"}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-soft-gray ${
                    iIndex !== section.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-soft-gray ${item.color}`}>
                      {item.icon}
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-xs text-gray-400 font-bold">{item.value}</span>}
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        {session && (
          <button 
            onClick={() => signOut()}
            className="w-full mt-4 p-5 bg-red-50 rounded-3xl flex items-center justify-between text-red-500 group active:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white shadow-sm">
                <LogOut size={20} />
              </div>
              <span className="font-bold text-sm">Выйти из аккаунта</span>
            </div>
            <ChevronRight size={18} className="text-red-200" />
          </button>
        )}
      </div>
    </div>
  );
}
