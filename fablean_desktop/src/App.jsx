import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import NovelDetail from './pages/NovelDetail';
import Reader from './pages/Reader';
import Profile from './pages/Profile';
import AuthorDashboard from './pages/AuthorDashboard';
import AuthorEditor from './pages/AuthorEditor';
import PublicProfile from './pages/PublicProfile';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { AuthProvider, useAuth } from './AuthContext';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <Router>
      <div className="app-container">
        {user && <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
        <main className={user ? 'main-content' : ''}>
          <Routes>
            <Route path="/signin" element={user ? <Navigate to="/" replace /> : <SignIn />} />
            <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUp />} />

            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/novel/:id" element={<ProtectedRoute><NovelDetail /></ProtectedRoute>} />
            <Route path="/read/:novelId/:chapterNum" element={<ProtectedRoute><Reader /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/user/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/author/dashboard" element={<ProtectedRoute><AuthorDashboard /></ProtectedRoute>} />
            <Route path="/author/editor/:novelId" element={<ProtectedRoute><AuthorEditor /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={user ? '/' : '/signin'} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
