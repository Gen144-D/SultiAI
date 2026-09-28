import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, shadows, typography, borderRadius } from '../theme';
import { readableOnGradient } from '../theme/moduleColors';
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
  const hideProgress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => Animated.timing(hideProgress, { toValue: 1, duration: Platform.OS === 'ios' ? 200 : 160, useNativeDriver: true }).start();
    const onHide = () => Animated.timing(hideProgress, { toValue: 0, duration: 200, useNativeDriver: true }).start();

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [hideProgress]);

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions?.tabBarStyle?.display === 'none') return null;

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
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={styles.tab}
      >
        <View style={[
          styles.iconWrap,
          focused && styles.activeIconWrap,
          isSulti && styles.sultiIconWrapBase,
          isSulti && focused && [
            styles.sultiIconWrapActive,
            { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}2E` },
          ],
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
            size={isSulti ? (focused ? 24 : 22) : (focused ? 24 : 22)}
            color={isSulti && focused ? readableOnGradient([colors.primary, colors.primaryDark]) : focused ? colors.primary : colors.tabInactive}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: focused ? colors.primary : colors.tabInactive },
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
  const hideTranslate = hideProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 96 + safePaddingBottom] });
  const containerStyle = [
    styles.container,
    {
      backgroundColor: isWeb
        ? (isDark ? colors.surface : colors.surface)
        : 'transparent',
      borderColor: colors.border,
      paddingBottom: safePaddingBottom || 12,
      ...(isWeb ? {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      } : {}),
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[containerStyle, { transform: [{ translateY: hideTranslate }] }]}>
        <View style={[styles.inner, { paddingBottom: safePaddingBottom }]}>
          {state.routes.map(renderTab)}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.hideWrap, { transform: [{ translateY: hideTranslate }] }]}>
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={containerStyle}
      >
        <View style={[styles.inner, { paddingBottom: safePaddingBottom }]}>
          {state.routes.map(renderTab)}
        </View>
      </BlurView>
    </Animated.View>
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
  hideWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
    minHeight: 52,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeIconWrap: {
    backgroundColor: 'transparent',
  },
  sultiIconWrapBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sultiIconWrapActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  label: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeLabel: {
    fontWeight: '700',
  },
  sultiLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
});
