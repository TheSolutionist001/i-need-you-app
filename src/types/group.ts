export type GroupMemberStatus = 'active' | 'waitlist';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  max_members: number;
  is_public_event: boolean;
  created_by: string;
  created_at: string;
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
