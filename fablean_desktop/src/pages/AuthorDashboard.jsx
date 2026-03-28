import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Users, Star, MessageSquare, Loader, Plus, BookOpen } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AuthorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [aggregates, setAggregates] = useState({ reads: 0, rating: 0, comments: 0 });
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:4000/api/author/${user.id}/dashboard`).then(res => res.json()),
      fetch(`http://localhost:4000/api/author/${user.id}/novels`).then(res => res.json())
    ]).then(([aggData, novelsData]) => {
      setAggregates({
        reads: aggData.reads || 0,
        rating: aggData.rating || 0,
        comments: aggData.comments || 0
      });
      setNovels(novelsData || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user.id]);

  const handleCreateWorkspace = async () => {
    setCreating(true);
    try {
      const res = await fetch('http://localhost:4000/api/novels', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title: 'Untitled Workspace', authorName: user.full_name })
      });
      const data = await res.json();
      if(data.id) {
         navigate(`/author/editor/${data.id}`);
      }
    } catch(err) {
      console.error(err);
      alert("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  if(loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader className="animate-spin text-accent" size={48} /></div>;

  return (
    <div className="author-dashboard animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Creator Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Here's how your novels are doing.</p>
        </div>
        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6, cursor: 'default' }} disabled>Characters are auto-managed by AI</button>
      </header>



      {(
        <div className="dashboard-content">
          <h2 style={{ marginBottom: '1.5rem' }}>Analytics Overview</h2>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="stat-card glass" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '0.75rem' }}><BarChart size={32} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Reads</p>
                <h3 style={{ fontSize: '2rem' }}>{(aggregates.reads / 1000).toFixed(1)}K</h3>
              </div>
            </div>
            <div className="stat-card glass" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', borderRadius: '0.75rem' }}><Star size={32} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Average Rating</p>
                <h3 style={{ fontSize: '2rem' }}>{aggregates.rating.toFixed(1)}/5.0</h3>
              </div>
            </div>
            <div className="stat-card glass" style={{ padding: '2rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '0.75rem' }}><MessageSquare size={32} /></div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Comments</p>
                <h3 style={{ fontSize: '2rem' }}>{aggregates.comments}</h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '2.5rem' }}>
             <h2>My Workspaces</h2>
             <button onClick={handleCreateWorkspace} disabled={creating} className="btn-primary shadow" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {creating ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                Create New Workspace
             </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {novels.length === 0 ? <p style={{color: 'var(--text-secondary)'}}>No workspaces found.</p> : novels.map(n => (
                <div key={n.id} className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '48px', height: '64px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {n.cover_url ? <img src={n.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <BookOpen size={24} color="var(--text-secondary)"/>}
                      </div>
                      <div>
                         <h3 style={{fontSize: '1.2rem', marginBottom: '0.25rem'}}>{n.title}</h3>
                         <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{n.chapters_count || 0} Chapters Published</p>
                      </div>
                   </div>
                   <Link to={`/author/editor/${n.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>Open Editor</Link>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
