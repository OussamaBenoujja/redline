import React, { useState, useEffect } from 'react';
import { Settings, BookOpen, Clock, Heart, Loader, X, Save } from 'lucide-react';
import NovelCard from '../components/NovelCard';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user, updateProfileContext } = useAuth();
  const [activeTab, setActiveTab] = useState('history'); // history, library, created
  const [userProfile, setUserProfile] = useState(null);
  const [myWorks, setMyWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', avatar_url: '', banner_url: '' });
  const [saving, setSaving] = useState(false);

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
      fetch(`http://localhost:4000/api/users/${user.id}/profile`).then(res => res.json()),
      fetch(`http://localhost:4000/api/author/${user.id}/novels`).then(res => res.json())
    ]).then(([profileData, worksData]) => {
      setUserProfile(profileData);
      setMyWorks(worksData || []);
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
      const res = await fetch(`http://localhost:4000/api/users/${user.id}/profile`, {
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
          <img src={userProfile.banner_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80'} alt="Profile Banner" />
          <button className="edit-banner-btn shadow" onClick={() => setIsEditing(true)}><Settings size={18} /> Edit Banner</button>
        </div>
        
        <div className="profile-info-container">
          <div className="profile-avatar-wrapper">
            <img src={userProfile.avatar_url || 'https://via.placeholder.com/150'} alt={userProfile.full_name} className="profile-avatar" />
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
        </div>
      </section>
    </div>
  );
}
