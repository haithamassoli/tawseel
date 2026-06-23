import { translate } from '@/lib/i18n';

/**
 * The 12 governorates of Jordan, as stable slugs.
 * Display names live in src/translations/{en,ar}.json under `governorates.<slug>`.
 */
export const GOVERNORATES = [
  'amman',
  'irbid',
  'zarqa',
  'mafraq',
  'ajloun',
  'jerash',
  'madaba',
  'balqa',
  'karak',
  'tafilah',
  'maan',
  'aqaba',
] as const;

export type GovernorateSlug = (typeof GOVERNORATES)[number];

/** Resolve the localized display name for a governorate slug. */
export function getGovernorateLabel(slug: GovernorateSlug): string {
  return translate(`governorates.${slug}` as any);
}

/** Build { label, value } options for the Select component. */
export function getGovernorateOptions(): { label: string; value: GovernorateSlug }[] {
  return GOVERNORATES.map(slug => ({ label: getGovernorateLabel(slug), value: slug }));
}
