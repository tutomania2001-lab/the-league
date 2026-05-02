import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={[Typography.title, { marginBottom: Spacing.sm }]}>⚙️ Settings</GlowText>

        <Card>
          <Text style={Typography.label}>Account</Text>
          <Button label="Change Password" variant="secondary" onPress={() => {}} style={{ marginTop: Spacing.sm }} />
        </Card>

        <Card>
          <Text style={Typography.label}>KYC Verification</Text>
          <Text style={[Typography.body, { marginTop: Spacing.xs, marginBottom: Spacing.sm }]}>
            Required before your first withdrawal. Powered by Stripe Identity.
          </Text>
          <Button label="Verify Identity" variant="secondary" onPress={() => {}} />
        </Card>

        <Card>
          <Text style={Typography.label}>Danger Zone</Text>
          <Button
            label="Log Out"
            variant="secondary"
            onPress={() => supabase.auth.signOut()}
            style={{ marginTop: Spacing.sm, borderColor: Colors.error }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
});
