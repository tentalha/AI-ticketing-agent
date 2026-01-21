import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket } from '../services/api.js';

function GuestForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        guestName: '',
        guestEmail: '',
        subject: '',
        content: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [duplicates, setDuplicates] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setDuplicates(null);

        try {
            const result = await createTicket(formData);

            if (result.duplicatesFound) {
                setDuplicates(result);
                setLoading(false);
                return;
            }

            setSuccess({
                ticketId: result.ticket.ticketId,
                email: formData.guestEmail
            });

            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create ticket');
            setLoading(false);
        }
    };

    const handleForceCreate = async () => {
        setLoading(true);
        setDuplicates(null);

        try {
            const result = await createTicket({
                ...formData,
                forceCreate: true
            });

            setSuccess({
                ticketId: result.ticket.ticketId,
                email: formData.guestEmail
            });

            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create ticket');
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>Submit a Support Request</h1>
                <p style={{ marginTop: '10px', color: '#666' }}>
                    We're here to help! Fill out the form below and we'll get back to you soon.
                </p>
            </div>

            {/* SUCCESS MESSAGE */}
            {success && (
                <div className="card">
                    <div
                        style={{
                            background: '#e8f5e9',
                            padding: '20px',
                            borderRadius: '8px',
                            border: '2px solid #4CAF50',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '10px', color: '#2e7d32' }}>✔</div>
                        <h3 style={{ color: '#2e7d32' }}>Ticket Created Successfully!</h3>
                        <p>
                            Your ticket <strong>#{success.ticketId}</strong> has been created.
                        </p>
                        <p>
                            We've sent an email to <strong>{success.email}</strong> with a
                            unique link to view and reply to your ticket.
                        </p>

                        <button
                            className="button button-primary"
                            style={{ marginTop: '15px' }}
                            onClick={() => {
                                setSuccess(null);
                                setFormData({
                                    guestName: '',
                                    guestEmail: '',
                                    subject: '',
                                    content: ''
                                });
                            }}
                        >
                            Submit Another Request
                        </button>
                    </div>
                </div>
            )}

            {/* DUPLICATES WARNING */}
            {duplicates && (
                <div className="card">
                    <div
                        style={{
                            background: '#fff3e0',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #ffa726'
                        }}
                    >
                        <h3 style={{ color: '#e65100' }}>Similar Tickets Found</h3>
                        <p>{duplicates.reasoning}</p>

                        {duplicates.similarTickets.map((ticket) => (
                            <div
                                key={ticket.ticketId}
                                style={{
                                    background: 'white',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    borderRadius: '4px'
                                }}
                            >
                                <strong>#{ticket.ticketId}</strong> – {ticket.subject}
                                <br />
                                <small>
                                    Status: {ticket.status} | Created:{' '}
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                </small>
                            </div>
                        ))}

                        <div style={{ marginTop: '15px' }}>
                            <button
                                className="button button-secondary"
                                style={{ marginRight: '10px' }}
                                onClick={() =>
                                    navigate(`/ticket/${duplicates.similarTickets[0].ticketId}`)
                                }
                            >
                                View Existing Ticket
                            </button>

                            <button
                                className="button button-primary"
                                disabled={loading}
                                onClick={handleForceCreate}
                            >
                                Create New Ticket Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORM */}
            {!success && (
                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <label className="label">Your Name *</label>
                        <input
                            type="text"
                            name="guestName"
                            className="input"
                            value={formData.guestName}
                            onChange={handleChange}
                            required
                        />

                        <label className="label">Your Email *</label>
                        <input
                            type="email"
                            name="guestEmail"
                            className="input"
                            value={formData.guestEmail}
                            onChange={handleChange}
                            required
                        />

                        <label className="label">Subject *</label>
                        <input
                            type="text"
                            name="subject"
                            className="input"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                        />

                        <label className="label">Description *</label>
                        <textarea
                            name="content"
                            className="textarea"
                            value={formData.content}
                            onChange={handleChange}
                            required
                        />

                        {error && <div className="error">{error}</div>}

                        <button
                            type="submit"
                            className="button button-primary"
                            disabled={loading}
                            style={{ marginTop: '20px', width: '100%' }}
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default GuestForm;
