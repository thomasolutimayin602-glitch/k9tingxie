'use client';

import React from 'react';
import { useLearning } from '@/context/LearningContext';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintWorksheetProps {
  onBack: () => void;
}

export const PrintWorksheet: React.FC<PrintWorksheetProps> = ({ onBack }) => {
  const { userState } = useLearning();

  const wrongWords = Object.values(userState.wrongWords);
  const wrongChars = Object.values(userState.wrongChars);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      {/* Top action bar - hidden during print */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回应用
        </button>

        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          田字格字帖排版已针对 A4 纸张进行优化
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 px-5 py-2 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          直接打印 / 另存为 PDF
        </button>
      </div>

      {/* Printable Sheet Container */}
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-md rounded-2xl print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full">
        {/* Worksheet Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-slate-900 font-serif">
            义务教育 1-9 年级常用字词 · 错题强化练字帖
          </h1>
          <div className="flex items-center justify-between text-xs text-slate-600 mt-3 font-serif">
            <span>学员账号：<strong>{userState.username}</strong></span>
            <span>生成日期：{new Date().toLocaleDateString('zh-CN')}</span>
            <span>
              错词：{wrongWords.length} 组 · 错字：{wrongChars.length} 个
            </span>
          </div>
        </div>

        {wrongWords.length === 0 && wrongChars.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            暂无错字错词，字帖内容为空。
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wrong Words */}
            {wrongWords.map(item => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-800">{item.word}（{item.grade}）</span>
                  <span>错误次数：{item.mistakeCount} 次</span>
                </div>

                {/* Tianzige Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.word.split('').map((c, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="font-mono text-xs text-slate-500 h-5">
                        {item.pinyinArr?.[i] || ''}
                      </span>
                      {/* Model Tianzige Box */}
                      <div className="w-14 h-14 border border-red-500 relative flex items-center justify-center bg-white text-2xl font-serif text-slate-800">
                        {/* Red cross dashed line */}
                        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-red-300 pointer-events-none" />
                        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-red-300 pointer-events-none" />
                        <span className="relative z-10">{c}</span>
                      </div>
                    </div>
                  ))}

                  {/* 3 Blank Practice Tianzige for student writing */}
                  <div className="flex items-center gap-1.5 ml-4">
                    <span className="text-[10px] text-slate-400 mr-1">描红与临摹：</span>
                    {[1, 2, 3].map(boxNum => (
                      <div key={boxNum} className="flex flex-col items-center">
                        <span className="h-5" />
                        <div className="w-14 h-14 border border-red-400 relative bg-white">
                          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-red-300" />
                          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-red-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {item.explanation && (
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    释义：{item.explanation}
                  </div>
                )}
              </div>
            ))}

            {/* Wrong Chars */}
            {wrongChars.map(item => (
              <div key={item.char} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-800">单字【{item.char}】（出处：{item.wordSource}）</span>
                  <span>错误次数：{item.mistakeCount} 次</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs text-slate-500 h-5">{item.pinyin}</span>
                    <div className="w-14 h-14 border border-red-500 relative flex items-center justify-center bg-white text-2xl font-serif text-slate-800">
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-red-300 pointer-events-none" />
                      <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-red-300 pointer-events-none" />
                      <span className="relative z-10">{item.char}</span>
                    </div>
                  </div>

                  {/* 5 Blank Practice Boxes */}
                  <div className="flex items-center gap-1.5 ml-4">
                    <span className="text-[10px] text-slate-400 mr-1">连续练写：</span>
                    {[1, 2, 3, 4, 5].map(bNum => (
                      <div key={bNum} className="flex flex-col items-center">
                        <span className="h-5" />
                        <div className="w-14 h-14 border border-red-400 relative bg-white">
                          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-red-300" />
                          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-red-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 font-serif">
          全国义务教育语文课程标准（1-9年级）生字词规范书写字帖 · 倡导笔顺正确、间架结构端正
        </div>
      </div>
    </div>
  );
};
