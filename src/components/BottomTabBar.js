import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, shadows, typography, borderRadius } from '../theme';
import { TAB_ROUTES } from '../theme/dashboardGradients';

const ICON_MAP = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Learn: { focused: 'school', unfocused: 'school-outline' },
  SULTI: { focused: 'sparkles', unfocused: 'sparkles-outline' },
  Community: { focused: 'people', unfocused: 'people-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

export default function BottomTabBar({ state, descriptors, navigation, routes = TAB_ROUTES }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const safePaddingBottom = insets.bottom || 0;

  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const routeName = route.name;
    const routeConfig = routes.find((r) => r.id === routeName) || {
      label: routeName,
      focusedIcon: 'ellipse',
      unfocusedIcon: 'ellipse',
    };

    const iconNames = ICON_MAP[routeName] || { focused: routeConfig.focusedIcon, unfocused: routeConfig.unfocusedIcon };
    const iconName = focused ? iconNames.focused : iconNames.unfocused;
    const label = options.tabBarLabel ?? routeConfig.label ?? routeName;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    const isSulti = routeName === 'SULTI';

    return (
      <TouchableOpacity
        key={route.key}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.tab}
      >
        <View style={[
          styles.iconWrap,
          focused && styles.activeIconWrap,
          isSulti && focused && styles.sultiIconWrap,
        ]}>
          {isSulti && focused ? (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.full }]}
            />
          ) : null}
          <Ionicons
            name={iconName}
            size={isSulti && focused ? 26 : isSulti ? 24 : focused ? 24 : 22}
            color={isSulti && focused ? '#fff' : focused ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: focused ? colors.primary : colors.textSecondary },
            focused && styles.activeLabel,
            isSulti && focused && styles.sultiLabel,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isWeb = Platform.OS === 'web';
  const tabBarStyle = [
    styles.container,
    {
      backgroundColor: isWeb
        ? (isDark ? colors.surface : colors.surface)
        : 'transparent',
      borderColor: colors.glassBorder,
      paddingBottom: safePaddingBottom || 12,
      ...(isWeb ? {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } : {}),
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={tabBarStyle}>
        <View style={[styles.inner, { paddingBottom: safePaddingBottom }]}>
          {state.routes.map(renderTab)}
        </View>
      </View>
    );
  }

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={tabBarStyle}
    >
      <View style={[styles.inner, { paddingBottom: safePaddingBottom }]}>
        {state.routes.map(renderTab)}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    ...shadows.xl,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 3,
    minHeight: 56,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,168,150,0.10)',
    ...Platform.select({
      ios: {
        shadowColor: '#00A896',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 0 16px rgba(0,168,150,0.25)' },
    }),
  },
  sultiIconWrap: {
    width: 48,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#00A896',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 0 24px rgba(0,168,150,0.35)' },
    }),
  },
  label: {
    ...typography.small,
    fontWeight: '600',
  },
  activeLabel: {
    fontWeight: '800',
  },
  sultiLabel: {
    fontWeight: '800',
  },
});
