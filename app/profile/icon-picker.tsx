import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, Image,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ICON_SIZE = (width - Spacing.md * 2 - Spacing.sm * 4) / 5;
const DD_VERSION = '14.24.1';
const DD_BASE = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon`;

type IconEntry = { id: number; name: string; uri: string };

export default function IconPickerScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { profile, updateProfile } = useProfile(userId);
  const [icons, setIcons] = useState<IconEntry[]>([]);
  const [filtered, setFiltered] = useState<IconEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    fetch(`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/data/en_US/profileicon.json`)
      .then(r => r.json())
      .then(json => {
        const list: IconEntry[] = Object.values(json.data).map((icon: any) => ({
          id: icon.id,
          name: icon.id.toString(),
          uri: `${DD_BASE}/${icon.id}.png`,
        }));
        list.sort((a, b) => a.id - b.id);
        setIcons(list);
        setFiltered(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(icons); return; }
    setFiltered(icons.filter(i => i.id.toString().includes(search.trim())));
  }, [search, icons]);

  async function handleSave() {
    if (selected === null) return;
    setSaving(true);
    const uri = `${DD_BASE}/${selected}.png`;
    await updateProfile({ avatar_url: uri } as any);
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <GlowText style={Typography.heading}>Choose Icon</GlowText>
        <Button label="✓ Save" onPress={handleSave} loading={saving} disabled={selected === null} style={{ paddingVertical: 6, paddingHorizontal: 16, minHeight: 36 }} />
      </View>

      <Input
        placeholder="Search by icon ID..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        keyboardType="number-pad"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={[Typography.body, { marginTop: Spacing.md }]}>Loading icons...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={5}
          keyExtractor={i => i.id.toString()}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const isSelected = selected === item.id;
            const isCurrent = profile?.avatar_url?.includes(`/${item.id}.png`);
            return (
              <TouchableOpacity
                onPress={() => setSelected(item.id)}
                activeOpacity={0.75}
                style={[
                  styles.iconWrap,
                  isSelected && styles.iconSelected,
                  isCurrent && styles.iconCurrent,
                ]}
              >
                <Image source={{ uri: item.uri }} style={styles.iconImg} />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={Typography.body}>No icons found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm,
  },
  search: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  grid: { padding: Spacing.md, gap: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  iconWrap: {
    width: ICON_SIZE, height: ICON_SIZE,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.accentBorder,
    margin: Spacing.xs / 2,
  },
  iconSelected: {
    borderColor: Colors.accent, borderWidth: 2,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 6,
  },
  iconCurrent: {
    borderColor: Colors.gold, borderWidth: 2,
  },
  iconImg: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: Colors.accent, borderRadius: 10,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { fontSize: 9, fontWeight: '900', color: Colors.background },
});
