import { NextRequest, NextResponse } from 'next/server';

export interface StrokeLogItem {
  id: string;
  username: string;
  word?: string;
  character: string;
  strokeIndex: number;
  isCorrect: boolean;
  isBackwards?: boolean;
  mistakesOnStroke?: number;
  totalMistakes?: number;
  drawnPointsCount: number;
  drawnPathString?: string;
  drawnPointsSample?: Array<{ x: number; y: number }>;
  expectedStrokePointsSample?: Array<{ x: number; y: number }>;
  failureReasons: string[];
  analysis: string;
  leniency: number;
  boxSize: number;
  timestamp: number;
  userAgent?: string;
}

// Global in-memory cache to preserve logs across invocations on warm instances
declare global {
  // eslint-disable-next-line no-var
  var __strokeLogs: StrokeLogItem[] | undefined;
}

if (!globalThis.__strokeLogs) {
  globalThis.__strokeLogs = [];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// GET: Retrieve stroke logs with diagnostic statistical analysis
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const charParam = searchParams.get('char');
  const userParam = searchParams.get('user');

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100;
  let logs = globalThis.__strokeLogs || [];

  if (userParam) {
    logs = logs.filter(l => l.username.toLowerCase() === userParam.toLowerCase());
  }

  if (charParam) {
    logs = logs.filter(l => l.character === charParam);
  }

  // Calculate statistics and common failure reasons
  const totalAttempts = logs.length;
  const failedLogs = logs.filter(l => !l.isCorrect);
  const failedCount = failedLogs.length;
  const successCount = totalAttempts - failedCount;

  const reasonCounts: Record<string, number> = {};
  failedLogs.forEach(l => {
    (l.failureReasons || []).forEach(r => {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
  });

  const commonFailureReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count, percentage: Math.round((count / (failedCount || 1)) * 100) }))
    .sort((a, b) => b.count - a.count);

  const characterBreakdown: Record<string, { attempts: number; fails: number }> = {};
  logs.forEach(l => {
    if (!characterBreakdown[l.character]) {
      characterBreakdown[l.character] = { attempts: 0, fails: 0 };
    }
    characterBreakdown[l.character].attempts++;
    if (!l.isCorrect) characterBreakdown[l.character].fails++;
  });

  const recentLogs = logs.slice(-limit).reverse();

  return NextResponse.json(
    {
      success: true,
      timestamp: Date.now(),
      summary: {
        totalAttempts,
        successCount,
        failedCount,
        failureRate: totalAttempts > 0 ? `${Math.round((failedCount / totalAttempts) * 100)}%` : '0%',
        commonFailureReasons,
        characterBreakdown,
      },
      logs: recentLogs,
    },
    {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

// POST: Record new stroke log with drawn points and analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || !body.character) {
      return NextResponse.json(
        { success: false, error: 'Missing character in payload' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const logItem: StrokeLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: body.username || 'gamer',
      word: body.word || '',
      character: body.character,
      strokeIndex: typeof body.strokeIndex === 'number' ? body.strokeIndex : 0,
      isCorrect: !!body.isCorrect,
      isBackwards: !!body.isBackwards,
      mistakesOnStroke: body.mistakesOnStroke || 0,
      totalMistakes: body.totalMistakes || 0,
      drawnPointsCount: body.drawnPointsCount || (body.drawnPointsSample?.length || 0),
      drawnPathString: body.drawnPathString || '',
      drawnPointsSample: Array.isArray(body.drawnPointsSample) ? body.drawnPointsSample.slice(0, 30) : [],
      expectedStrokePointsSample: Array.isArray(body.expectedStrokePointsSample)
        ? body.expectedStrokePointsSample.slice(0, 30)
        : [],
      failureReasons: Array.isArray(body.failureReasons) ? body.failureReasons : [],
      analysis: body.analysis || '',
      leniency: typeof body.leniency === 'number' ? body.leniency : 1.3,
      boxSize: body.boxSize || 130,
      timestamp: Date.now(),
      userAgent: request.headers.get('user-agent') || body.userAgent || '',
    };

    if (!globalThis.__strokeLogs) {
      globalThis.__strokeLogs = [];
    }

    globalThis.__strokeLogs.push(logItem);

    // Keep memory capped at 300 logs
    if (globalThis.__strokeLogs.length > 300) {
      globalThis.__strokeLogs = globalThis.__strokeLogs.slice(-250);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Stroke trajectory logged successfully',
        loggedId: logItem.id,
        analysis: logItem.analysis,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('Error saving stroke log:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing stroke log' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// DELETE: Clear stroke logs
export async function DELETE() {
  globalThis.__strokeLogs = [];
  return NextResponse.json(
    { success: true, message: 'All stroke logs cleared' },
    { headers: CORS_HEADERS }
  );
}
