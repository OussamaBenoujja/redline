import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, Users, ArrowLeft, Loader, Send, User, ThumbsUp, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config/api';

export default function NovelDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const [novel, setNovel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lastReadChapter, setLastReadChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  // Library State
  const [inLibrary, setInLibrary] = useState(false);
  const [togglingLibrary, setTogglingLibrary] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Reviews State
  const [ratingHover, setRatingHover] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulLoadingReviewId, setHelpfulLoadingReviewId] = useState(null);
  const [showAllChaptersModal, setShowAllChaptersModal] = useState(false);

  const resolveMediaUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/480x720.png?text=No+Cover';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatReads = (value) => {
    const reads = Number(value || 0);
    if (!Number.isFinite(reads) || reads < 1000) return String(Math.max(0, Math.floor(reads || 0)));
    if (reads >= 1000000) {
      const m = reads / 1000000;
      return `${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    const k = reads / 1000;
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1)}K`;
  };

  const getLocalLastReadChapter = () => {
    if (!user?.id) return null;
    try {
      const raw = localStorage.getItem(`lastRead:${user.id}:${id}`);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const localBookmark = getLocalLastReadChapter();
    if (localBookmark) setLastReadChapter(localBookmark);

    const requests = [
      fetch(`${API_BASE_URL}/api/novels/${id}`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/novels/${id}/reviews`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/novels/${id}/chapters`).then(res => res.json()),
      fetch(`${API_BASE_URL}/api/users/${user.id}/library/check/${id}`).then(res => res.json())
    ];

    if (user?.id) {
      requests.push(fetch(`${API_BASE_URL}/api/users/${user.id}/history/${id}`, { cache: 'no-store' }).then(res => res.json()));
    }

    Promise.all(requests).then((results) => {
      const [novelData, reviewsData, chaptersData, libraryData, historyData] = results;
      setNovel(novelData);
      setReviews(reviewsData || []);
      setChapters(chaptersData || []);
      setInLibrary(libraryData.inLibrary);

      const bookmark = Number(historyData?.bookmark_idx);
      const remoteBookmark = Number.isFinite(bookmark) && bookmark >= 1 ? bookmark : null;
      const bestBookmark = Math.max(remoteBookmark || 0, localBookmark || 0);
      setLastReadChapter(bestBookmark > 0 ? bestBookmark : null);

      setLoading(false);

      if (user?.id && novelData?.author_id) {
          fetch(`${API_BASE_URL}/api/users/${user.id}/following/check/${novelData.author_id}`)
            .then(res => res.json())
            .then(data => setIsFollowing(data.isFollowing))
            .catch(console.error);
      }
    }).catch(err => {
      console.error("Failed to fetch novel details", err);
      setLoading(false);
    });
  }, [id, user?.id]);

  const maxChapter = chapters.length > 0
    ? Math.max(...chapters.map((ch) => Number(ch.chapter_number) || 0))
    : 1;
  const continueChapter = lastReadChapter
    ? Math.min(Math.max(lastReadChapter, 1), Math.max(maxChapter, 1))
    : 1;
  const hasReadingProgress = Number.isFinite(lastReadChapter) && lastReadChapter >= 1;

  const handleToggleLibrary = async () => {
    setTogglingLibrary(true);
    try {
      if (inLibrary) {
        await fetch(`${API_BASE_URL}/api/users/${user.id}/library/${id}`, { method: 'DELETE' });
        setInLibrary(false);
      } else {
        await fetch(`${API_BASE_URL}/api/users/${user.id}/library`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novelId: id })
        });
        setInLibrary(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingLibrary(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user?.id || !novel?.author_id) return;
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/follow/${novel.author_id}`, { method });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update follow state');
      }
      if (typeof data.isFollowing === 'boolean') {
        setIsFollowing(data.isFollowing);
      } else {
        setIsFollowing(!isFollowing);
      }
    } catch(err) {
      console.error(err);
      alert(err.message || 'Failed to update follow state');
    }
    finally { setFollowLoading(false); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if(newRating === 0) return alert("Please select a star rating first.");
    if(!newReviewText.trim()) return alert("Please write a review comment.");
    
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/novels/${id}/reviews`, {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ userId: user.id, rating: newRating, text: newReviewText })
      });
      if(res.ok) {
         const addedReview = await res.json();
         setReviews([addedReview, ...reviews]);
         setNewRating(0);
         setNewReviewText('');
      } else {
         const err = await res.json();
         alert(err.error);
      }
    } catch(err) {
      console.error(err);
      alert("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpfulClick = async (reviewId) => {
    if (!user?.id || !reviewId) return;
    setHelpfulLoadingReviewId(reviewId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark review as helpful');
      }

      setReviews((prev) => prev.map((r) => (
        Number(r.id) === Number(reviewId)
          ? { ...r, likes: Number(data.likes || 0) }
          : r
      )));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to mark review as helpful');
    } finally {
      setHelpfulLoadingReviewId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  if (!novel || novel.error) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Novel not found.</h2>
        <Link to="/" className="btn-primary" style={{ marginTop: '1rem' }}>Back to Library</Link>
      </div>
    );
  }

  return (
    <div className="novel-detail-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {showAllChaptersModal && (
        <div
          onClick={() => setShowAllChaptersModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 8, 23, 0.72)',
            backdropFilter: 'blur(3px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(980px, 100%)',
              maxHeight: '85vh',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>All Chapters ({chapters.length})</h3>
              <button
                className="btn-outline"
                onClick={() => setShowAllChaptersModal(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem' }}
              >
                <X size={16} /> Close
              </button>
            </div>

            <div style={{ padding: '1rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' }}>
                {chapters.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/read/${novel.id}/${ch.chapter_number}`}
                    onClick={() => setShowAllChaptersModal(false)}
                    className="glass"
                    style={{
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      padding: '0.85rem 0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chapter {ch.chapter_number}</span>
                    <strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.title || `Chapter ${ch.chapter_number}`}</strong>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Back to Library
      </Link>
      
      {/* Hero Header Side-by-Side Flexbox */}
      <div style={{ display: 'flex', gap: '4rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0, width: '300px', aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <img src={resolveMediaUrl(novel.cover_photo || novel.cover_url)} alt={novel.title} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {novel.featured === 1 && <span style={{ display: 'inline-block', background: 'var(--accent-primary)', color: 'black', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', width: 'fit-content' }}>Featured</span>}
          <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '0.5rem', lineHeight: '1.1' }}>{novel.title}</h1>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>by {novel.author_id ? (
                <Link to={`/user/${novel.author_id}`} style={{ color: 'var(--text-primary)', fontWeight: 'bold', textDecoration: 'none' }} className="hover-accent-text">
                  {novel.author_name}
                </Link>
              ) : (
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{novel.author_name}</span>
              )}
            </span>
            {user?.id && novel.author_id && Number(user.id) !== Number(novel.author_id) && (
                <button 
                  onClick={handleToggleFollow}
                  className={`btn-outline ${isFollowing ? 'active' : ''}`}
                  disabled={followLoading}
                  style={{ padding: '0.2rem 0.8rem', fontSize: '0.9rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <User size={14} /> {followLoading ? 'Saving...' : (isFollowing ? 'Following' : 'Follow')}
                </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}><Star size={20} fill="currentColor" className="text-accent" /> {novel.rating?.toFixed(1) || '0.0'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}><BookOpen size={20} /> {chapters.length || 0} Chapters</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}><Users size={20} /> {formatReads(novel.reads)} Reads</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
             {novel.tags && (typeof novel.tags === 'string' ? JSON.parse(novel.tags) : novel.tags).map(tag => (
               <span key={tag} style={{ background: 'var(--bg-secondary)', padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{tag}</span>
             ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to={`/read/${novel.id}/${continueChapter}`} className="btn-primary" style={{ textDecoration: 'none', padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              {hasReadingProgress ? `Continue (Chapter ${continueChapter})` : 'Start Reading'}
            </Link>
            <button 
              className={inLibrary ? 'btn-primary shadow' : 'btn-outline'} 
              onClick={handleToggleLibrary}
              disabled={togglingLibrary}
              style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}
            >
              {togglingLibrary ? '...' : (inLibrary ? 'In Library' : 'Add to Library')}
            </button>
          </div>
        </div>
      </div>

      {/* Grid layout for Synopsis and TOC */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', marginTop: '5rem' }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>Synopsis</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.8' }}>{novel.synopsis || 'No synopsis yet.'}</p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>Table of Contents</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             {chapters.length === 0 ? <p style={{color: 'var(--text-secondary)'}}>No chapters published yet.</p> : chapters.slice(0, 5).map((ch, i) => (
               <Link to={`/read/${novel.id}/${ch.chapter_number}`} key={ch.id} className="glass" style={{ padding: '1.25rem', borderRadius: '0.5rem', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}>
                 <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Chapter {ch.chapter_number}</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{ch.title || `Chapter ${ch.chapter_number}`}</span>
                 </div>
                 <BookOpen size={18} className="text-secondary" />
               </Link>
             ))}
             {chapters.length > 5 && (
               <button className="btn-outline" style={{ marginTop: '1rem' }} onClick={() => setShowAllChaptersModal(true)}>
                 View All {chapters.length} Chapters
               </button>
             )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Community Reviews</h2>
        
        {/* Write Review Form */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1rem', marginBottom: '3rem' }}>
           <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Leave a Review</h3>
           <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', cursor: 'pointer' }} onMouseLeave={() => setRatingHover(0)}>
               {[1,2,3,4,5].map(star => (
                  <Star 
                     key={star} 
                     size={28} 
                     onClick={() => setNewRating(star)}
                     onMouseEnter={() => setRatingHover(star)}
                     fill={(ratingHover || newRating) >= star ? 'currentColor' : 'none'}
                     className={(ratingHover || newRating) >= star ? 'text-accent' : 'text-secondary'}
                     style={{ transition: 'color 0.2s' }}
                  />
               ))}
               <span style={{ marginLeft: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                  {newRating > 0 ? `${newRating} Stars` : 'Rate this novel...'}
               </span>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <textarea 
                value={newReviewText}
                onChange={e => setNewReviewText(e.target.value)}
                placeholder="Share your thoughts on this story..."
                style={{ width: '100%', height: '120px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical' }}
             />
             <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleReviewSubmit} disabled={submittingReview} className="btn-primary shadow" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   {submittingReview ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                   Submit Review
                </button>
             </div>
           </div>
        </div>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0', background: 'var(--bg-secondary)', borderRadius: '1rem' }}>No reviews yet. Be the first to share your thoughts!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             {reviews.map(r => (
               <div key={r.id} className="glass" style={{ padding: '2rem', borderRadius: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {r.user_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                           <strong style={{ fontSize: '1.1rem', display: 'block' }}>{r.user_name}</strong>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(r.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-primary)', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>
                      <Star size={16} fill="currentColor" /> {r.rating.toFixed(1)}
                    </span>
                 </div>
                 <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '1.5rem', fontSize: '1.05rem' }}>{r.content || r.text}</p>
                  {Number(r.user_id) !== Number(user?.id) ? (
                    <button
                      className="btn-outline"
                      onClick={() => handleHelpfulClick(r.id)}
                      disabled={helpfulLoadingReviewId === r.id}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {helpfulLoadingReviewId === r.id ? 'Saving...' : <><ThumbsUp size={16} /> Helpful ({r.likes || 0})</>}
                    </button>
                  ) : (
                    <span
                      className="btn-outline"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, cursor: 'default' }}
                    >
                      <ThumbsUp size={16} /> Helpful ({r.likes || 0})
                    </span>
                  )}
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
