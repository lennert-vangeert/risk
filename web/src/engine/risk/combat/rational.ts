/**
 * Minimal exact rational arithmetic over BigInt — used ONLY by tests to verify
 * the float runtime combat math against closed-form probabilities to full
 * precision. It is never imported by the runtime engine (no BigInt in the hot
 * path).
 */
export interface Rational {
  n: bigint;
  d: bigint;
}

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
};

/** Construct a reduced rational from integer numerator/denominator. */
export const rat = (n: bigint | number, d: bigint | number = 1n): Rational => {
  let nn = BigInt(n);
  let dd = BigInt(d);
  if (dd === 0n) throw new Error("rational: zero denominator");
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd) || 1n;
  return { n: nn / g, d: dd / g };
};

export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };

export const addR = (a: Rational, b: Rational): Rational =>
  rat(a.n * b.d + b.n * a.d, a.d * b.d);

export const mulR = (a: Rational, b: Rational): Rational =>
  rat(a.n * b.n, a.d * b.d);

export const eqR = (a: Rational, b: Rational): boolean =>
  a.n === b.n && a.d === b.d;

export const toNumber = (a: Rational): number => Number(a.n) / Number(a.d);
