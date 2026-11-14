import type { Gender } from '@/types/profile';

// Ein Eintrag im Feed (Rueckgabe der board_feed-Funktion)
export interface BoardFeedItem {
  id: string;
  body: string;
  target_genders: Gender[] | null;
  created_at: string;
  author_id: string;
  author_first_name: string | null;
  distance_m: number;
  sport: string;
  // Ungefaehre Position (Stadt, auf ~1 km gerundet) fuer die Karte
  lat?: number | null;
  lng?: number | null;
}
