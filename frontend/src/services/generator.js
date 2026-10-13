const lower = 'abcdefghijklmnopqrstuvwxyz';
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const digits = '0123456789';
const symbols = '!@#$%&*+-=?_';
export function randomIndex(max) {
  const limit = Math.floor(4294967296 / max) * max;
  let number;
  do { number = crypto.getRandomValues(new Uint32Array(1))[0]; } while (number >= limit);
  return number % max;
}
export const presets = {
  faible: { length: 8, uppercase: false, digits: false, symbols: false },
  fort: { length: 12, uppercase: true, digits: true, symbols: false },
  tresFort: { length: 16, uppercase: true, digits: true, symbols: true }
};
export function generatePassword({ length = 16, uppercase = true, digits: useDigits = true, symbols: useSymbols = true } = {}) {
  if (!Number.isInteger(length) || length < 6 || length > 64) throw new Error('Longueur invalide.');
  const groups = [lower, ...(uppercase ? [upper] : []), ...(useDigits ? [digits] : []), ...(useSymbols ? [symbols] : [])];
  const alphabet = groups.join('');
  const result = groups.map(group => group[randomIndex(group.length)]);
  while (result.length < length) result.push(alphabet[randomIndex(alphabet.length)]);
  for (let index = result.length - 1; index > 0; index--) { const other = randomIndex(index + 1); [result[index], result[other]] = [result[other], result[index]]; }
  return result.join('');
}
