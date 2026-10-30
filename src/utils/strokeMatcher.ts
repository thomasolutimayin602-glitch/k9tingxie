// Geometric and stroke direction evaluation utilities
// Normalizes user strokes and evaluates relative direction and order without strict absolute coordinate matching

export interface Point2D {
  x: number;
  y: number;
  t?: number;
}

export interface StrokeEvaluationResult {
  isStrokeOrderMatch: boolean;
  isDirectionMatch: boolean;
  strokeCountMatch: boolean;
  userStrokeCount: number;
  expectedStrokeCount: number;
  issues: string[];
  strokeDetails: Array<{
    strokeIndex: number;
    userAngle: number;
    expectedAngle: number;
    similarity: number;
    isBackwards: boolean;
    isMatch: boolean;
    description: string;
  }>;
}

// Convert radians to degrees in [0, 360)
function radToDeg(rad: number): number {
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// Calculate direction vector between start and end of a stroke
export function getStrokeVector(points: Point2D[]): { dx: number; dy: number; length: number; angle: number } {
  if (points.length < 2) {
    return { dx: 0, dy: 0, length: 0, angle: 0 };
  }
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = radToDeg(Math.atan2(dy, dx));
  return {
    dx: length > 0 ? dx / length : 0,
    dy: length > 0 ? dy / length : 0,
    length,
    angle,
  };
}

// Classify basic stroke type based on angle
// 0deg = Right (横), 90deg = Down (竖), 135deg = Down-Left (撇), 45deg = Down-Right (捺), 315deg = Up-Right (提)
export function classifyStrokeType(angle: number, dx: number, dy: number): string {
  if ((angle >= 335 || angle <= 40) && dx > 0) return '横 (从左向右)';
  if (angle >= 65 && angle <= 115 && dy > 0) return '竖 (从上向下)';
  if (angle > 105 && angle < 175 && dx < 0 && dy > 0) return '撇 (向左下)';
  if (angle > 15 && angle < 75 && dx > 0 && dy > 0) return '捺/点 (向右下)';
  if (angle >= 280 && angle <= 345 && dx > 0 && dy < 0) return '提 (向右上)';
  if (angle > 175 && angle < 260 && dx < 0 && dy < 0) return '向左上';
  return '折/复合笔画';
}

// Evaluate user's stroke sequence against HanziWriter standard medians
// expectedMedians: array of stroke medians from hanzi-writer data
// userStrokes: array of Point2D arrays (each element is one stroke drawn by user)
export function evaluateStrokeSequence(
  userStrokes: Point2D[][],
  expectedMedians: number[][][]
): StrokeEvaluationResult {
  const issues: string[] = [];
  const strokeDetails: StrokeEvaluationResult['strokeDetails'] = [];

  const userCount = userStrokes.length;
  const expectedCount = expectedMedians.length;
  const strokeCountMatch = Math.abs(userCount - expectedCount) <= 1; // allow minor count tolerance (e.g. connected stroke)

  let allDirectionsMatch = true;

  // Evaluate each stroke
  const compareCount = Math.min(userCount, expectedCount);

  for (let i = 0; i < compareCount; i++) {
    const userPts = userStrokes[i];
    const userVec = getStrokeVector(userPts);

    // Expected stroke medians in HanziWriter SVG coordinate:
    // HanziWriter y is upward in source medians, so inverted: y_screen = 1024 - y_svg or dy_screen = -dy_svg
    const expPtsRaw = expectedMedians[i];
    const expPts: Point2D[] = expPtsRaw.map(p => ({ x: p[0], y: 1024 - p[1] }));
    const expVec = getStrokeVector(expPts);

    // Cosine similarity between userVec and expVec
    const dotProduct = userVec.dx * expVec.dx + userVec.dy * expVec.dy;
    const isBackwards = dotProduct < -0.4; // opposite direction

    // Lenient direction match: cosine similarity > 0.35 (angle difference < 70 degrees)
    // or both belong to the same broad category (horizontal, vertical, etc.)
    const userType = classifyStrokeType(userVec.angle, userVec.dx, userVec.dy);
    const expType = classifyStrokeType(expVec.angle, expVec.dx, expVec.dy);

    const isMatch = dotProduct > 0.35 || userType === expType;

    if (!isMatch) {
      allDirectionsMatch = false;
      if (isBackwards) {
        issues.push(`第 ${i + 1} 笔运笔方向相反（标准为${expType}）`);
      } else {
        issues.push(`第 ${i + 1} 笔笔顺可能错误（写成了${userType}，标准为${expType}）`);
      }
    }

    strokeDetails.push({
      strokeIndex: i,
      userAngle: Math.round(userVec.angle),
      expectedAngle: Math.round(expVec.angle),
      similarity: parseFloat(dotProduct.toFixed(2)),
      isBackwards,
      isMatch,
      description: `第 ${i + 1} 笔: 用户为 ${userType}，标准为 ${expType}`,
    });
  }

  if (userCount < expectedCount) {
    issues.push(`笔画未写全（当前写了 ${userCount} 笔，标准为 ${expectedCount} 笔）`);
  } else if (userCount > expectedCount + 1) {
    issues.push(`笔画过多或有重复描摹（写了 ${userCount} 笔，标准为 ${expectedCount} 笔）`);
  }

  const isStrokeOrderMatch = allDirectionsMatch && strokeCountMatch;

  return {
    isStrokeOrderMatch,
    isDirectionMatch: allDirectionsMatch,
    strokeCountMatch,
    userStrokeCount: userCount,
    expectedStrokeCount: expectedCount,
    issues,
    strokeDetails,
  };
}
