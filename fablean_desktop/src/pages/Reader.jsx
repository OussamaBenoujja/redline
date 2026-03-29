import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Image as ImageIcon, MessageSquare, X, Loader } from 'lucide-react';
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

  // AI Image States
  const [paragraphImages, setParagraphImages] = useState({});
  const [imageLoading, setImageLoading] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [selectedParagraphId, setSelectedParagraphId] = useState(null);

  // Comments State
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Log History Event
    if (user?.id) {
       fetch(`http://localhost:4000/api/users/${user.id}/history`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ novelId, chapterNum })
       }).catch(e => console.error("History log failed:", e));
    }

    const loadReaderData = async () => {
      try {
        setLoading(true);
        const chapterListRes = await fetch(`http://localhost:4000/api/novels/${novelId}/chapters`);
        const chapterList = await chapterListRes.json();
        if (!chapterListRes.ok) throw new Error(chapterList.error || 'Chapter list load failed');

        const selected = (chapterList || []).find(ch => Number(ch.chapter_number) === Number(chapterNum));
        if (!selected?.id) throw new Error('Chapter not found for this novel');

        const chapterRes = await fetch(`http://localhost:4000/api/chapters/${selected.id}`);
        const chapterData = await chapterRes.json();
        if (!chapterRes.ok) throw new Error(chapterData.error || 'Chapter load failed');

        const commentsRes = await fetch(`http://localhost:4000/api/chapters/${chapterData.id}/comments`);
        const commentsData = await commentsRes.json();

        if (!isMounted) return;
        setChapter(chapterData);
        setComments(commentsData || []);
        setParagraphImages({});
        setImageLoading({});
        setImageErrors({});
        setSelectedParagraphId(null);
      } catch (err) {
        console.error("Failed to fetch reader data:", err);
        if (isMounted) setChapter({ error: err.message });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReaderData();

    return () => {
      isMounted = false;
    };
  }, [novelId, chapterNum]);

  const generateParagraphImage = useCallback(async (paragraph, silent = false) => {
    if (!chapter?.id || !paragraph?.id) return;

    setImageLoading(prev => ({ ...prev, [paragraph.id]: true }));
    setImageErrors(prev => ({ ...prev, [paragraph.id]: '' }));

    try {
      const res = await fetch('http://localhost:4000/api/images/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, paragraphId: paragraph.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      if (!data.imageBase64) throw new Error('GPU returned no image');

      setParagraphImages(prev => ({ ...prev, [paragraph.id]: data.imageBase64 }));
    } catch (e) {
      if (!silent) {
        console.error('Paragraph image generation failed:', e.message);
      }
      setImageErrors(prev => ({ ...prev, [paragraph.id]: e.message || 'Failed to generate image' }));
    } finally {
      setImageLoading(prev => {
        const next = { ...prev };
        delete next[paragraph.id];
        return next;
      });
    }
  }, [chapter?.id]);

  const handleParagraphSelect = useCallback(async (paragraph) => {
    if (!showImages || !paragraph?.id) return;
    setSelectedParagraphId(paragraph.id);
    if (!paragraphImages[paragraph.id] && !imageLoading[paragraph.id]) {
      await generateParagraphImage(paragraph);
    }
  }, [showImages, paragraphImages, imageLoading, generateParagraphImage]);

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
  const chapterBgImage = selectedParagraphId ? paragraphImages[selectedParagraphId] : null;
  const chapterBackgroundStyle = showImages && chapterBgImage
    ? {
        backgroundImage: `url(${chapterBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }
    : undefined;
  const getCommentsForParagraph = (idx) => comments.filter(c => c.paragraph_idx === idx);
  const activeComments = activeParagraphIdx !== null ? getCommentsForParagraph(activeParagraphIdx) : [];

  const handlePostComment = async () => {
      if(!newCommentText.trim()) return;
      if (!chapter?.id) return;
      setPostingComment(true);
      try {
        const res = await fetch(`http://localhost:4000/api/chapters/${chapter.id}/comments`, {
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
    <div className={`reader-container animate-fade-in ${readerThemeClass} ${showImages && chapterBgImage ? 'chapter-bg-enabled' : ''}`} style={chapterBackgroundStyle}>
      
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
        {chapter.paragraphs && chapter.paragraphs.map(p => {
          const paragraphComments = getCommentsForParagraph(p.idx);
          const imageErr = imageErrors[p.id];
          const isImageLoading = !!imageLoading[p.id];

          return (
            <div
              key={p.idx}
              className={`paragraph-block text paragraph-selectable ${selectedParagraphId === p.id ? 'active' : ''}`}
              onClick={() => handleParagraphSelect(p)}
              title={showImages ? 'Click to set this paragraph image as chapter background' : 'Enable image mode to set chapter background'}
            >
              <div className="text-wrapper">
                <p>{p.text}</p>
                <div className="inline-action-bar">
                   {showImages && (
                     <button
                       className="inline-comment-btn"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleParagraphSelect(p);
                       }}
                       disabled={isImageLoading}
                       title="Set chapter background from this paragraph"
                     >
                       {isImageLoading ? <Loader size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                       <span>{isImageLoading ? 'Generating...' : (imageErr ? 'Retry bg' : (selectedParagraphId === p.id ? 'Background set' : 'Set background'))}</span>
                     </button>
                   )}
                   <button className="inline-comment-btn" onClick={(e) => { e.stopPropagation(); setActiveParagraphIdx(p.idx); }} title="View Comments">
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
