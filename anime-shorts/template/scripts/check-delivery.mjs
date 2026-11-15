#!/usr/bin/env node
// Check script.json against the delivery ladder (scripts/delivery.mjs) before any
// voiceover is priced or generated. Exits 1 when two neighbouring beats jump more
// than one rung, so a jarring take is never paid for.
//
// Usage: node scripts/check-delivery.mjs
import { readFileSync } from 'node:fs';
import { checkTransitions, rungOf, RUNG_NAMES } from './delivery.mjs';

const script = JSON.parse(readFileSync('script.json', 'utf8'));
for (const b of script.beats) {
  if (!b.line) continue;
  const { tag, rung } = rungOf(b.line);
  const bar = rung === null ? '?' : '▮'.repeat(rung + 1).padEnd(4, '·');
  console.log(`${b.id.padEnd(4)} ${bar}  ${rung === null ? 'not on ladder' : RUNG_NAMES[rung]}${tag ? ` [${tag}]` : ''}`);
}
const problems = checkTransitions(script.beats);
if (problems.length) {
  console.error(`\n${problems.length} transition(s) break the ladder:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('\nDelivery transitions OK.');
