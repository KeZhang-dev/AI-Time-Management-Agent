const CHIP_COUNT = 5;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function categoryChipClass(category: string): string {
  const index = (hashString(category) % CHIP_COUNT) + 1;
  return `chip-${index}`;
}

export function categoryBarColorVar(category: string): string {
  const index = (hashString(category) % CHIP_COUNT) + 1;
  return `var(--chip-${index}-fg)`;
}
