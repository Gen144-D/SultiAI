import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function RoleplayCard({ onPress, onViewAll, expanded, children, colors: colorsProp }) {
  // The parent passes the active theme in, but falling back to the hook means a
  // RoleplayCard rendered anywhere else can never paint the old fixed teal.
  const theme = useTheme();
  const colors = colorsProp || theme.colors;
  const primaryColor = colors.primary;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[primaryColor + '08', primaryColor + '03']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${primaryColor}24` }]}
      >
        <View style={styles.header}>
          {/* Icon in circular container */}
          <View style={[styles.iconWrap, { backgroundColor: primaryColor + '15', borderColor: primaryColor + '25' }]}>
            <Ionicons name="game-controller-outline" size={22} color={primaryColor} />
          </View>

          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>
                Role-Play Scenarios
              </Text>
              {/* "See All" secondary link */}
              {onViewAll && (
                <TouchableOpacity
                  onPress={onViewAll}
                  activeOpacity={0.7}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="See all role-play scenarios"
                >
                  <Text style={[styles.seeAll, { color: primaryColor }]}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Practice real conversations with Sulti as a local character
            </Text>
          </View>

          {/* Expand / collapse control */}
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            style={[styles.chevronWrap, { backgroundColor: expanded ? primaryColor + '15' : 'transparent' }]}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={primaryColor}
            />
          </TouchableOpacity>
        </View>

        {expanded && (
          <View style={[styles.content, { borderTopColor: primaryColor + '1F' }]}>
            {children}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: '500',
  },
  chevronWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
