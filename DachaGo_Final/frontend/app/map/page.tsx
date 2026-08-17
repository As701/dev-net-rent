'use client';

import { 
  ArrowLeft, 
  SlidersHorizontal, 
  Navigation
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RealMap = dynamic(() => import('@/components/RealMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-soft-gray flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
    </div>
  )
});

export default function MapSearch() {
  return (
    <div className="h-screen w-full relative bg-[#E5E3DF] overflow-hidden">
      {/* Real Map Component */}
      <div className="absolute inset-0 z-0">
        <RealMap />
      </div>

      {/* Top Header & Navigation */}
      <div className="absolute top-12 left-6 right-6 flex items-center justify-between z-10">
        <Link href="/" className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft text-gray-900 border border-white/50">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft font-bold text-xs text-gray-900 border border-white/50">
            <SlidersHorizontal size={16} className="text-brand-blue" />
            Фильтр
          </button>
        </div>
      </div>

      {/* FABs */}
      <div className="absolute right-6 bottom-44 flex flex-col gap-3 z-10">
        <button className="p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-soft text-brand-blue border border-white/50 active:scale-95 transition-all">
          <Navigation size={24} />
        </button>
      </div>
    </div>
  );
}
