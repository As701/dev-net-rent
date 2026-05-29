'use client';

import { ArrowLeft, Plus, Search, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import PropertyCard from '@/components/PropertyCard';

export default function MyAdsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id || 'admin-id-fixed';
      fetch(`http://localhost:5005/api/listings?owner_id=${userId}`)
        .then(res => res.json())
        .then(data => {
          setAds(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-soft-gray pb-12">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Мои объявления</h1>
        <button onClick={() => router.push('/create')} className="p-2 text-brand-blue">
          <Plus size={24} />
        </button>
      </div>

      <main className="px-6 mt-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div></div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {ads.map((ad) => (
              <PropertyCard key={ad.id} property={ad} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] border border-gray-100">
            <LayoutGrid size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold text-sm mb-6">У вас пока нет объявлений</p>
            <button 
              onClick={() => router.push('/create')}
              className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-black shadow-lg shadow-brand-blue/20"
            >
              Создать первое
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
