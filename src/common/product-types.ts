export const PRODUCT_TYPE_OPTIONS = [
  'Recessed luminaires',
  'Track luminaires',
  'Modular luminaires',
  'Wall-ceiling luminaires',
  'Linear fluorescent luminaires',
  'Suspended luminaires',
  'Linear LED luminaires',
  'Information displays',
] as const;

export type ProductTypeOption = (typeof PRODUCT_TYPE_OPTIONS)[number];
