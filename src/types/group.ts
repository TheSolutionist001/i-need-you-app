export type GroupMemberStatus = 'active' | 'waitlist';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  is_public_event: boolean;
  created_by: string;
  created_at: string;
  sport: string;
  next_meetup_at: string | null;
  city: string | null;
  // 1 = jede Woche, 2 = alle 2 Wochen ...; null = einmalig
  meetup_repeat_weeks?: number | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: GroupMemberStatus;
  joined_at: string;
}

// Mitglied plus oeffentlich sichtbarer Name (aus public_profiles)
export interface GroupMemberWithName extends GroupMember {
  first_name: string | null;
  city: string | null;
}

// Rueckgabe von get_group_preview (Einladelink-Vorschau)
export interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  active_count: number;
  is_full: boolean;
  already_member: boolean;
}

// Rueckgabe von discover_groups (eigene Gruppen + oeffentliche im Umkreis)
export interface DiscoverGroup {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  max_members: number;
  is_public_event: boolean;
  created_by: string;
  next_meetup_at: string | null;
  city: string | null;
  active_count: number;
  my_status: GroupMemberStatus | null;
  distance_m: number | null;
  // Ungefaehre Position (Stadt, auf ~1 km gerundet) fuer die Karte
  lat?: number | null;
  lng?: number | null;
}

export interface NewGroupInput {
  name: string;
  description: string;
  maxMembers: number;
  sport: string;
  nextMeetupAt: string | null; // ISO
  city: string | null;
  lat: number | null;
  lng: number | null;
  repeatWeeks: number | null;
}

export type RsvpStatus = 'yes' | 'no';

export interface MeetupRsvp {
  user_id: string;
  status: RsvpStatus;
  first_name: string | null;
}

export interface PollOptionView {
  id: string;
  label: string;
  votes: number;
  mine: boolean;
  voters: string[];
}

export interface PollView {
  id: string;
  question: string;
  created_by: string;
  created_at: string;
  options: PollOptionView[];
  voterCount: number;
}
