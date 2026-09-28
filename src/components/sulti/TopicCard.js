import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../theme';
import { ensureContrast } from '../../theme/moduleColors';

// Map filled icons to outline versions for cleaner line-art style
const ICON_MAP = {
  'hand-left': 'hand-left-outline',
  'cart': 'cart-outline',
  'restaurant': 'restaurant-outline',
  'compass': 'compass-outline',
  'bus': 'bus-outline',
  'warning': 'warning-outline',
  'people': 'people-outline',
  'airplane': 'airplane-outline',
};

export default function TopicCard({ label, icon, color, onPress, disabled, desc }) {
  const { colors } = useTheme();
  // Use outline version for cleaner line-art style
  const outlineIcon = ICON_MAP[icon] || icon;
  // Situation colours are a fixed brand palette, so they can fall below 4.5:1
  // on an unfamiliar theme surface. Nudge them until they are legible.
  const ink = ensureContrast(color, colors.surface, 4.5);
  const decor = ensureContrast(color, colors.surface, 3);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={`Practice ${label}`}
      accessibilityRole="button"
      hitSlop={4}
    >
      {/* Colored top-border accent */}
      <View style={[styles.topAccent, { backgroundColor: decor }]} />

      {/* Icon in circular container with subtle background */}
      <View style={[styles.iconWrap, { backgroundColor: decor + '14', borderColor: decor + '26' }]}>
        <Ionicons name={outlineIcon} size={24} color={decor} />
      </View>

      {/* Text content */}
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: ink }]}>{label}</Text>
        {desc && <Text style={[styles.desc, { color: colors.textMuted }]}>{desc}</Text>}
      </View>

      {/* Active indicator dot */}
      <View style={[styles.activeDot, { backgroundColor: decor }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing.lg + 4,
    paddingVertical: spacing.xxl + 4,
    gap: spacing.md + 2,
    borderWidth: 1,
    minWidth: 108,
    maxWidth: 142,
    minHeight: 172,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    opacity: 0.9,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: spacing.xs,
  },
  textWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 19,
  },
  desc: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 15,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 'auto',
    marginBottom: spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
});
