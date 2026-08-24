import { describe, it, expect } from 'vitest';
import { dueCues, formatCues, parseCues, toSeconds } from '@/timer/cues';

describe('parseCues', () => {
  it('reads MM:SS lines into seconds and text', () => {
    const { cues, rejected } = parseCues('05:00  Torches gutter out\n2:30\tThe door shudders');
    expect(cues).toEqual([
      { at: 300, text: 'Torches gutter out' },
      { at: 150, text: 'The door shudders' },
    ]);
    expect(rejected).toEqual([]);
  });

  it('skips blank lines and comments', () => {
    const { cues, rejected } = parseCues('\n# a note\n  \n00:30  Loot');
    expect(cues).toEqual([{ at: 30, text: 'Loot' }]);
    expect(rejected).toEqual([]);
  });

  it('reports the line numbers it could not read', () => {
    const { cues, rejected } = parseCues('05:00  Fine\n5 minutes left\n05:60  Bad seconds\n07:00');
    expect(cues).toEqual([{ at: 300, text: 'Fine' }]);
    expect(rejected).toEqual([2, 3, 4]);
  });

  it('orders cues down the clock whatever order they were written in', () => {
    const { cues } = parseCues('00:30  Last\n10:00  First\n05:00  Middle');
    expect(cues.map((cue) => cue.at)).toEqual([600, 300, 30]);
  });

  it('reads an hours field', () => {
    expect(parseCues('01:30:00  Halfway').cues[0]?.at).toBe(5400);
  });

  it('clamps a time past the clock face', () => {
    expect(parseCues('99:99:59  Edge').cues[0]?.at).toBe(99 * 3600 + 59 * 60 + 59);
  });
});

describe('toSeconds', () => {
  it('takes a time code or a plain count of seconds', () => {
    expect(toSeconds('05:00')).toBe(300);
    expect(toSeconds(' 1:05 ')).toBe(65);
    expect(toSeconds('02:01:05')).toBe(7265);
    expect(toSeconds(90)).toBe(90);
  });

  it('rejects what it cannot read', () => {
    expect(toSeconds('5m')).toBeUndefined();
    expect(toSeconds('05:60')).toBeUndefined();
    expect(toSeconds(Number.NaN)).toBeUndefined();
  });
});

describe('formatCues', () => {
  it('round-trips through parseCues', () => {
    const source = '02:00:00  Halftime\n10:00  Wrap up\n00:05  Go';
    expect(formatCues(parseCues(source).cues)).toBe(source);
  });
});

describe('dueCues', () => {
  const cues = parseCues('10:00  Ten\n05:00  Five\n00:00  Zero').cues;

  it('fires a cue the face swept past', () => {
    expect(dueCues(cues, 301, 299)).toEqual([{ at: 300, text: 'Five' }]);
  });

  it('fires everything crossed in one step, down the clock', () => {
    expect(dueCues(cues, 601, 0).map((cue) => cue.text)).toEqual(['Ten', 'Five', 'Zero']);
  });

  it('leaves a cue sitting on the starting value alone', () => {
    expect(dueCues(cues, 300, 300)).toEqual([]);
  });

  it('stays quiet while the clock holds still', () => {
    expect(dueCues(cues, 299, 299)).toEqual([]);
  });

  it('stays quiet when the clock is wound back up', () => {
    expect(dueCues(cues, 100, 600)).toEqual([]);
  });
});
