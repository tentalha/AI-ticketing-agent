# AI Multi-Agent Support System

A full-stack support ticket system that automatically classifies, routes, and responds to customer support requests with human oversight.

## Project Overview

This system uses an orchestrator to analyze incoming support tickets and route them to specialized agents. The agents automatically generate responses based on their domain expertise. A confidence-based routing system ensures quality control, with human admins reviewing medium-confidence responses and handling edge cases.

## Architecture

### System Components

```
┌─────────────┐
│   Guest     │ → Submits ticket via web form
└──────┬──────┘
       ↓
┌─────────────────────────────────────┐
│   Orchestrator AI (Claude)          │ → Classifies intent + routes
│   - Returns confidence score        │
│   - Checks for duplicates            │
└──────┬──────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│  Routing Decision (Confidence-based) │
└──────┬───────────────────────────────┘
       ↓
┌──────┴────────┬──────────────┬────────────┐
│ High (≥0.8)   │ Med (0.5-0.8)│ Low (<0.5) │
│ Auto-respond  │ Queue for    │ Escalate   │
│               │ approval     │ to admin   │
└───────────────┴──────────────┴────────────┘
       ↓
┌──────────────────────────────────────────┐
│  Specialized Agents (Claude)             │
│  - RefundAgent: Refunds & cancellations  │
│  - TechnicalAgent: Tech issues & bugs    │
│  - GeneralAgent: General inquiries       │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│  Admin Review (for medium confidence)    │
│  - Approve, Edit, Reject, or Reassign    │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│  Guest receives email notification       │
│  with unique link to view/reply          │
└──────────────────────────────────────────┘
```

### Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- Anthropic Claude (AI)
- Nodemailer (Email)
- node-cron (Background jobs)

**Frontend:**
- React 18
- Vite (build tool)
- React Router
- Axios
- CSS (no frameworks for simplicity)

## Features Implemented

### 1. Conversation Threading
- Full back-and-forth communication
- Guest receives email with unique ticket link
- Complete conversation history visible to admin and guest
- Real-time updates (polling)

### 2. AI Confidence Routing
- **High confidence (≥0.8)**: Agent auto-responds, sent directly to guest
- **Medium confidence (0.5-0.8)**: Response queued for admin approval
- **Low confidence (<0.5)**: Escalated directly to admin

### 3. Agent Response Review
Admin can:
- **Approve**: Send agent response as-is
- **Edit**: Modify response before sending
- **Reject**: Write manual response instead
- **Reassign**: Route to different agent

### 4. Response Time Escalation
- Background job checks every 2 minutes
- Configurable timeout (default 15 minutes)
- Auto-escalates unresponsive tickets to admin
- Alerts shown in admin dashboard

### 5. Duplicate Detection
- AI checks for similar open tickets from same guest
- Shows potential duplicates before creating ticket
- Option to view existing ticket or create new one

### 6. Agent Failure Handling
- Try-catch around all AI calls
- Auto-escalate on timeout, error, or invalid output
- Error context logged and shown to admin
- No silent failures

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Gmail account for email notifications (or other SMTP)

### Step 1: Clone/Download

```bash
cd "Agent assesment"
```

### Step 2: Setup Backend

```bash
cd server
npm install
```

Create `.env` file in `/server`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-support-system
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Agent Configuration
AGENT_TIMEOUT_MS=30000
HIGH_CONFIDENCE_THRESHOLD=0.8
MEDIUM_CONFIDENCE_THRESHOLD=0.5
ESCALATION_TIME_MINUTES=15
```

**Important for Gmail:**
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the app password (not your regular Gmail password) in `EMAIL_PASS`

### Step 3: Setup Frontend

```bash
cd ../client
npm install
```

The `.env` file is already created with default values.

### Step 4: Start MongoDB

Make sure MongoDB is running:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --dbpath=/path/to/data/directory
```

### Step 5: Start Backend

```bash
cd server
npm run dev
```

You should see:
```
✓ Connected to MongoDB
✓ Server running on port 5000
✓ Background jobs started
```

### Step 6: Start Frontend

