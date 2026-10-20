import { getLocale } from '../i18n/locale';

export const MAX_AMOUNT_CENTS = 999_999_999;

// No floating-point multiplication: fractional digits are parsed as integers.
export function parseAmountToCents(input: string): number {
  const normalized = input.trim();
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(normalized)) {
    throw new Error('Saisissez un montant avec au plus deux décimales.');
  }
  const [euros = '0', fraction = ''] = normalized.replace(',', '.').split('.');
  const cents = Number(euros) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) {
    throw new Error('Le montant doit être compris entre 0,01 et 9 999 999,99 €.');
  }
  return cents;
}

export function centsToInput(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Montant invalide.');
  return `${Math.floor(cents / 100)}${getLocale() === 'fr-FR' ? ',' : '.'}${String(cents % 100).padStart(2, '0')}`;
}

export function formatMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Montant invalide.');
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(cents / 100);
}
