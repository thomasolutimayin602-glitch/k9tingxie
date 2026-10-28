'use client';

import React, { useState } from 'react';
import { useLearning } from '@/context/LearningContext';
import { WrongWord, WrongChar, WordItem } from '@/types';
import { MistakePracticeModal } from './MistakePracticeModal';
import { soundManager } from '@/utils/sound';
import {
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Volume2,
  FileDown,
  Printer,
  Sparkles,
  Search,
} from 'lucide-react';

interface MistakeBankViewProps {
  onNavigateToPrint: () => void;
  onNavigateToSummary: () => void;
}

export const MistakeBankView: React.FC<MistakeBankViewProps> = ({
  onNavigateToPrint,
  onNavigateToSummary,
}) => {
  const { userState, allWords, updatePracticeProgress, markRetestSuccess } = useLearning();

  const [activeTab, setActiveTab] = useState<'all' | 'words' | 'chars' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for practicing a selected mistake
  const [practiceTarget, setPracticeTarget] = useState<{
    isOpen: boolean;
    mode: 'single_char' | 'whole_word';
    failedChar?: string;
    failedCharPinyin?: string;
    wordItem?: WordItem;
  }>({
    isOpen: false,
    mode: 'single_char',
  });

  const wrongWordsList = Object.values(userState.wrongWords);
  const wrongCharsList = Object.values(userState.wrongChars);

  // Filter items
  const filteredWords = wrongWordsList.filter(item => {
    if (activeTab === 'chars') return false;
    if (activeTab === 'pending' && item.retestPassed) return false;
    if (searchQuery) {
      return item.word.includes(searchQuery) || item.pinyin.includes(searchQuery);
    }
    return true;
  });

  const filteredChars = wrongCharsList.filter(item => {
    if (activeTab === 'words') return false;
    if (activeTab === 'pending' && item.retestPassed) return false;
    if (searchQuery) {
      return item.char.includes(searchQuery) || item.pinyin.includes(searchQuery) || item.wordSource.includes(searchQuery);
    }
    return true;
  });

  const totalMistakesCount = wrongWordsList.length + wrongCharsList.length;

  const handleStartPracticeChar = (item: WrongChar) => {
    // Find a parent word if available
    const parentWord = allWords.find(w => w.word.includes(item.char)) || {
      id: 'custom',
      word: item.wordSource || item.char,
      pinyin: item.pinyin,
      pinyinArr: [item.pinyin],
      chars: [item.char],
      grade: '强化巩固',
      gradeKey: 'g1-2',
      type: '错字练写',
      explanation: `生字【${item.char}】强化书写`,
      newChars: [item.char],
    };

    setPracticeTarget({
      isOpen: true,
      mode: 'single_char',
      failedChar: item.char,
      failedCharPinyin: item.pinyin,
      wordItem: parentWord as WordItem,
    });
  };

  const handleStartPracticeWord = (item: WrongWord) => {
    const parentWord = allWords.find(w => w.id === item.id) || {
      id: item.id,
      word: item.word,
      pinyin: item.pinyin,
      pinyinArr: item.pinyinArr || item.word.split('').map(() => ''),
      chars: item.word.split(''),
      grade: item.grade,
      gradeKey: 'g1-2',
      type: '错词练写',
      explanation: item.explanation,
      newChars: [],
    };

    setPracticeTarget({
      isOpen: true,
      mode: 'whole_word',
      wordItem: parentWord as WordItem,
    });
  };

  const handleModalFinish = () => {
    if (practiceTarget.mode === 'single_char' && practiceTarget.failedChar) {
      updatePracticeProgress('char', practiceTarget.failedChar, 3);
      markRetestSuccess('char', practiceTarget.failedChar);
    } else if (practiceTarget.mode === 'whole_word' && practiceTarget.wordItem) {
      updatePracticeProgress('word', practiceTarget.wordItem.id, 3);
      markRetestSuccess('word', practiceTarget.wordItem.id);
    }
    setPracticeTarget({ isOpen: false, mode: 'single_char' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              错字·错词笔记本
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            绑定账号：<span className="font-mono font-semibold text-amber-700">{userState.username}</span> · 共记录{' '}
            <strong className="text-rose-600 font-bold">{wrongWordsList.length}</strong> 个错词、{' '}
            <strong className="text-rose-600 font-bold">{wrongCharsList.length}</strong> 个错字
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onNavigateToPrint}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            打印字帖 (PDF)
          </button>
          <button
            type="button"
            onClick={onNavigateToSummary}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            汇总与导出
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部 ({totalMistakesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('words')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'words' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            错词库 ({wrongWordsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chars')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'chars' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            错字库 ({wrongCharsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            待重测
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索汉字、词语或拼音..."
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main List */}
      {totalMistakesCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            错题库空空如也，太厉害了！
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            默写中所有出现笔顺或字形错误的词语、汉字将自动归档在此处供强化巩固。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wrong Words Section */}
          {filteredWords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-5 bg-rose-500 rounded-full" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  错词列表 ({filteredWords.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWords.map(item => (
                  <div
                    key={item.id}
                    className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-sm font-semibold text-slate-700 tracking-wider">
                          {item.pinyin}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                            错 {item.mistakeCount} 次
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              item.retestPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.retestPassed ? '重考已掌握' : '待重考'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl sm:text-2xl font-bold tracking-widest text-slate-900 font-serif">
                          {item.word}
                        </h3>
                        <button
                          type="button"
                          onClick={() => soundManager.speakChinese(item.word)}
                          className="p-1 text-slate-400 hover:text-amber-700 transition-colors"
                          title="朗读发音"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.explanation && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {item.explanation}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400">{item.grade}</span>
                      <button
                        type="button"
                        onClick={() => handleStartPracticeWord(item)}
                        className="flex items-center gap-1 font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        连写3遍巩固
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wrong Characters Section */}
          {filteredChars.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-5 bg-amber-500 rounded-full" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  错字列表 ({filteredChars.length})
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredChars.map(item => (
                  <div
                    key={item.char}
                    className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm hover:border-amber-300 transition-all flex flex-col items-center text-center justify-between"
                  >
                    <span className="font-mono text-xs text-slate-600 mb-0.5">
                      {item.pinyin}
                    </span>
                    <div className="w-14 h-14 rounded-lg bg-amber-50/60 border border-red-300 flex items-center justify-center text-2xl font-bold font-serif text-slate-800 my-1 relative">
                      {item.char}
                      {item.retestPassed && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute -top-1 -right-1 bg-white rounded-full" />
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate w-full mb-2">
                      出处：{item.wordSource}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartPracticeChar(item)}
                      className="w-full text-xs font-medium text-amber-800 bg-amber-100/70 hover:bg-amber-200 py-1 rounded-md transition-colors"
                    >
                      练写3遍
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Modal for practicing */}
      {practiceTarget.isOpen && practiceTarget.wordItem && (
        <MistakePracticeModal
          isOpen={practiceTarget.isOpen}
          mode={practiceTarget.mode}
          failedChar={practiceTarget.failedChar}
          failedCharPinyin={practiceTarget.failedCharPinyin}
          wordItem={practiceTarget.wordItem}
          onFinish={handleModalFinish}
        />
      )}
    </div>
  );
};
