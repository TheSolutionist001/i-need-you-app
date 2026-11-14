import type { PollView } from '@/types/group';

export interface PollRow {
  id: string;
  question: string;
  created_by: string;
  created_at: string;
}
export interface PollOptionRow {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}
export interface PollVoteRow {
  option_id: string;
  poll_id: string;
  user_id: string;
}

/**
 * Fuegt Umfragen, Antworten und Stimmen zu einer Anzeige zusammen:
 * Stimmen je Antwort, eigene Auswahl, Namen der Abstimmenden und die Zahl
 * der Personen, die ueberhaupt abgestimmt haben (Mehrfachauswahl moeglich).
 */
export function buildPollViews(
  polls: PollRow[],
  options: PollOptionRow[],
  votes: PollVoteRow[],
  myId: string | null,
  names: Map<string, string | null>,
): PollView[] {
  return polls.map((poll) => {
    const pollVotes = votes.filter((v) => v.poll_id === poll.id);
    const opts = options
      .filter((o) => o.poll_id === poll.id)
      .sort((a, b) => a.position - b.position)
      .map((o) => {
        const optVotes = pollVotes.filter((v) => v.option_id === o.id);
        return {
          id: o.id,
          label: o.label,
          votes: optVotes.length,
          mine: optVotes.some((v) => v.user_id === myId),
          voters: optVotes.map((v) => names.get(v.user_id) ?? 'Unbekannt'),
        };
      });
    return {
      id: poll.id,
      question: poll.question,
      created_by: poll.created_by,
      created_at: poll.created_at,
      options: opts,
      voterCount: new Set(pollVotes.map((v) => v.user_id)).size,
    };
  });
}
