// EXTENDED MATH FUNCTIONS

import { CREAGEN_PRECISION } from './constants'

/**
 * Return the greatest common divisor
 */
export function gcd(a: number, b: number) {
  if (b === 0) return a
  return gcd(b, a % b)
}

/**
 * Proper modulo that also handles negative cases
 */
export function mod(n: number, m: number) {
  return ((n % m) + m) % m
}

/**
 * Round number to a `dec` decimal point
 */
export function roundToDec(n: number, dec?: number) {
  if (typeof dec === 'undefined') {
    return n
  }
  return parseFloat(n.toFixed(dec ?? CREAGEN_PRECISION))
}

// FROM es2015.core

/**
 * Returns the number of leading zero bits in the 32-bit binary representation of a number.
 * @param x A numeric expression.
 */
export function clz32(x: number): number {
  return Math.clz32(x)
}

/**
 * Returns the result of 32-bit multiplication of two numbers.
 * @param x First number
 * @param y Second number
 */
export function imul(x: number, y: number): number {
  return Math.imul(x, y)
}

/**
 * Returns the sign of the x, indicating whether x is positive, negative or zero.
 * @param x The numeric expression to test
 */
export function sign(x: number): number {
  return Math.sign(x)
}

/**
 * Returns the base 10 logarithm of a number.
 * @param x A numeric expression.
 */
export function log10(x: number): number {
  return Math.log10(x)
}

/**
 * Returns the base 2 logarithm of a number.
 * @param x A numeric expression.
 */
export function log2(x: number): number {
  return Math.log2(x)
}

/**
 * Returns the natural logarithm of 1 + x.
 * @param x A numeric expression.
 */
export function log1p(x: number): number {
  return Math.log1p(x)
}

/**
 * Returns the result of (e^x - 1), which is an implementation-dependent approximation to
 * subtracting 1 from the exponential function of x (e raised to the power of x, where e
 * is the base of the natural logarithms).
 * @param x A numeric expression.
 */
export function expm1(x: number): number {
  return Math.expm1(x)
}

/**
 * Returns the hyperbolic cosine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function cosh(x: number): number {
  return Math.cosh(x)
}

/**
 * Returns the hyperbolic sine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function sinh(x: number): number {
  return Math.sinh(x)
}

/**
 * Returns the hyperbolic tangent of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function tanh(x: number): number {
  return Math.tanh(x)
}

/**
 * Returns the inverse hyperbolic cosine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function acosh(x: number): number {
  return Math.acosh(x)
}

/**
 * Returns the inverse hyperbolic sine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function asinh(x: number): number {
  return Math.asinh(x)
}

/**
 * Returns the inverse hyperbolic tangent of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function atanh(x: number): number {
  return Math.atanh(x)
}

/**
 * Returns the square root of the sum of squares of its arguments.
 * @param values Values to compute the square root for.
 *     If no arguments are passed, the result is +0.
 *     If there is only one argument, the result is the absolute value.
 *     If any argument is +Infinity or -Infinity, the result is +Infinity.
 *     If any argument is NaN, the result is NaN.
 *     If all arguments are either +0 or −0, the result is +0.
 */
export function hypot(...values: number[]): number {
  return Math.hypot(...values)
}

/**
 * Returns the integral part of the a numeric expression, x, removing any fractional digits.
 * If x is already an integer, the result is x.
 * @param x A numeric expression.
 */
export function trunc(x: number): number {
  return Math.trunc(x)
}

/**
 * Returns the nearest single precision float representation of a number.
 * @param x A numeric expression.
 */
export function fround(x: number): number {
  return Math.fround(x)
}

/**
 * Returns an implementation-dependent approximation to the cube root of number.
 * @param x A numeric expression.
 */
export function cbrt(x: number): number {
  return Math.cbrt(x)
}

// FROM es5

/**
 * Returns the absolute value of a number (the value without regard to whether it is positive or negative).
 * For example, the absolute value of -5 is the same as the absolute value of 5.
 * @param x A numeric expression for which the absolute value is needed.
 */
export function abs(x: number): number {
  return Math.abs(x)
}

/**
 * Returns the arc cosine (or inverse cosine) of a number.
 * @param x A numeric expression.
 */
export function acos(x: number): number {
  return Math.acos(x)
}

/**
 * Returns the arcsine of a number.
 * @param x A numeric expression.
 */
export function asin(x: number): number {
  return Math.asin(x)
}

/**
 * Returns the arctangent of a number.
 * @param x A numeric expression for which the arctangent is needed.
 */
export function atan(x: number): number {
  return Math.atan(x)
}

/**
 * Returns the angle (in radians) from the X axis to a point.
 * @param y A numeric expression representing the cartesian y-coordinate.
 * @param x A numeric expression representing the cartesian x-coordinate.
 */
export function atan2(y: number, x: number): number {
  return Math.atan2(y, x)
}

/**
 * Returns the smallest integer greater than or equal to its numeric argument.
 * @param x A numeric expression.
 */
export function ceil(x: number): number {
  return Math.ceil(x)
}

/**
 * Returns the cosine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function cos(x: number): number {
  return Math.cos(x)
}

/**
 * Returns e (the base of natural logarithms) raised to a power.
 * @param x A numeric expression representing the power of e.
 */
export function exp(x: number): number {
  return Math.exp(x)
}

/**
 * Returns the greatest integer less than or equal to its numeric argument.
 * @param x A numeric expression.
 */
export function floor(x: number): number {
  return Math.floor(x)
}

/**
 * Returns the natural logarithm (base e) of a number.
 * @param x A numeric expression.
 */
export function log(x: number): number {
  return Math.log(x)
}

/**
 * Returns the larger of a set of supplied numeric expressions.
 * @param values Numeric expressions to be evaluated.
 */
export function max(...values: number[]): number {
  return Math.max(...values)
}

/**
 * Returns the smaller of a set of supplied numeric expressions.
 * @param values Numeric expressions to be evaluated.
 */
export function min(...values: number[]): number {
  return Math.min(...values)
}

/**
 * Returns the value of a base expression taken to a specified power.
 * @param x The base value of the expression.
 * @param y The exponent value of the expression.
 */
export function pow(x: number, y: number): number {
  return Math.pow(x, y)
}

/** Returns a pseudorandom number between 0 and 1. */
export function random(): number {
  return Math.random()
}

/**
 * Returns a supplied numeric expression rounded to the nearest integer.
 * @param x The value to be rounded to the nearest integer.
 */
export function round(x: number): number {
  return Math.round(x)
}

/**
 * Returns the sine of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function sin(x: number): number {
  return Math.sin(x)
}

/**
 * Returns the square root of a number.
 * @param x A numeric expression.
 */
export function sqrt(x: number): number {
  return Math.sqrt(x)
}

/**
 * Returns the tangent of a number.
 * @param x A numeric expression that contains an angle measured in radians.
 */
export function tan(x: number): number {
  return Math.tan(x)
}

/** The mathematical constant e. This is Euler's number, the base of natural logarithms. */
export const E = Math.E

/** The natural logarithm of 10. */
export const LN10 = Math.LN10

/** The natural logarithm of 2. */
export const LN2 = Math.LN2

/** The base-2 logarithm of e. */
export const LOG2E = Math.LOG2E

/** The base-10 logarithm of e. */
export const LOG10E = Math.LOG10E

/** Pi. This is the ratio of the circumference of a circle to its diameter. */
export const PI = Math.PI

/** The square root of 0.5, or, equivalently, one divided by the square root of 2. */
export const SQRT1_2 = Math.SQRT1_2

/** The square root of 2. */
export const SQRT2 = Math.SQRT2
