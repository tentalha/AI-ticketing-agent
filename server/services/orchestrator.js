const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

async function classifyAndRoute(subject, content) {
    try {
        const prompt = `You are an intelligent ticket routing system. Analyze the following support request and classify it into one of three categories:

1. REFUND - Requests about refunds, cancellations, returns, money back, billing disputes
2. TECHNICAL - Technical issues, bugs, errors, app problems, system failures, login issues
3. GENERAL - General inquiries, questions about services, business hours, contact info, features

Support Request:
Subject: ${subject}
Content: ${content}

CONFIDENCE SCORING GUIDELINES:
- HIGH (0.8-1.0): Clear, single-category request with specific details. Obvious intent.
- MEDIUM (0.5-0.8): Ambiguous requests that could fit multiple categories, vague descriptions, missing critical details, or requests that mix multiple intents.
- LOW (0.0-0.5): Extremely unclear, nonsensical, or requires information not available to determine category.

Be conservative with high confidence scores. If there's ANY ambiguity, overlapping categories, or missing context, use MEDIUM confidence (0.5-0.8).

Respond in JSON format with:
{
  "intent": "REFUND" or "TECHNICAL" or "GENERAL",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of your classification and confidence level",
  "agentName": "RefundAgent" or "TechnicalAgent" or "GeneralAgent"
}`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse orchestrator response');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Validate result
        if (!result.intent || !result.agentName || typeof result.confidence !== 'number') {
            throw new Error('Invalid orchestrator response format');
        }

        return result;
    } catch (error) {
        console.error('Orchestrator error:', error);
        throw new Error(`Orchestrator failed: ${error.message}`);
    }
}

async function checkDuplicates(guestEmail, subject, content, Ticket) {
    try {
        // Find open tickets from same email
        const openTickets = await Ticket.find({
            guestEmail: guestEmail.toLowerCase(),
            status: { $in: ['open', 'pending'] }
        }).limit(10);

        if (openTickets.length === 0) {
            return { hasDuplicates: false, similarTickets: [] };
        }

        const ticketsInfo = openTickets.map(t => ({
            ticketId: t.ticketId,
            subject: t.subject
        }));

        const prompt = `Compare this new support request with existing open tickets from the same user.

New Request:
Subject: ${subject}
Content: ${content}

Existing Open Tickets:
${JSON.stringify(ticketsInfo, null, 2)}

Are any of these tickets about the same or very similar issue? Respond in JSON:
{
  "hasDuplicates": true or false,
  "similarTicketIds": ["ticketId1", "ticketId2"],
  "reasoning": "brief explanation"
}`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const responseText = message.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return { hasDuplicates: false, similarTickets: [] };
        }

        const result = JSON.parse(jsonMatch[0]);

        const similarTickets = openTickets.filter(t =>
            result.similarTicketIds && result.similarTicketIds.includes(t.ticketId)
        );

        return {
            hasDuplicates: result.hasDuplicates,
            similarTickets: similarTickets,
            reasoning: result.reasoning
        };
    } catch (error) {
        console.error('Duplicate check error:', error);
        // Don't fail the request if duplicate check fails
        return { hasDuplicates: false, similarTickets: [] };
    }
}

module.exports = {
    classifyAndRoute,
    checkDuplicates
};
