'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import { soundManager } from '@/utils/sound';

export interface TianzigeBoxProps {
  character: string;
  pinyin?: string;
  size?: number;
  mode?: 'quiz' | 'animate' | 'static' | 'view';
  isActive?: boolean;
  isCompleted?: boolean;
  hasMistake?: boolean;
  onMistake?: (char: string, strokeIndex: number) => void;
  onCorrectStroke?: (char: string, strokeIndex: number) => void;
  onCharComplete?: (char: string, totalMistakes: number) => void;
  showOutline?: boolean;
  strokeColor?: string;
  className?: string;
  autoStartQuiz?: boolean;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const startQuiz = useCallback((writerInstance?: HanziWriter) => {
    const writer = writerInstance || writerRef.current;
    if (!writer) return;

    writer.quiz({
      onMistake: (strokeData) => {
        soundManager.playMistake();
        if (onMistake) {
          onMistake(character, strokeData.strokeNum);
        }
      },
      onCorrectStroke: (strokeData) => {
        soundManager.playCorrectStroke();
        if (onCorrectStroke) {
          onCorrectStroke(character, strokeData.strokeNum);
        }
      },
      onComplete: (summary) => {
        soundManager.playCharPass();
        if (onCharComplete) {
          onCharComplete(character, summary.totalMistakes);
        }
      },
    });
  }, [character, onMistake, onCorrectStroke, onCharComplete]);

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

  // Initialize or update HanziWriter instance
  useEffect(() => {
    if (!containerRef.current || !character) return;

    // Clear previous SVG
    containerRef.current.innerHTML = '';
    setIsLoading(true);

    try {
      const writer = HanziWriter.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: size * 0.1,
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
        showHintAfterMisses: mode === 'quiz' ? 0 : 3, // strict quiz mode: no auto hint revealing strokes!
        renderer: 'svg',
        onLoadCharDataSuccess: () => {
          setIsLoading(false);
        },
        onLoadCharDataError: (err) => {
          console.warn(`Could not load HanziWriter data for '${character}':`, err);
          setIsLoading(false);
        },
      });

      writerRef.current = writer;

      if (mode === 'quiz' && autoStartQuiz) {
        startQuiz(writer);
      } else if (mode === 'animate') {
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
  }, [character, size, mode, showOutline, strokeColor, autoStartQuiz, startQuiz, playAnimation]);

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
        className={`relative rounded-xl overflow-hidden shadow-sm transition-all duration-200 border-2 ${
          isActive
            ? 'ring-4 ring-amber-400 ring-offset-2 border-amber-500 shadow-md scale-[1.02]'
            : isCompleted
            ? hasMistake
              ? 'border-rose-400 ring-2 ring-rose-200'
              : 'border-emerald-500 ring-2 ring-emerald-200'
            : 'border-red-400/80 hover:border-red-500'
        } bg-[#fffdfa]`}
        style={{ width: size, height: size, touchAction: 'none' }}
      >
        {/* SVG Tianzige Crosshairs background */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Horizontal center dashed line */}
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
          {/* Vertical center dashed line */}
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
          {/* Subtle diagonal dashed lines for mizige guidance */}
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

        {/* HanziWriter mount point */}
        <div
          ref={containerRef}
          className="relative z-0 w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
        />

        {/* Status badges */}
        {mode === 'quiz' && isCompleted && (
          <div className="absolute top-1.5 right-1.5 z-10">
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
