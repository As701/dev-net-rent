'use client';

import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon, 
  MoreVertical,
  Info,
  CalendarDays,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { properties } from '@/lib/mock';

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Здравствуйте! Ваше объявление еще актуально?", sender: 'user', time: '12:30' },
    { id: 2, text: "Добрый день! Да, дача свободна на ближайшие выходные.", sender: 'owner', time: '12:35' },
    { id: 3, text: "Какая окончательная цена за 3 дня?", sender: 'user', time: '12:36' },
  ]);

  const property = properties.find(p => p.id === parseInt(params.id)) || properties[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setMessage('');
    
    // Mock owner response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Я уточню этот момент и напишу вам в течение часа.",
        sender: 'owner',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-4 rounded-b-3xl shadow-sm z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-soft-gray rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={property.owner.avatar} className="w-10 h-10 rounded-xl bg-accent-blue" alt={property.owner.name} />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{property.owner.name}</h2>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">В сети</p>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-soft-gray rounded-full transition-colors">
            <MoreVertical size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Property Context Card */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-soft-gray p-3 rounded-2xl flex items-center gap-3 border border-gray-100"
        >
          <img src={property.image} className="w-12 h-12 rounded-xl object-cover" alt="Property" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 truncate">{property.title}</h4>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <MapPin size={10} />
              <span className="truncate">{property.location}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-brand-blue">{property.price.toLocaleString()} сум</p>
            <p className="text-[10px] text-gray-400">/{property.priceUnit}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </motion.div>
      </header>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar"
      >
        <div className="text-center py-4">
          <span className="px-4 py-1.5 bg-gray-200/50 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">Сегодня</span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-brand-blue text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-tighter text-right ${
                  msg.sender === 'user' ? 'text-white/60' : 'text-gray-300'
                }`}>
                  {msg.time}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Booking Quick Actions (Contextual) */}
      <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 text-[10px] font-bold text-gray-600 shadow-sm whitespace-nowrap">
          <CalendarDays size={14} className="text-brand-blue" />
          Свободные даты?
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 text-[10px] font-bold text-gray-600 shadow-sm whitespace-nowrap">
          <Info size={14} className="text-brand-blue" />
          Как проехать?
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 rounded-full border border-brand-blue/20 text-[10px] font-bold text-brand-blue shadow-sm whitespace-nowrap">
          <ChevronRight size={14} />
          Забронировать
        </button>
      </div>

      {/* Input area */}
      <footer className="bg-white p-6 pb-10 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button className="p-3 bg-soft-gray text-gray-400 rounded-2xl hover:text-brand-blue transition-colors">
            <ImageIcon size={22} />
          </button>
          <div className="flex-1 bg-soft-gray rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:ring-2 ring-brand-blue/20 transition-all">
            <input 
              type="text" 
              placeholder="Напишите сообщение..." 
              className="bg-transparent outline-none w-full text-sm text-gray-700"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`p-3 rounded-2xl transition-all shadow-lg ${
              message.trim() 
                ? 'bg-brand-blue text-white shadow-brand-blue/20' 
                : 'bg-gray-200 text-gray-400 shadow-none'
            }`}
          >
            <Send size={22} />
          </button>
        </div>
      </footer>
    </div>
  );
}
