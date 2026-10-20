import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppDatabase } from '../../db/client';
import { createRenewalRepository, renewalReminder, RENEWAL_PREFIX } from './repository';
import { localeStore, t } from '../../i18n/locale';

export const renewalNotificationsAvailable = true;
const channelId = 'renewal-reminders';
export async function requestRenewalPermission() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, {
    name: t('Renouvellements'), importance: Notifications.AndroidImportance.DEFAULT,
    sound: null, lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted || (await Notifications.requestPermissionsAsync()).granted;
}
let queue: Promise<unknown> = Promise.resolve();
export function syncRenewalNotifications(db: AppDatabase): Promise<void> {
  const run = async () => {
    const language = localeStore.getState().language;
    const granted = (await Notifications.getPermissionsAsync()).granted;
    const desired = granted ? createRenewalRepository(db).all().flatMap((r) => { const p = renewalReminder(r); return p ? [p] : []; }) : [];
    if (desired.length > 40) throw new Error('40 rappels de renouvellement maximum.');
    const wanted = new Map(desired.map((p) => [p.identifier, p]));
    for (const current of await Notifications.getAllScheduledNotificationsAsync()) {
      if (!current.identifier.startsWith(RENEWAL_PREFIX)) continue;
      const next = wanted.get(current.identifier);
      if (next?.timestamp === current.content.data?.scheduledFor && current.content.data?.language === language) wanted.delete(current.identifier);
      else await Notifications.cancelScheduledNotificationAsync(current.identifier);
    }
    for (const p of wanted.values()) await Notifications.scheduleNotificationAsync({ identifier: p.identifier,
      content: { title: t('Un renouvellement approche'), body: t('Consultez vos dates limites dans MyBudget.'),
        data: { renewalReminder: true, scheduledFor: p.timestamp, language } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.timestamp), channelId },
    });
  };
  const next = queue.then(run, run); queue = next.catch(() => undefined); return next;
}
export function observeRenewalNotifications(open: () => void) {
  function redirect(response: Notifications.NotificationResponse | null) {
    if (response?.notification.request.content.data?.renewalReminder !== true) return;
    open(); void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }
  const listener = Notifications.addNotificationResponseReceivedListener(redirect);
  redirect(Notifications.getLastNotificationResponse());
  return () => listener.remove();
}
