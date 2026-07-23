export type ReportReason = 'spam' | 'belaestigung' | 'unangemessen' | 'sonstiges';

export const reportReasonOptions: { label: string; value: ReportReason }[] = [
  { label: 'Spam', value: 'spam' },
  { label: 'Belästigung', value: 'belaestigung' },
  { label: 'Unangemessen', value: 'unangemessen' },
  { label: 'Sonstiges', value: 'sonstiges' },
];

// Rueckgabe von admin_list_reports()
export interface AdminReport {
  report_id: string;
  kind: 'post' | 'profile';
  reported_post_id: string | null;
  reported_post_body: string | null;
  reported_profile_id: string | null;
  reported_profile_name: string | null;
  reporter_id: string;
  reporter_name: string | null;
  reason: ReportReason | null;
  created_at: string;
}
