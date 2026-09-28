import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { spacing, borderRadius, shadows } from '../theme';

function FadeSlideIn({ delay = 0, children, style }) {
  const fade = useMemo(() => new Animated.Value(0), []);
  const slide = useMemo(() => new Animated.Value(24), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slide, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fade, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}

function ScaleIn({ delay = 0, children, style }) {
  const scale = useMemo(() => new Animated.Value(0.8), []);
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fade, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function ForgotPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'sultiai://reset-password',
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      const message = err?.message || 'Failed to send reset email. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Reset Password"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        gradient={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Icon */}
          <FadeSlideIn delay={0}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed" size={40} color={colors.primary} />
            </View>
          </FadeSlideIn>

          {/* Title */}
          <FadeSlideIn delay={50}>
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
          </FadeSlideIn>
          <FadeSlideIn delay={100}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </Text>
          </FadeSlideIn>

          {sent ? (
            /* Success state */
            <ScaleIn delay={0}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                accessibilityLiveRegion="polite"
              >
                <View style={[styles.successIcon, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                </View>
                <Text style={[styles.sentTitle, { color: colors.text }]}>Email Sent!</Text>
                <Text style={[styles.sentDesc, { color: colors.textSecondary }]}>
                  Check your inbox ({email}) for reset instructions.
                </Text>
                <Text style={[styles.sentNote, { color: colors.textLight }]}>
                  Didn&apos;t receive it? Check your spam folder or try again.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Auth', { mode: 'signIn', email })}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Sign In"
                >
                  <Text style={[styles.primaryBtnText, { color: colors.textOnGradient }]}>
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </ScaleIn>
          ) : (
            /* Form state */
            <View
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Email input */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.error : focused ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={error ? colors.error : focused ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleReset}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>

              {/* Error */}
              {!!error && (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: colors.error + '15', borderColor: colors.error + '30' },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleReset}
                disabled={loading}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Send Reset Link"
                accessibilityState={{ disabled: loading }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.textOnGradient} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.textOnGradient }]}>
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backLink}
                accessibilityRole="button"
                accessibilityLabel="Back to Sign In"
              >
                <Text style={[styles.backLinkText, { color: colors.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  card: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
  },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    height: 56,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

  primaryBtn: {
    height: 54,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },

  backLink: { marginTop: spacing.md, alignItems: 'center' },
  backLinkText: { fontSize: 15, fontWeight: '600' },

  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sentTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  sentDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: spacing.sm },
  sentNote: { fontSize: 13, textAlign: 'center', marginBottom: spacing.xl },
});
