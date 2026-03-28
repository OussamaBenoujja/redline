import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, BookOpen, Library, User, Flame, Coins, Bell, PenTool } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { io } from 'socket.io-client';

export default function Navbar({ isDarkMode, toggleTheme }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ streak_days: 0, coins: 0 });
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    fetch(`http://localhost:4000/api/users/${user.id}/profile`)
      .then(res => res.json())
      .catch(console.error);

    fetch(`http://localhost:4000/api/users/${user.id}/notifications`)
      .then(res => res.json())
      .then(data => setNotifs(data || []))
      .catch(console.error);

    // Native Socket.io Bindings
    const socket = io('http://localhost:4000');
    socket.emit('join_user_room', user.id);

    socket.on('new_notification', (notif) => {
        setNotifs(prev => [{...notif, is_read: 0, created_at: new Date().toISOString()}, ...prev]);
    });

    return () => {
        socket.disconnect();
    };
  }, [user?.id]);

  const unreadNotifs = notifs.filter(n => !n.is_read).length;

  const handleNotifClick = async (notifId) => {
    setShowNotifs(false);
    try {
      await fetch(`http://localhost:4000/api/notifications/${notifId}/read`, { method: 'PUT' });
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n));
    } catch(e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`http://localhost:4000/api/users/${user.id}/notifications/read`, { method: 'PUT' });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch(e) { console.error(e); }
  };

  return (
    <nav className="navbar glass">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <BookOpen className="brand-icon" size={28} />
          <span className="brand-text">Fablean</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link hide-on-mobile">
            <Library size={20} />
            <span>Library</span>
          </Link>
          <Link to="/author/dashboard" className="nav-link hide-on-mobile">
            <PenTool size={20} />
            <span>Studio</span>
          </Link>
          <Link to="/profile" className="nav-link">
            <User size={20} />
            <span className="hide-on-mobile">Profile</span>
          </Link>
          
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <button className="nav-icon-btn" title="Notifications" onClick={() => setShowNotifs(!showNotifs)}>
              <Bell size={20} />
              {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
            </button>
            {showNotifs && (
              <div className="notification-dropdown glass animate-scale-in" style={{ position: 'absolute', top: '100%', right: '0', width: '320px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 'bold' }}>Notifications</h4>
                  {unreadNotifs > 0 && <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>Mark all read</button>}
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notifs.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>No notifications yet.</p> : 
                    notifs.map(n => (
                      <Link to={n.target_url} key={n.id} onClick={() => handleNotifClick(n.id)} style={{ display: 'block', padding: '0.75rem', borderRadius: '6px', background: n.is_read ? 'transparent' : 'rgba(29, 185, 84, 0.1)', borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--accent-primary)', textDecoration: 'none', color: 'var(--text-primary)', transition: 'var(--transition)' }} className="notif-item">
                        <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>{n.message}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>{new Date(n.created_at).toLocaleString()}</span>
                      </Link>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
            {isDarkMode ? <Sun size={20} className="icon-sun"/> : <Moon size={20} className="icon-moon"/>}
          </button>
        </div>
      </div>
    </nav>
  );
}
