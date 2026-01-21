import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GuestForm from './components/GuestForm.jsx';
import TicketView from './components/TicketView.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import AdminTicketView from './components/AdminTicketView.jsx';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    {/* Guest Routes */}
                    <Route path="/" element={<GuestForm />} />
                    <Route path="/ticket/:ticketId" element={<TicketView />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/ticket/:ticketId" element={<AdminTicketView />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
