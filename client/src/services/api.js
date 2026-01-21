import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Guest API
export const createTicket = async (ticketData) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
};

export const getTicket = async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
};

export const replyToTicket = async (ticketId, content) => {
    const response = await api.post(`/tickets/${ticketId}/reply`, { content });
    return response.data;
};

// Admin API
export const getAllTickets = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/admin/tickets?${params}`);
    return response.data;
};

export const getAdminTicketDetails = async (ticketId) => {
    const response = await api.get(`/admin/tickets/${ticketId}`);
    return response.data;
};

export const approveResponse = async (ticketId, messageId, adminName) => {
    const response = await api.post(`/admin/tickets/${ticketId}/approve/${messageId}`, { adminName });
    return response.data;
};

export const editResponse = async (ticketId, messageId, editedContent, adminName) => {
    const response = await api.post(`/admin/tickets/${ticketId}/edit/${messageId}`, {
        editedContent,
        adminName
    });
    return response.data;
};

export const rejectResponse = async (ticketId, messageId, rejectionReason, manualResponse, adminName) => {
    const response = await api.post(`/admin/tickets/${ticketId}/reject/${messageId}`, {
        rejectionReason,
        manualResponse,
        adminName
    });
    return response.data;
};

export const reassignTicket = async (ticketId, newAgent) => {
    const response = await api.post(`/admin/tickets/${ticketId}/reassign`, { newAgent });
    return response.data;
};

export const adminReply = async (ticketId, content, adminName) => {
    const response = await api.post(`/admin/tickets/${ticketId}/reply`, { content, adminName });
    return response.data;
};

export const updateTicketStatus = async (ticketId, status) => {
    const response = await api.put(`/admin/tickets/${ticketId}/status`, { status });
    return response.data;
};

export const linkTickets = async (ticketId, targetTicketId) => {
    const response = await api.post(`/admin/tickets/${ticketId}/link`, { targetTicketId });
    return response.data;
};

export const mergeTickets = async (ticketId, targetTicketId) => {
    const response = await api.post(`/admin/tickets/${ticketId}/merge`, { targetTicketId });
    return response.data;
};

export const unlinkTickets = async (ticketId, targetTicketId) => {
    const response = await api.post(`/admin/tickets/${ticketId}/unlink`, { targetTicketId });
    return response.data;
};

export default api;
