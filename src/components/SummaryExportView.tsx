'use client';

import React, { useState } from 'react';
import { useLearning } from '@/context/LearningContext';
import { generateMistakesCSV } from '@/utils/storage';
import {
  Award,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Sparkles,
  Download,
} from 'lucide-react';

interface SummaryExportViewProps {
  onNavigateToPrint: () => void;
}

export const SummaryExportView: React.FC<SummaryExportViewProps> = ({ onNavigateToPrint }) => {
  const {
    userState,
    allWords,
    totalCharactersCount,
    masteredCharactersCount,
    wrongWordsCount,
    wrongCharsCount,
    clearUserData,
  } = useLearning();

  const [copied, setCopied] = useState(false);

  const wrongWordsList = Object.values(userState.wrongWords);
  const wrongCharsList = Object.values(userState.wrongChars);

  // Grade breakdown counts
  const gradeStats = {
    '1-2年级': { total: 48, done: 0 },
    '3-4年级': { total: 179, done: 0 },
    '5-6年级': { total: 518, done: 0 },
    '7-9年级': { total: 865, done: 0 },
  };

  allWords.forEach(w => {
    if (userState.completedWordIds.includes(w.id)) {
      if (w.gradeKey === 'g1-2') gradeStats['1-2年级'].done++;
      else if (w.gradeKey === 'g3-4') gradeStats['3-4年级'].done++;
      else if (w.gradeKey === 'g5-6') gradeStats['5-6年级'].done++;
      else if (w.gradeKey === 'g7-9') gradeStats['7-9年级'].done++;
    }
  });

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = generateMistakesCSV(userState);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamer_语文1-9年级错字错词本_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(userState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamer_学习进度备份_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Summary text
  const handleCopyText = () => {
    let text = `【1-9年级生字词听写默写成绩单与错题本】\n`;
    text += `用户：${userState.username}\n`;
    text += `掌握生字：${masteredCharactersCount} / ${totalCharactersCount} 字\n`;
    text += `完成词语：${userState.completedWordIds.length} / ${allWords.length} 词\n`;
    text += `错词数量：${wrongWordsList.length} 个\n`;
    text += `错字数量：${wrongCharsList.length} 个\n\n`;

    if (wrongWordsList.length > 0) {
      text += `--- 错词列表 ---\n`;
      wrongWordsList.forEach((item, i) => {
        text += `${i + 1}. ${item.word} (${item.pinyin}) - 错${item.mistakeCount}次\n`;
      });
      text += `\n`;
    }

    if (wrongCharsList.length > 0) {
      text += `--- 错字列表 ---\n`;
      wrongCharsList.forEach((item, i) => {
        text += `${i + 1}. ${item.char} (${item.pinyin}) 出处：${item.wordSource}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetConfirm = () => {
    if (window.confirm('确定要清空全部默写进度和错题记录并重新开始吗？')) {
      clearUserData();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-7 h-7 text-amber-200" />
            <span className="text-xs uppercase tracking-widest font-semibold text-amber-200">
              全量 1-9 年级生字词默写成果
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            默写学习报告与错题汇总
          </h1>
          <p className="text-sm text-amber-100 max-w-xl">
            绑定账号：<strong className="underline underline-offset-4">{userState.username}</strong>。
            系统通过最小汉字重复算法，已为您规划覆盖全部 3,502 个义务教育常用规范汉字。
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <div className="text-xs text-amber-200">生字覆盖</div>
              <div className="text-xl sm:text-2xl font-black mt-0.5">
                {masteredCharactersCount} <span className="text-xs font-normal text-amber-200">/ {totalCharactersCount}</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <div className="text-xs text-amber-200">词语默写完成</div>
              <div className="text-xl sm:text-2xl font-black mt-0.5">
                {userState.completedWordIds.length} <span className="text-xs font-normal text-amber-200">/ {allWords.length}</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <div className="text-xs text-amber-200">累计错词</div>
              <div className="text-xl sm:text-2xl font-black mt-0.5 text-rose-200">
                {wrongWordsCount} <span className="text-xs font-normal text-amber-200">个</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
              <div className="text-xs text-amber-200">累计错字</div>
              <div className="text-xl sm:text-2xl font-black mt-0.5 text-amber-200">
                {wrongCharsCount} <span className="text-xs font-normal text-amber-200">个</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Progress Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          各学段生字词完成进度
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(gradeStats).map(([gradeName, st]) => {
            const percent = Math.round((st.done / (st.total || 1)) * 100);
            return (
              <div key={gradeName} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{gradeName}</span>
                  <span className="font-mono text-amber-700">{st.done} / {st.total} ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Action Card */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              错题本一键导出与打印
            </h2>
            <p className="text-xs text-amber-800/80 mt-0.5">
              提供田字格字帖排版打印、CSV 电子表格、JSON 完整备份与纯文本复制等多种格式
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onNavigateToPrint}
            className="flex flex-col items-center justify-center p-4 bg-white border border-amber-300 rounded-xl hover:border-amber-500 hover:shadow-md transition-all text-amber-900 group"
          >
            <Printer className="w-6 h-6 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">田字格字帖 (PDF)</span>
            <span className="text-[10px] text-slate-500 mt-0.5">直接打印或保存PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex flex-col items-center justify-center p-4 bg-white border border-amber-300 rounded-xl hover:border-amber-500 hover:shadow-md transition-all text-amber-900 group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">导出 CSV / Excel</span>
            <span className="text-[10px] text-slate-500 mt-0.5">含拼音释义表格</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center p-4 bg-white border border-amber-300 rounded-xl hover:border-amber-500 hover:shadow-md transition-all text-amber-900 group"
          >
            <Download className="w-6 h-6 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">导出 JSON 数据</span>
            <span className="text-[10px] text-slate-500 mt-0.5">全量结构化备份</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex flex-col items-center justify-center p-4 bg-white border border-amber-300 rounded-xl hover:border-amber-500 hover:shadow-md transition-all text-amber-900 group"
          >
            {copied ? (
              <Check className="w-6 h-6 text-emerald-600 mb-1" />
            ) : (
              <Copy className="w-6 h-6 text-slate-600 mb-1 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-bold">{copied ? '已复制到剪贴板' : '复制汇总文本'}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">纯文本便捷分享</span>
          </button>
        </div>
      </div>

      {/* Mistakes Table Preview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="text-base font-bold text-slate-800 mb-3">
          错题库明细总览 ({wrongWordsList.length + wrongCharsList.length})
        </h2>

        {wrongWordsList.length === 0 && wrongCharsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            暂无错题记录，恭喜全部掌握！
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">类别</th>
                  <th className="py-2.5 px-3">生词 / 汉字</th>
                  <th className="py-2.5 px-3">拼音</th>
                  <th className="py-2.5 px-3">错误频次</th>
                  <th className="py-2.5 px-3">连写3遍状态</th>
                  <th className="py-2.5 px-3">掌握判定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wrongWordsList.map(item => (
                  <tr key={item.id} className="hover:bg-amber-50/40">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px]">
                        错词
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold font-serif text-sm text-slate-900">
                      {item.word}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{item.pinyin}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-semibold">{item.mistakeCount} 次</td>
                    <td className="py-2.5 px-3">
                      {item.practiceRoundsDone >= 3 ? (
                        <span className="text-emerald-600 font-medium">✓ 已完成3遍</span>
                      ) : (
                        <span className="text-amber-600 font-medium">已写 {item.practiceRoundsDone}/3 遍</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.retestPassed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.retestPassed ? '已攻克' : '待复习'}
                      </span>
                    </td>
                  </tr>
                ))}

                {wrongCharsList.map(item => (
                  <tr key={item.char} className="hover:bg-amber-50/40">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                        错字
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold font-serif text-sm text-slate-900">
                      {item.char}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        (出处: {item.wordSource})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{item.pinyin}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-semibold">{item.mistakeCount} 次</td>
                    <td className="py-2.5 px-3">
                      {item.practiceRoundsDone >= 3 ? (
                        <span className="text-emerald-600 font-medium">✓ 已完成3遍</span>
                      ) : (
                        <span className="text-amber-600 font-medium">已写 {item.practiceRoundsDone}/3 遍</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.retestPassed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.retestPassed ? '已攻克' : '待复习'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
        <span>需要重新开始或清空当前账户的所有进度吗？</span>
        <button
          type="button"
          onClick={handleResetConfirm}
          className="flex items-center gap-1 text-rose-600 hover:text-rose-800 font-medium py-1 px-2.5 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置学习数据
        </button>
      </div>
    </div>
  );
};
