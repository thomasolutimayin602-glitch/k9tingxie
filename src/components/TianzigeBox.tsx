'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import { soundManager } from '@/utils/sound';
import { Point2D, evaluateStrokeSequence } from '@/utils/strokeMatcher';
import { Check, RotateCcw, Undo2, Sparkles, AlertCircle } from 'lucide-react';

interface HanziCharData {
  strokes: string[];
  medians: number[][][];
}

export interface TianzigeBoxProps {
  character: string;
  pinyin?: string;
  word?: string;
  size?: number;
  mode?: 'quiz' | 'animate' | 'static' | 'view';
  isActive?: boolean;
  isCompleted?: boolean;
  hasMistake?: boolean;
  onMistake?: (char: string, strokeIndex: number, reason?: string) => void;
  onCorrectStroke?: (char: string, strokeIndex: number) => void;
  onCharComplete?: (char: string, totalMistakes: number) => void;
  showOutline?: boolean;
  strokeColor?: string;
  className?: string;
  autoStartQuiz?: boolean;
  leniency?: number;
  recognitionEngine?: 'smart' | 'strict';
}

export const TianzigeBox: React.FC<TianzigeBoxProps> = ({
  character,
  pinyin,
  size = 140,
  mode = 'quiz',
  isActive = false,
  isCompleted = false,
  hasMistake = false,
  onMistake,
  onCorrectStroke,
  onCharComplete,
  showOutline = false,
  strokeColor = '#1e293b',
  className = '',
  autoStartQuiz = true,
  leniency = 1.4,
  recognitionEngine = 'smart',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const charDataRef = useRef<HanziCharData | null>(null);

  // HanziWriter animation state
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Smart Canvas Freehand state
  // userStrokes: array of strokes, each stroke is an array of Point2D
  const [userStrokes, setUserStrokes] = useState<Point2D[][]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point2D[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<{
    passed?: boolean;
    message?: string;
    type?: 'success' | 'error' | 'warning';
  } | null>(null);

  const autoEvaluateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playAnimation = useCallback((writerInstance?: HanziWriter) => {
    const writer = writerInstance || writerRef.current;
    if (!writer) return;
    setIsAnimating(true);
    writer.animateCharacter({
      onComplete: () => {
        setIsAnimating(false);
      },
    });
  }, []);

  // Load HanziWriter instance & character data
  useEffect(() => {
    if (!containerRef.current || !character) return;
    containerRef.current.innerHTML = '';
    setIsLoading(true);

    try {
      const writer = HanziWriter.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: size * 0.08,
        showOutline: mode === 'animate' || mode === 'static' || mode === 'view' ? true : showOutline,
        showCharacter: mode === 'static' || mode === 'view',
        strokeColor: strokeColor,
        outlineColor: '#cbd5e1',
        highlightColor: '#22c55e',
        drawingColor: '#0f172a',
        drawingWidth: Math.max(16, size * 0.12),
        strokeFadeDuration: 250,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 180,
        showHintAfterMisses: 0,
        renderer: 'svg',
        onLoadCharDataSuccess: (data: unknown) => {
          charDataRef.current = data as HanziCharData;
          setIsLoading(false);
        },
        onLoadCharDataError: (err) => {
          console.warn(`Could not load HanziWriter data for '${character}':`, err);
          setIsLoading(false);
        },
      });

      writerRef.current = writer;

      if (mode === 'animate' && autoStartQuiz) {
        playAnimation(writer);
      }
    } catch (e) {
      console.error('Failed to create HanziWriter:', e);
      setIsLoading(false);
    }

    return () => {
      if (writerRef.current) {
        try {
          writerRef.current.cancelQuiz();
        } catch {}
      }
    };
  }, [character, size, mode, showOutline, strokeColor, leniency, autoStartQuiz, playAnimation]);

  // Redraw Canvas strokes
  const redrawCanvas = useCallback((strokes: Point2D[][], strokeStyle = '#0f172a') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      if (stroke.length < 1) return;

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = Math.max(6, Math.round(size * 0.055));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.length === 1) {
        // Draw a point/dot
        ctx.fillStyle = strokeStyle;
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);

      // Smooth curves using quadratic Bézier midpoints
      for (let i = 1; i < stroke.length - 1; i++) {
        const xc = (stroke[i].x + stroke[i + 1].x) / 2;
        const yc = (stroke[i].y + stroke[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
      }

      const last = stroke[stroke.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });
  }, [size]);

  // Handle Freehand Evaluation (Shape Recognition + Stroke Order Matching)
  const evaluateHandwriting = useCallback(async (currentStrokes: Point2D[][]) => {
    if (currentStrokes.length === 0) return;
    setIsEvaluating(true);
    setEvaluationFeedback(null);

    // Format ink structure for Handwriting Recognition:
    // [ [x_coords], [y_coords], [timestamps] ]
    const ink = currentStrokes.map(stroke => {
      const xs: number[] = [];
      const ys: number[] = [];
      const ts: number[] = [];
      stroke.forEach(pt => {
        xs.push(Math.round(pt.x));
        ys.push(Math.round(pt.y));
        ts.push(pt.t || 0);
      });
      return [xs, ys, ts];
    });

    const expectedMedians = charDataRef.current?.medians || [];

    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetChar: character,
          ink,
          userStrokes: currentStrokes,
          expectedMedians,
          width: size,
          height: size,
        }),
      });

      const data = await res.json();

      if (data.success && data.passed) {
        // Both shape and stroke order passed!
        redrawCanvas(currentStrokes, '#059669'); // Green stroke
        soundManager.playCharPass();
        setEvaluationFeedback({
          passed: true,
          message: '书写规范，笔顺正确！',
          type: 'success',
        });
        if (onCharComplete) {
          onCharComplete(character, 0);
        }
      } else {
        // Did not pass: identify why
        soundManager.playMistake();
        redrawCanvas(currentStrokes, '#dc2626'); // Red stroke

        let failReason = '';
        if (!data.isShapeMatch) {
          const topGuess = data.candidates?.[0] || '未知';
          failReason = `字形不吻合（识别为【${topGuess}】），请注意间架结构`;
        } else if (!data.isStrokeOrderMatch) {
          const firstIssue = data.strokeEvaluation?.issues?.[0];
          failReason = firstIssue || '字形正确，但笔画顺序或运笔方向有误';
        } else {
          failReason = '笔顺或字形未完全匹配标准';
        }

        setEvaluationFeedback({
          passed: false,
          message: failReason,
          type: 'error',
        });

        if (onMistake) {
          onMistake(character, 0, failReason);
        }
      }
    } catch (e: unknown) {
      console.warn('Recognition evaluation error, using local fallback:', e);
      // Local fallback evaluation using stroke matcher
      if (expectedMedians.length > 0) {
        const localEval = evaluateStrokeSequence(currentStrokes, expectedMedians);
        if (localEval.isStrokeOrderMatch) {
          redrawCanvas(currentStrokes, '#059669');
          soundManager.playCharPass();
          setEvaluationFeedback({ passed: true, message: '笔顺与笔画数吻合！', type: 'success' });
          if (onCharComplete) onCharComplete(character, 0);
        } else {
          soundManager.playMistake();
          redrawCanvas(currentStrokes, '#dc2626');
          const issue = localEval.issues[0] || '笔顺有误';
          setEvaluationFeedback({ passed: false, message: issue, type: 'error' });
          if (onMistake) onMistake(character, 0, issue);
        }
      }
    } finally {
      setIsEvaluating(false);
    }
  }, [character, size, onCharComplete, onMistake, redrawCanvas]);

  // Pointer event handlers for drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isCompleted || isEvaluating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (autoEvaluateTimerRef.current) {
      clearTimeout(autoEvaluateTimerRef.current);
      autoEvaluateTimerRef.current = null;
    }

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x, y, t: Date.now() }];
    setEvaluationFeedback(null);

    // Initial dot
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, Math.round(size * 0.027)), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stroke = currentStrokeRef.current;
    const lastPt = stroke[stroke.length - 1];

    // Filter tiny jitter
    if (lastPt && Math.hypot(x - lastPt.x, y - lastPt.y) < 2) return;

    stroke.push({ x, y, t: Date.now() });

    // Live draw current stroke segment
    const ctx = canvas.getContext('2d');
    if (ctx && stroke.length >= 2) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(6, Math.round(size * 0.055));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    const newStroke = [...currentStrokeRef.current];
    currentStrokeRef.current = [];

    if (newStroke.length > 0) {
      soundManager.playCorrectStroke(); // audio feedback on stroke completion
      if (onCorrectStroke) {
        onCorrectStroke(character, userStrokes.length);
      }

      const updatedStrokes = [...userStrokes, newStroke];
      setUserStrokes(updatedStrokes);
      redrawCanvas(updatedStrokes);

      // Auto evaluate after 900ms of inactivity
      const expectedCount = charDataRef.current?.medians?.length || 8;
      // If user has written roughly the expected number of strokes, trigger faster
      const delay = updatedStrokes.length >= expectedCount ? 700 : 1200;

      if (autoEvaluateTimerRef.current) clearTimeout(autoEvaluateTimerRef.current);
      autoEvaluateTimerRef.current = setTimeout(() => {
        evaluateHandwriting(updatedStrokes);
      }, delay);
    }
  };

  // Undo last stroke
  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userStrokes.length === 0 || isEvaluating) return;
    if (autoEvaluateTimerRef.current) clearTimeout(autoEvaluateTimerRef.current);
    const updated = userStrokes.slice(0, -1);
    setUserStrokes(updated);
    redrawCanvas(updated);
    setEvaluationFeedback(null);
  };

  // Clear all strokes for this character
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (autoEvaluateTimerRef.current) clearTimeout(autoEvaluateTimerRef.current);
    setUserStrokes([]);
    redrawCanvas([]);
    setEvaluationFeedback(null);
  };

  // Manual trigger evaluate
  const handleManualEvaluate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (autoEvaluateTimerRef.current) clearTimeout(autoEvaluateTimerRef.current);
    evaluateHandwriting(userStrokes);
  };

  // Reset when character changes
  useEffect(() => {
    setUserStrokes([]);
    setEvaluationFeedback(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, size, size);
    }
  }, [character, size]);

  const isQuizMode = mode === 'quiz';
  const isSmartEngine = isQuizMode && recognitionEngine === 'smart';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Pinyin Header */}
      {pinyin && (
        <div className="h-7 flex items-center justify-center font-mono text-base sm:text-lg font-medium text-slate-700 tracking-wider mb-1">
          {pinyin}
        </div>
      )}

      {/* Tianzige Frame */}
      <div
        className={`relative rounded-xl overflow-hidden shadow-xs border-2 ${
          isActive
            ? 'ring-4 ring-amber-400 ring-offset-1 border-amber-500 shadow-md'
            : isCompleted
            ? hasMistake
              ? 'border-rose-400 ring-2 ring-rose-200'
              : 'border-emerald-500 ring-2 ring-emerald-200'
            : 'border-red-400/80 hover:border-red-500'
        } bg-[#fffdfa]`}
        style={{ width: size, height: size, touchAction: 'none' }}
      >
        {/* SVG Tianzige Red Crosshairs background */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="0"
            y1={size / 2}
            x2={size}
            y2={size / 2}
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <line
            x1={size / 2}
            y1="0"
            x2={size / 2}
            y2={size}
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <line
            x1="0"
            y1="0"
            x2={size}
            y2={size}
            stroke="#ef4444"
            strokeWidth="0.75"
            strokeDasharray="3 5"
            opacity="0.2"
          />
          <line
            x1={size}
            y1="0"
            x2="0"
            y2={size}
            stroke="#ef4444"
            strokeWidth="0.75"
            strokeDasharray="3 5"
            opacity="0.2"
          />
        </svg>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Evaluating Indicator */}
        {isEvaluating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-20 animate-fadeIn">
            <div className="w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] text-amber-800 font-bold">智能评测中...</span>
          </div>
        )}

        {/* Mode A: HanziWriter SVG mount (used in animate/view/static mode) */}
        <div
          ref={containerRef}
          className={`relative z-0 w-full h-full ${!isSmartEngine ? 'block' : 'hidden'}`}
          style={{ touchAction: 'none' }}
        />

        {/* Mode B: Smart Freehand Canvas (used in smart quiz mode) */}
        {isSmartEngine && (
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 z-10 w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        )}

        {/* Mini quick-actions toolbar overlay on active Tianzige */}
        {isSmartEngine && isActive && !isCompleted && userStrokes.length > 0 && (
          <div className="absolute bottom-1 right-1 z-30 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-0.5 rounded-lg border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={handleUndo}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="撤销上一笔"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="清空当前字"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleManualEvaluate}
              className="p-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
              title="完成书写并立即评测"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Status badges */}
        {isCompleted && (
          <div className="absolute top-1.5 right-1.5 z-30">
            {hasMistake ? (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold shadow">
                ✕
              </span>
            ) : (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                ✓
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating or Inline Diagnostic Feedback Banner */}
      {evaluationFeedback && (
        <div
          className={`mt-1.5 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 max-w-[170px] text-center leading-tight shadow-xs animate-fadeIn ${
            evaluationFeedback.passed
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {evaluationFeedback.passed ? (
            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
          )}
          <span className="truncate">{evaluationFeedback.message}</span>
        </div>
      )}

      {/* Animation controls if in animate mode */}
      {mode === 'animate' && (
        <button
          type="button"
          onClick={() => playAnimation()}
          disabled={isAnimating}
          className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition-colors flex items-center gap-1 shadow-sm"
        >
          {isAnimating ? '演示中...' : '▶ 重播笔顺'}
        </button>
      )}
    </div>
  );
};
