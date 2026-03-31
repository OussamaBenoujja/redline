import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <h1 style={{ marginBottom: '1rem' }}>Sign In</h1>

        <label style={{ display: 'block', marginBottom: '0.4rem' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        <label style={{ display: 'block', marginBottom: '0.4rem' }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          No account? <Link to="/signup" style={{ color: 'var(--accent-primary)' }}>Create one</Link>
        </p>
      </form>
    </div>
  );
}
