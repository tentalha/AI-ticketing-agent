const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        ref: 'Ticket'
    },
    sender: {
        type: String,
        enum: ['guest', 'RefundAgent', 'TechnicalAgent', 'GeneralAgent', 'admin'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'pending_approval', 'approved', 'rejected', 'edited'],
        default: 'sent'
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1
    },
    reasoning: {
        type: String
    },
    approvedBy: {
        type: String
    },
    editedContent: {
        type: String
    },
    rejectionReason: {
        type: String
    },
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
