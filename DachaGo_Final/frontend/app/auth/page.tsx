'use client';

import { signIn } from "next-auth/react";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Smartphone, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [otpMode, setOtpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [timer, setTimer] = useState(0);
  const router = useRouter();

  // Timer logic for resend OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (mode === 'login') {
        const result = await signIn('credentials', {
          email_or_phone: email, // This can be email or phone
          password,
          redirect: false,
        });

        if (result?.error) {
          if (result.error === "Account not verified") {
            // If we had the userId, we could switch to OTP mode
            setError("Ваш аккаунт не подтвержден. Пожалуйста, подтвердите его.");
          } else {
            setError(result.error || "Неверный логин или пароль");
          }
        } else {
          router.push('/');
          router.refresh();
        }
      } else if (mode === 'register') {
        if (!otpMode) {
          // Send registration request
          const res = await fetch("http://localhost:5000/api/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, name, password }),
          });
          const data = await res.json();
          if (res.ok) {
            setUserId(data.userId);
            setOtpMode(true);
            setTimer(60);
          } else {
            setError(data.error);
          }
        } else {
          // Verify OTP
          const res = await fetch("http://localhost:5000/api/verify-otp", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, otp }),
          });
          const data = await res.json();
          if (res.ok) {
            setMode('login');
            setOtpMode(false);
            setError("Аккаунт подтвержден! Теперь вы можете войти.");
          } else {
            setError(data.error);
          }
        }
      } else if (mode === 'forgot') {
          const res = await fetch("http://localhost:5000/api/forgot-password", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (res.ok) {
            setError("Инструкции по сбросу отправлены на почту.");
            setTimeout(() => setMode('login'), 3000);
          } else {
            setError(data.error);
          }
      }
    } catch (err) {
      setError("Ошибка соединения с сервером.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/resend-otp", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setTimer(60);
        setError("Код отправлен повторно.");
      }
    } catch (err) {
      setError("Не удалось отправить код.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <motion.div 
        layout
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100"
      >
        <div className="flex justify-between items-center mb-8">
            <Link href="/" className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-brand-blue transition-colors">
            <ArrowLeft size={20} />
            </Link>
            {mode !== 'login' && !otpMode && (
                <button onClick={() => setMode('login')} className="text-sm font-bold text-gray-400 hover:text-brand-blue transition-colors">
                    Войти
                </button>
            )}
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-2">
          {otpMode ? 'Подтверждение' : (mode === 'login' ? 'С возвращением!' : mode === 'register' ? 'Создать аккаунт' : 'Сброс пароля')}
        </h1>
        <p className="text-gray-400 text-sm mb-8 font-medium">
          {otpMode ? `Мы отправили 5-значный код на ${email || phone}` : 'Заполните данные для продолжения'}
        </p>

        {error && (
            <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-2xl text-sm font-bold mb-6 ${error.includes('успешно') || error.includes('отправлен') || error.includes('Инструкции') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
            >
                {error}
            </motion.div>
        )}

        <form onSubmit={handleAuth}>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {otpMode ? (
                <motion.div 
                    key="otp"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                        <ShieldCheck size={20} className="text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Введите 5-значный код" 
                            maxLength={5}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="bg-transparent outline-none w-full text-lg tracking-[1em] font-black text-center" 
                            required
                        />
                    </div>
                    <div className="text-center">
                        <button 
                            type="button"
                            onClick={resendOtp}
                            disabled={timer > 0 || loading}
                            className={`text-sm font-bold ${timer > 0 ? 'text-gray-300' : 'text-blue-600'}`}
                        >
                            Отправить код еще раз {timer > 0 && `(${timer}с)`}
                        </button>
                    </div>
                </motion.div>
              ) : (
                <motion.div 
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                >
                    {mode === 'register' && (
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                            <User size={20} className="text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Ваше имя" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-transparent outline-none w-full text-sm font-medium" 
                                required
                            />
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                        <Mail size={20} className="text-gray-400" />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-transparent outline-none w-full text-sm font-medium" 
                            required={mode !== 'forgot' || true}
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                            <Smartphone size={20} className="text-gray-400" />
                            <input 
                                type="tel" 
                                placeholder="Телефон (опционально)" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="bg-transparent outline-none w-full text-sm font-medium" 
                            />
                        </div>
                    )}

                    {mode !== 'forgot' && (
                        <div className="relative flex items-center gap-3 bg-gray-50 px-4 py-4 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
                            <Lock size={20} className="text-gray-400" />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Пароль" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-transparent outline-none w-full text-sm font-medium pr-10" 
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {mode === 'login' && (
              <div className="mt-4 text-right">
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-gray-400 hover:text-blue-600">
                      Забыли пароль?
                  </button>
              </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-blue-600 text-white py-5 rounded-3xl font-bold mt-8 shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? 'Загрузка...' : (otpMode ? 'Подтвердить' : mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : 'Сбросить пароль')}
          </button>
        </form>

        {!otpMode && mode !== 'forgot' && (
            <>
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Или войти через</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => signIn('google', { callbackUrl: '/' })}
                        className="flex items-center justify-center gap-2 p-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="20" alt="" />
                        <span className="text-sm font-bold text-gray-700">Google</span>
                    </button>
                    <button 
                        onClick={() => signIn('apple', { callbackUrl: '/' })}
                        className="flex items-center justify-center gap-2 p-4 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width="18" alt="" />
                        <span className="text-sm font-bold text-gray-700">Apple</span>
                    </button>
                </div>
            </>
        )}

        <p className="text-center mt-8 text-sm text-gray-400">
          {mode === 'login' ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          <button 
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setOtpMode(false); }}
            className="text-blue-600 font-bold ml-1 underline underline-offset-4"
          >
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
