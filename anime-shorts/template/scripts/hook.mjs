// Rules for the first and last beat, from YouTube's analytics on the Gojo short
// (2026-11-15: 50% swiped away before watching, 0 comments, while those who stayed
// watched 66%). The middle of the short was fine; the open and the close were not.
//
// Open: a viewer in the Shorts feed decides in the first 1–2 seconds, so the first
//   beat must show the hook title, say its point in a few words, and move at once.
// Close: the last line asks the viewer something they can answer in a comment.
import { rungOf } from './delivery.mjs';

const MAX_HOOK_WORDS = 6;
const MAX_OPENING_WORDS = 9; // about 2.5s spoken
const FAST_EFFECTS = ['punch', 'shake'];

const spoken = (line) => (line ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = (s) => s.split(' ').filter(Boolean).length;

/** Problems with the opening and closing beats. `errors` must be fixed; `warnings` are a judgement call. */
export function checkOpenAndClose(script) {
  const errors = [];
  const warnings = [];
  const beats = script.beats ?? [];
  const first = beats[0];
  if (!first) return { errors: ['script.json has no beats'], warnings };

  if (script.hookCard) {
    const n = wordCount((script.hookCard.lines ?? []).join(' '));
    if (!script.hookCard.top || !script.hookCard.bottom) errors.push('hookCard needs a "top" and a "bottom" panel id');
    if (n > MAX_HOOK_WORDS + 2) errors.push(`hookCard title is ${n} words; keep it to ${MAX_HOOK_WORDS + 2} or fewer`);
  } else if (!first.hook) errors.push(`${first.id}: the first beat needs a "hook" title; it is on screen from frame 0`);
  else if (wordCount(first.hook) > MAX_HOOK_WORDS) errors.push(`${first.id}: hook is ${wordCount(first.hook)} words; keep it to ${MAX_HOOK_WORDS} or fewer`);

  const opening = spoken(first.line);
  if (opening && wordCount(opening) > MAX_OPENING_WORDS) {
    errors.push(`${first.id}: the opening line is ${wordCount(opening)} words; say the hook in ${MAX_OPENING_WORDS} or fewer and move the rest to the next beat`);
  }

  const fx = (first.effect ?? 'kenburns').split('+').map((s) => s.trim());
  const fast = FAST_EFFECTS.some((e) => fx.includes(e));
  if ((first.panels ?? []).length < 2 && !fast) {
    errors.push(`${first.id}: the opening is one panel on a slow "${first.effect ?? 'kenburns'}"; give it 2–3 panels (a cut inside the first second) or "punch"`);
  }

  if (first.line && rungOf(first.line).rung === 0) {
    warnings.push(`${first.id}: the short opens on a quiet line; narration or heightened usually holds a feed viewer better`);
  }

  if (script.closingQuestion !== false) {
    const last = [...beats].reverse().find((b) => b.line);
    if (last && !spoken(last.line).includes('?')) {
      errors.push(`${last.id}: the last line should ask the viewer a question they can answer in a comment (set "closingQuestion": false to skip)`);
    }
  }
  return { errors, warnings };
}
