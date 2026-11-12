export function makeTests(base, generate, seed) {
  const values = [...new Set(base.map(String))];
  const seen = new Set(values);
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  let attempts = 0;
  while (values.length < 25 && attempts++ < 5000) {
    const input = String(generate(random, attempts));
    if (!seen.has(input)) {
      seen.add(input);
      values.push(input);
    }
  }
  if (values.length < 25) throw new Error(`Could not generate 25 tests from seed ${seed}`);
  return values;
}

export const randomInt = (random, min, max) => min + Math.floor(random() * (max - min + 1));
export const numberLine = numbers => numbers.join(' ');
export const randomNumbers = (random, { minLength = 0, maxLength = 9, min = -20, max = 20 } = {}) =>
  Array.from({ length: randomInt(random, minLength, maxLength) }, () => randomInt(random, min, max));
