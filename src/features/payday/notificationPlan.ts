import { REMINDER_PREFIX, type PlannedReminder } from './schedule';

export type ScheduledReminder = { identifier: string; content: { data?: Record<string, unknown> } };
export type ReminderAdapter = {
  list(): Promise<ScheduledReminder[]>;
  cancel(id: string): Promise<void>;
  schedule(reminder: PlannedReminder): Promise<void>;
};
export async function reconcileReminders(adapter: ReminderAdapter, desired: PlannedReminder[], language?: string) {
  const existing = (await adapter.list()).filter((r) => r.identifier.startsWith(REMINDER_PREFIX));
  const wanted = new Map(desired.map((r) => [r.identifier, r]));
  for (const reminder of existing) {
    const target = wanted.get(reminder.identifier);
    if (!target || reminder.content.data?.scheduledFor !== target.timestamp
      || (language !== undefined && reminder.content.data?.language !== language)) await adapter.cancel(reminder.identifier);
    else wanted.delete(reminder.identifier);
  }
  for (const reminder of wanted.values()) await adapter.schedule(reminder);
}
