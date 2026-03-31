import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, Clock, Heart, Loader, X, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import NovelCard from '../components/NovelCard';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config/api';

export default function Profile() {
  const { user, updateProfileContext } = useAuth();
  const [activeTab, setActiveTab] = useState('history'); // history, library, created
  const [userProfile, setUserProfile] = useState(null);
  const [myWorks, setMyWorks] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', avatar_url: '', banner_url: '' });
  const [saving, setSaving] = useState(false);

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const getInitials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  };

  const toneBySeed = (seed) => {
    const palettes = [
      ['#132743', '#27496d'],
      ['#2b2d42', '#4a4e69'],
      ['#1f3b2d', '#2f5d4f'],
      ['#4c1d3d', '#7a255d'],
      ['#3b2b1f', '#6b4c35'],
    ];
    const value = String(seed || '')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return palettes[value % palettes.length];
  };

  const avatarFallbackStyle = (seed) => {
    const [a, b] = toneBySeed(seed);
    return {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '2rem',
      color: '#e7efff',
      background: `linear-gradient(145deg, ${a}, ${b})`,
      letterSpacing: '0.03em',
    };
  };

  const bannerFallbackStyle = (seed) => {
    const [a, b] = toneBySeed(seed);
    return {
      width: '100%',
      height: '100%',
      background: `linear-gradient(120deg, ${a}, ${b})`,
      position: 'relative',
      overflow: 'hidden',
    };
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchProfileData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/api/users/${user.id}/profile`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/author/${user.id}/novels`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/users/${user.id}/following`).then(res => res.json())
    ]).then(([profileData, worksData, followingData]) => {
      setUserProfile(profileData);
      setMyWorks(worksData || []);
      setFollowedAuthors(Array.isArray(followingData) ? followingData : []);
      setEditForm({
        full_name: profileData.full_name || '',
        bio: profileData.bio || '',
        avatar_url: profileData.avatar_url || '',
        banner_url: profileData.banner_url || ''
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProfileData();
  }, [user.id]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if(res.ok) {
        setIsEditing(false);
        // Sync context so Navbar visibly updates globally
        updateProfileContext({ full_name: editForm.full_name, avatar_url: editForm.avatar_url });
        // Refresh local tab view
        fetchProfileData();
      } else {
        alert("Failed to save profile");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !userProfile) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader className="animate-spin text-accent" size={48} /></div>;
  if (!userProfile || userProfile.error) return <div style={{ textAlign: 'center', padding: '4rem' }}><h2>Error loading profile.</h2></div>;

  const readingList = userProfile.readingList || [];
  const historyList = userProfile.historyList || [];

  return (
    <div className="profile-page animate-fade-in">
      
      {/* EDIT MODAL OVERLAY */}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} style={{ color: 'var(--text-secondary)' }}><X/></button>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bio</label>
                  <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows="3" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avatar Image</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     {editForm.avatar_url && <img src={editForm.avatar_url} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />}
                     <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'avatar_url')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Banner Image</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     {editForm.banner_url && <img src={editForm.banner_url} alt="Preview" style={{ width: '80px', height: '40px', borderRadius: '0.25rem', objectFit: 'cover' }} />}
                     <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'banner_url')} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
               <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
               <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                 {saving ? 'Saving...' : <><Save size={18}/> Save Changes</>}
               </button>
             </div>
          </div>
        </div>
      )}

      <header className="profile-header">
        <div className="profile-banner">
          {userProfile.banner_url ? (
            <img src={resolveMediaUrl(userProfile.banner_url)} alt="Profile Banner" />
          ) : (
            <div style={bannerFallbackStyle(userProfile.full_name)}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 45%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 10%, rgba(255,255,255,0.12), transparent 35%)' }} />
            </div>
          )}
          <button className="edit-banner-btn shadow" onClick={() => setIsEditing(true)}><Settings size={18} /> Edit Banner</button>
        </div>
        
        <div className="profile-info-container">
          <div className="profile-avatar-wrapper">
            {userProfile.avatar_url ? (
              <img src={resolveMediaUrl(userProfile.avatar_url)} alt={userProfile.full_name} className="profile-avatar" />
            ) : (
              <div style={avatarFallbackStyle(userProfile.full_name)}>{getInitials(userProfile.full_name)}</div>
            )}
          </div>
          
          <div className="profile-details">
            <div className="profile-title-row">
              <h1 className="profile-name">{userProfile.full_name}</h1>
              <button className="btn-outline" onClick={() => setIsEditing(true)}>Edit Profile</button>
            </div>
            
            <div className="profile-stats">
              <span className="stat"><span className="stat-value">{userProfile.followers_count}</span> Followers</span>
            </div>
            
            <p className="profile-bio">{userProfile.bio}</p>
          </div>
        </div>
      </header>

      <section className="profile-content">
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={18} /> History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Heart size={18} /> Favorites
          </button>
          <button 
            className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`}
            onClick={() => setActiveTab('created')}
          >
            <BookOpen size={18} /> My Works
          </button>
          <button
            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            <Heart size={18} /> Followed Authors
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'history' && (
            <div className="library-grid">
              {historyList.map(novel => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
              {historyList.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No novels in your history yet.</p>}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="library-grid">
              {readingList.map(novel => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
              {readingList.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No favorites in your library yet.</p>}
            </div>
          )}
          
          {activeTab === 'created' && (
             <div className="library-grid">
               {myWorks.map(novel => (
                 <NovelCard key={novel.id} novel={novel} hideReadBtn={true} />
               ))}
               {myWorks.length === 0 && (
                 <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                   <BookOpen size={48} className="empty-icon" />
                   <h3>No published works yet</h3>
                   <p>Start writing your first novel to share your imagination.</p>
                   <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.href='/author/dashboard'}>Go To Studio</button>
                 </div>
               )}
             </div>
          )}

          {activeTab === 'following' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {followedAuthors.map((author) => (
                <Link
                  key={author.id}
                  to={`/user/${author.id}`}
                  className="glass"
                  style={{ textDecoration: 'none', color: 'inherit', borderRadius: '0.9rem', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', gap: '0.85rem', alignItems: 'center' }}
                >
                  <img
                    src={author.avatar_url ? resolveMediaUrl(author.avatar_url) : ''}
                    alt={author.full_name}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: author.avatar_url ? 'block' : 'none' }}
                  />
                  {!author.avatar_url && (
                    <div style={{ ...avatarFallbackStyle(author.full_name), width: '56px', height: '56px', fontSize: '1rem', flexShrink: 0 }}>
                      {getInitials(author.full_name)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{author.full_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>{author.works_count || 0} works</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.1rem' }}>{author.followers_count || 0} followers</div>
                  </div>
                </Link>
              ))}
              {followedAuthors.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>You are not following any authors yet.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
