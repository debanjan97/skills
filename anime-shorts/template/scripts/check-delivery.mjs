#!/usr/bin/env node
// Check script.json before any voiceover is priced or generated, so a take that
// would have to be redone is never paid for. Exits 1 when:
//   - two neighbouring beats jump more than one rung of the delivery ladder (scripts/delivery.mjs)
//   - the first beat is a slow open, or the last line asks the viewer nothing (scripts/hook.mjs)
//
// Usage: node scripts/check-delivery.mjs
import { readFileSync } from 'node:fs';
import { checkTransitions, rungOf, RUNG_NAMES } from './delivery.mjs';
import { checkOpenAndClose } from './hook.mjs';

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
}
const { errors, warnings } = checkOpenAndClose(script);
for (const w of warnings) console.warn(`\nwarning: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s) with the open or the close:`);
  for (const e of errors) console.error(`  - ${e}`);
}
if (problems.length || errors.length) process.exit(1);
console.log('\nDelivery transitions, hook and closing question OK.');
