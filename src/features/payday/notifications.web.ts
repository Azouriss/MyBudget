import type { AppDatabase } from '../../db/client';
export const phoneNotificationsAvailable = false;
export async function requestSalaryNotificationPermission(): Promise<boolean> { return false; }
export async function syncSalaryNotifications(_db: AppDatabase): Promise<string> {
  return 'Les notifications téléphone sont disponibles dans l’app Android. Le rappel dans l’accueil fonctionne ici.';
}
export function observeSalaryNotification(_onMonth: (month: string) => void): () => void { return () => undefined; }
