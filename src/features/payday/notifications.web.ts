import type { AppDatabase } from '../../db/client';
export const phoneNotificationsAvailable = false;
export async function requestSalaryNotificationPermission(): Promise<boolean> { return false; }
export async function syncSalaryNotifications(_db: AppDatabase): Promise<string> {
  return 'Rappel dans l’accueil ici. Notifications sur Android.';
}
export function observeSalaryNotification(_onMonth: (month: string) => void): () => void { return () => undefined; }
