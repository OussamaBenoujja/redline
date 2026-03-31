import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup({ fullName, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
      <form onSubmit={handleSubmit} className="glass" style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <h1 style={{ marginBottom: '1rem' }}>Create Account</h1>

        <label style={{ display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

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

        <label style={{ display: 'block', marginBottom: '0.4rem' }}>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/signin" style={{ color: 'var(--accent-primary)' }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
