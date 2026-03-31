import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Image as ImageIcon, MessageSquare, X, Loader, ThumbsUp, ThumbsDown, CornerDownRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;

export default function Reader() {
  const { user } = useAuth();
  const { novelId, chapterNum } = useParams();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState(null);
  const [chapterList, setChapterList] = useState([]);
  const [comments, setComments] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showImages, setShowImages] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('inter');
  const [themeMode, setThemeMode] = useState('default');

  const [activeParagraphIdx, setActiveParagraphIdx] = useState(null);
  const [showChapterComments, setShowChapterComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyTextByComment, setReplyTextByComment] = useState({});
  const [postingReplyForCommentId, setPostingReplyForCommentId] = useState(null);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [currentBgImage, setCurrentBgImage] = useState('');
  const [nextBgImage, setNextBgImage] = useState('');
  const [isBgFading, setIsBgFading] = useState(false);
  const paragraphRefs = useRef({});
  const bgFadeTimeoutRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const chapterNumber = Number(chapterNum);
    if (user?.id && Number.isFinite(chapterNumber) && chapterNumber >= 1) {
      try {
        localStorage.setItem(`lastRead:${user.id}:${novelId}`, String(chapterNumber));
      } catch (e) {
        console.warn('Local history cache write failed:', e);
      }
    }

    if (user?.id) {
      fetch(`${API_BASE}/api/users/${user.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ novelId, chapterNum: Number.isFinite(chapterNumber) ? chapterNumber : chapterNum })
      }).catch((e) => console.error('History log failed:', e));
    }

    const loadReaderData = async () => {
      try {
        setLoading(true);

        const chapterListRes = await fetch(`${API_BASE}/api/novels/${novelId}/chapters`);
        const chapterList = await chapterListRes.json();
        if (!chapterListRes.ok) throw new Error(chapterList.error || 'Chapter list load failed');

        const selected = (chapterList || []).find((ch) => Number(ch.chapter_number) === Number(chapterNum));
        if (!selected?.id) throw new Error('Chapter not found for this novel');

        const [chapterRes, commentsRes, scenesRes] = await Promise.all([
          fetch(`${API_BASE}/api/chapters/${selected.id}`),
          fetch(`${API_BASE}/api/chapters/${selected.id}/comments?userId=${user?.id || ''}`),
          fetch(`${API_BASE}/api/chapters/${selected.id}/scenes`)
        ]);

        const chapterData = await chapterRes.json();
        const commentsData = await commentsRes.json();
        const scenesData = await scenesRes.json();

        if (!chapterRes.ok) throw new Error(chapterData.error || 'Chapter load failed');

        if (!isMounted) return;
        setChapterList(Array.isArray(chapterList) ? chapterList : []);
        setChapter(chapterData);
        setComments(Array.isArray(commentsData) ? commentsData : []);
        setScenes(Array.isArray(scenesData) ? scenesData : []);
      } catch (err) {
        console.error('Failed to fetch reader data:', err);
        if (isMounted) setChapter({ error: err.message });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReaderData();
    return () => {
      isMounted = false;
    };
  }, [novelId, chapterNum, user?.id]);

  const buildParagraphCharRanges = (fullText, paragraphs) => {
    const text = String(fullText || '');
    const sourceParagraphs = Array.isArray(paragraphs) ? paragraphs : [];
    if (!text || sourceParagraphs.length === 0) return [];

    const ranges = [];
    const sepRegex = /\n\s*\n/g;
    let cursor = 0;
    let paragraphPos = 0;

    const pushChunk = (chunkStart, chunkEnd) => {
      if (paragraphPos >= sourceParagraphs.length) return;

      const rawChunk = text.slice(chunkStart, chunkEnd);
      if (!rawChunk.trim()) return;

      const firstNonWs = rawChunk.search(/\S/);
      const trailingWsLen = (rawChunk.match(/\s*$/) || [''])[0].length;
      const start = chunkStart + (firstNonWs < 0 ? 0 : firstNonWs);
      const end = Math.max(start, chunkEnd - trailingWsLen);

      const paragraph = sourceParagraphs[paragraphPos];
      ranges.push({ idx: Number(paragraph.idx), start, end });
      paragraphPos += 1;
    };

    let match = sepRegex.exec(text);
    while (match) {
      pushChunk(cursor, match.index);
      cursor = sepRegex.lastIndex;
      match = sepRegex.exec(text);
    }
    pushChunk(cursor, text.length);

    return ranges;
  };

  const paragraphCharRanges = buildParagraphCharRanges(chapter?.full_text, chapter?.paragraphs);
  const paragraphRangeByIdx = Object.fromEntries(paragraphCharRanges.map((r) => [Number(r.idx), r]));

  const scenesWithImages = scenes
    .filter((s) => s.image_path)
    .map((scene) => {
      let start = Number(scene.start_char_idx);
      let end = Number(scene.end_char_idx);

      if (!(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start)) {
        const startPara = Number(scene.start_paragraph_idx);
        const endPara = Number(scene.end_paragraph_idx);
        const startRange = paragraphRangeByIdx[startPara];
        const endRange = paragraphRangeByIdx[endPara];
        if (startRange && endRange) {
          start = startRange.start;
          end = endRange.end;
        }
      }

      if (!(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start) && scene.selected_text) {
        const fallbackStart = String(chapter?.full_text || '').indexOf(scene.selected_text);
        if (fallbackStart >= 0) {
          start = fallbackStart;
          end = fallbackStart + String(scene.selected_text).length;
        }
      }

      if (!(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start)) return null;
      return { ...scene, _startChar: start, _endChar: end };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const startDiff = Number(a._startChar) - Number(b._startChar);
      if (startDiff !== 0) return startDiff;
      const endDiff = Number(a._endChar) - Number(b._endChar);
      if (endDiff !== 0) return endDiff;
      return Number(a.scene_number) - Number(b.scene_number);
    });

  useEffect(() => {
    if (!showImages || scenesWithImages.length === 0) {
      setActiveSceneId(null);
      return;
    }
    setActiveSceneId(Number(scenesWithImages[0].id));
  }, [showImages, chapter?.id, scenesWithImages.length]);

  useEffect(() => {
    if (!showImages || !chapter?.paragraphs?.length || scenesWithImages.length === 0) return;

    const updateActiveSceneFromScroll = () => {
      const triggerY = window.innerHeight * 0.35;
      let currentParagraphIdx = Number(chapter.paragraphs[0]?.idx ?? 0);

      for (const paragraph of chapter.paragraphs) {
        const el = paragraphRefs.current[paragraph.idx];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= triggerY) currentParagraphIdx = Number(paragraph.idx);
        else break;
      }

      const activeParagraphRange = paragraphRangeByIdx[currentParagraphIdx];
      const currentCharIdx = activeParagraphRange ? Number(activeParagraphRange.start) : 0;

      const containingScenes = scenesWithImages.filter((scene) => {
        const start = Number(scene._startChar);
        const end = Number(scene._endChar);
        return currentCharIdx >= start && currentCharIdx < end;
      });

      let sceneForPosition = null;
      if (containingScenes.length > 0) {
        // Prefer the most specific/later scene when ranges overlap.
        sceneForPosition = containingScenes[containingScenes.length - 1];
      } else {
        for (const scene of scenesWithImages) {
          if (Number(scene._startChar) <= currentCharIdx) sceneForPosition = scene;
          else break;
        }
      }

      if (!sceneForPosition) sceneForPosition = scenesWithImages[0];

      const nextSceneId = Number(sceneForPosition.id);
      setActiveSceneId((prev) => (prev === nextSceneId ? prev : nextSceneId));
    };

    const onViewportChange = () => {
      window.requestAnimationFrame(updateActiveSceneFromScroll);
    };

    onViewportChange();
    window.addEventListener('scroll', onViewportChange, { passive: true });
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [showImages, chapter?.id, chapter?.paragraphs, scenesWithImages, paragraphRangeByIdx]);

  const activeScene = showImages
    ? (scenesWithImages.find((s) => Number(s.id) === activeSceneId) || scenesWithImages[0] || null)
    : null;
  const activeSceneImageUrl = activeScene?.image_path ? `${API_BASE}${activeScene.image_path}` : '';

  useEffect(() => {
    if (bgFadeTimeoutRef.current) {
      clearTimeout(bgFadeTimeoutRef.current);
      bgFadeTimeoutRef.current = null;
    }

    if (!showImages || !activeSceneImageUrl) {
      setCurrentBgImage('');
      setNextBgImage('');
      setIsBgFading(false);
      return;
    }

    if (!currentBgImage) {
      setCurrentBgImage(activeSceneImageUrl);
      return;
    }

    if (currentBgImage === activeSceneImageUrl) return;

    setNextBgImage(activeSceneImageUrl);
    setIsBgFading(true);
    bgFadeTimeoutRef.current = setTimeout(() => {
      setCurrentBgImage(activeSceneImageUrl);
      setNextBgImage('');
      setIsBgFading(false);
      bgFadeTimeoutRef.current = null;
    }, 420);
  }, [showImages, activeSceneImageUrl, currentBgImage]);

  useEffect(() => {
    return () => {
      if (bgFadeTimeoutRef.current) clearTimeout(bgFadeTimeoutRef.current);
    };
  }, []);

  const readerThemeClass = `theme-${themeMode} font-${fontFamily}`;
  const getCommentsForParagraph = (idx) => comments.filter((c) => c.paragraph_idx === idx);
  const chapterComments = comments.filter((c) => c.paragraph_idx === null || c.paragraph_idx === undefined);
  const isDrawerOpen = activeParagraphIdx !== null || showChapterComments;
  const activeComments = activeParagraphIdx !== null ? getCommentsForParagraph(activeParagraphIdx) : [];
  const displayedComments = showChapterComments ? chapterComments : activeComments;
  const chapterNumbers = (chapterList || []).map((ch) => Number(ch.chapter_number)).filter((n) => Number.isFinite(n));
  const maxChapterNumber = chapterNumbers.length ? Math.max(...chapterNumbers) : Number(chapterNum);
  const currentChapterNumber = Number(chapterNum);
  const previousChapterNumber = currentChapterNumber > 1 ? currentChapterNumber - 1 : null;
  const hasNextChapter = currentChapterNumber < maxChapterNumber;

  const handleNextChapter = () => {
    if (hasNextChapter) {
      navigate(`/read/${novelId}/${currentChapterNumber + 1}`);
      return;
    }
    navigate(`/novel/${novelId}`);
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !chapter?.id || !user?.id) return;
    if (!showChapterComments && activeParagraphIdx === null) return;

    setPostingComment(true);
    const paragraphIdx = showChapterComments ? null : activeParagraphIdx;

    try {
      const res = await fetch(`${API_BASE}/api/chapters/${chapter.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, novelId, paragraphIdx, text: newCommentText })
      });
      if (res.ok) {
        const addedComment = await res.json();
        setComments((prev) => [...prev, addedComment]);
        setNewCommentText('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to post comment');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPostingComment(false);
    }
  };

  const handleVoteComment = async (commentId, voteValue) => {
    if (!user?.id || !commentId) return;
    setVotingCommentId(commentId);
    try {
      const target = comments.find((c) => Number(c.id) === Number(commentId));
      const nextVote = Number(target?.my_vote || 0) === voteValue ? 0 : voteValue;

      const res = await fetch(`${API_BASE}/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, vote: nextVote })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to vote');

      setComments((prev) => prev.map((comment) => (
        Number(comment.id) === Number(commentId)
          ? {
              ...comment,
              vote_score: Number(data.vote_score || 0),
              upvotes: Number(data.upvotes || 0),
              downvotes: Number(data.downvotes || 0),
              my_vote: Number(data.my_vote || 0),
            }
          : comment
      )));
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to vote');
    } finally {
      setVotingCommentId(null);
    }
  };

  const handleReplyToComment = async (commentId) => {
    const replyText = String(replyTextByComment[commentId] || '').trim();
    if (!replyText || !user?.id) return;

    setPostingReplyForCommentId(commentId);
    try {
      const res = await fetch(`${API_BASE}/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, text: replyText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add reply');

      setComments((prev) => prev.map((comment) => (
        Number(comment.id) === Number(commentId)
          ? { ...comment, replies: [...(comment.replies || []), data] }
          : comment
      )));

      setReplyTextByComment((prev) => ({ ...prev, [commentId]: '' }));
      setReplyingToCommentId(null);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to add reply');
    } finally {
      setPostingReplyForCommentId(null);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}><Loader className="animate-spin text-accent" size={48} /></div>;
  }

  if (!chapter || chapter.error) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-primary)', height: '100vh' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Chapter not found.</h2>
        <Link to={`/novel/${novelId}`} className="btn-primary" style={{ marginTop: '1rem' }}>Return to Novel</Link>
      </div>
    );
  }

  return (
    <div
      className={`reader-container animate-fade-in ${readerThemeClass} ${currentBgImage ? 'reader-with-scene-bg' : ''}`}
    >
      {currentBgImage && (
        <>
          <div
            className={`reader-scene-bg-layer ${isBgFading ? 'reader-scene-bg-fade-out' : ''}`}
            style={{ backgroundImage: `url("${currentBgImage}")` }}
          />
          {nextBgImage && (
            <div
              className={`reader-scene-bg-layer reader-scene-bg-next ${isBgFading ? 'reader-scene-bg-fade-in' : ''}`}
              style={{ backgroundImage: `url("${nextBgImage}")` }}
            />
          )}
        </>
      )}

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
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}>
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

      {isDrawerOpen && (
        <div className="comments-drawer glass animate-pull-left">
          <div className="drawer-header">
            <h3>
              {showChapterComments ? 'Chapter Discussion' : `Paragraph ${activeParagraphIdx + 1} Comments`} <span className="badge">{displayedComments.length}</span>
            </h3>
            <button onClick={() => { setActiveParagraphIdx(null); setShowChapterComments(false); }} className="close-btn"><X size={20} /></button>
          </div>
          <div className="drawer-content">
            <div className="comment-list">
              {displayedComments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  {showChapterComments ? 'No chapter discussion yet. Start the conversation!' : 'No reactions here yet. Be the first!'}
                </p>
              ) : displayedComments.map((c) => (
                <div key={c.id} className="comment-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
                  <strong>{c.user_name}</strong>
                  <p>{c.text}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn-outline"
                      onClick={() => handleVoteComment(c.id, 1)}
                      disabled={votingCommentId === c.id}
                      style={{ padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: Number(c.my_vote) === 1 ? 'rgba(16,185,129,0.7)' : undefined }}
                    >
                      <ThumbsUp size={14} /> {c.upvotes || 0}
                    </button>

                    <button
                      className="btn-outline"
                      onClick={() => handleVoteComment(c.id, -1)}
                      disabled={votingCommentId === c.id}
                      style={{ padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: Number(c.my_vote) === -1 ? 'rgba(239,68,68,0.7)' : undefined }}
                    >
                      <ThumbsDown size={14} /> {c.downvotes || 0}
                    </button>

                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Score {c.vote_score || 0}</span>

                    <button
                      className="btn-outline"
                      onClick={() => setReplyingToCommentId((prev) => prev === c.id ? null : c.id)}
                      style={{ padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <CornerDownRight size={14} /> Reply ({(c.replies || []).length})
                    </button>
                  </div>

                  {(c.replies || []).length > 0 && (
                    <div style={{ marginTop: '0.55rem', paddingLeft: '0.6rem', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {c.replies.map((r) => (
                        <div key={r.id} style={{ background: 'var(--bg-secondary)', borderRadius: '0.5rem', padding: '0.45rem 0.55rem' }}>
                          <strong style={{ fontSize: '0.86rem' }}>{r.user_name}</strong>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingToCommentId === c.id && (
                    <div style={{ marginTop: '0.55rem', display: 'flex', gap: '0.45rem' }}>
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyTextByComment[c.id] || ''}
                        onChange={(e) => setReplyTextByComment((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReplyToComment(c.id); }}
                        style={{ flex: 1 }}
                      />
                      <button className="btn-primary" onClick={() => handleReplyToComment(c.id)} disabled={postingReplyForCommentId === c.id}>
                        {postingReplyForCommentId === c.id ? '...' : 'Reply'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="comment-input-box">
              <input
                type="text"
                placeholder={showChapterComments ? 'Add a chapter comment...' : 'Add your reaction...'}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }}
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
          <button
            className={`control-btn ${showChapterComments ? 'active' : ''}`}
            onClick={() => {
              setShowChapterComments((prev) => !prev);
              setActiveParagraphIdx(null);
            }}
            title="Chapter Comments"
          >
            <MessageSquare size={20} />
            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem' }}>{chapterComments.length}</span>
          </button>
          <button className={`control-btn ${showImages ? 'active' : ''}`} onClick={() => setShowImages(!showImages)} title="Toggle Scene Images">
            <ImageIcon size={20} />
          </button>
          <button className={`control-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="reader-content" style={{ fontSize: `${fontSize}px` }}>
        {chapter.paragraphs && chapter.paragraphs.map((p) => {
          const paragraphComments = getCommentsForParagraph(p.idx);

          return (
            <React.Fragment key={p.idx}>
              <div
                className="paragraph-block text paragraph-selectable"
                ref={(el) => {
                  if (el) paragraphRefs.current[p.idx] = el;
                  else delete paragraphRefs.current[p.idx];
                }}
                onClick={() => { setShowChapterComments(false); setActiveParagraphIdx(p.idx); }}
              >
                <div className="text-wrapper">
                  <p>{p.text}</p>
                  <div className="inline-action-bar">
                    <button className="inline-comment-btn" onClick={(e) => { e.stopPropagation(); setShowChapterComments(false); setActiveParagraphIdx(p.idx); }} title="View Comments">
                      <MessageSquare size={16} /> <span>{paragraphComments.length}</span>
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div className="reader-footer">
          <Link to={previousChapterNumber ? `/read/${novelId}/${previousChapterNumber}` : `/novel/${novelId}`} className={`btn-outline ${currentChapterNumber <= 1 ? 'disabled' : ''}`}>
            Previous Chapter
          </Link>
          <button className="btn-primary" onClick={handleNextChapter}>{hasNextChapter ? 'Next Chapter' : 'Back to Novel'}</button>
        </div>
      </main>
    </div>
  );
}
