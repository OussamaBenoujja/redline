import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loader, User, BookOpen } from 'lucide-react';

export default function PublicProfile() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [works, setWorks] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`http://localhost:4000/api/users/${id}/profile`).then(r=>r.json()),
            fetch(`http://localhost:4000/api/author/${id}/novels`).then(r=>r.json())
        ]).then(([profData, worksData]) => {
            setProfile(profData);
            setWorks(worksData || []);
            setLoading(false);

            if (currentUser?.id) {
                fetch(`http://localhost:4000/api/users/${currentUser.id}/following/check/${id}`)
                    .then(r=>r.json())
                    .then(d=>setIsFollowing(d.isFollowing)).catch(console.error);
            }
        }).catch(err => { console.error(err); setLoading(false); });
    }, [id, currentUser?.id]);

    const handleToggleFollow = async () => {
        if (!currentUser?.id) return;
        try {
            const method = isFollowing ? 'DELETE' : 'POST';
            const res = await fetch(`http://localhost:4000/api/users/${currentUser.id}/follow/${id}`, { method });
            if (res.ok) setIsFollowing(!isFollowing);
        } catch(err) { console.error(err); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader className="animate-spin text-accent" size={48} /></div>;
    if (!profile || profile.error) return <div style={{textAlign: 'center', padding: '4rem'}}>User not found</div>;

    return (
        <div className="profile-page animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ position: 'relative', height: '240px', borderRadius: '12px', overflow: 'hidden', marginBottom: '4rem', background: '#333' }}>
                {profile.banner ? <img src={profile.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width:'100%',height:'100%',background:'linear-gradient(to right, var(--bg-secondary), var(--bg-primary))'}} />}
                <div style={{ position: 'absolute', bottom: '-40px', left: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-primary)', padding: '4px' }}>
                        {profile.avatar ? <img src={profile.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width:'100%', height:'100%', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems:'center', justifyContent: 'center'}}><User size={48}/></div>}
                    </div>
                </div>
            </div>
            
            <div style={{ padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{profile.full_name}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', whiteSpace: 'pre-wrap' }}>{profile.bio || "This user hasn't written a bio yet."}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>Joined {new Date(profile.join_date).toLocaleDateString()}</p>
                </div>
                {currentUser?.id && currentUser.id !== parseInt(id) && (
                    <button onClick={handleToggleFollow} className={isFollowing ? 'btn-outline' : 'btn-primary'} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
                        {isFollowing ? 'Following' : 'Follow Author'}
                    </button>
                )}
            </div>

            <div style={{ marginTop: '4rem', padding: '0 2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen className="text-accent" /> Published Works</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {works.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No works published.</p> : works.map(novel => (
                        <Link to={`/novel/${novel.id}`} key={novel.id} style={{ display: 'block', textDecoration: 'none', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', transition: 'var(--transition)', border: '1px solid var(--border-color)', height: '100%' }}>
                            <div style={{ height: '280px', overflow: 'hidden' }}>
                                <img src={novel.cover_url} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{novel.title}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span>{novel.chapters_count || 0} Chs</span>
                                    <span>★ {novel.rating?.toFixed(1) || '0.0'}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
