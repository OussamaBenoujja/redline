import React, { useState, useEffect } from 'react';
import NovelCard from '../components/NovelCard';
import { Search, Filter, SlidersHorizontal, Loader } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../config/api';

export default function Home() {
  const { user } = useAuth();
  const [novels, setNovels] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('popular'); // popular, rating

  useEffect(() => {
    const novelsReq = fetch(`${API_BASE_URL}/api/novels`).then(res => res.json());
    const historyReq = user?.id
      ? fetch(`${API_BASE_URL}/api/users/${user.id}/profile`).then(res => res.json())
      : Promise.resolve(null);

    Promise.all([novelsReq, historyReq])
      .then(([novelsData, profileData]) => {
        setNovels(novelsData || []);

        const historyItems = Array.isArray(profileData?.historyList)
          ? profileData.historyList
          : [];

        const dedupedHistory = [];
        const seen = new Set();
        for (const item of historyItems) {
          if (!item?.id || seen.has(item.id)) continue;
          seen.add(item.id);
          dedupedHistory.push(item);
        }

        setContinueReading(dedupedHistory.slice(0, 4));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch novels", err);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="home-page animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  const featuredNovel = novels.find(n => n.featured === 1);
  
  // Advanced Filtering
  let filteredNovels = novels.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.author_name.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genreFilter === 'All' || n.genre === genreFilter;
    const matchesStatus = statusFilter === 'All' || n.status === statusFilter;
    return matchesSearch && matchesGenre && matchesStatus;
  });

  // Sorting
  filteredNovels = filteredNovels.sort((a, b) => {
    if (sortBy === 'popular') return b.reads - a.reads;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const isFilteringActive =
    search.trim().length > 0 ||
    genreFilter !== 'All' ||
    statusFilter !== 'All';

  const topRatedNovels = [...novels]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const completedPicks = novels
    .filter((n) => n.status === 'Completed')
    .sort((a, b) => (b.reads || 0) - (a.reads || 0))
    .slice(0, 4);

  const ongoingNow = novels
    .filter((n) => n.status === 'Ongoing')
    .sort((a, b) => (b.reads || 0) - (a.reads || 0))
    .slice(0, 4);

  const genres = ['All', ...new Set(novels.map(n => n.genre).filter(Boolean))];

  const renderShelf = (title, items, keyPrefix) => (
    <section className="shelf-section" key={keyPrefix}>
      <div className="shelf-header">
        <h3 className="shelf-title">{title}</h3>
      </div>
      <div className="novel-grid">
        {items.map((novel) => (
          <NovelCard key={`${keyPrefix}-${novel.id}`} novel={novel} />
        ))}
      </div>
    </section>
  );

  return (
    <div className="home-page animate-fade-in">
      <header className="hero-section">
        {featuredNovel && (
          <div className="hero-content">
            <h1 className="hero-title">Discover <span className="text-accent">Immersive</span> Worlds</h1>
            <p className="hero-subtitle">Read, visualize, and experience your favorite novels like never before.</p>
            
            <div className="search-bar glass">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Search novels, authors, or genres..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}
      </header>

      <section className="library-section">
        <div className="library-header">
          <h2 className="section-title">Trending Now</h2>
          
          <div className="advanced-filters">
            <div className="filter-group">
              <Filter size={16} />
              <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} className="filter-select">
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            
            <div className="filter-group">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                <option value="All">Any Status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="filter-group">
              <SlidersHorizontal size={16} />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="novel-grid">
          {filteredNovels.map(novel => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
        
        {filteredNovels.length === 0 && (
          <div className="no-results">
            <p>No novels found matching your filters.</p>
            <button className="btn-secondary" onClick={() => {setSearch(''); setGenreFilter('All'); setStatusFilter('All');}} style={{marginTop: '1rem'}}>Clear Filters</button>
          </div>
        )}

        {!isFilteringActive && (
          <>
            {continueReading.length > 0 && renderShelf('Start From Where You Left Off', continueReading, 'continue-reading')}
            {renderShelf('Top Rated', topRatedNovels, 'top-rated')}
            {renderShelf('Completed Picks', completedPicks, 'completed-picks')}
            {renderShelf('Ongoing Now', ongoingNow, 'ongoing-now')}
          </>
        )}
      </section>
    </div>
  );
}
