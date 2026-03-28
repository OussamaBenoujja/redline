import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Type, Image as ImageIcon, Download, MessageSquare, CheckCircle, X, Loader } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Reader() {
  const { user } = useAuth();
  const { novelId, chapterNum } = useParams();
  
  const [chapter, setChapter] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Customization States
  const [showImages, setShowImages] = useState(true);
  const [fontSize, setFontSize] = useState(18); 
  const [fontFamily, setFontFamily] = useState('inter'); 
  const [themeMode, setThemeMode] = useState('default');
  
  const [activeParagraphIdx, setActiveParagraphIdx] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Comments State
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    // Assuming chapterId maps to chapterNum for the demo
    const chapterId = chapterNum;
    
    // Log History Native Event
    if (user?.id) {
       fetch(`http://localhost:4000/api/users/${user.id}/history`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ novelId, chapterNum })
       }).catch(e => console.error("History log failed:", e));
    }

    Promise.all([
      fetch(`http://localhost:4000/api/chapters/${chapterId}`).then(res => res.json()),
      fetch(`http://localhost:4000/api/chapters/${chapterId}/comments`).then(res => res.json())
    ]).then(([chapterData, commentsData]) => {
      setChapter(chapterData);
      setComments(commentsData || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch reader data:", err);
      setLoading(false);
    });
  }, [novelId, chapterNum]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}><Loader className="animate-spin text-accent" size={48} /></div>;
  }
  
  if (!chapter || chapter.error) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-primary)', height: '100vh' }}>
        <h2 style={{color: 'var(--text-primary)'}}>Chapter not found.</h2>
        <Link to={`/novel/${novelId}`} className="btn-primary" style={{ marginTop: '1rem' }}>Return to Novel</Link>
      </div>
    );
  }

  const readerThemeClass = `theme-${themeMode} font-${fontFamily}`;
  const getCommentsForParagraph = (idx) => comments.filter(c => c.paragraph_idx === idx);
  const activeComments = activeParagraphIdx !== null ? getCommentsForParagraph(activeParagraphIdx) : [];

  const handlePostComment = async () => {
      if(!newCommentText.trim()) return;
      setPostingComment(true);
      try {
          const chapterId = chapterNum;
          const res = await fetch(`http://localhost:4000/api/chapters/${chapterId}/comments`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ userId: user.id, novelId, paragraphIdx: activeParagraphIdx, text: newCommentText })
          });
          if(res.ok) {
              const addedComment = await res.json();
              setComments([...comments, addedComment]);
              setNewCommentText('');
          } else {
              const err = await res.json();
              console.error("Failed to post:", err);
              alert(err.error);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setPostingComment(false);
      }
  };

  return (
    <div className={`reader-container animate-fade-in ${readerThemeClass}`}>
      
      {showSettings && (
        <div className="settings-panel glass animate-fade-in">
          <h4>Reading Options</h4>
          <div className="setting-row">
            <span>Font Size</span>
            <div className="setting-actions" style={{ alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
               <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '1.2rem', flex: 'none' }}>-</button>
               <span style={{ fontWeight: 600, width: '40px', textAlign: 'center' }}>{fontSize}</span>
               <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '1.2rem', flex: 'none' }}>+</button>
            </div>
          </div>
          <div className="setting-row">
            <span>Font Style</span>
            <select 
               value={fontFamily} 
               onChange={(e) => setFontFamily(e.target.value)}
               style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
               <option value="inter">Sans-serif (Inter)</option>
               <option value="serif">Serif (Georgia)</option>
            </select>
          </div>
          <div className="setting-row">
            <span>Background Theme</span>
            <div className="setting-actions">
               <button className={themeMode === 'default' ? 'active' : ''} onClick={() => setThemeMode('default')}>Auto</button>
               <button className={themeMode === 'sepia' ? 'active' : ''} onClick={() => setThemeMode('sepia')}>Sepia</button>
               <button className={themeMode === 'pure-black' ? 'active' : ''} onClick={() => setThemeMode('pure-black')}>Black</button>
            </div>
          </div>
        </div>
      )}

      {activeParagraphIdx !== null && (
        <div className="comments-drawer glass animate-pull-left">
          <div className="drawer-header">
            <h3>Paragraph {activeParagraphIdx + 1} Comments <span className="badge">{activeComments.length}</span></h3>
            <button onClick={() => setActiveParagraphIdx(null)} className="close-btn"><X size={20}/></button>
          </div>
          <div className="drawer-content">
             <div className="comment-list">
               {activeComments.length === 0 ? (
                 <p style={{color: 'var(--text-secondary)'}}>No reactions here yet. Be the first!</p>
               ) : activeComments.map((c, i) => (
                 <div key={i} className="comment-item">
                   <strong>{c.user_name}</strong>
                   <p>{c.text}</p>
                   <span className="comment-likes">❤️ {c.likes}</span>
                 </div>
               ))}
             </div>
             <div className="comment-input-box">
                <input 
                   type="text" 
                   placeholder="Add your reaction..." 
                   value={newCommentText}
                   onChange={e => setNewCommentText(e.target.value)}
                   onKeyDown={e => { if(e.key === 'Enter') handlePostComment(); }}
                />
                <button className="btn-primary" onClick={handlePostComment} disabled={postingComment}>
                   {postingComment ? '...' : 'Post'}
                </button>
             </div>
          </div>
        </div>
      )}

      <header className="reader-header glass">
        <Link to={`/novel/${novelId}`} className="back-link">
          <ArrowLeft size={20} /> <span className="hide-on-mobile">Back</span>
        </Link>
        <h2 className="chapter-title hide-on-mobile">Ch {chapter.chapter_number}: {chapter.title}</h2>
        <div className="reader-controls">
          <button className={`control-btn ${showImages ? 'active' : ''}`} onClick={() => setShowImages(!showImages)} title="Toggle AI Images">
            <ImageIcon size={20} />
          </button>
          <button className={`control-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Settings">
             <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="reader-content" style={{ fontSize: `${fontSize}px` }}>
        <h1 className="chapter-hero-title">Chapter {chapter.chapter_number}</h1>
        <h2 className="chapter-subtitle">{chapter.title}</h2>
        
        {chapter.paragraphs && chapter.paragraphs.map(p => {
          const paragraphComments = getCommentsForParagraph(p.idx);
          return (
            <div key={p.idx} className={`paragraph-block text`}>
              {/* Note: The backend schema doesn't differentiate images directly here, using text */}
              <div className="text-wrapper">
                <p>{p.text}</p>
                <div className="inline-action-bar">
                   <button className="inline-comment-btn" onClick={() => setActiveParagraphIdx(p.idx)} title="View Comments">
                     <MessageSquare size={16}/> <span>{paragraphComments.length}</span>
                   </button>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="reader-footer">
          <Link to={`/read/${novelId}/${parseInt(chapterNum) - 1}`} className={`btn-outline ${chapterNum <= 1 ? 'disabled' : ''}`}>
            Previous Chapter
          </Link>
          <button className="btn-primary">
            Next Chapter
          </button>
        </div>
      </main>
    </div>
  );
}
