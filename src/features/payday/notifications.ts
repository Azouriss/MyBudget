import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppDatabase } from '../../db/client';
import { createPaydayRepository } from './repository';
import { planSalaryReminders } from './schedule';
import { reconcileReminders } from './notificationPlan';
import { monthBounds } from '../../lib/dates';
import { localeStore, t } from '../../i18n/locale';

export const phoneNotificationsAvailable = true;
const channelId = 'salary-reminders';
Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
}) });

export async function requestSalaryNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, {
    name: t('Rappel du salaire'), importance: Notifications.AndroidImportance.DEFAULT,
    sound: null, lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

let queue: Promise<unknown> = Promise.resolve();
export function syncSalaryNotifications(db: AppDatabase): Promise<string> {
  const run = async () => {
    const repository = createPaydayRepository(db);
    const settings = repository.settings();
    const language = localeStore.getState().language;
    const permission = await Notifications.getPermissionsAsync();
    const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const desired = settings?.notificationsEnabled && granted
      ? planSalaryReminders(settings.day, repository.recordedMonths()) : [];
    await reconcileReminders({
      list: () => Notifications.getAllScheduledNotificationsAsync(),
      cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
      schedule: async (reminder) => {
        await Notifications.scheduleNotificationAsync({ identifier: reminder.identifier,
          content: { title: t('Votre salaire du mois'), body: t('Pensez à saisir le salaire net reçu ce mois-ci.'),
            data: { salaryMonth: reminder.month, scheduledFor: reminder.timestamp, language } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.timestamp), channelId },
        });
      },
    }, desired, language);
    return !settings?.notificationsEnabled ? 'Notifications désactivées.' : granted
      ? 'Rappels programmés vers 9 h le jour de paie.' : 'Notifications non autorisées. Activez-les dans les réglages du téléphone.';
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export function observeSalaryNotification(onMonth: (month: string) => void): () => void {
  function redirect(response: Notifications.NotificationResponse | null) {
    const month = response?.notification.request.content.data?.salaryMonth;
    if (typeof month !== 'string') return;
    try { monthBounds(month); } catch { return; }
    onMonth(month);
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
  redirect(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
