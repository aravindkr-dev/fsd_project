import cron from 'node-cron';
import { env } from '../config/env.js';
import { runReminderJob } from '../services/notificationService.js';

export function startReminderJob() {
  if (!cron.validate(env.reminderCron)) {
    console.error(`Invalid REMINDER_CRON "${env.reminderCron}"; reminders disabled`);
    return;
  }
  cron.schedule(env.reminderCron, async () => {
    try {
      const stats = await runReminderJob();
      console.log('Reminder job finished', stats);
    } catch (err) {
      console.error('Reminder job failed:', err);
    }
  });
  console.log(`Reminder job scheduled: ${env.reminderCron}`);
}
