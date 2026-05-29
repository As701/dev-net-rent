'use client';

import { 
  Home as HomeIcon, MapPin, MessageCircle, User 
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isChatDetail = pathname?.startsWith('/messages/') && pathname.split('/').length > 2;
  const hiddenRoutes = ['/auth', '/admin', '/create', '/details'];
  if (hiddenRoutes.some(route => pathname?.startsWith(route)) || isChatDetail) return null;

  const isActive = (path: string) => pathname === path;
  const brandBlue = '#2599C8';

  // Функция для надежного перехода
  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <div style={{ position: 'relative', zIndex: 999999 }}>
      {/* ЦЕНТРАЛЬНАЯ КНОПКА "СОЗДАТЬ" */}
      <div 
        onClick={() => navigateTo('/create')}
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '64px',
          height: '64px',
          backgroundColor: brandBlue,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #FFFFFF',
          boxShadow: '0 10px 25px rgba(37, 153, 200, 0.4)',
          zIndex: 1000001,
          cursor: 'pointer',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>

      {/* ПАНЕЛЬ */}
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F3F4F6',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1000000,
          height: '80px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.05)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
        }}
      >
        <button onClick={() => navigateTo('/')} style={navBtnStyle(isActive('/'))}>
          <HomeIcon size={24} color={isActive('/') ? brandBlue : '#D1D5DB'} />
          <span style={navTextStyle(isActive('/'))}>Главная</span>
        </button>
        
        <button onClick={() => navigateTo('/map')} style={navBtnStyle(isActive('/map'))}>
          <MapPin size={24} color={isActive('/map') ? brandBlue : '#D1D5DB'} />
          <span style={navTextStyle(isActive('/map'))}>Карта</span>
        </button>

        <div style={{ width: '64px' }} />

        <button onClick={() => navigateTo('/messages')} style={navBtnStyle(pathname === '/messages')}>
          <MessageCircle size={24} color={pathname === '/messages' ? brandBlue : '#D1D5DB'} />
          <span style={navTextStyle(pathname === '/messages')}>Чаты</span>
        </button>

        <button onClick={() => navigateTo('/profile')} style={navBtnStyle(isActive('/profile'))}>
          <User size={24} color={isActive('/profile') ? brandBlue : '#D1D5DB'} />
          <span style={navTextStyle(isActive('/profile'))}>Профиль</span>
        </button>
      </nav>
    </div>
  );
}

const navBtnStyle = (active: boolean) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  width: '60px',
  padding: 0,
  outline: 'none',
} as const);

const navTextStyle = (active: boolean) => ({
  fontSize: '10px',
  fontWeight: 'bold',
  color: active ? '#2599C8' : '#D1D5DB',
} as const);
