'use client';

import { 
  LayoutGrid, Users, MessageSquare, Shield, 
  Trash2, CheckCircle, XCircle, ExternalLink, 
  Search, ArrowLeft, CreditCard, CalendarCheck,
  CheckCircle2, AlertTriangle, Settings, FileText,
  Bell, ListFilter, MoreVertical, Menu, X, BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type AdminView = 'dashboard' | 'users' | 'listings' | 'bookings' | 'payments' | 'verification' | 'complaints' | 'settings' | 'logs';

export default function FullAdminPanel() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = 'http://localhost:5005/api';

  useEffect(() => {
    fetchStats();
    fetchViewData(activeView);
  }, [activeView]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`);
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchViewData = async (view: AdminView) => {
    setLoading(true);
    try {
      let endpoint = '';
      switch(view) {
        case 'users': endpoint = '/admin/users'; break;
        case 'listings': endpoint = '/admin/listings'; break;
        case 'logs': endpoint = '/admin/logs'; break;
        default: endpoint = '/admin/stats'; // Default or empty
      }
      if (endpoint) {
        const res = await fetch(`${API_URL}${endpoint}`);
        if (res.ok) setData(await res.json());
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Вы уверены, что хотите изменить статус на "${newStatus}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/listings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchViewData(activeView);
    } catch (err) { alert('Ошибка обновления'); }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Дашборд', icon: <BarChart3 size={20} /> },
    { id: 'users', label: 'Пользователи', icon: <Users size={20} /> },
    { id: 'listings', label: 'Объявления', icon: <LayoutGrid size={20} /> },
    { id: 'bookings', label: 'Бронирования', icon: <CalendarCheck size={20} /> },
    { id: 'payments', label: 'Платежи', icon: <CreditCard size={20} /> },
    { id: 'verification', label: 'Верификация', icon: <CheckCircle2 size={20} /> },
    { id: 'complaints', label: 'Жалобы', icon: <AlertTriangle size={20} /> },
    { id: 'settings', label: 'Настройки', icon: <Settings size={20} /> },
    { id: 'logs', label: 'Логи', icon: <FileText size={20} /> },
  ];

  const renderView = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-bold animate-pulse">Загрузка данных...</p>
      </div>
    );

    switch(activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Пользователи', value: stats?.users || 0, icon: <Users />, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Активные объявления', value: stats?.active_listings || 0, icon: <LayoutGrid />, color: 'text-green-500', bg: 'bg-green-50' },
                { label: 'Бронирования', value: stats?.bookings || 0, icon: <CalendarCheck />, color: 'text-purple-500', bg: 'bg-purple-50' },
                { label: 'Оборот (мес)', value: `${(stats?.turnover || 0).toLocaleString()} сум`, icon: <CreditCard />, color: 'text-orange-500', bg: 'bg-orange-50' },
              ].map((card) => (
                <div key={card.label} className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                  <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[40px] shadow-soft border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-6">Быстрые действия</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setActiveView('listings')} className="p-4 bg-gray-50 rounded-2xl hover:bg-brand-blue hover:text-white transition-all group">
                        <LayoutGrid className="mb-2 text-brand-blue group-hover:text-white" />
                        <p className="font-bold text-sm">Проверить объявления</p>
                     </button>
                     <button onClick={() => setActiveView('complaints')} className="p-4 bg-gray-50 rounded-2xl hover:bg-red-500 hover:text-white transition-all group">
                        <AlertTriangle className="mb-2 text-red-500 group-hover:text-white" />
                        <p className="font-bold text-sm">Жалобы</p>
                     </button>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[40px] shadow-soft border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-6">Система</h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-soft-gray rounded-2xl">
                        <span className="text-sm font-bold text-gray-600">Комиссия сервиса</span>
                        <span className="px-3 py-1 bg-white rounded-lg font-black text-brand-blue">10%</span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-soft-gray rounded-2xl">
                        <span className="text-sm font-bold text-gray-600">Статус выплат</span>
                        <span className="flex items-center gap-1.5 text-green-500 font-bold text-xs">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Работает
                        </span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Пользователь</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Контакты</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Статус</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-10 h-10 rounded-xl bg-accent-blue" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">ID: {u.id.slice(0,8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-700">{u.email}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{u.phone || 'Нет телефона'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        u.verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {u.verified ? 'Верифицирован' : 'Обычный'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'listings':
        return (
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Объект</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Цена</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Статус</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Модерация</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={l.image} className="w-12 h-12 rounded-xl object-cover" />
                        <div>
                          <p className="text-sm font-bold text-gray-900 line-clamp-1">{l.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{l.type === 'rent' ? 'Аренда' : 'Продажа'} • {l.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-xs text-gray-900">{l.price.toLocaleString()} сум</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        l.status === 'active' ? 'bg-green-50 text-green-600' : l.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {l.status === 'active' ? 'Активно' : l.status === 'pending' ? 'На проверке' : 'Отклонено'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => updateStatus(l.id, 'active')} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={18} /></button>
                        <button onClick={() => updateStatus(l.id, 'rejected')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><XCircle size={18} /></button>
                        <Link href={`/details/${l.id}`} target="_blank" className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><ExternalLink size={18} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            {data.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-2xl shadow-soft border border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-xs">LOG</div>
                   <div>
                      <p className="text-sm font-bold text-gray-900">{log.action}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{log.details}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-gray-900 uppercase">{new Date(log.created_at).toLocaleTimeString()}</p>
                   <p className="text-[8px] text-gray-400 font-bold uppercase">{log.ip}</p>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <div className="p-12 text-center text-gray-400 font-bold bg-white rounded-[40px] border border-dashed border-gray-200">Этот раздел находится в разработке</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex font-sans antialiased text-gray-900">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-gray-900 text-white z-[70] transition-all duration-300 transform ${isSidebarOpen ? '-translate-x-full' : 'translate-x-0'} lg:relative lg:translate-x-0 ${isSidebarOpen ? 'lg:w-72' : 'lg:w-0 lg:overflow-hidden'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10 px-2">
            <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
              <Shield className="fill-brand-blue" /> DachaGo
            </h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400"><X size={20} /></button>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as AdminView)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                  activeView === item.id ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-800">
             <button onClick={() => router.push('/')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white transition-colors font-bold text-sm">
                <ArrowLeft size={18} /> На сайт
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-soft-gray rounded-xl transition-colors">
              <Menu size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-black text-gray-900 capitalize">{activeView}</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Администрирование</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Поиск..." 
                className="pl-10 pr-4 py-2.5 bg-soft-gray border-none rounded-xl text-xs w-64 focus:ring-2 ring-brand-blue transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
               <div className="w-9 h-9 rounded-xl bg-accent-blue flex items-center justify-center text-brand-blue">
                  <Shield size={20} />
               </div>
               <div className="hidden sm:block">
                  <p className="text-xs font-black text-gray-900">Admin</p>
                  <p className="text-[8px] text-green-500 font-bold uppercase tracking-widest">Online</p>
               </div>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
