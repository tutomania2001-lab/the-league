import { Colors, Spacing, Typography } from '../../constants/theme';

test('primary accent is hextech cyan', () => {
  expect(Colors.accent).toBe('#00c8ff');
});

test('background is dark navy', () => {
  expect(Colors.background).toBe('#070b14');
});

test('spacing scale exists', () => {
  expect(Spacing.md).toBe(16);
});
