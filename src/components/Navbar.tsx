'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLearning } from '@/context/LearningContext';
import { AppTab } from '@/types';
import { soundManager } from '@/utils/sound';
import { StrokeDiagnosticModal } from './StrokeDiagnosticModal';
import {
  BookOpen,
  Edit3,
  BarChart3,
  Volume2,
  VolumeX,
  LogOut,
  User,
  Layers,
  Activity,
} from 'lucide-react';

interface NavbarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const {
    gradeFilter,
    setGradeFilter,
    wrongWordsCount,
    wrongCharsCount,
    masteredCharactersCount,
    totalCharactersCount,
  } = useLearning();

  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const toggleSound = () => {
    soundManager.enabled = !soundManager.enabled;
    setSoundEnabled(soundManager.enabled);
  };

  const totalMistakes = wrongWordsCount + wrongCharsCount;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand */}
          <div
            onClick={() => onSelectTab('dictation')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-sm font-serif font-black text-base sm:text-lg">
              田
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                看拼音写汉字
                <span className="text-[10px] font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200">
                  1-9年级
                </span>
              </div>
              <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                已掌握 {masteredCharactersCount} / {totalCharactersCount} 字
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('dictation')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'dictation'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>听写默写</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('mistakes')}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'mistakes'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>错题本</span>
              {totalMistakes > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    currentTab === 'mistakes'
                      ? 'bg-white text-rose-600'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {totalMistakes}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('summary')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'summary'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">成果与导出</span>
              <span className="sm:hidden">成果</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Trajectory Diagnostics button */}
            <button
              type="button"
              onClick={() => setIsDiagnosticOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 text-slate-600 hover:text-amber-800 rounded-xl hover:bg-amber-50 border border-slate-200 transition-colors flex items-center gap-1 text-xs"
              title="书写轨迹与失败原因分析"
            >
              <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span className="hidden md:inline font-medium">轨迹诊断</span>
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              title={soundEnabled ? '音效已开' : '音效已关'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* User badge & Logout */}
            <div className="flex items-center gap-1.5 bg-slate-100 py-1 px-2.5 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-semibold text-slate-700 hidden sm:inline">{user}</span>
              <button
                type="button"
                onClick={logout}
                className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                title="退出登录"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-bar: Grade Filter (shown when on dictation tab) */}
        {currentTab === 'dictation' && (
          <div className="flex items-center justify-between py-2 border-t border-amber-100/60 overflow-x-auto no-scrollbar gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
                <Layers className="w-3 h-3 text-amber-600" />
                学段分类：
              </span>

              {[
                { key: 'all', label: '全部 (1-9年级)' },
                { key: 'g1-2', label: '低段 (1-2年级)' },
                { key: 'g3-4', label: '中段 (3-4年级)' },
                { key: 'g5-6', label: '高段 (5-6年级)' },
                { key: 'g7-9', label: '初中 (7-9年级)' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGradeFilter(item.key as typeof gradeFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    gradeFilter === item.key
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <StrokeDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
    </header>
  );
};
