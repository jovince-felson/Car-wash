const Customer = require('../models/Customer');
const emailService = require('./email');
const logger = require('../config/logger');

// Runs every hour in production (setInterval used here for simplicity)
function startFollowUpJob(io) {
  const INTERVAL = process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 30 * 1000;

  setInterval(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const customers = await Customer.find({
        lastVisit: { $lt: sevenDaysAgo },
        followUpSent: false,
        totalVisits: { $gt: 0 },
      });

      for (const customer of customers) {
        const daysSince = Math.floor((Date.now() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
        if (customer.email) {
          await emailService.sendFollowUp(customer.email, { name: customer.name, daysSince })
            .catch(e => logger.warn('Follow-up email failed', { error: e.message }));
        }
        customer.followUpSent = true;
        await customer.save();

        if (io) {
          io.emit('notification', {
            type: 'followup',
            message: `Follow-up sent to ${customer.name} (${daysSince} days since last visit)`,
            time: new Date().toISOString(),
          });
        }
      }
      if (customers.length > 0) {
        logger.info(`Follow-up job: ${customers.length} customer(s) notified`);
      }
    } catch (err) {
      logger.error('Follow-up job error', { error: err.message });
    }
  }, INTERVAL);

  logger.info(`Follow-up reminder job started (interval: ${INTERVAL}ms)`);
}

module.exports = { startFollowUpJob };
