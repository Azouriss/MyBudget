import type { AppDatabase } from '../../db/client';
export const renewalNotificationsAvailable = false;
export async function requestRenewalPermission() { return false; }
export async function syncRenewalNotifications(_db: AppDatabase) {}
export function observeRenewalNotifications(_open: () => void) { return () => {}; }
