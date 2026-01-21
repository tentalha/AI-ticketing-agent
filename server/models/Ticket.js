const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    guestEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    guestName: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'resolved', 'escalated'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedAgent: {
        type: String,
        enum: ['RefundAgent', 'TechnicalAgent', 'GeneralAgent', 'admin', null],
        default: null
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    intent: {
        type: String,
        default: ''
    },
    reasoning: {
        type: String,
        default: ''
    },
    escalated: {
        type: Boolean,
        default: false
    },
    escalationReason: {
        type: String,
        default: ''
    },
    lastResponseTime: {
        type: Date,
        default: Date.now
    },
    needsApproval: {
        type: Boolean,
        default: false
    },
    linkedTickets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    }],
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true
});

// Index for faster lookups
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ guestEmail: 1, status: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
