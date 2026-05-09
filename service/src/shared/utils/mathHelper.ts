/**
 * Rounds a number to a specified number of decimal places.
 * @param value The number to round
 * @param precision The number of decimal places (default is 3)
 */
export const preciseRound = (value: number | undefined, precision = 3): number | undefined => {
  if (!value) {
    return value;
  }
  return Number(Math.round(Number(value + 'e' + precision)) + 'e-' + precision);
};