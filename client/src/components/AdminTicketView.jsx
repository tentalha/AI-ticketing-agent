import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
    getAdminTicketDetails,
    approveResponse,
    editResponse,
    rejectResponse,
    reassignTicket,
    adminReply,
    updateTicketStatus,
    linkTickets,
    mergeTickets,
    unlinkTickets,
    getAllTickets
} from '../services/api.js';

function AdminTicketView() {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adminName] = useState('Admin'); // In production, get from auth

    // State for various actions
    const [editingMessage, setEditingMessage] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [rejectingMessage, setRejectingMessage] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [manualResponse, setManualResponse] = useState('');
    const [replyContent, setReplyContent] = useState('');

    // State for link/merge
    const [showLinkMerge, setShowLinkMerge] = useState(false);
    const [linkTargetId, setLinkTargetId] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        loadTicket();
        const interval = setInterval(loadTicket, 5000);
        return () => clearInterval(interval);
    }, [ticketId]);

    const loadTicket = async () => {
        try {
            const data = await getAdminTicketDetails(ticketId);
            setTicket(data.ticket);
            setMessages(data.messages);
            setLoading(false);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load ticket');
            setLoading(false);
        }
    };

    const handleApprove = async (messageId) => {
        try {
            await approveResponse(ticketId, messageId, adminName);
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to approve response');
        }
    };

    const handleEditSubmit = async (messageId) => {
        try {
            await editResponse(ticketId, messageId, editContent, adminName);
            setEditingMessage(null);
            setEditContent('');
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to edit response');
        }
    };

    const handleRejectSubmit = async (messageId) => {
        try {
            await rejectResponse(ticketId, messageId, rejectReason, manualResponse, adminName);
            setRejectingMessage(null);
            setRejectReason('');
            setManualResponse('');
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to reject response');
        }
    };

    const handleReassign = async (newAgent) => {
        try {
            await reassignTicket(ticketId, newAgent);
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to reassign ticket');
        }
    };

    const handleAdminReply = async (e) => {
        e.preventDefault();
        try {
            await adminReply(ticketId, replyContent, adminName);
            setReplyContent('');
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to send reply');
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateTicketStatus(ticketId, newStatus);
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to update status');
        }
    };

    const handleSearchTickets = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const data = await getAllTickets();
            const filtered = data.tickets.filter(t =>
                t.ticketId !== ticketId &&
                (t.ticketId.toLowerCase().includes(searchText.toLowerCase()) ||
                    t.subject.toLowerCase().includes(searchText.toLowerCase()))
            ).slice(0, 5);
            setSearchResults(filtered);
        } catch (err) {
            console.error('Search error:', err);
        }
    };

    const handleLinkTickets = async () => {
        if (!linkTargetId) return;
        try {
            await linkTickets(ticketId, linkTargetId);
            await loadTicket();
            setLinkTargetId('');
            setSearchResults([]);
            setError('');
        } catch (err) {
            setError('Failed to link tickets');
        }
    };

    const handleMergeTickets = async () => {
        if (!linkTargetId) return;
        if (!confirm(`Merge ticket #${ticketId} into #${linkTargetId}? This will move all messages and close this ticket.`)) {
            return;
        }
        try {
            await mergeTickets(ticketId, linkTargetId);
            navigate(`/admin/ticket/${linkTargetId}`);
        } catch (err) {
            setError('Failed to merge tickets');
        }
    };

    const handleUnlinkTicket = async (targetId) => {
        try {
            await unlinkTickets(ticketId, targetId);
            await loadTicket();
            setError('');
        } catch (err) {
            setError('Failed to unlink tickets');
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

    const pendingMessages = messages.filter(m => m.status === 'pending_approval');

    return (
        <div className="container">
            <div className="header">
                <h1>Admin Ticket Management</h1>
                <div className="nav">
                    <a href="/admin">← Back to Dashboard</a>
                </div>
            </div>

            <div className="card">
                {/* Ticket Header */}
                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h2>{ticket.subject}</h2>
                            <p style={{ color: '#666', marginTop: '5px' }}>
                                Ticket #{ticket.ticketId} | {ticket.guestName} ({ticket.guestEmail})
                            </p>
                        </div>
                        <div>
                            <span className={`status-badge status-${ticket.status}`}>
                                {ticket.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Ticket Metadata */}
                    <div style={{
                        marginTop: '15px',
                        padding: '15px',
                        background: '#f5f5f5',
                        borderRadius: '6px',
                        fontSize: '14px'
                    }}>
                        <div><strong>Assigned Agent:</strong> {ticket.assignedAgent}</div>
                        <div><strong>Intent:</strong> {ticket.intent}</div>
                        <div><strong>Confidence:</strong> {(ticket.confidence * 100).toFixed(1)}%</div>
                        <div><strong>Reasoning:</strong> {ticket.reasoning}</div>
                        {ticket.escalated && (
                            <div style={{ color: '#f44336', marginTop: '8px' }}>
                                <strong>Escalated:</strong> {ticket.escalationReason}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                            onChange={(e) => handleReassign(e.target.value)}
                            value={ticket.assignedAgent}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="">Reassign to...</option>
                            <option value="RefundAgent">Refund Agent</option>
                            <option value="TechnicalAgent">Technical Agent</option>
                            <option value="GeneralAgent">General Agent</option>
                            <option value="admin">Admin</option>
                        </select>

                        <select
                            onChange={(e) => handleStatusChange(e.target.value)}
                            value={ticket.status}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="">Change Status...</option>
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="resolved">Resolved</option>
                            <option value="escalated">Escalated</option>
                        </select>
                    </div>
                </div>

                {error && <div className="error">{error}</div>}

                {/* Linked Tickets Display */}
                {ticket.linkedTickets && ticket.linkedTickets.length > 0 && (
                    <div style={{
                        background: '#e3f2fd',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #2196f3'
                    }}>
                        <h4 style={{ marginBottom: '10px' }}>Linked Tickets</h4>
                        {ticket.linkedTickets.map(lt => (
                            <div key={lt.ticketId} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px',
                                background: 'white',
                                borderRadius: '4px',
                                marginBottom: '5px'
                            }}>
                                <div>
                                    <strong>#{lt.ticketId}</strong> - {lt.subject}
                                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                                        ({lt.status})
                                    </span>
                                </div>
                                <div>
                                    <button
                                        className="button button-secondary"
                                        style={{ marginRight: '5px', fontSize: '12px', padding: '4px 8px' }}
                                        onClick={() => navigate(`/admin/ticket/${lt.ticketId}`)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="button"
                                        style={{ fontSize: '12px', padding: '4px 8px', background: '#f44336', color: 'white' }}
                                        onClick={() => handleUnlinkTicket(lt.ticketId)}
                                    >
                                        Unlink
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Merged From Notice */}
                {ticket.metadata && ticket.metadata.mergedInto && (
                    <div style={{
                        background: '#fff3e0',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '1px solid #ffa726'
                    }}>
                        <strong>This ticket was merged into #{ticket.metadata.mergedInto}</strong>
                        <button
                            className="button button-secondary"
                            style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px' }}
                            onClick={() => navigate(`/admin/ticket/${ticket.metadata.mergedInto}`)}
                        >
                            View Target Ticket
                        </button>
                    </div>
                )}

                {/* Link/Merge Tools */}
                <div style={{
                    background: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <button
                        className="button button-secondary"
                        onClick={() => setShowLinkMerge(!showLinkMerge)}
                        style={{ marginBottom: showLinkMerge ? '15px' : '0' }}
                    >
                        {showLinkMerge ? 'Close' : 'Link/Merge Tickets'}
                    </button>

                    {showLinkMerge && (
                        <div>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by ticket ID or subject..."
                                value={linkTargetId}
                                onChange={(e) => {
                                    setLinkTargetId(e.target.value);
                                    handleSearchTickets(e.target.value);
                                }}
                                style={{ width: '100%', marginBottom: '10px' }}
                            />

                            {searchResults.length > 0 && (
                                <div style={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    marginBottom: '10px',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                }}>
                                    {searchResults.map(t => (
                                        <div
                                            key={t.ticketId}
                                            style={{
                                                padding: '10px',
                                                borderBottom: '1px solid #eee',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                setLinkTargetId(t.ticketId);
                                                setSearchResults([]);
                                            }}
                                        >
                                            <strong>#{t.ticketId}</strong> - {t.subject}
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                {t.guestName} | {t.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="button button-primary"
                                    onClick={handleLinkTickets}
                                    disabled={!linkTargetId}
                                >
                                    Link Tickets
                                </button>
                                <button
                                    className="button"
                                    style={{ background: '#ff9800' }}
                                    onClick={handleMergeTickets}
                                    disabled={!linkTargetId}
                                >
                                    Merge Into Target
                                </button>
                            </div>
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                                <strong>Link:</strong> Connect related tickets (keeps both open)<br />
                                <strong>Merge:</strong> Move all messages to target ticket and close this one
                            </p>
                        </div>
                    )}
                </div>

                {/* Pending Approvals Alert */}
                {pendingMessages.length > 0 && (
                    <div style={{
                        background: '#fff3e0',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        border: '2px solid #ffa726'
                    }}>
                        <strong>{pendingMessages.length} response(s) pending approval</strong>
                    </div>
                )}

                {/* Conversation Thread */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '15px' }}>Conversation</h3>

                    {messages.map((msg) => (
                        <div key={msg.id}>
                            <div className={`message message-${msg.sender.toLowerCase().includes('agent') ? 'agent' : msg.sender} ${msg.status === 'pending_approval' ? 'message-pending' : ''}`}>
                                <div className="message-sender">
                                    {msg.sender}
                                    {msg.confidence && ` (${(msg.confidence * 100).toFixed(0)}% confidence)`}
                                    {msg.approvedBy && ` - Approved by ${msg.approvedBy}`}
                                </div>
                                <div className="message-content">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                                {msg.reasoning && (
                                    <div style={{
                                        marginTop: '8px',
                                        padding: '8px',
                                        background: 'rgba(0,0,0,0.05)',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontStyle: 'italic'
                                    }}>
                                        <strong>AI Reasoning:</strong> {msg.reasoning}
                                    </div>
                                )}
                                <div className="message-meta">
                                    {new Date(msg.createdAt).toLocaleString()} | Status: {msg.status}
                                </div>

                                {/* Action Buttons for Pending Messages */}
                                {msg.status === 'pending_approval' && (
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleApprove(msg.id)}
                                            className="button button-primary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingMessage(msg.id);
                                                setEditContent(msg.content);
                                            }}
                                            className="button button-secondary"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setRejectingMessage(msg.id)}
                                            className="button button-danger"
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {msg.status === 'rejected' && (
                                    <div style={{
                                        marginTop: '8px',
                                        color: '#f44336',
                                        fontSize: '12px'
                                    }}>
                                        Rejected: {msg.rejectionReason}
                                    </div>
                                )}
                            </div>

                            {/* Edit Form */}
                            {editingMessage === msg.id && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '15px',
                                    background: '#e3f2fd',
                                    borderRadius: '8px'
                                }}>
                                    <h4 style={{ marginBottom: '10px' }}>Edit Response</h4>
                                    <textarea
                                        className="textarea"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                    />
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleEditSubmit(msg.id)}
                                            className="button button-primary"
                                        >
                                            Save & Send
                                        </button>
                                        <button
                                            onClick={() => setEditingMessage(null)}
                                            className="button button-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Reject Form */}
                            {rejectingMessage === msg.id && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '15px',
                                    background: '#ffebee',
                                    borderRadius: '8px'
                                }}>
                                    <h4 style={{ marginBottom: '10px' }}>Reject & Provide Manual Response</h4>
                                    <label className="label">Rejection Reason (optional)</label>
                                    <input
                                        className="input"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Why are you rejecting this response?"
                                    />
                                    <label className="label">Manual Response *</label>
                                    <textarea
                                        className="textarea"
                                        value={manualResponse}
                                        onChange={(e) => setManualResponse(e.target.value)}
                                        placeholder="Write your manual response to the guest..."
                                        required
                                    />
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleRejectSubmit(msg.id)}
                                            className="button button-danger"
                                        >
                                            Reject & Send Manual Response
                                        </button>
                                        <button
                                            onClick={() => setRejectingMessage(null)}
                                            className="button button-secondary"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Admin Reply Form */}
                <div>
                    <h3 style={{ marginBottom: '10px' }}>Send Admin Reply</h3>
                    <form onSubmit={handleAdminReply}>
                        <textarea
                            className="textarea"
                            placeholder="Type your message to the guest..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="button button-primary"
                            style={{ marginTop: '10px' }}
                        >
                            Send Reply
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminTicketView;
