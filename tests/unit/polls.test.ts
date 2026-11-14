import { describe, expect, it } from 'vitest';
import { buildPollViews } from '@/utils/polls';

describe('buildPollViews', () => {
  const polls = [{ id: 'p1', question: 'Wann?', created_by: 'u1', created_at: '2026-11-14T10:00:00Z' }];
  const options = [
    { id: 'o2', poll_id: 'p1', label: 'Di', position: 1 },
    { id: 'o1', poll_id: 'p1', label: 'Mo', position: 0 },
  ];
  const votes = [
    { option_id: 'o1', poll_id: 'p1', user_id: 'u1' },
    { option_id: 'o2', poll_id: 'p1', user_id: 'u1' },
    { option_id: 'o2', poll_id: 'p1', user_id: 'u2' },
  ];
  const names = new Map<string, string | null>([['u1', 'Anna'], ['u2', 'Tom']]);

  it('sortiert Antworten, zaehlt Stimmen und Abstimmende', () => {
    const [view] = buildPollViews(polls, options, votes, 'u2', names);
    expect(view?.options.map((o) => o.label)).toEqual(['Mo', 'Di']);
    expect(view?.options.map((o) => o.votes)).toEqual([1, 2]);
    expect(view?.options.map((o) => o.mine)).toEqual([false, true]);
    expect(view?.options[1]?.voters).toEqual(['Anna', 'Tom']);
    expect(view?.voterCount).toBe(2);
  });

  it('Umfrage ohne Stimmen', () => {
    const [view] = buildPollViews(polls, options, [], null, names);
    expect(view?.voterCount).toBe(0);
    expect(view?.options.every((o) => o.votes === 0 && !o.mine)).toBe(true);
  });
});
