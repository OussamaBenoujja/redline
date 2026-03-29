import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, Plus, FileText, LayoutDashboard, Loader, CheckCircle, Wifi, Edit3, Sparkles, X, UserCheck, UserPlus, AlertTriangle } from 'lucide-react';
import { io } from 'socket.io-client';

export default function AuthorEditor() {
  const { novelId } = useParams();
  
  const [chapters, setChapters] = useState([]);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterText, setChapterText] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  // Novel Rename State
  const [isRenaming, setIsRenaming] = useState(false);
  const [novelTitle, setNovelTitle] = useState('');

  // AI Assist State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiNewChars, setAiNewChars] = useState([]);
  const [aiExistingChars, setAiExistingChars] = useState([]);
  const [aiError, setAiError] = useState('');

  // 1. Initial Load & Socket Boot
  useEffect(() => {
    // Connect Socket
    const newSocket = io('http://localhost:4000');
    setSocket(newSocket);
    newSocket.on('connect', () => setSocketConnected(true));
    newSocket.on('disconnect', () => setSocketConnected(false));

    // Fetch Content
    Promise.all([
      fetch(`http://localhost:4000/api/novels/${novelId}`).then(res => res.json()),
      fetch(`http://localhost:4000/api/novels/${novelId}/chapters`).then(res => res.json())
    ]).then(([novelData, chaptersData]) => {
      setNovel(novelData);
      setNovelTitle(novelData.title || 'Untitled Workspace');
      setChapters(chaptersData || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    return () => newSocket.disconnect();
  }, [novelId]);

  // 2. Load Selected Chapter
  const loadChapter = async (chap) => {
     setActiveChapterId(chap.id);
     setChapterTitle(chap.title);
     // Fetch full content (GET /api/chapters/:id)
     try {
       const res = await fetch(`http://localhost:4000/api/chapters/${chap.id}`);
       const data = await res.json();
       setChapterText(data.full_text || '');
     } catch(e) {
       console.error("Failed to load chapter content", e);
     }
  };

  const startNewChapter = () => {
     setActiveChapterId(null);
     setChapterTitle('');
     setChapterText('');
  };

  // 3. Save / Publish (creates a new chapter DB entry or chunks it)
  const handleSave = async () => {
    if (!chapterTitle.trim() || !chapterText.trim()) return alert("Title and content are required.");
    setIsSaving(true);
    setSavedSuccess(false);

    // If activeChapterId exists, it's already auto-saved via Socket. Just flash success.
    // If not, we map a new one.
    const isNew = !activeChapterId;
    const nextChapterNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;
    const finalChapterNum = isNew ? nextChapterNum : chapters.find(c => c.id === activeChapterId)?.chapter_number;

    try {
      const res = await fetch('http://localhost:4000/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          title: chapterTitle,
          chapterNumber: finalChapterNum,
          fullText: chapterText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSavedSuccess(true);
        if(isNew) setActiveChapterId(data.chapterId);
        
        // Refresh chapters
        const updatedChapters = await fetch(`http://localhost:4000/api/novels/${novelId}/chapters`).then(r => r.json());
        setChapters(updatedChapters || []);
      } else {
        const err = await res.json();
        alert(`Error saving: ${err.error}`);
      }
    } catch (error) {
       console.error(error);
       alert("Failed to save chapter.");
    } finally {
       setIsSaving(false);
       setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  // 4. Real-time WebSockets Live Typing
  const handleTextChange = (e) => {
    const newVal = e.target.value;
    setChapterText(newVal);
    // Directly stream keystrokes to DB if modifying an existing chapter
    if (socket && activeChapterId) {
        socket.emit('edit_chapter', { chapterId: activeChapterId, fullText: newVal });
    }
  };

  // 5. Rename Novel Workspace
  const handleRenameBlur = async () => {
    setIsRenaming(false);
    if(novelTitle !== novel.title) {
        try {
            await fetch(`http://localhost:4000/api/novels/${novelId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ title: novelTitle })
            });
            setNovel({...novel, title: novelTitle});
        } catch(e) {
            console.error(e);
            setNovelTitle(novel.title); // rollback
        }
    }
  };

  // 6. AI Analyze
  const handleAiAnalyze = async () => {
    if (!chapterText.trim()) return alert('Write some content first before running AI analysis.');
    setShowAiPanel(true);
    setAiLoading(true);
    setAiError('');
    setAiSuggestions([]);
    setAiNewChars([]);
    setAiExistingChars([]);
    try {
      const res = await fetch('http://localhost:4000/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelId, text: chapterText })
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      setAiSuggestions(data.suggestions || []);
      setAiNewChars(data.newCharacters || []);
      setAiExistingChars(data.existingCharacters || []);
    } catch (err) {
      console.error(err);
      setAiError('Failed to reach the AI service.');
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (original, replacement) => {
    setChapterText(prev => prev.replace(original, replacement));
    setAiSuggestions(prev => prev.filter(s => s.original !== original));
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}><Loader className="animate-spin text-accent" size={48} /></div>;

  return (
    <div className="author-editor-layout animate-fade-in" style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)' }}>
      
      {/* Sidebar - Table of Contents */}
      <aside className="editor-sidebar glass" style={{ width: '300px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <Link to="/author/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textDecoration: 'none', fontWeight: 'bold' }}>
            <LayoutDashboard size={18} /> Exit to Dashboard
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'text' }}>
             {isRenaming ? (
                <input 
                   autoFocus
                   type="text" 
                   value={novelTitle} 
                   onChange={e => setNovelTitle(e.target.value)}
                   onBlur={handleRenameBlur}
                   onKeyDown={e => e.key === 'Enter' && handleRenameBlur()}
                   style={{ fontSize: '1.2rem', fontWeight: 'bold', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', outline: '1px solid var(--accent-primary)', width: '100%', borderRadius: '4px', padding: '0.2rem' }}
                />
             ) : (
                <h2 onClick={() => setIsRenaming(true)} style={{ fontSize: '1.2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {novelTitle} <Edit3 size={14} className="text-secondary" />
                </h2>
             )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Table of Contents</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {chapters.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>No chapters drafted yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               {chapters.map(c => (
                 <li key={c.id} onClick={() => loadChapter(c)} style={{ padding: '0.75rem 1rem', background: activeChapterId === c.id ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', borderLeft: activeChapterId === c.id ? '2px solid var(--accent-primary)' : '2px solid transparent', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                   <FileText size={16} className={activeChapterId === c.id ? 'text-accent' : 'text-secondary'} />
                   <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chapter {c.chapter_number}</div>
                      <div style={{ fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.title}</div>
                   </div>
                 </li>
               ))}
            </ul>
          )}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={startNewChapter} className="btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: activeChapterId === null ? 'var(--bg-secondary)' : 'transparent' }}>
            <Plus size={16} /> Draft New Chapter
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="editor-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
         <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
            <div style={{ flex: 1 }}>
               <input 
                  type="text" 
                  placeholder="Chapter Title..." 
                  value={chapterTitle}
                  onChange={e => setChapterTitle(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', outline: 'none' }}
               />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
               {socketConnected ? 
                   <span style={{color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem'}}><Wifi size={14} color="#10b981"/> Live connected</span>
                   : 
                   <span style={{color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem'}}><Wifi size={14}/> Disconnected</span>
               }

               <button
                 className="btn-outline"
                 onClick={startNewChapter}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
               >
                 <Plus size={16} /> New Chapter
               </button>
               
               {savedSuccess && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }} className="animate-fade-in"><CheckCircle size={16} /> Draft Saved</span>}
               
               <button className="btn-primary shadow" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                 {activeChapterId ? 'Force Sync & Map' : 'Publish Chapter'}
               </button>
               <button className="btn-outline" onClick={handleAiAnalyze} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(168, 85, 247, 0.5)', color: '#a855f7' }}>
                 {aiLoading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                 AI Assist
               </button>
            </div>
         </header>

         <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
            <textarea
               className="editor-textarea"
               placeholder="Write your story here... (Separate paragraphs with double newlines)"
               value={chapterText}
               onChange={handleTextChange}
               style={{
                  width: '100%',
                  maxWidth: '800px',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.2rem',
                  lineHeight: '1.8',
                  resize: 'none',
                  fontFamily: 'var(--font-serif)'
               }}
            />
         </div>
      </main>

      {/* AI Assist Sidebar */}
      {showAiPanel && (
        <aside className="ai-sidebar glass animate-fade-in" style={{ width: '380px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7' }}><Sparkles size={18} /> AI Writing Assistant</h3>
            <button onClick={() => setShowAiPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            {aiLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                <Loader size={32} className="animate-spin" style={{ color: '#a855f7' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Analyzing your chapter...</p>
              </div>
            )}

            {aiError && !aiLoading && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0 }}>{aiError}</p>
              </div>
            )}

            {!aiLoading && aiSuggestions.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Edit3 size={16} /> Grammar & Style ({aiSuggestions.length})</h4>
                {aiSuggestions.map((s, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #eab308' }}>
                    <p style={{ fontSize: '0.85rem', color: '#ef4444', margin: '0 0 0.5rem', textDecoration: 'line-through' }}>{s.original}</p>
                    <p style={{ fontSize: '0.85rem', color: '#10b981', margin: '0 0 0.5rem' }}>{s.replacement}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', fontStyle: 'italic' }}>{s.reason}</p>
                    <button onClick={() => applySuggestion(s.original, s.replacement)} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', borderColor: '#10b981', color: '#10b981' }}>Apply Fix</button>
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && aiNewChars.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={16} /> New Characters Saved ({aiNewChars.length})</h4>
                {aiNewChars.map((c, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.75rem', borderLeft: '3px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: c.importance === 'MAIN' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(100,100,100,0.2)', color: c.importance === 'MAIN' ? '#a855f7' : 'var(--text-secondary)' }}>{c.importance}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>{c.base_description}</p>
                    {c.visual_tags && c.visual_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {c.visual_tags.map((tag, j) => <span key={j} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '2rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>{tag}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && aiExistingChars.length > 0 && (
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserCheck size={16} /> Already Tracked ({aiExistingChars.length})</h4>
                {aiExistingChars.map((c, i) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '0.5rem', opacity: 0.7, borderLeft: '3px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{c.base_description}</p>
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && !aiError && aiSuggestions.length === 0 && aiNewChars.length === 0 && aiExistingChars.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Click "AI Assist" to analyze your chapter text.</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
