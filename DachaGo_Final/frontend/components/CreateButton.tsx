'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

export default function CreateButton() {
  useEffect(() => {
    console.log("[DEBUG] CreateButton mounted/rendered");
  }, []);
  
  return (
    <div className="create-button-wrapper relative -mt-14" style={{ position: 'relative' }}>
      <Link 
        href="/create"
        id="stable-create-button"
        className="create-button-link w-16 h-16 rounded-full flex items-center justify-center text-white border-4 border-white z-[110]"
        style={{ 
          backgroundColor: '#2599C8', 
          boxShadow: '0 20px 25px -5px rgb(59 130 246 / 0.5)',
          transition: 'none',
          display: 'flex',
          width: '64px',
          height: '64px'
        }}
      >
        <Plus 
          size={32} 
          strokeWidth={3} 
          color="#FFFFFF"
          className="create-button-icon" 
          style={{ transition: 'none' }}
        />
      </Link>
    </div>
  );
}
