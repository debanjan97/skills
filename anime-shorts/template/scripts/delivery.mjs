// The delivery ladder: every ElevenLabs v4 tag a beat may open with, by intensity.
// Neighbouring beats may move at most ONE rung (user feedback: a jump such as
// calm → shouting, or shouting → whispering, breaks immersion).
//
//   0 quiet      [whispering] [softly]
//   1 narration  no tag, [slowly] [seriously] [curious] [warmly]
//   2 heightened [dramatically] [intense] [excited]
//   3 peak       [shouting]
//
// So whispering → narration → dramatic → shouting is the only way up, and the
// same rungs in reverse are the only way down. Peak (3) may only follow 2 and be
// followed by 2. A tag not on the ladder is an error: add it here, with a rung, first.
export const LADDER = {
  whispering: 0, whispers: 0, whisper: 0, softly: 0, quietly: 0,
  '': 1, slowly: 1, seriously: 1, curious: 1, warmly: 1, calm: 1, calmly: 1,
  dramatically: 2, intense: 2, excited: 2, urgently: 2,
  shouting: 3, yelling: 3,
};

export const RUNG_NAMES = ['quiet', 'narration', 'heightened', 'peak'];

/** The rung a line opens with: its first leading [tag], or narration when it has none. */
export function rungOf(line) {
  const m = /^\s*\[([^\]]+)\]/.exec(line ?? '');
  const tag = m ? m[1].trim().toLowerCase() : '';
  return { tag, rung: Object.hasOwn(LADDER, tag) ? LADDER[tag] : null };
}

/** Every rule break in a script's beat order, as readable strings. Empty means it passes. */
export function checkTransitions(beats) {
  const problems = [];
  let prev = null;
  for (const beat of beats) {
    if (!beat.line) continue; // captions-only beat: no voice to compare
    const { tag, rung } = rungOf(beat.line);
    // A tag later in the line also changes delivery mid-line; it must be one rung from the opening one.
    const inner = [...beat.line.matchAll(/\[([^\]]+)\]/g)].slice(1).map((m) => m[1].trim().toLowerCase());
    if (rung === null) {
      problems.push(`${beat.id}: [${tag}] is not on the delivery ladder (scripts/delivery.mjs)`);
      prev = null;
      continue;
    }
    for (const t of inner) {
      if (!Object.hasOwn(LADDER, t)) problems.push(`${beat.id}: [${t}] is not on the delivery ladder`);
      else if (Math.abs(LADDER[t] - rung) > 1) problems.push(`${beat.id}: jumps from [${tag || 'narration'}] to [${t}] inside the line`);
    }
    if (prev && Math.abs(rung - prev.rung) > 1) {
      problems.push(
        `${prev.id} → ${beat.id}: ${RUNG_NAMES[prev.rung]} [${prev.tag || 'no tag'}] → ${RUNG_NAMES[rung]} [${tag || 'no tag'}] jumps ${Math.abs(rung - prev.rung)} rungs; move one at a time`,
      );
    }
    prev = { id: beat.id, tag, rung };
  }
  return problems;
}
