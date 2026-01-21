const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendTicketCreatedEmail(ticket) {
    const ticketUrl = `${process.env.FRONTEND_URL}/ticket/${ticket.ticketId}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: ticket.guestEmail,
        subject: `Ticket Created: ${ticket.subject}`,
        html: `
      <h2>Your support ticket has been created</h2>
      <p>Hi ${ticket.guestName},</p>
      <p>Thank you for contacting us. We've received your request and assigned it ticket ID: <strong>${ticket.ticketId}</strong></p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <p>You can view and reply to your ticket using this link:</p>
      <p><a href="${ticketUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Ticket</a></p>
      <p>Or copy this link: ${ticketUrl}</p>
      <p>You will receive email notifications when there are updates to your ticket.</p>
      <br>
      <p>Best regards,<br>Support Team</p>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Ticket created email sent to ${ticket.guestEmail}`);
    } catch (error) {
        console.error('Email send error:', error);
        // Don't throw - email failure shouldn't break ticket creation
    }
}

async function sendNewResponseEmail(ticket, message) {
    const ticketUrl = `${process.env.FRONTEND_URL}/ticket/${ticket.ticketId}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: ticket.guestEmail,
        subject: `New Response: ${ticket.subject}`,
        html: `
      <h2>You have a new response</h2>
      <p>Hi ${ticket.guestName},</p>
      <p>There's a new response to your support ticket <strong>${ticket.ticketId}</strong>:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
        <p><strong>From:</strong> ${message.sender}</p>
        <p>${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}</p>
      </div>
      <p><a href="${ticketUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Conversation</a></p>
      <p>Or copy this link: ${ticketUrl}</p>
      <br>
      <p>Best regards,<br>Support Team</p>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`New response email sent to ${ticket.guestEmail}`);
    } catch (error) {
        console.error('Email send error:', error);
    }
}

async function sendEscalationAlert(ticket, reason) {
    console.log(`ESCALATION ALERT: Ticket ${ticket.ticketId} escalated - ${reason}`);

    // In production, send email to admin team
    // For now, just log it
}

module.exports = {
    sendTicketCreatedEmail,
    sendNewResponseEmail,
    sendEscalationAlert
};
