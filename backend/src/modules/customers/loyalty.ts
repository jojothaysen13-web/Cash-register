// 1 point earned per €1 paid; 1 point redeemable for 1 cent off (≈1% back).
const POINTS_EARN_DIVISOR_CENTS = 100;
const POINT_VALUE_CENTS = 1;

export function pointsEarnedFor(paidCents: number): number {
  return Math.floor(paidCents / POINTS_EARN_DIVISOR_CENTS);
}

export function redemptionValueCents(points: number): number {
  return points * POINT_VALUE_CENTS;
}
