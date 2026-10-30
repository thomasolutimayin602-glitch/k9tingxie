'use client';

import React, { useState, useEffect } from 'react';
import { WordItem } from '@/types';
import { TianzigeBox } from './TianzigeBox';
import { soundManager } from '@/utils/sound';
import confetti from 'canvas-confetti';
import { AlertCircle, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface MistakePracticeModalProps {
  isOpen: boolean;
  mode: 'single_char' | 'whole_word';
  failedChar?: string;
  failedCharPinyin?: string;
  wordItem: WordItem;
  onFinish: () => void;
}

export const MistakePracticeModal: React.FC<MistakePracticeModalProps> = ({
  isOpen,
  mode,
  failedChar = '',
  failedCharPinyin = '',
  wordItem,
  onFinish,
}) => {
  // Practice round: 1, 2, 3
  const [currentRound, setCurrentRound] = useState(1);
  // In whole_word mode, which character of the word is being written in this round (0 to word.chars.length - 1)
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  // Status message / warning
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [isDone, setIsDone] = useState(false);
  // Key to force re-render / reset TianzigeBox when user makes a mistake
  const [practiceKey, setPracticeKey] = useState(0);

  const isWholeWord = mode === 'whole_word';
  const targetChars = isWholeWord ? wordItem.chars : [failedChar];
  const targetPinyins = isWholeWord ? wordItem.pinyinArr : [failedCharPinyin];

  useEffect(() => {
    if (isOpen) {
      setCurrentRound(1);
      setActiveCharIndex(0);
      setErrorMessage(null);
      setRoundMistakes(0);
      setIsDone(false);
      setPracticeKey(prev => prev + 1);
    }
  }, [isOpen, mode, failedChar, wordItem.id]);

  if (!isOpen) return null;

  // Called when a stroke error occurs
  const handleMistake = () => {
    setRoundMistakes(prev => prev + 1);
    setErrorMessage(`第 ${currentRound} 遍书写出现笔顺或字形错误！必须 100% 正确，本遍重写。`);
    // Reset current round after a short hesitation
    setTimeout(() => {
      setActiveCharIndex(0);
      setRoundMistakes(0);
      setPracticeKey(k => k + 1);
    }, 600);
  };

  // Called when one character in current round finishes
  const handleCharComplete = (char: string, mistakes: number) => {
    if (mistakes > 0 || roundMistakes > 0) {
      handleMistake();
      return;
    }

    setErrorMessage(null);

    // If whole word, check if more characters remaining in this round
    if (isWholeWord && activeCharIndex < targetChars.length - 1) {
      setActiveCharIndex(prev => prev + 1);
      return;
    }

    // This round finished with zero mistakes!
    if (currentRound < 3) {
      soundManager.playVictory();
      setCurrentRound(r => r + 1);
      setActiveCharIndex(0);
      setRoundMistakes(0);
      setPracticeKey(k => k + 1);
    } else {
      // Completed all 3 rounds!
      soundManager.playVictory();
      setIsDone(true);
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  };

  const handleManualReset = () => {
    setActiveCharIndex(0);
    setRoundMistakes(0);
    setErrorMessage(null);
    setPracticeKey(k => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-200" />
            <h2 className="text-base sm:text-lg font-bold tracking-wide">
              {isWholeWord ? '整词未掌握 · 强化巩固 (连写3遍)' : `生字【${failedChar}】笔顺字形订正 (连写3遍)`}
            </h2>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono">
            {isWholeWord ? '已收录至错词库' : '已收录至错字库'}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Section 1: Demonstration Guide */}
          <div className="w-full bg-amber-50/70 border border-amber-200 rounded-xl p-3 sm:p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                标准笔顺与范字演示（点击可重播）
              </span>
              <span className="text-xs text-amber-700 font-medium">
                {isWholeWord ? `${wordItem.pinyin} · ${wordItem.grade}` : `${failedCharPinyin} · 出自《${wordItem.word}》`}
              </span>
            </div>

            {/* Demonstration Tianzige Boxes */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap py-1">
              {targetChars.map((char, idx) => (
                <TianzigeBox
                  key={`demo_${char}_${idx}`}
                  character={char}
                  pinyin={targetPinyins[idx]}
                  size={isWholeWord && targetChars.length > 2 ? 88 : 105}
                  mode="animate"
                />
              ))}
            </div>

            {isWholeWord && wordItem.explanation && (
              <p className="text-xs text-slate-600 text-center mt-2 border-t border-amber-200/60 pt-2 line-clamp-2">
                释义：{wordItem.explanation}
              </p>
            )}
          </div>

          {/* Section 2: Requirement Badge & Progress */}
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <div className="text-xs sm:text-sm font-medium text-slate-700">
              规则：<span className="text-rose-600 font-bold">笔顺与字形必须完全一致</span>，错一笔即重写该遍
            </div>
            {/* 3 Steps indicator */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(roundNum => {
                const isRoundPassed = roundNum < currentRound || isDone;
                const isRoundCurrent = roundNum === currentRound && !isDone;
                return (
                  <div
                    key={roundNum}
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                      isRoundPassed
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isRoundCurrent
                        ? 'bg-amber-500 text-white ring-2 ring-amber-300 scale-105'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isRoundPassed ? '✓' : roundNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm px-3 py-2 rounded-lg mb-3 flex items-center justify-between animate-shake">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={handleManualReset}
                className="text-xs font-bold underline ml-2 hover:text-rose-900"
              >
                立即重写
              </button>
            </div>
          )}

          {/* Practice Area */}
          {!isDone ? (
            <div className="flex flex-col items-center my-1 w-full">
              <div className="text-xs text-slate-500 mb-2 font-medium">
                正在进行：<span className="text-amber-700 font-bold">第 {currentRound} / 3 遍</span>
                {isWholeWord && ` · 请书写第 ${activeCharIndex + 1}/${targetChars.length} 个字`}
              </div>

              {/* Interactive Writing Box */}
              <div key={`practice_${practiceKey}_${currentRound}_${activeCharIndex}`} className="flex flex-col items-center">
                <TianzigeBox
                  character={targetChars[activeCharIndex]}
                  pinyin={targetPinyins[activeCharIndex]}
                  word={wordItem.word}
                  size={148}
                  mode="quiz"
                  recognitionEngine="smart"
                  showOutline={false}
                  onMistake={handleMistake}
                  onCharComplete={handleCharComplete}
                  autoStartQuiz={true}
                />
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleManualReset}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  清空重写本遍
                </button>
              </div>
            </div>
          ) : (
            /* Celebration Card */
            <div className="flex flex-col items-center py-6 text-center animate-bounce-subtle">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                恭喜！已连续 3 遍正确默写！
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {isWholeWord
                  ? `成语/词语【${wordItem.word}】已牢固掌握基本笔顺与字形，已收入错词库，后续将再次抽考。`
                  : `生字【${failedChar}】笔顺与字形已完全掌握，已收入错字库。`}
              </p>
              <button
                type="button"
                onClick={onFinish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
              >
                完成订正，继续下一词 →
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>提示：必须连续全对才能通过，字形、笔顺缺一不可</span>
          {isDone && (
            <button
              type="button"
              onClick={onFinish}
              className="text-amber-700 font-semibold hover:underline"
            >
              直接继续
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
