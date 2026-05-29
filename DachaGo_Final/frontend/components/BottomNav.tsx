'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, MessageCircle, User } from 'lucide-react';
import CreateButton from './CreateButton';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 px-8 py-4 flex items-center justify-between z-[100] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <Link href="/map" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/map') ? 'text-[#2599C8]' : 'text-gray-300 hover:text-[#2599C8]'}`}>
        <MapPin size={24} />
        <span className="text-[10px] font-bold">Карта</span>
      </Link>

      <Link href="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-[#2599C8]' : 'text-gray-300 hover:text-[#2599C8]'}`}>
        <Home size={24} />
        <span className="text-[10px] font-bold">Главная</span>
      </Link>
      
      <CreateButton />

      <Link href="/messages" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/messages') ? 'text-[#2599C8]' : 'text-gray-300 hover:text-[#2599C8]'}`}>
        <MessageCircle size={24} />
        <span className="text-[10px] font-bold">Чаты</span>
      </Link>

      <Link href="/profile" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/profile') ? 'text-[#2599C8]' : 'text-gray-300 hover:text-[#2599C8]'}`}>
        <User size={24} />
        <span className="text-[10px] font-bold">Профиль</span>
      </Link>
    </nav>
  );
}
