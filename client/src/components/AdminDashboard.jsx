import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTickets } from '../services/api.js';

function AdminDashboard() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadTickets();
        const interval = setInterval(loadTickets, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [filter]);

    const loadTickets = async () => {
        try {
            const filters = {};
            if (filter === 'needsApproval') filters.needsApproval = 'true';
            if (filter === 'escalated') filters.escalated = 'true';
            if (filter !== 'all' && filter !== 'needsApproval' && filter !== 'escalated') {
                filters.status = filter;
            }

            const data = await getAllTickets(filters);
            setTickets(data.tickets);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load tickets:', err);
            setLoading(false);
        }
    };

    const getConfidenceClass = (confidence) => {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.5) return 'confidence-medium';
        return 'confidence-low';
    };

    const needsApprovalCount = tickets.filter(t => t.needsApproval).length;
    const escalatedCount = tickets.filter(t => t.escalated).length;

    return (
        <div className="container">
            <div className="header">
                <h1>Admin Dashboard</h1>
                <p style={{ marginTop: '10px', color: '#666' }}>
                    Manage support tickets and review AI agent responses
                </p>
            </div>

            <div className="card">
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '20px',
                    padding: '15px',
                    background: '#f5f5f5',
                    borderRadius: '8px'
                }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
                            {tickets.length}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Total Tickets</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                            {needsApprovalCount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Needs Approval</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                            {escalatedCount}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Escalated</div>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ marginRight: '10px', fontWeight: '500' }}>Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            fontSize: '14px'
                        }}
                    >
                        <option value="all">All Tickets</option>
                        <option value="needsApproval">Needs Approval</option>
                        <option value="escalated">Escalated</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No tickets found
                    </div>
                ) : (
                    <ul className="ticket-list">
                        {tickets.map((ticket) => (
                            <li
                                key={ticket.ticketId}
                                className="ticket-item"
                                onClick={() => navigate(`/admin/ticket/${ticket.ticketId}`)}
                            >
                                <div className="ticket-header">
                                    <div>
                                        <span className="ticket-id">#{ticket.ticketId}</span>
                                        <span className={`confidence-score ${getConfidenceClass(ticket.confidence)}`}>
                                            {(ticket.confidence * 100).toFixed(0)}% confidence
                                        </span>
                                        {ticket.needsApproval && (
                                            <span style={{
                                                marginLeft: '10px',
                                                color: '#ff9800',
                                                fontWeight: 'bold',
                                                fontSize: '12px'
                                            }}>
                                                NEEDS APPROVAL
                                            </span>
                                        )}
                                        {ticket.escalated && (
                                            <span style={{
                                                marginLeft: '10px',
                                                color: '#f44336',
                                                fontWeight: 'bold',
                                                fontSize: '12px'
                                            }}>
                                                ESCALATED
                                            </span>
                                        )}
                                    </div>
                                    <span className={`status-badge status-${ticket.status}`}>
                                        {ticket.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="ticket-subject">{ticket.subject}</div>

                                <div className="ticket-meta">
                                    <strong>{ticket.guestName}</strong> ({ticket.guestEmail}) |
                                    Agent: {ticket.assignedAgent} |
                                    Intent: {ticket.intent} |
                                    Created: {new Date(ticket.createdAt).toLocaleString()}
                                </div>

                                {ticket.escalationReason && (
                                    <div style={{
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        color: '#f44336',
                                        fontStyle: 'italic'
                                    }}>
                                        Escalation: {ticket.escalationReason}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
