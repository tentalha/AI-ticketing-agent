const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const { getAgent } = require('../services/agents');
const { sendNewResponseEmail } = require('../services/emailService');

router.get('/tickets', async (req, res) => {
    try {
        const { status, needsApproval, escalated } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (needsApproval === 'true') filter.needsApproval = true;
        if (escalated === 'true') filter.escalated = true;

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            tickets: tickets.map(t => ({
                ticketId: t.ticketId,
                guestName: t.guestName,
                guestEmail: t.guestEmail,
                subject: t.subject,
                status: t.status,
                assignedAgent: t.assignedAgent,
                confidence: t.confidence,
                intent: t.intent,
                escalated: t.escalated,
                escalationReason: t.escalationReason,
                needsApproval: t.needsApproval,
                createdAt: t.createdAt,
                lastResponseTime: t.lastResponseTime
            }))
        });
    } catch (error) {
        console.error('Get admin tickets error:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

router.get('/tickets/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticket = await Ticket.findOne({ ticketId }).populate('linkedTickets');
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const messages = await Message.find({ ticketId }).sort({ createdAt: 1 });

        res.json({
            ticket: {
                ticketId: ticket.ticketId,
                guestName: ticket.guestName,
                guestEmail: ticket.guestEmail,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                assignedAgent: ticket.assignedAgent,
                confidence: ticket.confidence,
                intent: ticket.intent,
                reasoning: ticket.reasoning,
                escalated: ticket.escalated,
                escalationReason: ticket.escalationReason,
                needsApproval: ticket.needsApproval,
                createdAt: ticket.createdAt,
                lastResponseTime: ticket.lastResponseTime,
                linkedTickets: ticket.linkedTickets.map(lt => ({
                    ticketId: lt.ticketId,
                    subject: lt.subject,
                    status: lt.status,
                    createdAt: lt.createdAt
                })),
                metadata: Object.fromEntries(ticket.metadata)
            },
            messages: messages.map(m => ({
                id: m._id,
                sender: m.sender,
                content: m.content,
                status: m.status,
                confidence: m.confidence,
                reasoning: m.reasoning,
                approvedBy: m.approvedBy,
                editedContent: m.editedContent,
                rejectionReason: m.rejectionReason,
                createdAt: m.createdAt
            }))
        });
    } catch (error) {
        console.error('Get admin ticket details error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
});

router.post('/tickets/:ticketId/approve/:messageId', async (req, res) => {
    try {
        const { ticketId, messageId } = req.params;
        const { adminName = 'Admin' } = req.body;

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const message = await Message.findById(messageId);
        if (!message || message.ticketId !== ticketId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Update message status
        message.status = 'approved';
        message.approvedBy = adminName;
        await message.save();

        // Update ticket
        ticket.needsApproval = false;
        ticket.lastResponseTime = new Date();
        ticket.status = 'open';
        await ticket.save();

        // Send email to guest
        await sendNewResponseEmail(ticket, message);

        res.json({ success: true, message: 'Response approved and sent' });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve response' });
    }
});

router.post('/tickets/:ticketId/edit/:messageId', async (req, res) => {
    try {
        const { ticketId, messageId } = req.params;
        const { editedContent, adminName = 'Admin' } = req.body;

        if (!editedContent) {
            return res.status(400).json({ error: 'Edited content is required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const message = await Message.findById(messageId);
        if (!message || message.ticketId !== ticketId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Update message
        message.status = 'edited';
        message.editedContent = editedContent;
        message.content = editedContent; // Update the actual content
        message.approvedBy = adminName;
        await message.save();

        // Update ticket
        ticket.needsApproval = false;
        ticket.lastResponseTime = new Date();
        ticket.status = 'open';
        await ticket.save();

        // Send email
        await sendNewResponseEmail(ticket, message);

        res.json({ success: true, message: 'Response edited and sent' });
    } catch (error) {
        console.error('Edit error:', error);
        res.status(500).json({ error: 'Failed to edit response' });
    }
});

router.post('/tickets/:ticketId/reject/:messageId', async (req, res) => {
    try {
        const { ticketId, messageId } = req.params;
        const { rejectionReason, manualResponse, adminName = 'Admin' } = req.body;

        if (!manualResponse) {
            return res.status(400).json({ error: 'Manual response is required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const message = await Message.findById(messageId);
        if (!message || message.ticketId !== ticketId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Mark agent message as rejected
        message.status = 'rejected';
        message.rejectionReason = rejectionReason || 'Admin provided manual response';
        await message.save();

        // Create manual admin response
        const adminMessage = new Message({
            ticketId,
            sender: 'admin',
            content: manualResponse,
            status: 'sent',
            approvedBy: adminName
        });
        await adminMessage.save();

        // Update ticket
        ticket.needsApproval = false;
        ticket.lastResponseTime = new Date();
        ticket.status = 'open';
        await ticket.save();

        // Send email
        await sendNewResponseEmail(ticket, adminMessage);

        res.json({ success: true, message: 'Agent response rejected, manual response sent' });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: 'Failed to reject and send manual response' });
    }
});

router.post('/tickets/:ticketId/reassign', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { newAgent } = req.body;

        if (!['RefundAgent', 'TechnicalAgent', 'GeneralAgent', 'admin'].includes(newAgent)) {
            return res.status(400).json({ error: 'Invalid agent name' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        ticket.assignedAgent = newAgent;
        await ticket.save();

        res.json({ success: true, message: `Ticket reassigned to ${newAgent}` });
    } catch (error) {
        console.error('Reassign error:', error);
        res.status(500).json({ error: 'Failed to reassign ticket' });
    }
});

router.post('/tickets/:ticketId/reply', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, adminName = 'Admin' } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const adminMessage = new Message({
            ticketId,
            sender: 'admin',
            content,
            status: 'sent',
            approvedBy: adminName
        });
        await adminMessage.save();

        ticket.lastResponseTime = new Date();
        ticket.status = 'open';
        ticket.escalated = false;
        await ticket.save();

        await sendNewResponseEmail(ticket, adminMessage);

        res.json({ success: true, message: 'Admin reply sent' });
    } catch (error) {
        console.error('Admin reply error:', error);
        res.status(500).json({ error: 'Failed to send admin reply' });
    }
});

router.put('/tickets/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!['open', 'pending', 'resolved', 'escalated'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        ticket.status = status;
        await ticket.save();

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

router.post('/tickets/:ticketId/link', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { targetTicketId } = req.body;

        if (!targetTicketId) {
            return res.status(400).json({ error: 'Target ticket ID required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        const targetTicket = await Ticket.findOne({ ticketId: targetTicketId });

        if (!ticket || !targetTicket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Add bidirectional link
        if (!ticket.linkedTickets.includes(targetTicket._id)) {
            ticket.linkedTickets.push(targetTicket._id);
            await ticket.save();
        }

        if (!targetTicket.linkedTickets.includes(ticket._id)) {
            targetTicket.linkedTickets.push(ticket._id);
            await targetTicket.save();
        }

        res.json({
            success: true,
            message: `Tickets ${ticketId} and ${targetTicketId} linked`
        });
    } catch (error) {
        console.error('Link tickets error:', error);
        res.status(500).json({ error: 'Failed to link tickets' });
    }
});

router.post('/tickets/:ticketId/merge', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { targetTicketId } = req.body;

        if (!targetTicketId) {
            return res.status(400).json({ error: 'Target ticket ID required' });
        }

        if (ticketId === targetTicketId) {
            return res.status(400).json({ error: 'Cannot merge ticket with itself' });
        }

        const sourceTicket = await Ticket.findOne({ ticketId });
        const targetTicket = await Ticket.findOne({ ticketId: targetTicketId });

        if (!sourceTicket || !targetTicket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Move all messages from source to target
        await Message.updateMany(
            { ticketId },
            { $set: { ticketId: targetTicketId } }
        );

        // Add merge note to target ticket
        const mergeNote = new Message({
            ticketId: targetTicketId,
            sender: 'admin',
            content: `**Ticket Merged:** This ticket was merged with #${ticketId} (${sourceTicket.subject})`,
            status: 'sent'
        });
        await mergeNote.save();

        // Close source ticket and mark as merged
        sourceTicket.status = 'resolved';
        sourceTicket.metadata.set('mergedInto', targetTicketId);
        sourceTicket.metadata.set('mergedAt', new Date().toISOString());
        await sourceTicket.save();

        res.json({
            success: true,
            message: `Ticket ${ticketId} merged into ${targetTicketId}`
        });
    } catch (error) {
        console.error('Merge tickets error:', error);
        res.status(500).json({ error: 'Failed to merge tickets' });
    }
});

router.post('/tickets/:ticketId/unlink', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { targetTicketId } = req.body;

        if (!targetTicketId) {
            return res.status(400).json({ error: 'Target ticket ID required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        const targetTicket = await Ticket.findOne({ ticketId: targetTicketId });

        if (!ticket || !targetTicket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Remove bidirectional link
        ticket.linkedTickets = ticket.linkedTickets.filter(
            id => !id.equals(targetTicket._id)
        );
        await ticket.save();

        targetTicket.linkedTickets = targetTicket.linkedTickets.filter(
            id => !id.equals(ticket._id)
        );
        await targetTicket.save();

        res.json({
            success: true,
            message: `Tickets ${ticketId} and ${targetTicketId} unlinked`
        });
    } catch (error) {
        console.error('Unlink tickets error:', error);
        res.status(500).json({ error: 'Failed to unlink tickets' });
    }
});

module.exports = router;
