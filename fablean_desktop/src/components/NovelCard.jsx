import React from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function NovelCard({ novel }) {
  // Parse tags safely
  let parsedTags = [];
  try {
    parsedTags = JSON.parse(novel.tags || '[]');
  } catch(e) {}

  const resolveMediaUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/480x720.png?text=No+Cover';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const formatRating = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
  };

  return (
    <Link to={`/novel/${novel.id}`} className="novel-card">
      <div className="card-image-wrapper">
        <img 
          src={resolveMediaUrl(novel.cover_photo || novel.cover_url)} 
          alt={novel.title} 
          className="card-image" 
          loading="lazy" 
        />
        {novel.featured === 1 && <span className="featured-badge">Featured</span>}
        <div className="card-overlay">
          <button className="read-btn">
            <BookOpen size={16} /> Read Now
          </button>
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{novel.title}</h3>
        <p className="card-author">{novel.author_name}</p>
        
        <div className="card-stats">
          <span className="rating">
            <Star size={14} className="star-icon" fill="currentColor" /> {formatRating(novel.rating)}
          </span>
          <span className="genre">{novel.genre}</span>
        </div>
        
        <div className="card-tags">
          {parsedTags.slice(0, 3).map((tag, i) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
