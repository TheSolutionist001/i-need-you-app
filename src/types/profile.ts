export type Gender = 'maennlich' | 'weiblich' | 'divers' | 'keine_angabe';

export interface Profile {
  id: string;
  first_name: string;
  gender: Gender | null;
  city: string | null;
  created_at: string;
}

export const genderOptions: { label: string; value: Gender }[] = [
  { label: 'Männlich', value: 'maennlich' },
  { label: 'Weiblich', value: 'weiblich' },
  { label: 'Divers', value: 'divers' },
  { label: 'Keine Angabe', value: 'keine_angabe' },
];
