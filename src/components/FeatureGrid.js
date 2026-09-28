import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { FEATURES } from '../theme/dashboardGradients';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const HORIZONTAL_PADDING = spacing.xl * 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING - CARD_GAP) / 2;

// Map to outline icons for consistent line-art style
const ICON_MAP = {
  'sparkles': 'sparkles-outline',
  'language': 'language-outline',
  'chatbubbles': 'chatbubbles-outline',
  'mic-circle': 'mic-outline',
  'mic': 'mic-outline',
  'camera': 'camera-outline',
  'trophy': 'trophy-outline',
  'flame': 'flame-outline',
};

/**
 * FeatureCard
 *
 * Individual grid card with:
 *   - Staggered mount animation (opacity + scale spring)
 *   - Press/tap scale effect
 *   - Line-art icon style
 *
 * @param {{ feature: typeof FEATURES[0], index: number, onPress: Function }} props
 */
function FeatureCard({ feature, index, onPress }) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(
      () => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 200,
            useNativeDriver: true,
          }),
        ]).start();
      },
      index * 80,
    );
    return () => clearTimeout(timer);
  }, [index]);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.94,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  // Use outline icon for cleaner look
  const iconName = ICON_MAP[feature.iconName] || feature.iconName;
  const primaryColor = feature.gradient[0];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        width: CARD_WIDTH,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <GlassCard
            variant="elevated"
            style={styles.featureCard}
            padding="lg"
          >
            {/* Icon in circular container with subtle border */}
            <View style={[styles.iconContainer, { backgroundColor: primaryColor + '10', borderColor: primaryColor + '20' }]}>
              <Ionicons name={iconName} size={24} color={primaryColor} />
            </View>
            <Text style={[styles.featureLabel, { color: colors.text }]}>
              {feature.title}
            </Text>
          </GlassCard>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * FeatureGrid
 *
 * Maps the configurable `FEATURES` array into a responsive 2-column
 * grid with staggered mount animations and tap-scale micro-interactions.
 *
 * @param {{ navigation: any, features?: typeof FEATURES }} props
 */
export default function FeatureGrid({ navigation, features = FEATURES }) {
  const handlePress = (feature) => {
    navigation?.navigate(feature.path);
  };

  return (
    <View style={styles.grid}>
      {features.map((feature, index) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          index={index}
          onPress={() => handlePress(feature)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  featureCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xxl,
    ...shadows.card,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1.5,
  },
    featureLabel: {
      ...typography.caption,
    },
});
