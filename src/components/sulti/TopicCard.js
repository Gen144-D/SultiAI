import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '../../theme';

export default function TopicCard({ label, icon, color, onPress, disabled, desc }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: color + '12', borderColor: color + '25' },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={`Practice ${label}`}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {desc && <Text style={[styles.desc, { color: color + 'CC' }]}>{desc}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    minWidth: 96,
    maxWidth: 120,
    minHeight: 80,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.24,
    textAlign: 'center',
    lineHeight: 18,
    // Prevent character-level breaking
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  desc: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 15,
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});