'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLearning } from '@/context/LearningContext';
import { TianzigeBox } from './TianzigeBox';
import { MistakePracticeModal } from './MistakePracticeModal';
import { soundManager } from '@/utils/sound';
import confetti from 'canvas-confetti';
import {
  Volume2,
  HelpCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export const DictationView: React.FC = () => {
  const {
    currentWord,
    currentIndex,
    totalInFilter,
    goToNextWord,
    goToPrevWord,
    onWordCompleteSuccess,
    onSingleCharMistake,
    onWholeWordMistake,
    userState,
    masteredCharactersCount,
    totalCharactersCount,
  } = useLearning();

  // Track status of characters in current word
  // array of { completed: boolean, mistakes: number }
  const [charStatuses, setCharStatuses] = useState<Array<{ completed: boolean; mistakes: number }>>([]);
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [keyReset, setKeyReset] = useState(0);

  // Mistake modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'single_char' | 'whole_word';
    failedChar?: string;
    failedCharPinyin?: string;
    pendingQueue?: Array<{ char: string; pinyin: string }>;
  }>({
    isOpen: false,
    mode: 'single_char',
  });

  // Calculate box size responsively based on screen width
  const [boxSize, setBoxSize] = useState(130);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const charCount = currentWord?.chars.length || 4;
      if (width < 420) {
        // small phone
        setBoxSize(Math.min(82, Math.floor((width - 48) / charCount)));
      } else if (width < 640) {
        // normal phone
        setBoxSize(Math.min(96, Math.floor((width - 64) / charCount)));
      } else if (width < 1024) {
        // tablet
        setBoxSize(130);
      } else {
        // desktop / iPad Pro
        setBoxSize(148);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentWord]);

  // Reset character tracking when currentWord changes
  useEffect(() => {
    if (currentWord) {
      setCharStatuses(currentWord.chars.map(() => ({ completed: false, mistakes: 0 })));
      setActiveCharIndex(0);
      setShowExplanation(false);
      setKeyReset(k => k + 1);
    }
  }, [currentWord]);

  // Handle stroke mistake for a specific character
  const handleCharMistake = useCallback(() => {
    setCharStatuses(prev => {
      const next = [...prev];
      if (next[activeCharIndex]) {
        next[activeCharIndex] = {
          ...next[activeCharIndex],
          mistakes: next[activeCharIndex].mistakes + 1,
        };
      }
      return next;
    });
  }, [activeCharIndex]);

  // Check word results
  const checkAndFinalizeWord = useCallback((lastCharMistakes?: number) => {
    if (!currentWord) return;

    // Gather latest statuses
    const updatedStatuses = charStatuses.map((st, idx) => {
      if (idx === activeCharIndex && lastCharMistakes !== undefined) {
        return { completed: true, mistakes: lastCharMistakes };
      }
      return st;
    });

    const failedIndexes: number[] = [];
    updatedStatuses.forEach((st, idx) => {
      if (!st.completed || st.mistakes > 0) {
        failedIndexes.push(idx);
      }
    });

    if (failedIndexes.length === 0) {
      // 100% Passed with zero mistakes!
      soundManager.playVictory();
      onWordCompleteSuccess(currentWord);
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Automatically go to next word after celebration
      setTimeout(() => {
        goToNextWord();
      }, 1200);
    } else if (failedIndexes.length === currentWord.chars.length) {
      // All characters failed -> Whole word mistake!
      onWholeWordMistake(currentWord);
      setModalState({
        isOpen: true,
        mode: 'whole_word',
      });
    } else {
      // Some failed, but some passed!
      // Add each failed character to wrongChars and queue practice
      const failedQueue: Array<{ char: string; pinyin: string }> = [];
      failedIndexes.forEach(idx => {
        const char = currentWord.chars[idx];
        const pinyin = currentWord.pinyinArr[idx] || '';
        onSingleCharMistake(char, pinyin, currentWord);
        failedQueue.push({ char, pinyin });
      });

      if (failedQueue.length > 0) {
        const first = failedQueue[0];
        setModalState({
          isOpen: true,
          mode: 'single_char',
          failedChar: first.char,
          failedCharPinyin: first.pinyin,
          pendingQueue: failedQueue.slice(1),
        });
      }
    }
  }, [currentWord, charStatuses, activeCharIndex, onWordCompleteSuccess, onWholeWordMistake, onSingleCharMistake, goToNextWord]);

  // Handle character completion
  const handleCharComplete = useCallback((_char: string, totalMistakes: number) => {
    if (!currentWord) return;

    setCharStatuses(prev => {
      const next = [...prev];
      if (next[activeCharIndex]) {
        next[activeCharIndex] = {
          completed: true,
          mistakes: totalMistakes,
        };
      }
      return next;
    });

    // If there is a next character, advance active index
    if (activeCharIndex < currentWord.chars.length - 1) {
      setActiveCharIndex(prev => prev + 1);
    } else {
      // Last character finished! Check entire word!
      setTimeout(() => {
        checkAndFinalizeWord(totalMistakes);
      }, 350);
    }
  }, [currentWord, activeCharIndex, checkAndFinalizeWord]);

  // User clicked "不会写 / 认输整词"
  const handleGiveUpWholeWord = () => {
    if (!currentWord) return;
    onWholeWordMistake(currentWord);
    setModalState({
      isOpen: true,
      mode: 'whole_word',
    });
  };

  // When practice modal finishes a character or whole word
  const handleModalFinish = () => {
    if (modalState.pendingQueue && modalState.pendingQueue.length > 0) {
      // More failed characters to practice
      const nextItem = modalState.pendingQueue[0];
      setModalState({
        isOpen: true,
        mode: 'single_char',
        failedChar: nextItem.char,
        failedCharPinyin: nextItem.pinyin,
        pendingQueue: modalState.pendingQueue.slice(1),
      });
    } else {
      // All done! Close modal and advance to next word
      setModalState({ isOpen: false, mode: 'single_char' });
      goToNextWord();
    }
  };

  const handlePronounce = () => {
    if (currentWord) {
      soundManager.speakChinese(currentWord.word);
    }
  };

  const handleResetCurrentWord = () => {
    if (currentWord) {
      setCharStatuses(currentWord.chars.map(() => ({ completed: false, mistakes: 0 })));
      setActiveCharIndex(0);
      setKeyReset(k => k + 1);
    }
  };

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <p className="text-base">暂无此年级分类下的词语。</p>
      </div>
    );
  }

  const isCurrentWordCompleted = userState.completedWordIds.includes(currentWord.id);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-3 sm:px-6 py-4 animate-fadeIn">
      {/* Top Info Card */}
      <div className="w-full bg-white/90 backdrop-blur-sm border border-amber-200/80 rounded-2xl shadow-sm p-4 sm:p-5 mb-5 transition-all">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 border border-amber-300/50">
              {currentWord.grade}
            </span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
              {currentWord.type}
            </span>
            {isCurrentWordCompleted && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                已掌握
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              第 <strong className="text-amber-700 font-bold">{currentIndex + 1}</strong> / {totalInFilter} 词
            </span>
          </div>
        </div>

        {/* Pinyin Prompt Area */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-4xl font-bold font-mono tracking-widest text-slate-800 select-all">
              {currentWord.pinyin}
            </h1>
            <button
              type="button"
              onClick={handlePronounce}
              className="p-2 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-full transition-all active:scale-95 shadow-sm"
              title="发音朗读"
            >
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>看拼音在下方田字格默写汉字（笔顺与字形须完全一致）</span>
          </div>

          {/* Explanation hint toggle */}
          <div className="mt-2.5 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowExplanation(s => !s)}
              className="text-xs text-slate-500 hover:text-amber-700 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-amber-50/60 transition-colors"
            >
              {showExplanation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showExplanation ? '收起释义提示' : '词义释义提示'}
            </button>
            {showExplanation && (
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg text-center mt-1 px-3 py-1.5 bg-amber-50/50 rounded-lg border border-amber-100">
                {currentWord.explanation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Tianzige Writing Grid */}
      <div className="w-full flex flex-col items-center justify-center py-3 sm:py-6">
        <div
          key={`word_grid_${currentWord.id}_${keyReset}`}
          className="flex items-center justify-center gap-2 sm:gap-4 flex-nowrap"
        >
          {currentWord.chars.map((char, idx) => {
            const st = charStatuses[idx] || { completed: false, mistakes: 0 };
            const isActive = idx === activeCharIndex;

            return (
              <div
                key={`${char}_${idx}`}
                onClick={() => setActiveCharIndex(idx)}
                className="cursor-pointer transition-transform"
              >
                <TianzigeBox
                  character={char}
                  pinyin={currentWord.pinyinArr[idx]}
                  size={boxSize}
                  mode="quiz"
                  isActive={isActive}
                  isCompleted={st.completed}
                  hasMistake={st.mistakes > 0}
                  showOutline={false}
                  onMistake={() => handleCharMistake()}
                  onCharComplete={(c, mist) => handleCharComplete(c, mist)}
                  autoStartQuiz={true}
                />
              </div>
            );
          })}
        </div>

        {/* Writing Tips */}
        <div className="text-xs text-slate-400 mt-3 text-center">
          点按单个田字格可切换当前书写字 · 支持手指、触控笔或鼠标顺滑书写
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="w-full max-w-xl flex items-center justify-between gap-2 mt-4 px-2">
        <button
          type="button"
          onClick={goToPrevWord}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          上一个
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCurrentWord}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            title="清空当前词的书写重试"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            重写
          </button>

          <button
            type="button"
            onClick={handleGiveUpWholeWord}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shadow-sm"
            title="不会写，显示完整笔顺示范并加入错词库"
          >
            <HelpCircle className="w-4 h-4" />
            不会写
          </button>
        </div>

        <button
          type="button"
          onClick={goToNextWord}
          disabled={currentIndex >= totalInFilter - 1}
          className="flex items-center gap-1 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 transition-colors shadow-sm"
        >
          下一个
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Persistent Bottom Character Coverage Progress */}
      <div className="w-full max-w-xl mt-6 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>1-9年级生字总覆盖：</span>
          <strong className="text-amber-700 font-bold text-sm">
            {masteredCharactersCount}
          </strong>
          <span className="text-slate-400">/ {totalCharactersCount} 字</span>
        </div>
        <div className="w-28 sm:w-44 bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-amber-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (masteredCharactersCount / (totalCharactersCount || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Mistake Practice Modal (3 consecutive times required) */}
      <MistakePracticeModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        failedChar={modalState.failedChar}
        failedCharPinyin={modalState.failedCharPinyin}
        wordItem={currentWord}
        onFinish={handleModalFinish}
      />
    </div>
  );
};