In a new terminal:

```bash
cd crun dev
```

Browser will automatically
Browser should open to `http://localhost:3000`

## Testing Each Feature

### Test 1: High Confidence Auto-Response

1. Go to `http://localhost:3000`
2. Fill out form:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Subject: "I want a refund"
   - Description: "I need my money back for order #12345. It hasn't arrived."
3. Submit
4. **Expected**: Ticket created, routed to RefundAgent, auto-response generated and sent
5. Check your email for notification with ticket link
6. Click link to see conversation

### Test 2: Medium Confidence (Needs Approval)

1. Submit ticket:
   - Subject: "Maybe a refund?"
   - Description: "I'm not sure if I want to cancel my order or not"
2. **Expected**: Ticket created, agent generates response, but status = "pending"
3. Go to `http://localhost:3000/admin`
4. See ticket with "NEEDS APPROVAL" badge
5. Click ticket, see pending response with yellow background
6. Test approve/edit/reject options

### Test 3: Low Confidence (Auto-Escalate)

1. Submit ticket:
   - Subject: "Random question"
   - Description: "What is the meaning of life?"
2. **Expected**: Low confidence, immediately escalated to admin
3. Admin dashboard shows "ESCALATED" badge
4. Escalation reason: "Low confidence classification"

### Test 4: Duplicate Detection

1. Create a ticket about refunds
2. Immediately create another ticket with similar content from same email
3. **Expected**: System shows warning about duplicate ticket
4. Options to view existing ticket or create anyway

### Test 5: Response Time Escalation

1. Create a ticket that would normally auto-respond
2. Manually update `ESCALATION_TIME_MINUTES=0.1` in server `.env` (6 seconds)
3. Restart backend
4. Wait 6+ seconds
5. Background job will auto-escalate the ticket
6. Check admin dashboard for escalation alert

### Test 6: Agent Failure Handling

1. Temporarily set invalid `ANTHROPIC_API_KEY` in server `.env`
2. Restart backend
3. Submit a ticket
4. **Expected**: AI call fails, ticket auto-escalates with error message
5. Admin sees error context

### Test 7: Conversation Threading

1. As guest, reply to an existing ticket
2. **Expected**: 
   - Agent generates follow-up response
   - Full conversation history maintained
   - Email notification sent
3. Go to ticket link, see complete thread

### Test 8: Admin Manual Actions

Go to `http://localhost:3000/admin`:

1. **Reassign**: Change ticket from one agent to another
2. **Manual Reply**: Admin sends custom message
3. **Status Change**: Mark ticket as resolved
4. **Edit Response**: Modify agent's response before sending
5. **Reject Response**: Reject agent and write manual response

## Project Structure

```
Agent assesment/
├── server/
│   ├── models/
│   │   ├── Ticket.js          # Ticket schema
│   │   └── Message.js         # Message schema
│   ├── routes/
│   │   ├── tickets.js         # Guest ticket routes
│   │   └── admin.js           # Admin management routes
│   ├── services/
│   │   ├── orchestrator.js    # Orchestrator AI + duplicate check
│   │   ├── agents.js          # 3 specialized AI agents
│   │   ├── emailService.js    # Email notifications
│   │   └── backgroundJobs.js  # Escalation cron job
│   ├── server.js              # Main Express server
│   ├── package.json
│   └── .env.example
│
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── GuestForm.js        # Public ticket submission
│   │   │   ├── TicketView.js       # Guest ticket view/reply
│   │   │   ├── AdminDashboard.js   # Admin ticket list
│   │   │   └── AdminTicketView.js  # Admin ticket management
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── App.js                  # Router
│   │   ├── index.js                # React entry
│   │   └── index.css               # Styles
│   ├── package.json
│   └── .env
│
└── README.md
```

## Architecture Decisions Explained

### Why Anthropic Claude?
I chose Claude for its strong reasoning capabilities and reliable JSON output. It handles classification tasks well and has a good understanding of customer service context.

### Why Confidence-Based Routing?
This approach balances automation with quality control. High-confidence requests get instant responses, uncertain cases get human review, and low-confidence tickets go straight to expert humans.

