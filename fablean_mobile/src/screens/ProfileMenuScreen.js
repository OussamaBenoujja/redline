import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NOVELS } from '../data/novels';

const BANNER = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1400&q=80';
const AVATAR = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80';

function getMyNovels(authorName) {
  return NOVELS.filter((novel) => novel.author === authorName || novel.tags.includes('My Novel'));
}

export default function ProfileMenuScreen({ session }) {
  const displayName = session?.fullName || 'Reader';
  const authorName = session?.fullName || 'Fablean Demo Reader';
  const myNovels = getMyNovels(authorName);
  const totalReads = myNovels.reduce((sum, novel) => sum + novel.reads, 0);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Image source={{ uri: BANNER }} style={styles.banner} />
        <View style={styles.avatarWrap}>
          <Image source={{ uri: AVATAR }} style={styles.avatar} />
        </View>
      </View>

      <View style={styles.profileBox}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.handle}>@{displayName.toLowerCase().replace(/\s+/g, '_')}</Text>
        <Text style={styles.bio}>
          Fantasy addict, late-night worldbuilder, and coffee-powered chapter polisher. I write
          character-driven stories with high stakes and emotional turns.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{myNovels.length}</Text>
            <Text style={styles.statLabel}>My Novels</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(totalReads / 1000)}K</Text>
            <Text style={styles.statLabel}>Total Reads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>142</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Novels</Text>
        <View style={styles.list}>
          {myNovels.map((novel) => (
            <View key={novel.id} style={styles.novelCard}>
              <Image source={{ uri: novel.cover }} style={styles.cover} />
              <View style={styles.novelBody}>
                <Text style={styles.novelTitle}>{novel.title}</Text>
                <Text style={styles.novelMeta}>{novel.genre} · {novel.status}</Text>
                <Text style={styles.novelMeta}>{novel.chapters} chapters · ★ {novel.rating}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Writing Bio</Text>
        <View style={styles.bioCard}>
          <Text style={styles.bioDetail}>• Themes: Identity, resilience, and haunted cities.</Text>
          <Text style={styles.bioDetail}>• Favorite POV: Close third person.</Text>
          <Text style={styles.bioDetail}>• Current project: Ashes Under Atlas (Draft).</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 24,
    gap: 12
  },
  headerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e9e0cf'
  },
  banner: {
    width: '100%',
    height: 160
  },
  avatarWrap: {
    position: 'absolute',
    bottom: -34,
    left: 16,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#f4f2ec'
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999
  },
  profileBox: {
    marginTop: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dccfb8',
    backgroundColor: '#fffaf1',
    padding: 14,
    gap: 8
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f1d1a'
  },
  handle: {
    fontSize: 13,
    color: '#6f6556'
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4f4739'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8c7a8',
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#294c3c'
  },
  statLabel: {
    fontSize: 11,
    color: '#665c4e',
    textTransform: 'uppercase'
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#211e18'
  },
  list: {
    gap: 10
  },
  novelCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8ccb7',
    backgroundColor: '#fffdf9',
    padding: 10,
    flexDirection: 'row',
    gap: 10
  },
  cover: {
    width: 58,
    height: 82,
    borderRadius: 8
  },
  novelBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4
  },
  novelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27221b'
  },
  novelMeta: {
    fontSize: 12,
    color: '#6c6355'
  },
  bioCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9cbb4',
    backgroundColor: '#fffaf0',
    padding: 12,
    gap: 6
  },
  bioDetail: {
    fontSize: 13,
    color: '#544b3e'
  }
});
