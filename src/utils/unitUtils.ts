/**
 * Utilidades para gerenciamento de unidades do sistema
 */

export type Unit = 'madre' | 'floresta' | 'atendimento_floresta';

export interface UnitConfig {
  value: Unit;
  label: string;
  shortLabel?: string;
}

export const UNITS: UnitConfig[] = [
  { value: 'madre', label: 'MADRE (Clínica Social)', shortLabel: 'MADRE' },
  { value: 'floresta', label: 'Floresta (Neuroavaliação)', shortLabel: 'Floresta' },
  { value: 'atendimento_floresta', label: 'Atendimento Floresta', shortLabel: 'Atendimento Floresta' },
];

/**
 * Retorna o label formatado de uma unidade
 */
export const getUnitLabel = (unit?: string | null, short: boolean = false): string => {
  if (!unit) return 'N/A';
  
  const unitConfig = UNITS.find(u => u.value === unit);
  if (!unitConfig) return unit;
  
  return short && unitConfig.shortLabel ? unitConfig.shortLabel : unitConfig.label;
};

/**
 * Retorna a variante de badge para uma unidade
 */
export const getUnitBadgeVariant = (unit?: string | null): 'default' | 'secondary' | 'outline' => {
  if (unit === 'madre') return 'default';
  if (unit === 'floresta') return 'secondary';
  if (unit === 'atendimento_floresta') return 'outline';
  return 'default';
};