### Why Simple Stack?
- **No auth system**: Keeps focus on core features
- **No state management library**: React state is sufficient for this scope
- **No CSS framework**: Clean, readable CSS
- **Minimal dependencies**: Easier to understand and maintain

### Database Design

**Ticket Model:**
Stores classification metadata (intent, confidence, reasoning), tracks escalation status and reason, references linked/duplicate tickets, and follows a status workflow: open → pending → resolved/escalated.

**Message Model:**
Separate from tickets for flexibility. Tracks approval status (pending → approved/rejected/edited), stores reasoning for transparency, and references tickets by ticketId.

### Background Jobs

**Why node-cron?**
It's simple and doesn't require an external job queue. It runs in the same process as the API, which is sufficient for this scale and easy to understand.

**Escalation Logic:**
The system checks the `lastResponseTime` field with a configurable timeout threshold. It runs every 2 minutes to balance responsiveness and performance.

### Email Notifications

**Why email?**
Email is universal, has no SMS costs or dependencies, supports rich HTML, and the unique link provides secure access.

**Design:**
Emails are sent asynchronously so they don't block the API. Failures are logged but don't break the flow. The system uses template-based HTML emails with clear call-to-action links.

## Security Considerations

**For Production, Add:**

1. **Authentication**: JWT for admin, signed tokens for guest links
2. **Rate Limiting**: Prevent abuse of ticket creation
3. **Input Validation**: Sanitize all user inputs
4. **CORS**: Restrict to specific domains
5. **HTTPS**: Encrypt all communication
6. **API Key Protection**: Use secrets manager, not .env
7. **Database**: Add indexes, use connection pooling
8. **Monitoring**: Log errors, track AI usage costs

## UI/UX Design

**Guest Interface:**
- Clean, minimal form
- Clear feedback on submission
- Duplicate detection upfront
- Easy-to-access ticket link

**Admin Interface:**
- Dashboard with key metrics
- Filter by status/escalation/approval
- Inline actions on messages
- Clear visual indicators for urgent items

## Future Enhancements

1. **Analytics Dashboard**: Track agent performance, response times, resolution rates
2. **Agent Training**: Fine-tune agents on historical successful responses
3. **Multi-language Support**: Auto-detect and respond in customer's language
4. **File Attachments**: Allow guests to upload screenshots/documents
5. **Live Chat**: Real-time WebSocket communication
6. **Knowledge Base Integration**: Agents reference FAQ/documentation
7. **Sentiment Analysis**: Track customer satisfaction
8. **Auto-categorization**: Tag tickets for reporting

## Troubleshooting

**MongoDB Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
→ Make sure MongoDB is running: `brew services start mongodb-community`

**AI API Error:**
```
Error: 401 Unauthorized
```
→ Check your `ANTHROPIC_API_KEY` in server `.env`

**Email Not Sending:**
```
Error: Invalid login
```
→ Use Gmail App Password, not regular password

**Port Already in Use:**
```
Error: listen EADDRINUSE: address already in use :::5000
```
→ Kill process: `lsof -ti:5000 | xargs kill -9`

**CORS Error in Browser:**
```
Access to XMLHttpRequest blocked by CORS policy
```
→ Make sure backend is running and CORS is enabled (it is by default)

## Support

For questions about this project:
1. Check the troubleshooting section above
2. Review the code comments
3. Test with the provided test scenarios

## 30-Minute Walkthrough Call Topics

1. **System Overview** (5 min)
   - Architecture diagram walkthrough
   - Component interaction flow

2. **AI Integration** (8 min)
   - Orchestrator classification logic
   - Agent specialization and prompts
   - Confidence scoring explanation

3. **Key Features Demo** (10 min)
   - Live demo of each major feature
   - Show admin approval workflow
   - Demonstrate escalation handling

4. **Code Walkthrough** (5 min)
   - Backend route structure
   - Frontend component organization
   - Database models

5. **Q&A** (2 min)

## License

This is a test project for assessment purposes.

---

Built for the Full Stack Developer Assessment
