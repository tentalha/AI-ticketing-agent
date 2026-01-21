import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getTicket, replyToTicket } from '../services/api.js';

function TicketView() {
    const { ticketId } = useParams();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTicket();
        // Poll for updates every 10 seconds
        const interval = setInterval(loadTicket, 10000);
        return () => clearInterval(interval);
    }, [ticketId]);

    const loadTicket = async () => {
        try {
            const data = await getTicket(ticketId);
            setTicket(data.ticket);
            setMessages(data.messages);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load ticket');
            setLoading(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setSending(true);
        setError('');

        try {
            await replyToTicket(ticketId, replyContent);
            setReplyContent('');
            await loadTicket(); // Reload to show new messages
            setSending(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reply');
            setSending(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading ticket...</div>;
    }

    if (error && !ticket) {
        return (
            <div className="container">
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="header">
                <h1>Support Ticket</h1>
                <div className="nav">
                    <a href="/">← Submit New Request</a>
                </div>
            </div>

            <div className="card">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #f0f0f0'
                }}>
                    <div>
                        <h2 style={{ marginBottom: '5px' }}>{ticket.subject}</h2>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Ticket #{ticket.ticketId} | {ticket.guestName}
                        </p>
                    </div>
                    <div>
                        <span className={`status-badge status-${ticket.status}`}>
                            {ticket.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {ticket.escalated && (
                    <div style={{
                        background: '#fff3e0',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        <strong>Escalated:</strong> {ticket.escalationReason}
                    </div>
                )}

                {ticket.linkedTickets && ticket.linkedTickets.length > 0 && (
                    <div style={{
                        background: '#e3f2fd',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        <strong>Related Tickets:</strong>
                        <div style={{ marginTop: '8px' }}>
                            {ticket.linkedTickets.map(lt => (
                                <div key={lt.ticketId} style={{ marginBottom: '5px' }}>
                                    <a
                                        href={`/ticket/${lt.ticketId}`}
                                        style={{
                                            color: '#1976d2',
                                            textDecoration: 'none',
                                            fontWeight: '500'
                                        }}
                                    >
                                        #{lt.ticketId} - {lt.subject}
                                    </a>
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                                        ({lt.status})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Conversation</h3>

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message message-${msg.sender.toLowerCase().replace('agent', '').replace('refund', 'agent').replace('technical', 'agent').replace('general', 'agent')}`}
                        >
                            <div className="message-sender">
                                {msg.sender === 'guest' ? ticket.guestName : msg.sender}
                                {msg.status === 'pending_approval' && ' (Pending Approval)'}
                            </div>
                            <div className="message-content">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <div className="message-meta">
                                {new Date(msg.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                {ticket.status !== 'resolved' && (
                    <div>
                        <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>Reply</h3>
                        <form onSubmit={handleReply}>
                            <textarea
                                className="textarea"
                                placeholder="Type your reply here..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                required
                            />
                            {error && <div className="error">{error}</div>}
                            <button
                                type="submit"
                                className="button button-primary"
                                disabled={sending}
                                style={{ marginTop: '10px' }}
                            >
                                {sending ? 'Sending...' : 'Send Reply'}
                            </button>
                        </form>
                    </div>
                )}

                {ticket.status === 'resolved' && (
                    <div style={{
                        background: '#e8f5e9',
                        padding: '15px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#2e7d32'
                    }}>
                        This ticket has been resolved
                    </div>
                )}
            </div>
        </div>
    );
}

export default TicketView;
