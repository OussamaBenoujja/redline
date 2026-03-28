import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import NovelDetail from './pages/NovelDetail';
import Reader from './pages/Reader';
import Profile from './pages/Profile';
import AuthorDashboard from './pages/AuthorDashboard';
import AuthorEditor from './pages/AuthorEditor';
import PublicProfile from './pages/PublicProfile';
import { AuthProvider } from './AuthContext';
import './index.css';

function App() {
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
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/novel/:id" element={<NovelDetail />} />
              <Route path="/read/:novelId/:chapterNum" element={<Reader />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:id" element={<PublicProfile />} />
              <Route path="/author/dashboard" element={<AuthorDashboard />} />
              <Route path="/author/editor/:novelId" element={<AuthorEditor />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
