// Direkt-Chat in der Uebersicht (Rueckgabe von my_chat_threads)
export interface ChatThreadSummary {
  id: string;
  other_id: string;
  other_first_name: string | null;
  post_id: string | null;
  post_body: string | null;
  last_message_at: string | null;
  last_body: string | null;
  last_from_me: boolean | null;
  unread: boolean;
  blocked: boolean;
}

export interface ChatMessage {
  id: string;
  thread_id: string | null;
  group_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
}

// Nachricht mit Vorname des Absenders (fuer die Anzeige)
export interface ChatMessageView extends ChatMessage {
  sender_first_name: string | null;
}

export interface BlockedUser {
  blocked_id: string;
  first_name: string | null;
  created_at: string;
}
