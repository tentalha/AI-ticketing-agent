# Frontend Client

## Structure

```
client/src/
├── components/
│   ├── GuestForm.js        # Submit new ticket
│   ├── TicketView.js       # View/reply to ticket (guest)
│   ├── AdminDashboard.js   # Admin ticket list
│   └── AdminTicketView.js  # Admin ticket management
├── services/
│   └── api.js              # API client with all endpoints
├── App.js                  # React Router setup
├── index.js                # React entry point
└── index.css               # Global styles
```

## Routes

**Guest Routes:**
- `/` - Submit new support ticket
- `/ticket/:ticketId` - View ticket and conversation

**Admin Routes:**
- `/admin` - Dashboard with all tickets
- `/admin/ticket/:ticketId` - Manage specific ticket

## Features

### Guest Interface
- Clean form for ticket submission
- Duplicate ticket detection with warnings
- Real-time ticket updates (10s polling)
- Full conversation thread view
- Reply functionality

### Admin Interface
- Ticket list with filters (all, pending, escalated, etc.)
- Key metrics dashboard
- Inline message approval/edit/reject
- Ticket reassignment
- Manual reply capability
- Status management
- Visual indicators for urgent items

## Running

Development server with Vite (hot reload):
```bash
npm run dev
```

Production build:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Configuration

API URL is configured in `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

Change this to your backend URL when deploying.
