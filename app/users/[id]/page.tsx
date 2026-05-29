'use client';

import { 
  ArrowLeft, 
  CheckCircle2, 
  MessageCircle, 
  UserPlus, 
  UserCheck, 
  Star, 
  Calendar, 
  LayoutGrid, 
  MessageSquare, 
  Info,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PropertyCard from '@/components/PropertyCard';

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'ads' | 'reviews' | 'about'>('ads');
  const [isFollowing, setIsFollowing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5005/api';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Profile
        const userRes = await fetch(`${API_URL}/users/${userId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }

        // 2. Fetch User Listings
        const listingsRes = await fetch(`${API_URL}/listings?owner_id=${userId}`);
        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          setListings(listingsData);
        }

        // 3. Fetch Reviews
        const reviewsRes = await fetch(`${API_URL}/reviews/user/${userId}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }

        // 4. Check Follow Status
        if (session?.user) {
          const currentUserId = (session.user as any).id || 'admin-id-fixed';
          const followRes = await fetch(`${API_URL}/follow/status?follower_id=${currentUserId}&following_id=${userId}`);
          if (followRes.ok) {
            const { isFollowing: status } = await followRes.json();
            setIsFollowing(status);
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, session]);

  const handleFollow = async () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    
    const currentUserId = (session.user as any).id || 'admin-id-fixed';
    try {
      const res = await fetch(`${API_URL}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: currentUserId,
          following_id: userId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.status === 'followed');
        // Update local counter
        setUser((prev: any) => ({
          ...prev,
          followersCount: data.status === 'followed' ? prev.followersCount + 1 : prev.followersCount - 1
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessage = () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    router.push(`/messages/${userId}?ownerId=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Пользователь не найден</h2>
        <button onClick={() => router.back()} className="text-brand-blue font-bold">Вернуться назад</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gray pb-12">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-sm font-bold text-gray-900">Профиль владельца</h1>
        <div className="w-10" />
      </div>

      {/* HEADER SECTION */}
      <header className="bg-white px-6 pt-8 pb-10 rounded-b-[40px] shadow-sm border-b border-gray-100">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-[36px] bg-accent-blue p-1.5 shadow-lg shadow-brand-blue/10">
              <img 
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                className="w-full h-full rounded-[30px] object-cover" 
                alt={user.name} 
              />
            </div>
            {user.verified === 1 && (
              <div className="absolute -bottom-2 -right-2 p-1.5 bg-white rounded-full shadow-md">
                <CheckCircle2 size={24} className="text-green-500 fill-white" />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900">{user.name}</h2>
            {user.verified === 1 && (
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-green-100">
                Верифицирован
              </span>
            )}
          </div>

          <p className="mt-3 text-gray-500 text-sm max-w-[280px] leading-relaxed">
            {user.bio || "Описание профиля отсутствует"}
          </p>

          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <p className="text-xl font-black text-gray-900">{user.followersCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Подписчики</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-gray-900">{user.followingCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Подписки</p>
            </div>
          </div>

          <div className="flex gap-3 w-full mt-8">
            <button 
              onClick={handleFollow}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                isFollowing 
                ? 'bg-soft-gray text-gray-500 border border-gray-200' 
                : 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={18} />
                  Вы подписаны
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Подписаться
                </>
              )}
            </button>
            <button 
              onClick={handleMessage}
              className="px-6 flex items-center justify-center bg-gray-900 text-white rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <MessageCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* TRUST BLOCK */}
      <div className="px-6 -mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">{user.rating || 5.0}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{reviews.length} отзывов</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-gray-100" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={20} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">на платформе</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">с {user.regDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK INFO */}
      <div className="px-6 mt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-50">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Объявления</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-gray-900">{user.adsCount}</span>
              <span className="text-xs text-gray-400 font-bold">всего</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="px-2 py-0.5 bg-soft-gray text-gray-500 text-[9px] font-bold rounded-lg uppercase">аренда</span>
              <span className="px-2 py-0.5 bg-soft-gray text-gray-500 text-[9px] font-bold rounded-lg uppercase">продажа</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-50">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Активные</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-green-500">{listings.length}</span>
              <span className="text-xs text-gray-400 font-bold">сейчас</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-green-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase">в поиске</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT (TABS) */}
      <div className="mt-8">
        <div className="flex px-6 border-b border-gray-100">
          {['ads', 'reviews', 'about'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 pb-4 text-sm font-bold transition-all relative ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {tab === 'ads' ? 'Объявления' : tab === 'reviews' ? 'Отзывы' : 'О себе'}
              {activeTab === tab && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue" />
              )}
            </button>
          ))}
        </div>

        <div className="px-6 pt-6">
          <AnimatePresence mode="wait">
            {activeTab === 'ads' && (
              <motion.div 
                key="ads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 gap-6"
              >
                {listings.length > 0 ? (
                  listings.map((item) => (
                    <PropertyCard key={item.id} property={item} />
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                      <LayoutGrid size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-500">Нет объявлений</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div 
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-5 bg-white rounded-3xl shadow-soft border border-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-[10px] font-bold text-brand-blue uppercase">
                            {rev.user_name?.[0] || 'U'}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{rev.user_name}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < rev.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{rev.text}</p>
                      <p className="text-[8px] text-gray-300 font-bold uppercase mt-4">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-500">Пока нет отзывов</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div 
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="p-6 bg-white rounded-3xl shadow-soft border border-gray-50">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-4">Полное описание</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {user.bio || "Пользователь пока не добавил описание."}
                  </p>
                </div>
                
                <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><MapPin size={18} /></div>
                      <span className="text-xs font-bold text-gray-700">ID пользователя</span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{user.id}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
