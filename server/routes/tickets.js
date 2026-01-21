const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const { classifyAndRoute, checkDuplicates } = require('../services/orchestrator');
const { getAgent } = require('../services/agents');
const { sendTicketCreatedEmail, sendNewResponseEmail } = require('../services/emailService');

const HIGH_CONFIDENCE = parseFloat(process.env.HIGH_CONFIDENCE_THRESHOLD) || 0.8;
const MEDIUM_CONFIDENCE = parseFloat(process.env.MEDIUM_CONFIDENCE_THRESHOLD) || 0.5;

router.post('/', async (req, res) => {
    try {
        const { guestName, guestEmail, subject, content } = req.body;

        // Validate input
        if (!guestName || !guestEmail || !subject || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for duplicates
        const duplicateCheck = await checkDuplicates(guestEmail, subject, content, Ticket);

        if (duplicateCheck.hasDuplicates && duplicateCheck.similarTickets.length > 0) {
            return res.status(200).json({
                duplicatesFound: true,
                similarTickets: duplicateCheck.similarTickets.map(t => ({
                    ticketId: t.ticketId,
                    subject: t.subject,
                    status: t.status,
                    createdAt: t.createdAt
                })),
                reasoning: duplicateCheck.reasoning
            });
        }

        const classification = await classifyAndRoute(subject, content);

        // Create ticket
        const ticketId = uuidv4().split('-')[0].toUpperCase();
        const ticket = new Ticket({
            ticketId,
            guestName,
            guestEmail: guestEmail.toLowerCase(),
            subject,
            confidence: classification.confidence,
            intent: classification.intent,
            reasoning: classification.reasoning,
            assignedAgent: classification.agentName,
            status: classification.confidence < MEDIUM_CONFIDENCE ? 'escalated' : 'open',
            escalated: classification.confidence < MEDIUM_CONFIDENCE,
            escalationReason: classification.confidence < MEDIUM_CONFIDENCE
                ? 'Low confidence classification'
                : ''
        });

        await ticket.save();

        // Save initial message
        const initialMessage = new Message({
            ticketId,
            sender: 'guest',
            content,
            status: 'sent'
        });
        await initialMessage.save();

        // Send email notification
        await sendTicketCreatedEmail(ticket);

        // Handle based on confidence level
        if (classification.confidence >= HIGH_CONFIDENCE) {
            // High confidence: Auto-respond with agent
            await processAgentResponse(ticket, subject, content);
        } else if (classification.confidence >= MEDIUM_CONFIDENCE) {
            // Medium confidence: Generate response but queue for approval
            await generatePendingResponse(ticket, subject, content);
        }
        // Low confidence already escalated to admin

        res.status(201).json({
            success: true,
            ticket: {
                ticketId: ticket.ticketId,
                status: ticket.status,
                assignedAgent: ticket.assignedAgent,
                confidence: ticket.confidence,
                needsApproval: ticket.needsApproval
            }
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ error: 'Failed to create ticket', details: error.message });
    }
});

router.get('/:ticketId', async (req, res) => {
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
                assignedAgent: ticket.assignedAgent,
                confidence: ticket.confidence,
                createdAt: ticket.createdAt,
                escalated: ticket.escalated,
                escalationReason: ticket.escalationReason,
                linkedTickets: ticket.linkedTickets.map(lt => ({
                    ticketId: lt.ticketId,
                    subject: lt.subject,
                    status: lt.status
                }))
            },
            messages: messages.map(m => ({
                id: m._id,
                sender: m.sender,
                content: m.content,
                status: m.status,
                createdAt: m.createdAt
            }))
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

router.post('/:ticketId/reply', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Save guest reply
        const guestMessage = new Message({
            ticketId,
            sender: 'guest',
            content,
            status: 'sent'
        });
        await guestMessage.save();

        // Update ticket
        ticket.lastResponseTime = new Date();
        ticket.status = 'open';
        await ticket.save();

        // Get conversation history
        const messages = await Message.find({ ticketId }).sort({ createdAt: 1 });
        const conversationHistory = messages.map(m => ({
            sender: m.sender,
            content: m.content
        }));

        // Generate agent response based on confidence
        if (ticket.confidence >= HIGH_CONFIDENCE) {
            await processAgentResponse(ticket, ticket.subject, content, conversationHistory);
        } else {
            await generatePendingResponse(ticket, ticket.subject, content, conversationHistory);
        }

        res.json({ success: true, message: 'Reply sent' });
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

async function processAgentResponse(ticket, subject, content, conversationHistory = []) {
    try {
        const agent = getAgent(ticket.assignedAgent);
        const agentResponse = await agent.generateResponse(subject, content, conversationHistory);

        const agentMessage = new Message({
            ticketId: ticket.ticketId,
            sender: ticket.assignedAgent,
            content: agentResponse.response,
            confidence: agentResponse.confidence,
            reasoning: agentResponse.reasoning,
            status: 'sent'
        });
        await agentMessage.save();

        ticket.lastResponseTime = new Date();
        await ticket.save();

        await sendNewResponseEmail(ticket, agentMessage);
    } catch (error) {
        console.error('Agent response error:', error);
        // Escalate on agent failure
        ticket.escalated = true;
        ticket.escalationReason = `Agent failure: ${error.message}`;
        ticket.status = 'escalated';
        ticket.assignedAgent = 'admin';
        await ticket.save();
    }
}

async function generatePendingResponse(ticket, subject, content, conversationHistory = []) {
    try {
        const agent = getAgent(ticket.assignedAgent);
        const agentResponse = await agent.generateResponse(subject, content, conversationHistory);

        const agentMessage = new Message({
            ticketId: ticket.ticketId,
            sender: ticket.assignedAgent,
            content: agentResponse.response,
            confidence: agentResponse.confidence,
            reasoning: agentResponse.reasoning,
            status: 'pending_approval'
        });
        await agentMessage.save();

        ticket.needsApproval = true;
        ticket.status = 'pending';
        await ticket.save();
    } catch (error) {
        console.error('Agent response generation error:', error);
        ticket.escalated = true;
        ticket.escalationReason = `Agent failure: ${error.message}`;
        ticket.status = 'escalated';
        ticket.assignedAgent = 'admin';
        await ticket.save();
    }
}

module.exports = router;
