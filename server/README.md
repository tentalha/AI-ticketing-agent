# Backend Server

## Structure

```
server/
├── models/          # MongoDB schemas
│   ├── Ticket.js   # Support ticket model
│   └── Message.js  # Conversation message model
├── routes/          # Express routes
│   ├── tickets.js  # Guest API endpoints
│   └── admin.js    # Admin API endpoints
├── services/        # Business logic
│   ├── orchestrator.js    # AI classification & routing
│   ├── agents.js          # Specialized AI agents
│   ├── emailService.js    # Email notifications
│   └── backgroundJobs.js  # Cron jobs for escalation
└── server.js        # Express app entry point
```

## API Endpoints

### Guest Endpoints

**POST /api/tickets**
- Create new support ticket
- Checks for duplicates
- Routes to appropriate agent
- Returns ticket ID

**GET /api/tickets/:ticketId**
- Get ticket details and messages
- Public access via unique ticket ID

**POST /api/tickets/:ticketId/reply**
- Guest replies to their ticket
- Triggers agent response

### Admin Endpoints

**GET /api/admin/tickets**
- List all tickets with filters
- Query params: status, needsApproval, escalated

**GET /api/admin/tickets/:ticketId**
- Get full ticket details with metadata

**POST /api/admin/tickets/:ticketId/approve/:messageId**
- Approve pending agent response

**POST /api/admin/tickets/:ticketId/edit/:messageId**
- Edit and send agent response

**POST /api/admin/tickets/:ticketId/reject/:messageId**
- Reject agent response and send manual reply

**POST /api/admin/tickets/:ticketId/reassign**
- Reassign ticket to different agent

**POST /api/admin/tickets/:ticketId/reply**
- Admin sends manual reply

**PUT /api/admin/tickets/:ticketId/status**
- Update ticket status

## Environment Variables

See `.env.example` for all configuration options.

Required:
- `ANTHROPIC_API_KEY` - Claude API key
- `MONGODB_URI` - MongoDB connection string

Optional but recommended:
- `EMAIL_*` - SMTP configuration for notifications
- `*_THRESHOLD` - Confidence thresholds for routing
- `ESCALATION_TIME_MINUTES` - Auto-escalation timeout

## Running

Development with auto-reload:
```bash
npm run dev
```

Production:
```bash
npm start
```
