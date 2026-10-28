'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Sparkles, BookOpen, KeyRound } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('gamer');
  const [password, setPassword] = useState('Diffraction1');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(username, password);
    if (!result.success) {
      setError(result.error || '登录失败，请检查用户名和密码');
    }
  };

  const handleFillDemo = () => {
    setUsername('gamer');
    setPassword('Diffraction1');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-orange-50/40 to-rose-50/50">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-amber-200/80 p-6 sm:p-8 animate-fadeIn">
        {/* Brand / Logo Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-md mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            看拼音写汉字
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            覆盖 1-9 年级 3500 常用生字词 · 智能笔顺与字形检验
          </p>
        </div>

        {/* Notice on closed registration */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 mb-5 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">学员登录提示：</span>
            本系统暂时未开放自主注册功能。请使用指定测试学员账号登录体验所有功能。
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl mb-4 animate-shake">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              学员用户名
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名 (如 gamer)"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              访问密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入访问密码"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm"
          >
            登 录 学 习
          </button>

          {/* Quick autofill helper for testing */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium py-1 px-2.5 rounded-lg hover:bg-amber-100/50 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              自动填入预设账号 (gamer / Diffraction1)
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          全日制义务教育语文课程标准 · 汉字默写评测系统
        </div>
      </div>
    </div>
  );
};
