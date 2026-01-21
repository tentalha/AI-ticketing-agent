const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const AGENT_TIMEOUT = parseInt(process.env.AGENT_TIMEOUT_MS) || 30000;

// Load context data
const orderHistory = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/order-history.json'), 'utf8'));
const faqData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/faq-data.json'), 'utf8'));
const techDocs = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tech-docs.json'), 'utf8'));

class BaseAgent {
    constructor(name, systemPrompt, contextData = null) {
        this.name = name;
        this.systemPrompt = systemPrompt;
        this.contextData = contextData;
    }

    async generateResponse(subject, content, conversationHistory = []) {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Agent timeout')), AGENT_TIMEOUT)
            );

            const responsePromise = this._callAI(subject, content, conversationHistory);

            return await Promise.race([responsePromise, timeoutPromise]);
        } catch (error) {
            console.error(`${this.name} error:`, error);
            throw error;
        }
    }

    async _callAI(subject, content, conversationHistory) {
        const historyText = conversationHistory.length > 0
            ? '\n\nPrevious Conversation:\n' + conversationHistory.map(msg =>
                `${msg.sender}: ${msg.content}`
            ).join('\n')
            : '';

        const contextText = this.contextData
            ? `\n\nAvailable Context Data:\n${JSON.stringify(this.contextData, null, 2)}`
            : '';

        const prompt = `${this.systemPrompt}${contextText}

Customer Request:
Subject: ${subject}
Message: ${content}${historyText}

Use the available context data to provide accurate, specific information when relevant. Provide a helpful, professional response. Then rate your confidence (0.0-1.0) in handling this request.

Respond in JSON format:
{
  "response": "your detailed response to the customer",
  "confidence": 0.0 to 1.0,
  "reasoning": "why this confidence level"
}`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse agent response');
        }

        const result = JSON.parse(jsonMatch[0]);

        if (!result.response || typeof result.confidence !== 'number') {
            throw new Error('Invalid agent response format');
        }

        return result;
    }
}


class RefundAgent extends BaseAgent {
    constructor() {
        super(
            'RefundAgent',
            `You are a Refund Specialist. You handle:
- Refund requests
- Order cancellations
- Return merchandise authorizations
- Billing disputes
- Payment issues

You have access to order history and refund policies in the context data. Reference specific order details, refund policy terms, and processing times when responding. Be empathetic but follow company policy. If you need to check order details or process a refund, explain the steps clearly. For complex cases outside standard refund policy, acknowledge the request and indicate it needs escalation.`,
            orderHistory
        );
    }
}


class TechnicalAgent extends BaseAgent {
    constructor() {
        super(
            'TechnicalAgent',
            `You are a Technical Support Specialist. You handle:
- Application errors and bugs
- Login/authentication issues
- Performance problems
- Integration issues
- Error codes and troubleshooting

You have access to technical documentation, common issues database, error codes, and system requirements in the context data. Reference specific troubleshooting steps, error code meanings, and system requirements when relevant. Provide step-by-step troubleshooting guidance. Ask clarifying questions about error messages, browser/device info, and steps to reproduce. If an issue requires backend investigation or is a critical bug, indicate it needs escalation to the technical team.`,
            techDocs
        );
    }
}


class GeneralAgent extends BaseAgent {
    constructor() {
        super(
            'GeneralAgent',
            `You are a Customer Service Specialist. You handle:
- General product questions
- Business hours and contact information
- Account information requests
- Feature explanations
- How-to questions
- General support

You have access to FAQs, company information, quick links, and general resources in the context data. Reference specific FAQ answers, company details, business hours, and contact information when relevant. Be friendly, helpful, and informative. Provide accurate information about services and features. If a question requires specific account access or detailed technical knowledge, indicate it should be escalated to appropriate specialist or human agent.`,
            faqData
        );
    }
}

// Agent factory
function getAgent(agentName) {
    switch (agentName) {
        case 'RefundAgent':
            return new RefundAgent();
        case 'TechnicalAgent':
            return new TechnicalAgent();
        case 'GeneralAgent':
            return new GeneralAgent();
        default:
            throw new Error(`Unknown agent: ${agentName}`);
    }
}

module.exports = {
    getAgent,
    RefundAgent,
    TechnicalAgent,
    GeneralAgent
};
