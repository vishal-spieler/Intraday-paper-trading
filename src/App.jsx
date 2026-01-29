import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layouts';
import Trading from './Pages/Trading';

function App() {
    return (
        <Router>
            {/* Pass the current page name to Layout to highlight the sidebar */}
            <Routes>
                <Route path="/" element={<Navigate to="/trading" replace />} />
                <Route
                    path="/trading"
                    element={
                        <Layout currentPageName="Trading">
                            <Trading />
                        </Layout>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
