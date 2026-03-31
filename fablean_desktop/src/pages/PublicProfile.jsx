import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loader, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function PublicProfile() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [works, setWorks] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    const resolveMediaUrl = (url, fallback = '') => {
        if (!url) return fallback;
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

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE_URL}/api/users/${id}/profile`).then(r=>r.json()),
            fetch(`${API_BASE_URL}/api/author/${id}/novels`).then(r=>r.json())
        ]).then(([profData, worksData]) => {
            setProfile(profData);
            setWorks(worksData || []);
            setLoading(false);

            if (currentUser?.id) {
                fetch(`${API_BASE_URL}/api/users/${currentUser.id}/following/check/${id}`)
                    .then(r=>r.json())
                    .then(d=>setIsFollowing(d.isFollowing)).catch(console.error);
            }
        }).catch(err => { console.error(err); setLoading(false); });
    }, [id, currentUser?.id]);

    const handleToggleFollow = async () => {
        if (!currentUser?.id) return;
        setFollowLoading(true);
        try {
            const method = isFollowing ? 'DELETE' : 'POST';
            const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/follow/${id}`, { method });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update follow state');
            if (typeof data.isFollowing === 'boolean') setIsFollowing(data.isFollowing);
            else setIsFollowing(!isFollowing);
        } catch(err) { console.error(err); }
        finally { setFollowLoading(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader className="animate-spin text-accent" size={48} /></div>;
    if (!profile || profile.error) return <div style={{textAlign: 'center', padding: '4rem'}}>User not found</div>;

    return (
        <div className="profile-page animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ position: 'relative', marginBottom: '4rem' }}>
                <div style={{ height: '240px', borderRadius: '12px', overflow: 'hidden', background: '#333' }}>
                    {profile.banner_url ? <img src={resolveMediaUrl(profile.banner_url)} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                        <div style={bannerFallbackStyle(profile.full_name)}>
                            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18), transparent 45%)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 10%, rgba(255,255,255,0.12), transparent 35%)' }} />
                        </div>
                    )}
                </div>
                <div style={{ position: 'absolute', bottom: '-40px', left: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', zIndex: 2 }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-primary)', padding: '4px', boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>
                        {profile.avatar_url ? <img src={resolveMediaUrl(profile.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain', objectPosition: 'center', background: 'var(--bg-secondary)' }} /> : <div style={avatarFallbackStyle(profile.full_name)}>{getInitials(profile.full_name)}</div>}
                    </div>
                </div>
            </div>
            
            <div style={{ padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{profile.full_name}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '600px', whiteSpace: 'pre-wrap' }}>{profile.bio || "This user hasn't written a bio yet."}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>Joined {new Date(profile.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
                {currentUser?.id && currentUser.id !== parseInt(id) && (
                    <button onClick={handleToggleFollow} disabled={followLoading} className={isFollowing ? 'btn-outline' : 'btn-primary'} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', marginTop: '0.45rem' }}>
                        {followLoading ? 'Saving...' : (isFollowing ? 'Following' : 'Follow Author')}
                    </button>
                )}
            </div>

            <div style={{ marginTop: '4rem', padding: '0 2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen className="text-accent" /> Published Works</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
                    {works.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No works published.</p> : works.map(novel => (
                        <Link to={`/novel/${novel.id}`} key={novel.id} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden', transition: 'var(--transition)', border: '1px solid var(--border-color)', height: '100%' }}>
                            <div style={{ height: '300px', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                                <img src={resolveMediaUrl(novel.cover_photo || novel.cover_url, 'https://via.placeholder.com/480x720.png?text=No+Cover')} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
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
