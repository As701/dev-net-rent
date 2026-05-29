'use client';

import { ArrowLeft, Send, Camera, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerId = searchParams.get('ownerId');
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = 'admin-id-fixed'; // В реальном приложении session.user.id

  useEffect(() => {
    const msg = searchParams.get('msg');
    if (msg) setInputText(msg);

    if (!session) {
      router.push('/auth');
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5005/api/chat/${userId}/${ownerId}/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Error fetching chat:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Опрос каждые 3 сек
    return () => clearInterval(interval);
  }, [session, ownerId, params.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const newMsg = {
      sender_id: userId,
      receiver_id: ownerId,
      listing_id: params.id,
      text: inputText,
    };

    try {
      const res = await fetch('http://localhost:5005/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      });
      if (res.ok) {
        setInputText('');
        // Добавляем локально для скорости
        setMessages([...messages, { ...newMsg, timestamp: new Date().toISOString() }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-soft-gray pb-24">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-4 rounded-b-[32px] shadow-sm flex items-center gap-4 z-10">
        <button onClick={() => router.back()} className="p-3 bg-soft-gray rounded-2xl text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center font-bold text-brand-blue">
            {ownerId === 'admin-id-fixed' ? 'Я' : 'В'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Владелец дачи</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Онлайн</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
      >
        {messages.map((m, index) => {
          const isMe = m.sender_id === userId;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium ${
                isMe ? 'bg-brand-blue text-white rounded-br-lg shadow-lg shadow-blue-100' : 'bg-white text-gray-700 rounded-bl-lg border border-gray-100'
              }`}>
                {m.text}
                <p className={`text-[8px] mt-2 font-bold uppercase ${isMe ? 'text-blue-200' : 'text-gray-300'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-6 bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {/* Quick Templates */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2">
           {["Здравствуйте! Свободно?", "Можно забронировать?", "Есть скидка?", "Где именно находится?"].map(t => (
             <button 
                key={t}
                onClick={() => setInputText(t)}
                className="px-4 py-2 bg-soft-gray rounded-xl text-[10px] font-black text-gray-500 whitespace-nowrap hover:bg-brand-blue hover:text-white transition-colors"
             >
               {t}
             </button>
           ))}
        </div>
        <div className="flex items-center gap-3 bg-soft-gray p-2 rounded-2xl">
          <button className="p-3 bg-white rounded-xl text-gray-400">
            <Camera size={20} />
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Напишите сообщение..." 
            className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-700 px-2"
          />
          <button 
            onClick={sendMessage}
            className="p-3 bg-brand-blue text-white rounded-xl shadow-lg shadow-blue-200"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
