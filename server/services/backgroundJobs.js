const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const { sendEscalationAlert } = require('./emailService');

const ESCALATION_TIME_MS = (parseInt(process.env.ESCALATION_TIME_MINUTES) || 15) * 60 * 1000;


async function checkForEscalations() {
    try {
        const now = new Date();
        const escalationThreshold = new Date(now.getTime() - ESCALATION_TIME_MS);

        // Find open/pending tickets with no recent response
        const ticketsToEscalate = await Ticket.find({
            status: { $in: ['open', 'pending'] },
            escalated: false,
            lastResponseTime: { $lt: escalationThreshold }
        });

        for (const ticket of ticketsToEscalate) {
            console.log(`Escalating ticket ${ticket.ticketId} due to timeout`);

            ticket.escalated = true;
            ticket.escalationReason = 'Response timeout - No response within time limit';
            ticket.status = 'escalated';
            ticket.assignedAgent = 'admin';

            await ticket.save();
            await sendEscalationAlert(ticket, ticket.escalationReason);
        }

        if (ticketsToEscalate.length > 0) {
            console.log(`Escalated ${ticketsToEscalate.length} tickets due to timeout`);
        }
    } catch (error) {
        console.error('Escalation check error:', error);
    }
}

function startBackgroundJobs() {
    console.log('Starting background jobs...');

    // Check for escalations every 2 minutes
    cron.schedule('*/2 * * * *', () => {
        console.log('Running escalation check...');
        checkForEscalations();
    });

    console.log('Background jobs started');
}

module.exports = {
    startBackgroundJobs,
    checkForEscalations
};
