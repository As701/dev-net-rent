'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, Camera, Trash2, CheckCircle2, AlertCircle, 
  ChevronRight, Lock, Laptop, Save
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    bio: '',
    language: 'Русский',
    region: 'Ташкент',
    avatar: ''
  });

  const [initialData, setInitialData] = useState({});
  const [isVerified, setIsVerified] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bioLimit = 200;

  useEffect(() => {
    if (session?.user) {
      const userId = (session.user as any).id || 'admin-id-fixed';
      fetch(`http://localhost:5005/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          const userFields = {
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            bio: data.bio || '',
            language: data.language || 'Русский',
            region: data.region || 'Ташкент',
            avatar: data.avatar || session?.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.name || 'Asilbek'}`
          };
          setFormData(userFields);
          setInitialData(userFields);
          setIsVerified(data.isVerified || false);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [session]);

  useEffect(() => {
    const isChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(isChanged);
  }, [formData, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Имя не может быть пустым';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }
    if (formData.bio.length > bioLimit) {
      newErrors.bio = `Максимум ${bioLimit} символов`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      const userId = (session?.user as any).id || 'admin-id-fixed';
      const response = await fetch(`http://localhost:5005/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setInitialData(formData);
        setHasChanges(false);
        // Optionally update session
        await update({
          ...session,
          user: {
            ...session?.user,
            name: formData.name,
            image: formData.avatar
          }
        });
        alert('Изменения сохранены');
        router.back();
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      if (confirm('У вас есть несохраненные изменения. Выйти без сохранения?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Файл слишком большой! Макс. размер 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ 
      ...prev, 
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'user'}` 
    }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-soft-gray pb-32">
      {/* Header */}
      <header className="bg-white px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 z-10 shadow-sm rounded-b-[30px]">
        <button onClick={handleBack} className="p-3 bg-soft-gray rounded-2xl text-gray-900 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-900">Редактировать профиль</h1>
      </header>

      <div className="px-6 mt-8 space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[40px] bg-white p-1 shadow-xl overflow-hidden border-4 border-white">
              <img 
                src={formData.avatar} 
                className="w-full h-full rounded-[34px] object-cover" 
                alt="Profile" 
              />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-3 bg-brand-blue text-white rounded-2xl border-4 border-white shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-brand-blue text-xs font-black uppercase tracking-wider"
            >
              Изменить фото
            </button>
            <button 
              onClick={removePhoto}
              className="text-red-500 text-xs font-black uppercase tracking-wider flex items-center gap-1"
            >
              <Trash2 size={14} /> Удалить
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-6">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-2">Основные данные</h3>
          
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-4">Имя</label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ваше имя"
                className={`w-full p-5 bg-white rounded-[24px] font-bold text-gray-900 outline-none border-2 transition-all ${errors.name ? 'border-red-500 shadow-sm shadow-red-100' : 'border-transparent focus:border-brand-blue/20'}`}
              />
              {errors.name && <p className="text-red-500 text-[10px] font-bold ml-4">{errors.name}</p>}
            </div>

            {/* Phone (Locked/Verification) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-4">Телефон</label>
              <div className="relative">
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  readOnly
                  className="w-full p-5 bg-gray-100 rounded-[24px] font-bold text-gray-500 outline-none border-2 border-transparent cursor-not-allowed"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-white rounded-lg border border-gray-100 text-[10px] font-black text-gray-400">
                  FIXED
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-4">Email</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@mail.com"
                className={`w-full p-5 bg-white rounded-[24px] font-bold text-gray-900 outline-none border-2 transition-all ${errors.email ? 'border-red-500 shadow-sm shadow-red-100' : 'border-transparent focus:border-brand-blue/20'}`}
              />
              {errors.email && <p className="text-red-500 text-[10px] font-bold ml-4">{errors.email}</p>}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider ml-4">О себе</label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Расскажите о себе..."
                rows={4}
                className={`w-full p-5 bg-white rounded-[24px] font-bold text-gray-900 outline-none border-2 transition-all resize-none ${errors.bio ? 'border-red-500 shadow-sm shadow-red-100' : 'border-transparent focus:border-brand-blue/20'}`}
              />
              <div className="flex justify-between items-center px-4">
                {errors.bio ? <p className="text-red-500 text-[10px] font-bold">{errors.bio}</p> : <div></div>}
                <p className={`text-[10px] font-bold ${formData.bio.length > bioLimit ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.bio.length} / {bioLimit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isVerified ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                {isVerified ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Статус верификации</p>
                <p className="text-sm font-black text-gray-900">{isVerified ? 'Верифицирован' : 'Не верифицирован'}</p>
              </div>
            </div>
            {!isVerified && (
              <button className="px-4 py-2 bg-brand-blue text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-brand-blue/10">
                Пройти
              </button>
            )}
          </div>
          {isVerified && (
            <p className="mt-4 text-[10px] text-gray-400 font-medium">Редактирование некоторых данных недоступно для верифицированных пользователей.</p>
          )}
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-2">Дополнительно</h3>
          <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex flex-col ml-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Язык</span>
                <select 
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="bg-transparent font-bold text-gray-900 outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="Русский">Русский</option>
                  <option value="O'zbek">O'zbek</option>
                  <option value="English">English</option>
                </select>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex flex-col ml-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Регион / Город</span>
                <select 
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="bg-transparent font-bold text-gray-900 outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="Ташкент">Ташкент</option>
                  <option value="Самарканд">Самарканд</option>
                  <option value="Бухара">Бухара</option>
                  <option value="Чимган">Чимган</option>
                </select>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] px-2">Безопасность</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/profile/security/password" className="bg-white p-5 rounded-[28px] shadow-soft border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-transform">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl">
                <Lock size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Пароль</span>
            </Link>
            <Link href="/profile/security/devices" className="bg-white p-5 rounded-[28px] shadow-soft border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-transform">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                <Laptop size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Устройства</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-6 right-6 z-20"
          >
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full p-5 bg-brand-blue text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand-blue/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:shadow-none"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
