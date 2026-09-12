import cron from 'node-cron';
import { refreshAllVehicles } from '../services/scheduleService.js';
import { processDueReminders } from '../services/reminderService.js';
import { logger } from '../utils/logger.js';

let running = false;

/** Refreshes maintenance statuses (raising due/overdue alerts) and fires reminders. */
export async function runMaintenanceSweep() {
  if (running) return;
  running = true;
  const started = Date.now();
  try {
    const vehicles = await refreshAllVehicles();
    const reminders = await processDueReminders();
    logger.info(`Maintenance sweep: ${vehicles} vehicle(s) refreshed, ${reminders} reminder alert(s) in ${Date.now() - started}ms`);
  } catch (error) {
    logger.error('Maintenance sweep failed:', error);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  // Every 30 minutes.
  const task = cron.schedule('*/30 * * * *', runMaintenanceSweep, { name: 'maintenance-sweep' });
  // Warm run shortly after boot.
  setTimeout(runMaintenanceSweep, 5000).unref();
  logger.info('Background scheduler started (maintenance sweep every 30 min)');
  return task;
}
