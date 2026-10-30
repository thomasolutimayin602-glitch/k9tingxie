'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LocalStrokeLog,
  getLocalStrokeLogs,
  clearLocalStrokeLogs,
  getLeniencySetting,
  setLeniencySetting,
} from '@/utils/strokeLogger';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Trash2,
  X,
  ExternalLink,
  TrendingDown,
  Info,
} from 'lucide-react';

interface StrokeDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeniencyChange?: (val: number) => void;
}

export const StrokeDiagnosticModal: React.FC<StrokeDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onLeniencyChange,
}) => {
  const [logs, setLogs] = useState<LocalStrokeLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<LocalStrokeLog | null>(null);
  const [leniency, setLeniency] = useState<number>(1.4);
  const [activeTab, setActiveTab] = useState<'recent' | 'stats' | 'api'>('recent');
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [isFetchingServer, setIsFetchingServer] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reloadLogs = useCallback(() => {
    const list = getLocalStrokeLogs();
    setLogs(list);
    if (list.length > 0) {
      setSelectedLog(prev => prev || list[0]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reloadLogs();
      const currentLeniency = getLeniencySetting();
      setLeniency(currentLeniency);
    }
  }, [isOpen, reloadLogs]);

  // Handle leniency slider change
  const handleLeniencySlider = (val: number) => {
    setLeniency(val);
    setLeniencySetting(val);
    if (onLeniencyChange) {
      onLeniencyChange(val);
    }
  };

  const handleClear = () => {
    if (window.confirm('确定清空当前本地书写轨迹记录吗？')) {
      clearLocalStrokeLogs();
      setLogs([]);
      setSelectedLog(null);
      // Also clear server
      fetch('/api/stroke-log', { method: 'DELETE' }).catch(() => {});
    }
  };

  // Test fetch from Vercel /api/stroke-log
  const handleTestServerAPI = async () => {
    setIsFetchingServer(true);
    setServerStatus('正在请求 /api/stroke-log ...');
    try {
      const res = await fetch('/api/stroke-log?limit=20');
      const data = await res.json();
      if (data.success) {
        setServerStatus(`API 联通正常！已记录 ${data.summary?.totalAttempts || 0} 次书写，失败率 ${data.summary?.failureRate || '0%'}`);
      } else {
        setServerStatus(`API 返回异常: ${data.error || '未知错误'}`);
      }
    } catch (e: unknown) {
      setServerStatus(`连接失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setIsFetchingServer(false);
    }
  };

  // Render visual canvas comparison
  useEffect(() => {
    if (!canvasRef.current || !selectedLog) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Tianzige background lines
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outer border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Coordinate conversion from 1024x1024 HanziWriter space to canvas (width x height)
    // HanziWriter coordinates: (0,0) top-left or centered. Usually points are in range ~0 to 1024, y may be inverted.
    const scale = width / 1024;

    // 1. Draw expected standard stroke (Green)
    if (selectedLog.expectedStrokePointsSample && selectedLog.expectedStrokePointsSample.length > 0) {
      const pts = selectedLog.expectedStrokePointsSample;
      ctx.strokeStyle = '#10b981'; // Green
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      pts.forEach((pt, idx) => {
        const x = pt.x * scale;
        // HanziWriter coordinate inverted Y in SVG medians: y is 900 - y or standard y
        const y = pt.y > 900 ? (1024 - pt.y) * scale : pt.y * scale;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Green circle on standard start
      if (pts.length > 0) {
        const startX = pts[0].x * scale;
        const startY = pts[0].y > 900 ? (1024 - pts[0].y) * scale : pts[0].y * scale;
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(startX, startY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw user's actual drawn trajectory (Red)
    if (selectedLog.drawnPointsSample && selectedLog.drawnPointsSample.length > 0) {
      const pts = selectedLog.drawnPointsSample;
      ctx.strokeStyle = selectedLog.isCorrect ? '#059669' : '#dc2626'; // Green if passed, Red if failed
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      pts.forEach((pt, idx) => {
        const x = pt.x * scale;
        const y = pt.y > 900 ? (1024 - pt.y) * scale : pt.y * scale;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Red circle on user start
      if (pts.length > 0) {
        const startX = pts[0].x * scale;
        const startY = pts[0].y > 900 ? (1024 - pts[0].y) * scale : pts[0].y * scale;
        ctx.fillStyle = selectedLog.isCorrect ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.arc(startX, startY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [selectedLog]);

  if (!isOpen) return null;

  const totalLogsCount = logs.length;
  const failedCount = logs.filter(l => !l.isCorrect).length;
  const successCount = totalLogsCount - failedCount;
  const failRate = totalLogsCount > 0 ? Math.round((failedCount / totalLogsCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-rose-700 to-amber-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-amber-200 animate-pulse" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">书写轨迹记录与失败原因诊断</h2>
              <p className="text-xs text-amber-200">
                实时采集笔画轨迹坐标，分析为何书写判定不通过
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leniency Tuning Alert Bar */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  书写容错度 (Leniency)：
                  <strong className="text-amber-800 font-mono text-sm">{leniency.toFixed(2)}</strong>
                </span>
                <span className="text-[11px] text-slate-500 ml-2">
                  {leniency <= 1.1 ? '（极严格，需极标准书法）' : leniency <= 1.5 ? '（标准推荐，适度容许自然手写偏差）' : '（宽松，更易通过）'}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-2 w-full sm:w-56">
              <span className="text-[10px] text-slate-400">严格</span>
              <input
                type="range"
                min="0.9"
                max="2.0"
                step="0.05"
                value={leniency}
                onChange={e => handleLeniencySlider(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">宽松</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'recent'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              最近书写轨迹 ({totalLogsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'stats'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              高频失败原因统计
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'api'
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Vercel API 接口
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={reloadLogs}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
              title="刷新记录"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
              title="清空记录"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Recent Trajectories & Visual Comparison */}
        {activeTab === 'recent' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col md:flex-row gap-4">
            {/* Left list of attempts */}
            <div className="w-full md:w-1/2 flex flex-col space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  暂无书写记录。请在田字格中尝试书写汉字，每一次笔画的轨迹都会在此实时显示并诊断。
                </div>
              ) : (
                logs.map(item => {
                  const isSelected = selectedLog?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedLog(item)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 font-serif">
                            {item.character}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            第 {item.strokeIndex + 1} 笔
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.isCorrect ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              通过
                            </span>
                          ) : (
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              判定失败
                            </span>
                          )}
                        </div>
                      </div>

                      {item.failureReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.failureReasons.map((r, i) => (
                            <span key={i} className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {item.analysis}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Detailed Inspection & Visual Canvas */}
            <div className="w-full md:w-1/2 flex flex-col items-center bg-slate-50/70 rounded-2xl border border-slate-200 p-4">
              {selectedLog ? (
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-700 mb-2">
                    生字【{selectedLog.character}】第 {selectedLog.strokeIndex + 1} 笔 轨迹比对
                  </span>

                  {/* Canvas Visualizer */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={180}
                      height={180}
                      className="bg-white rounded-xl shadow-xs"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        绿色：标准笔画
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        红色：您的轨迹 (圆点为起笔)
                      </span>
                    </div>
                  </div>

                  {/* Diagnostic Breakdown */}
                  <div className="w-full bg-white rounded-xl p-3 border border-slate-200 mt-3 text-xs space-y-1.5 text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      诊断分析报告：
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                      {selectedLog.analysis}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                      <div>
                        是否倒下笔：
                        <strong className={selectedLog.isBackwards ? 'text-rose-600' : 'text-emerald-600'}>
                          {selectedLog.isBackwards ? '是 (运笔方向反)' : '否 (方向正确)'}
                        </strong>
                      </div>
                      <div>
                        采样点数：
                        <strong>{selectedLog.drawnPointsCount} 点</strong>
                      </div>
                      <div>
                        当时容错度：
                        <strong>{selectedLog.leniency.toFixed(2)}</strong>
                      </div>
                      <div>
                        记录时间：
                        <strong>{new Date(selectedLog.timestamp).toLocaleTimeString()}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-xs text-slate-400 text-center">
                  点击左侧一条记录查看笔画轨迹比对与详细诊断
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: High Frequency Statistics */}
        {activeTab === 'stats' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div className="text-xs text-slate-500">累计书写笔画</div>
                <div className="text-xl font-black text-slate-800 mt-1">{totalLogsCount}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <div className="text-xs text-emerald-700">成功通过笔画</div>
                <div className="text-xl font-black text-emerald-800 mt-1">{successCount}</div>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                <div className="text-xs text-rose-700">失败率</div>
                <div className="text-xl font-black text-rose-800 mt-1">{failRate}%</div>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              常见失败原因归类排查建议
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-white border border-rose-100 rounded-xl text-xs space-y-1">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  1. 笔画方向相反 (倒下笔 - 约占 45%)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  汉字书写有严格的运笔方向：横画必须从左至右，竖画必须从上至下，撇画从右上至左下。如果习惯性从右往左“画横”，系统将严格判定失败。
                </p>
              </div>

              <div className="p-3 bg-white border border-amber-100 rounded-xl text-xs space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  2. 笔顺先后顺序错误 (约占 30%)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  例如“木”字先写横再写竖，若先写竖再写横，则当前笔画被检测为不匹配。
                </p>
              </div>

              <div className="p-3 bg-white border border-indigo-100 rounded-xl text-xs space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-indigo-600" />
                  3. 起笔位置在田字格中偏差较大 / 手机屏幕判定过于严苛 (约占 25%)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  在手机或平板触摸屏上使用手指书写时，触点比毛笔更粗，易产生偏移。建议将顶部的<strong>“书写容错度”</strong>滑块调至 <strong>1.4 ~ 1.6</strong>，即可自然顺畅书写。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Vercel API Link and JSON preview */}
        {activeTab === 'api' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-amber-600" />
                Vercel 后端书写轨迹数据接口
              </div>
              <p className="text-slate-600 leading-relaxed mb-3">
                所有在手机端、平板端的书写轨迹数据均会自动上报至您的 Vercel 部署环境 API，返回包含坐标采样、笔顺比对与诊断结果的 JSON 数据。
              </p>

              <div className="bg-white border border-slate-200 p-2.5 rounded-xl font-mono text-[11px] text-amber-900 break-all select-all mb-3">
                GET https://k9tingxie.vercel.app/api/stroke-log
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestServerAPI}
                  disabled={isFetchingServer}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                >
                  {isFetchingServer ? '正在请求...' : '测试在线 API 并返回数据'}
                </button>

                <a
                  href="/api/stroke-log"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
                >
                  在新标签页打开 JSON 数据
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {serverStatus && (
                <div className="mt-3 p-2.5 bg-amber-50 rounded-lg text-amber-800 text-xs border border-amber-200">
                  {serverStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>提示：调高容错度（1.4~1.6）可解决手机触屏判定过于严格的问题</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-medium"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
