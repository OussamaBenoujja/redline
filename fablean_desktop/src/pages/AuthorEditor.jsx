import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, Plus, FileText, LayoutDashboard, Loader, CheckCircle, Wifi, Edit3, Sparkles, X, UserCheck, UserPlus, AlertTriangle, Image as ImageIcon, Layers } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SCENE_API_BASE_URL, SOCKET_URL } from '../config/api';

const API_BASE = API_BASE_URL;
const SCENE_API_BASE = SCENE_API_BASE_URL;

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
  const [novelSynopsis, setNovelSynopsis] = useState('');
  const [novelCoverUrl, setNovelCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isSavingNovelMeta, setIsSavingNovelMeta] = useState(false);
  const [novelMetaSaved, setNovelMetaSaved] = useState(false);

  // AI Assist State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiNewChars, setAiNewChars] = useState([]);
  const [aiExistingChars, setAiExistingChars] = useState([]);
  const [aiError, setAiError] = useState('');

  // Scene Studio State
  const [sceneList, setSceneList] = useState([]);
  const [sceneStartIdx, setSceneStartIdx] = useState(null);
  const [sceneEndIdx, setSceneEndIdx] = useState(null);
  const [sceneContextNotes, setSceneContextNotes] = useState('');
  const [scenePromptOverride, setScenePromptOverride] = useState('');
  const [sceneBusy, setSceneBusy] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [generatingSceneId, setGeneratingSceneId] = useState(null);
  const [deletingSceneId, setDeletingSceneId] = useState(null);
  const [selectedExcerpt, setSelectedExcerpt] = useState('');
  const [showScenePanel, setShowScenePanel] = useState(true);
  const editorRef = useRef(null);

  // 1. Initial Load & Socket Boot
  useEffect(() => {
    // Connect Socket
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.on('connect', () => setSocketConnected(true));
    newSocket.on('disconnect', () => setSocketConnected(false));

    // Fetch Content
    Promise.all([
      fetch(`${API_BASE}/api/novels/${novelId}`).then(res => res.json()),
      fetch(`${SCENE_API_BASE}/api/novels/${novelId}/chapters`).then(res => res.json())
    ]).then(([novelData, chaptersData]) => {
      setNovel(novelData);
      setNovelTitle(novelData.title || 'Untitled Workspace');
      setNovelSynopsis(novelData.synopsis || '');
      setNovelCoverUrl(novelData.cover_photo || novelData.cover_url || '');
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
      const res = await fetch(`${SCENE_API_BASE}/api/chapters/${chap.id}`);
       const data = await res.json();
       setChapterText(data.full_text || '');

      const sceneRes = await fetch(`${SCENE_API_BASE}/api/chapters/${chap.id}/scenes`);
       const sceneData = await sceneRes.json();
       setSceneList(Array.isArray(sceneData) ? sceneData : []);
     } catch(e) {
       console.error("Failed to load chapter content", e);
     }
  };

  const startNewChapter = () => {
     setActiveChapterId(null);
     setChapterTitle('');
     setChapterText('');
     setSceneList([]);
     setSceneError('');
  };

  const getSceneRanges = () => {
    const text = chapterText || '';
    const maxLen = text.length;

    return (sceneList || [])
      .map((scene) => {
        const start = Number(scene.start_char_idx);
        const end = Number(scene.end_char_idx);

        if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= maxLen) {
          return { id: scene.id, start, end };
        }

        // Backward compatibility for legacy scene rows without char indexes.
        if (scene.selected_text && typeof scene.selected_text === 'string') {
          const idx = text.indexOf(scene.selected_text);
          if (idx >= 0) {
            return { id: scene.id, start: idx, end: idx + scene.selected_text.length };
          }
        }

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start || a.end - b.end);
  };

  const doesRangeOverlapExistingScene = (start, end) => {
    const ranges = getSceneRanges();
    return ranges.some((r) => !(end <= r.start || start >= r.end));
  };

  const renderCoverageHighlight = () => {
    const text = chapterText || '';
    if (!text) return null;

    const ranges = getSceneRanges();
    if (ranges.length === 0) return text;

    const nodes = [];
    let cursor = 0;

    ranges.forEach((range, idx) => {
      if (range.start > cursor) {
        nodes.push(<span key={`plain-${idx}-${cursor}`}>{text.slice(cursor, range.start)}</span>);
      }

      nodes.push(
        <mark key={`scene-${range.id}`} style={{ background: 'rgba(16, 185, 129, 0.28)', color: 'inherit', borderRadius: '3px' }}>
          {text.slice(range.start, range.end)}
        </mark>
      );

      cursor = Math.max(cursor, range.end);
    });

    if (cursor < text.length) {
      nodes.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
    }

    return nodes;
  };

  const captureCursorSelection = (showError = true) => {
    const editor = editorRef.current;
    if (!editor) return false;

    const selStart = editor.selectionStart;
    const selEnd = editor.selectionEnd;

    if (selStart === selEnd) {
      if (showError) setSceneError('Select scene text in the editor first, then click "Use Cursor Selection".');
      return false;
    }

    if (doesRangeOverlapExistingScene(selStart, selEnd)) {
      if (showError) setSceneError('Selection overlaps existing scene text. Delete or adjust the existing scene first.');
      return false;
    }

    setSceneStartIdx(selStart);
    setSceneEndIdx(selEnd);

    const excerpt = chapterText.slice(selStart, selEnd).trim();
    setSelectedExcerpt(excerpt);
    setSceneError('');
    return true;
  };

  const refreshScenes = async (chapterId) => {
    const res = await fetch(`${SCENE_API_BASE}/api/chapters/${chapterId}/scenes`);
    const data = await res.json();
    setSceneList(Array.isArray(data) ? data : []);
  };

  const handleCreateScene = async () => {
    if (!activeChapterId) {
      alert('Save/publish the chapter first, then create scenes.');
      return;
    }

    if (sceneStartIdx === null || sceneEndIdx === null) {
      const captured = captureCursorSelection(true);
      if (!captured) return;
    }

    const start = Number(sceneStartIdx);
    const end = Number(sceneEndIdx);

    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end <= start || end > (chapterText || '').length) {
      setSceneError(`Invalid character range. Chapter has ${(chapterText || '').length} characters.`);
      return;
    }

    if (doesRangeOverlapExistingScene(start, end)) {
      setSceneError('Selection overlaps existing scene text. Delete or adjust the existing scene first.');
      return;
    }

    setSceneBusy(true);
    setSceneError('');

    try {
      const res = await fetch(`${SCENE_API_BASE}/api/chapters/${activeChapterId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startCharIdx: start,
          endCharIdx: end,
          contextNotes: sceneContextNotes,
          promptOverride: scenePromptOverride
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create scene');

      await refreshScenes(activeChapterId);
      setSceneContextNotes('');
      setScenePromptOverride('');
      setSelectedExcerpt('');
      setSceneStartIdx(null);
      setSceneEndIdx(null);
    } catch (e) {
      setSceneError(e.message || 'Failed to create scene');
    } finally {
      setSceneBusy(false);
    }
  };

  const handleDeleteScene = async (sceneId) => {
    if (!activeChapterId) return;
    setDeletingSceneId(sceneId);
    setSceneError('');

    try {
      const res = await fetch(`${SCENE_API_BASE}/api/scenes/${sceneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete scene');
      await refreshScenes(activeChapterId);
    } catch (e) {
      setSceneError(e.message || 'Failed to delete scene');
    } finally {
      setDeletingSceneId(null);
    }
  };

  const handleGenerateSceneImage = async (sceneId) => {
    setGeneratingSceneId(sceneId);
    setSceneError('');
    try {
      const res = await fetch(`${SCENE_API_BASE}/api/scenes/${sceneId}/generate-image`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate scene image');
      await refreshScenes(activeChapterId);
    } catch (e) {
      setSceneError(e.message || 'Failed to generate scene image');
    } finally {
      setGeneratingSceneId(null);
    }
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
      const res = await fetch(`${SCENE_API_BASE}/api/chapters`, {
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
        const updatedChapters = await fetch(`${SCENE_API_BASE}/api/novels/${novelId}/chapters`).then(r => r.json());
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
        await fetch(`${API_BASE}/api/novels/${novelId}`, {
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

  const handleSaveNovelMeta = async () => {
    setIsSavingNovelMeta(true);
    setNovelMetaSaved(false);

    try {
      const payload = {
        title: novelTitle,
        synopsis: novelSynopsis,
        coverUrl: novelCoverUrl,
        coverPhoto: novelCoverUrl,
      };

      const res = await fetch(`${API_BASE}/api/novels/${novelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save novel details');
      }

      setNovel((prev) => ({
        ...prev,
        title: novelTitle,
        synopsis: novelSynopsis,
        cover_url: novelCoverUrl,
        cover_photo: novelCoverUrl,
      }));

      setNovelMetaSaved(true);
      setTimeout(() => setNovelMetaSaved(false), 2500);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to save novel details');
    } finally {
      setIsSavingNovelMeta(false);
    }
  };

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${API_BASE}${url}`;
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/media/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setNovelCoverUrl(data.url || '');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
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
      const res = await fetch(`${API_BASE}/api/ai/analyze`, {
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

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Synopsis</span>
              <textarea
                value={novelSynopsis}
                onChange={(e) => setNovelSynopsis(e.target.value)}
                rows={3}
                placeholder="Write a short synopsis..."
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  resize: 'vertical',
                  fontSize: '0.86rem',
                  lineHeight: 1.4,
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Cover Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  fontSize: '0.86rem',
                }}
              />
              {uploadingCover && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uploading cover...</span>}
            </label>

            {novelCoverUrl && (
              <div style={{ width: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <img
                  src={resolveMediaUrl(novelCoverUrl)}
                  alt="Novel cover preview"
                  style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                />
              </div>
            )}

            <button
              onClick={handleSaveNovelMeta}
              disabled={isSavingNovelMeta}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
            >
              {isSavingNovelMeta ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              Save Novel Details
            </button>

            {novelMetaSaved && (
              <span style={{ color: '#10b981', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={14} /> Saved
              </span>
            )}
          </div>
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
                 onClick={() => setShowScenePanel((prev) => !prev)}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
               >
                 <Layers size={16} /> {showScenePanel ? 'Hide Scene Studio' : 'Show Scene Studio'}
               </button>

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

         <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: showScenePanel ? 'stretch' : 'center', overflow: 'hidden' }}>
              <div style={{ width: '100%', maxWidth: showScenePanel ? 'none' : '920px', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '100%' }}>
                <textarea
                   className="editor-textarea"
                   placeholder="Write your story here... (Separate paragraphs with double newlines)"
                    ref={editorRef}
                   value={chapterText}
                   onChange={handleTextChange}
                    onMouseUp={() => captureCursorSelection(false)}
                    onKeyUp={() => captureCursorSelection(false)}
                   style={{
                      width: '100%',
                     minHeight: '100%',
                     height: '100%',
                     flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '1.2rem',
                      lineHeight: '1.8',
                     resize: 'none',
                     overflowY: 'auto',
                      fontFamily: 'var(--font-serif)'
                   }}
                />
              </div>
            </div>

            {showScenePanel && (
              <aside className="glass" style={{ width: '390px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} /> Scene Studio
                  </h3>
                  <button className="btn-outline" onClick={() => setShowScenePanel(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.6rem' }}>
                    <X size={14} /> Hide
                  </button>
                </div>

                <div style={{ padding: '1rem', overflowY: 'auto' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.9rem' }}>
                    Writers define scene context once, readers reuse saved image.
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <button className="btn-outline" onClick={() => captureCursorSelection(true)} disabled={!chapterText.trim() || !activeChapterId} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Layers size={14} /> Use Cursor Selection
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {sceneStartIdx !== null && sceneEndIdx !== null
                          ? `chars ${sceneStartIdx} to ${sceneEndIdx}`
                        : 'No selection'}
                    </span>
                  </div>

                  {selectedExcerpt && (
                    <div style={{ marginBottom: '0.75rem', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Selected excerpt preview:</strong>
                      <div style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>
                        {selectedExcerpt.length > 400 ? `${selectedExcerpt.slice(0, 400)}...` : selectedExcerpt}
                      </div>
                    </div>
                  )}

                  {chapterText && (
                    <div style={{ marginBottom: '0.75rem', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Text already in scenes (highlighted):</strong>
                      <div style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto', lineHeight: 1.55 }}>
                        {renderCoverageHighlight()}
                      </div>
                    </div>
                  )}

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Extra context notes (optional)</span>
                    <textarea value={sceneContextNotes} onChange={(e) => setSceneContextNotes(e.target.value)} rows={2} style={{ padding: '0.55rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', resize: 'vertical' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prompt override (optional)</span>
                    <textarea value={scenePromptOverride} onChange={(e) => setScenePromptOverride(e.target.value)} rows={2} style={{ padding: '0.55rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', resize: 'vertical' }} />
                  </label>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', marginBottom: '0.75rem' }}>
                    <button className="btn-primary" onClick={handleCreateScene} disabled={sceneBusy || !activeChapterId} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {sceneBusy ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />} Create Scene Group
                    </button>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Characters: {(chapterText || '').length}
                    </span>
                  </div>

                  {sceneError && (
                    <div style={{ marginBottom: '0.75rem', color: '#ef4444', fontSize: '0.85rem' }}>{sceneError}</div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {sceneList.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No scene groups yet for this chapter.</div>
                    ) : sceneList.map((scene) => (
                      <div key={scene.id} style={{ border: '1px solid var(--border-color)', borderRadius: '0.65rem', padding: '0.65rem 0.8rem', background: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                          <strong>
                            Scene {scene.scene_number} - chars {scene.start_char_idx ?? '?'} to {scene.end_char_idx ?? '?'}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <button className="btn-outline" onClick={() => handleGenerateSceneImage(scene.id)} disabled={generatingSceneId === scene.id || deletingSceneId === scene.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {generatingSceneId === scene.id ? <Loader size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                              {generatingSceneId === scene.id ? 'Generating...' : (scene.image_path ? 'Regenerate Image' : 'Generate Image')}
                            </button>
                            <button className="btn-outline" onClick={() => handleDeleteScene(scene.id)} disabled={deletingSceneId === scene.id || generatingSceneId === scene.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(239, 68, 68, 0.6)', color: '#ef4444' }}>
                              {deletingSceneId === scene.id ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
                              {deletingSceneId === scene.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          Status: {scene.image_status || 'draft'} {scene.image_path ? `| Saved: ${scene.image_path}` : ''}
                        </div>
                        {scene.last_error && (
                          <div style={{ marginTop: '0.35rem', color: '#ef4444', fontSize: '0.8rem' }}>
                            Last error: {scene.last_error}
                          </div>
                        )}
                        {scene.image_path && (
                          <div style={{ marginTop: '0.55rem', borderRadius: '0.55rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img
                              src={`${SCENE_API_BASE}${scene.image_path}`}
                              alt={`Scene ${scene.scene_number}`}
                              loading="lazy"
                              style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            )}
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
