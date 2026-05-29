'use client';

import { Search, MoreVertical, MessageCircle, ChevronLeft, Home, MapPin, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const chats = [
  {
    id: 1,
    name: "Асилбек Р.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Asilbek",
    lastMessage: "Is the dacha available for this weekend?",
    time: "2м назад",
    unread: true,
  },
  {
    id: 2,
    name: "Maria Petrova",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    lastMessage: "The payment has been received. Thank you!",
    time: "1ч назад",
    unread: false,
  },
  {
    id: 3,
    name: "DachaGo Support",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Support",
    lastMessage: "How can we help you today, Asilbek?",
    time: "5ч назад",
    unread: false,
  },
  {
    id: 4,
    name: "Artem S.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Artem",
    lastMessage: "Could you please send me more photos?",
    time: "Вчера",
    unread: true,
  }
];

export default function MessagesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-soft-gray pb-24">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <button onClick={() => router.push('/')} className="p-2 hover:bg-soft-gray rounded-full transition-colors">
               <ChevronLeft size={24} className="text-gray-900" />
             </button>
             <h1 className="text-2xl font-bold text-gray-900">Сообщения</h1>
          </div>
          <button className="p-2 bg-soft-gray rounded-xl">
            <MoreVertical size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-soft-gray px-4 py-3 rounded-2xl border border-transparent focus-within:border-brand-blue focus-within:bg-white transition-all">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Поиск чатов..." 
            className="bg-transparent outline-none w-full text-sm text-gray-700"
          />
        </div>
      </header>

      {/* Chat List */}
      <div className="mt-6 px-6">
        <div className="bg-white rounded-3xl overflow-hidden shadow-soft border border-gray-100">
          {chats.map((chat, index) => (
            <Link
              key={chat.id}
              href={`/messages/${chat.id}`}
              className={`p-4 flex items-center gap-4 hover:bg-soft-gray transition-colors cursor-pointer block ${
                index !== chats.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="relative">
                <img src={chat.avatar} className="w-14 h-14 rounded-2xl bg-accent-blue" alt={chat.name} />
                {chat.unread && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">{chat.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{chat.time}</span>
                </div>
                <p className={`text-xs line-clamp-1 ${chat.unread ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                  {chat.lastMessage}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty State Mock */}
      {chats.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 text-center px-12">
          <div className="p-6 bg-accent-blue rounded-full text-brand-blue mb-4">
            <MessageCircle size={40} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Нет сообщений</h3>
          <p className="text-sm text-gray-400">Начните диалог с владельцем объекта, чтобы увидеть его здесь.</p>
        </div>
      )}

      </div>
    </div>
  );
}
