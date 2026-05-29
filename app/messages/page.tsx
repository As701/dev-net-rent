'use client';

import { ArrowLeft, Search, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function MessagesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/auth');
      return;
    }

    const fetchChats = async () => {
      try {
        const userId = 'admin-id-fixed'; // В реальном приложении session.user.id
        const res = await fetch(`http://localhost:5005/api/messages/${userId}`);
        if (res.ok) {
          const data = await res.json();
          // Группировка сообщений по listing_id для списка диалогов
          const uniqueChats: any = {};
          data.forEach((m: any) => {
            if (!uniqueChats[m.listing_id]) {
              uniqueChats[m.listing_id] = m;
            }
          });
          setChats(Object.values(uniqueChats));
        }
      } catch (err) {
        console.error('Error fetching chats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [session]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24">
      <header className="bg-white px-6 pt-16 pb-6 rounded-b-[40px] shadow-sm flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-2xl font-black text-gray-900">Чаты</h1>
        <button className="p-3 bg-soft-gray rounded-2xl">
          <Search size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="px-6 mt-8 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
          </div>
        ) : chats.length > 0 ? (
          chats.map((chat) => (
            <motion.div
              key={chat.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/messages/${chat.listing_id}?ownerId=${chat.sender_id === 'admin-id-fixed' ? chat.receiver_id : chat.sender_id}`)}
              className="bg-white p-4 rounded-3xl shadow-soft border border-gray-50 flex items-center gap-4 cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={chat.listing_image || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=100'} 
                  className="w-16 h-16 rounded-2xl object-cover" 
                  alt="Listing" 
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-blue rounded-full border-2 border-white flex items-center justify-center text-white">
                  <MessageCircle size={12} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{chat.listing_title}</h4>
                <p className="text-xs text-gray-400 truncate mt-0.5">{chat.text}</p>
                <p className="text-[10px] text-gray-300 font-bold mt-2 uppercase">
                  {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={40} className="text-brand-blue" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Нет сообщений</h3>
            <p className="text-gray-400 font-bold text-sm px-10">
              Здесь будут ваши переписки с владельцами дач.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
