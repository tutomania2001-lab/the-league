import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Typography, Spacing } from '@/constants/theme';
import { Text } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>👤 Profile</GlowText>
      <Card style={{ marginBottom: Spacing.md }}>
        <Text style={Typography.body}>Full profile coming in Phase 2.</Text>
      </Card>
      <Button label="Log Out" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
