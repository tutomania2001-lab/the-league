import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>The League</GlowText>
    </Screen>
  );
}
