// Client-side stroke trajectory analyzer and remote logger

export interface LocalStrokeLog {
  id: string;
  character: string;
  word?: string;
  strokeIndex: number;
  isCorrect: boolean;
  isBackwards: boolean;
  mistakesOnStroke: number;
  totalMistakes: number;
  drawnPointsCount: number;
  drawnPointsSample: Array<{ x: number; y: number }>;
  expectedStrokePointsSample?: Array<{ x: number; y: number }>;
  failureReasons: string[];
  analysis: string;
  leniency: number;
  boxSize: number;
  timestamp: number;
}

const LOCAL_LOGS_KEY = 'cw2_stroke_logs';
const LENIENCY_KEY = 'cw2_leniency_setting';

// Get current leniency setting (default 1.4 for natural handwriting)
export function getLeniencySetting(): number {
  if (typeof window === 'undefined') return 1.4;
  try {
    const val = localStorage.getItem(LENIENCY_KEY);
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0.8 && num <= 2.5) return num;
    }
  } catch {}
  return 1.4; // Default to 1.4 (more forgiving than strict 1.0)
}

export function setLeniencySetting(val: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LENIENCY_KEY, val.toFixed(2));
  } catch {}
}

export function getLocalStrokeLogs(): LocalStrokeLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function clearLocalStrokeLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_LOGS_KEY);
  } catch {}
}

export interface HanziWriterStrokeData {
  strokeNum: number;
  mistakesOnStroke?: number;
  totalMistakes?: number;
  strokesRemaining?: number;
  drawnPath?: {
    pathString?: string;
    points?: Array<{ x: number; y: number }>;
  };
  isBackwards?: boolean;
}

export function analyzeAndLogStroke({
  username,
  character,
  word,
  strokeIndex,
  isCorrect,
  strokeData,
  expectedStrokePoints,
  boxSize,
  leniency,
}: {
  username: string;
  character: string;
  word?: string;
  strokeIndex: number;
  isCorrect: boolean;
  strokeData?: HanziWriterStrokeData;
  expectedStrokePoints?: Array<{ x: number; y: number }>;
  boxSize: number;
  leniency: number;
}): LocalStrokeLog {
  const drawnPoints: Array<{ x: number; y: number }> = strokeData?.drawnPath?.points || [];
  const isBackwards = !!strokeData?.isBackwards;
  const failureReasons: string[] = [];
  const analysisParts: string[] = [];

  if (isCorrect) {
    analysisParts.push(`第 ${strokeIndex + 1} 笔书写成功，笔画轨迹、方向与标准完全吻合！`);
  } else {
    // 1. Check if backwards
    if (isBackwards) {
      failureReasons.push('笔画方向相反 (倒下笔)');
      analysisParts.push('【笔画方向相反】您的起笔方向与标准运笔相反（如横画应由左往右，竖画应由上往下）。');
    }

    // 2. Check starting point distance
    if (drawnPoints.length > 0 && expectedStrokePoints && expectedStrokePoints.length > 0) {
      const userStart = drawnPoints[0];
      const targetStart = expectedStrokePoints[0];
      const startDist = Math.hypot(userStart.x - targetStart.x, userStart.y - targetStart.y);

      const userEnd = drawnPoints[drawnPoints.length - 1];
      const targetEnd = expectedStrokePoints[expectedStrokePoints.length - 1];
      const endDist = Math.hypot(userEnd.x - targetEnd.x, userEnd.y - targetEnd.y);

      if (startDist > 220) {
        failureReasons.push('起笔落点偏差较大');
        analysisParts.push(`【落笔位置偏差】起笔距离标准位置偏移约 ${Math.round(startDist)} 单位，请注意在田字格中的结构位置。`);
      }

      if (endDist > 240) {
        failureReasons.push('收笔位置偏差较大');
        analysisParts.push(`【收笔位置偏差】收笔距离标准位置偏移约 ${Math.round(endDist)} 单位。`);
      }
    }

    // 3. Check stroke points count / brevity
    if (drawnPoints.length < 3) {
      failureReasons.push('笔画轨迹过短或为单点点击');
      analysisParts.push('【笔画过短】书写轨迹过于轻短或为点触，系统未能采集到足够的笔画走势。');
    }

    // 4. Stroke order mismatch hint
    if (!isBackwards && failureReasons.length === 0) {
      failureReasons.push('笔顺顺序不符或笔画曲度差异');
      analysisParts.push(`【笔顺或字形不匹配】当前需写第 ${strokeIndex + 1} 笔，您的笔画可能属于该字后面的笔画，或笔画形态未达阈值。`);
    }
  }

  const logItem: LocalStrokeLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    character,
    word,
    strokeIndex,
    isCorrect,
    isBackwards,
    mistakesOnStroke: strokeData?.mistakesOnStroke || 0,
    totalMistakes: strokeData?.totalMistakes || 0,
    drawnPointsCount: drawnPoints.length,
    drawnPointsSample: drawnPoints.slice(0, 25),
    expectedStrokePointsSample: expectedStrokePoints?.slice(0, 25),
    failureReasons,
    analysis: analysisParts.join(' '),
    leniency,
    boxSize,
    timestamp: Date.now(),
  };

  // 1. Save to local storage
  if (typeof window !== 'undefined') {
    try {
      const existing = getLocalStrokeLogs();
      const updated = [logItem, ...existing.slice(0, 50)];
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(updated));
    } catch {}
  }

  // 2. Asynchronously upload to Vercel API
  if (typeof window !== 'undefined') {
    fetch('/api/stroke-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        word,
        character,
        strokeIndex,
        isCorrect,
        isBackwards,
        mistakesOnStroke: logItem.mistakesOnStroke,
        totalMistakes: logItem.totalMistakes,
        drawnPointsCount: logItem.drawnPointsCount,
        drawnPointsSample: logItem.drawnPointsSample,
        expectedStrokePointsSample: logItem.expectedStrokePointsSample,
        failureReasons: logItem.failureReasons,
        analysis: logItem.analysis,
        leniency,
        boxSize,
      }),
    }).catch(err => {
      console.warn('Failed to upload stroke log to Vercel API:', err);
    });
  }

  return logItem;
}
