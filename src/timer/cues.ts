import { MAX_TIMER_SECONDS } from '@/constants';
import { formatClock } from '@/ui/components/flipclock/format';

export interface Cue {
  /** Seconds left on the face when this fires. */
  at: number;
  text: string;
}

export interface CueParse {
  cues: Cue[];
  /** 1-based numbers of lines that held neither a cue nor a comment. */
  rejected: number[];
}

// Hours optional, matching the face: a cue sheet written before the hours column
// existed still reads.
const TIME = String.raw`(?:(\d{1,2}):)?(\d{1,2}):([0-5]\d)`;
const CUE_LINE = new RegExp(String.raw`^${TIME}[ \t]+(\S.*)$`);
const TIME_CODE = new RegExp(`^${TIME}$`);

const codeSeconds = (match: RegExpExecArray): number =>
  Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);

const clamp = (seconds: number): number => Math.min(Math.max(Math.trunc(seconds), 0), MAX_TIMER_SECONDS);

/** `"05:00"`, `"01:05:00"`, or a plain count of seconds; `undefined` for anything else. */
export function toSeconds(value: string | number): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? clamp(value) : undefined;
  const match = TIME_CODE.exec(String(value).trim());
  return match ? clamp(codeSeconds(match)) : undefined;
}

export function parseCues(source: string): CueParse {
  const cues: Cue[] = [];
  const rejected: number[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const match = CUE_LINE.exec(line);
    if (!match) {
      rejected.push(index + 1);
      return;
    }
    cues.push({ at: clamp(codeSeconds(match)), text: match[4]!.trim() });
  });
  // Down the clock, so a tick that crosses several fires them in the order the GM
  // would have watched them pass.
  cues.sort((a, b) => b.at - a.at);
  return { cues, rejected };
}

export function formatCues(cues: Cue[]): string {
  return cues.map((cue) => `${formatClock(cue.at)}  ${cue.text}`).join('\n');
}

/** Cues the face swept past between two samples. A cue sitting exactly on the
 *  starting value never fires: the clock has to reach it, not begin there. */
export function dueCues(cues: Cue[], previous: number, current: number): Cue[] {
  return cues.filter((cue) => previous > cue.at && current <= cue.at);
}
