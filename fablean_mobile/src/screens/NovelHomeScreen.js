import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { HOME_GENRES, HOME_SORTS, NOVELS } from '../data/novels';

function formatReads(reads) {
  if (reads >= 1000000) {
    return `${(reads / 1000000).toFixed(1)}M`;
  }

  if (reads >= 1000) {
    return `${(reads / 1000).toFixed(1)}K`;
  }

  return String(reads);
}

function scoreNovel(novel, sortMode) {
  if (sortMode === 'Top Rated') {
    return novel.rating;
  }

  if (sortMode === 'Newest') {
    return new Date(novel.updatedAt).getTime();
  }

  return novel.reads + novel.rating * 10000;
}

export default function NovelHomeScreen() {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortMode, setSortMode] = useState('Trending');

  const filteredNovels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return NOVELS.filter((novel) => {
      const genreMatches = activeGenre === 'All' || novel.genre === activeGenre;
      const queryMatches =
        normalizedQuery.length === 0 ||
        novel.title.toLowerCase().includes(normalizedQuery) ||
        novel.author.toLowerCase().includes(normalizedQuery) ||
        novel.tags.join(' ').toLowerCase().includes(normalizedQuery);

      return genreMatches && queryMatches;
    }).sort((a, b) => scoreNovel(b, sortMode) - scoreNovel(a, sortMode));
  }, [activeGenre, query, sortMode]);

  const featured = filteredNovels.filter((novel) => novel.featured).slice(0, 5);
  const trending = filteredNovels.slice(0, 8);
  const continueReading = filteredNovels
    .filter((novel) => novel.progress > 0 && novel.progress < 1)
    .slice(0, 4);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Your Story Universe</Text>
        <Text style={styles.heroTitle}>Discover bold worlds and write your own legend.</Text>
        <Text style={styles.heroCopy}>
          A curated reading space with trending picks, deep genre filters, and writer-first tools.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search title, author, or tag"
          placeholderTextColor="#8f8678"
          value={query}
          onChangeText={setQuery}
        />
        <Text style={styles.searchMeta}>{filteredNovels.length} results</Text>
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.sectionTitle}>Genre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {HOME_GENRES.map((genre) => {
            const isActive = genre === activeGenre;
            return (
              <Pressable
                key={genre}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveGenre(genre)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{genre}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Sort by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {HOME_SORTS.map((sort) => {
            const isActive = sort === sortMode;
            return (
              <Pressable
                key={sort}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSortMode(sort)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{sort}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Novels</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
        {featured.map((novel) => (
          <View key={novel.id} style={styles.featuredCard}>
            <Image source={{ uri: novel.cover }} style={styles.featuredImage} />
            <View style={styles.featuredOverlay}>
              <Text style={styles.featuredGenre}>{novel.genre}</Text>
              <Text style={styles.featuredTitle}>{novel.title}</Text>
              <Text style={styles.featuredMeta}>by {novel.author}</Text>
              <Text style={styles.featuredMeta}>★ {novel.rating} · {formatReads(novel.reads)} reads</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Continue Reading</Text>
      </View>
      <View style={styles.stackList}>
        {continueReading.length === 0 ? (
          <Text style={styles.emptyState}>No in-progress novels match your current filters.</Text>
        ) : (
          continueReading.map((novel) => (
            <View key={novel.id} style={styles.rowCard}>
              <Image source={{ uri: novel.cover }} style={styles.rowCover} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{novel.title}</Text>
                <Text style={styles.rowMeta}>{novel.author} · {novel.genre}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(novel.progress * 100)}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{Math.round(novel.progress * 100)}% complete</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
      </View>
      <View style={styles.stackList}>
        {trending.map((novel) => (
          <View key={novel.id} style={styles.trendingCard}>
            <View style={styles.badgeLine}>
              <Text style={styles.trendBadge}>{novel.status}</Text>
              <Text style={styles.trendMeta}>{novel.genre}</Text>
            </View>
            <Text style={styles.trendTitle}>{novel.title}</Text>
            <Text style={styles.trendCopy}>{novel.synopsis}</Text>
            <Text style={styles.trendMeta}>★ {novel.rating} · {formatReads(novel.reads)} reads · {novel.chapters} ch.</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 28,
    gap: 14
  },
  hero: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#112b23'
  },
  heroKicker: {
    color: '#9dddbb',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  heroTitle: {
    color: '#f3f7f4',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8
  },
  heroCopy: {
    color: '#bdd3c8',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20
  },
  searchWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dacfbf',
    backgroundColor: '#fffdf8',
    padding: 10,
    gap: 8
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8cdba',
    backgroundColor: '#fff8ef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#332f27'
  },
  searchMeta: {
    fontSize: 12,
    color: '#6e6557'
  },
  filterBlock: {
    gap: 6
  },
  sectionHeader: {
    marginTop: 6
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f1d1a'
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 20
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d4c7b0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fffaf2'
  },
  chipActive: {
    borderColor: '#305645',
    backgroundColor: '#305645'
  },
  chipText: {
    color: '#665d4e',
    fontSize: 12,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#edf8f2'
  },
  featuredRow: {
    gap: 12,
    paddingRight: 22
  },
  featuredCard: {
    width: 250,
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1d1b18'
  },
  featuredImage: {
    width: '100%',
    height: '100%'
  },
  featuredOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 14, 12, 0.72)',
    padding: 12,
    gap: 4
  },
  featuredGenre: {
    color: '#bce9d0',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  featuredTitle: {
    color: '#f7f3e9',
    fontSize: 18,
    fontWeight: '700'
  },
  featuredMeta: {
    color: '#e0d8c8',
    fontSize: 12
  },
  stackList: {
    gap: 10
  },
  rowCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddcfb9',
    backgroundColor: '#fffaf1',
    padding: 10,
    gap: 10
  },
  rowCover: {
    width: 64,
    height: 88,
    borderRadius: 8
  },
  rowBody: {
    flex: 1,
    gap: 6
  },
  rowTitle: {
    fontSize: 16,
    color: '#26221c',
    fontWeight: '700'
  },
  rowMeta: {
    color: '#696050',
    fontSize: 12
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e8ddcb',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2f6c4d'
  },
  progressLabel: {
    fontSize: 12,
    color: '#5e5748'
  },
  trendingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9cdb8',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6
  },
  badgeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  trendBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#2f4f3e'
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27231d'
  },
  trendCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5f584b'
  },
  trendMeta: {
    fontSize: 12,
    color: '#6b6454'
  },
  emptyState: {
    fontSize: 13,
    color: '#6b6458'
  }
});
