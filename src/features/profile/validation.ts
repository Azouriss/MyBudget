import { z } from 'zod';

export const profileLanguages = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
] as const;

const name = z.string().trim().max(80, '80 caractères maximum.')
  .regex(/^[^\u0000-\u001f\u007f]*$/u, 'Retirez les caractères de contrôle.');

export const profileSchema = z.object({
  firstName: name,
  lastName: name,
  language: z.enum(['fr', 'en']),
}).strict();

export type Profile = z.infer<typeof profileSchema>;
export const defaultProfile: Profile = { firstName: '', lastName: '', language: 'fr' };

export function profileLanguageLabel(language: Profile['language']) {
  return profileLanguages.find((option) => option.value === language)!.label;
}
