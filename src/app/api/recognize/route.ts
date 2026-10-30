import { NextRequest, NextResponse } from 'next/server';
import { evaluateStrokeSequence, Point2D } from '@/utils/strokeMatcher';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetChar, ink, userStrokes, expectedMedians, width = 300, height = 300 } = body;

    if (!targetChar) {
      return NextResponse.json(
        { success: false, error: 'targetChar is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let candidates: string[] = [];
    let isShapeMatch = false;
    let recognizeError: string | null = null;

    // 1. Handwriting Recognition via Google Input Tools API
    if (Array.isArray(ink) && ink.length > 0) {
      try {
        const postData = JSON.stringify({
          input_type: '0',
          requests: [
            {
              writing_guide: { writing_area_width: width, writing_area_height: height },
              ink,
            },
          ],
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const apiRes = await fetch(
          'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=translate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: postData,
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson && apiJson[0] === 'SUCCESS' && apiJson[1]?.[0]?.[1]) {
            candidates = apiJson[1][0][1] as string[];
            // Check if targetChar is in candidates (top 5)
            isShapeMatch = candidates.slice(0, 5).some(cand => cand.includes(targetChar) || cand === targetChar);
          }
        }
      } catch (e: unknown) {
        recognizeError = e instanceof Error ? e.message : 'Recognition service timeout';
        console.warn('Handwriting API fetch error:', e);
      }
    }

    // 2. Stroke Sequence & Direction Evaluation
    let strokeEvaluation = null;
    let isStrokeOrderMatch = true;

    if (Array.isArray(userStrokes) && Array.isArray(expectedMedians) && expectedMedians.length > 0) {
      strokeEvaluation = evaluateStrokeSequence(userStrokes as Point2D[][], expectedMedians as number[][][]);
      isStrokeOrderMatch = strokeEvaluation.isStrokeOrderMatch;
    }

    // 3. Fallback logic: If handwriting API had network glitch, trust stroke direction and stroke count
    if (candidates.length === 0 && strokeEvaluation) {
      isShapeMatch = strokeEvaluation.strokeCountMatch && strokeEvaluation.isDirectionMatch;
    }

    // Comprehensive verdict: Both shape and stroke order must match
    const passed = isShapeMatch && isStrokeOrderMatch;

    return NextResponse.json(
      {
        success: true,
        passed,
        targetChar,
        isShapeMatch,
        isStrokeOrderMatch,
        candidates: candidates.slice(0, 8),
        recognizedChar: candidates[0] || null,
        strokeEvaluation,
        recognizeError,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Internal error';
    console.error('Error in /api/recognize:', error);
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
