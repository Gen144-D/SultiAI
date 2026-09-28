import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';
import Button from '../components/Button';
import SocialSignInButtons, { Divider } from '../components/SocialSignInButtons';

const VALID_EMAIL = /^\S+@\S+\.\S+$/;

/* ── Animations ──────────────────────────────────────────────────── */
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

/* ── Segmented control ───────────────────────────────────────────── */
function SegmentedControl({ options, value, onChange, colors, reduceMotion }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const anim = useMemo(() => new Animated.Value(0), []);
  const index = options.indexOf(value);
  const innerWidth = containerWidth - 8;
  const segmentWidth = innerWidth / options.length;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(index);
    } else {
      Animated.spring(anim, {
        toValue: index,
        friction: 10,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [index, reduceMotion, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth],
  });

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[styles.segWrap, { backgroundColor: colors.surfaceSecondary || colors.surface }]}
      accessibilityRole="tablist"
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.segIndicator,
            {
              width: segmentWidth,
              transform: [{ translateX }],
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...shadows.sm,
            },
          ]}
        />
      )}
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={styles.segBtn}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={opt}
          >
            <Text
              style={[styles.segText, { color: selected ? colors.primary : colors.textSecondary }]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Input field ─────────────────────────────────────────────────── */
function AuthField({
  colors,
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secure,
  showSecret,
  onToggleSecret,
  isFocused,
  hasError,
  ...inputProps
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.error : isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={hasError ? colors.error : isFocused ? colors.primary : colors.textLight}
          style={styles.inputIcon}
        />
        <TextInput
          {...inputProps}
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
        />
        {secure && (
          <TouchableOpacity
            onPress={onToggleSecret}
            style={styles.eyeBtn}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={showSecret ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showSecret ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ── Password strength meter ─────────────────────────────────────── */
function passwordStrength(pwd) {
  let score = 0;
  if (!pwd) return 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
}

function StrengthMeter({ password, colors }) {
  const score = passwordStrength(password);
  if (!password) return null;

  const meta =
    score <= 2
      ? { label: 'Weak', color: colors.error }
      : score <= 3
        ? { label: 'Fair', color: colors.warning }
        : { label: 'Strong', color: colors.success };

  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBar}>
        {[1, 2, 3, 4, 5].map((seg) => (
          <View
            key={seg}
            style={[
              styles.strengthSeg,
              { backgroundColor: seg <= Math.max(score, 1) ? meta.color : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors, reduceMotion, getContrastColor } = useTheme();
  const { signIn, signUp } = useUser();

  // Dark mode's brand gradient is a light mint — flip to near-black ink for
  // the hero so white-on-white never happens.
  const onGradient = getContrastColor('#FFFFFF', '#042F2B');

  const initialMode = route?.params?.mode === 'signUp' ? 'signUp' : 'signIn';
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [created, setCreated] = useState(false);

  const switchMode = (m) => {
    if (m === mode || loading) return;
    setMode(m);
    setError('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setShowConfirm(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (loading) return;

    if (mode === 'signIn') {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }
      setLoading(true);
      const result = await signIn(email.trim(), password);
      setLoading(false);
      if (!result.success) setError(result.error);
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!VALID_EMAIL.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (confirm !== password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, name.trim());
    setLoading(false);

    if (result.success && result.message) {
      setCreated(true);
      return;
    }
    if (!result.success) setError(result.error);
  };

  const backToSignIn = () => {
    setCreated(false);
    setError('');
    setPassword('');
    setConfirm('');
    setMode('signIn');
  };

  const isSignUp = mode === 'signUp';
  const emailStripped = email.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[
          styles.backBtn,
          { top: insets.top + 8, backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
        ]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Brand hero */}
      <LinearGradient
        colors={[colors.gradientA, colors.gradientB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />
        <View style={styles.heroOrb3} />

        <View style={[styles.logoOuter, { borderColor: getContrastColor('rgba(255,255,255,0.3)', 'rgba(4,47,43,0.28)') }]}>
          <View style={styles.logoInner}>
            <Ionicons name="language" size={30} color={onGradient} />
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: onGradient }]}>
          {isSignUp ? 'Join SultiAI' : 'Welcome back'}
        </Text>
        <Text style={[styles.heroSubtitle, { color: onGradient }]}>
          {isSignUp ? 'Start speaking Bisaya in minutes' : 'Sign in to continue learning'}
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Floating card */}
          <FadeSlideIn delay={80}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card || colors.surface,
                  borderColor: colors.border,
                  ...shadows.lg,
                },
              ]}
            >
              <SegmentedControl
                options={['Sign In', 'Sign Up']}
                value={mode}
                onChange={switchMode}
                colors={colors}
                reduceMotion={reduceMotion}
              />

              {created ? (
                /* Success state */
                <View style={styles.successWrap} accessibilityLiveRegion="polite">
                  <View style={[styles.successIcon, { backgroundColor: colors.success + '15' }]}>
                    <Ionicons name="checkmark-circle" size={52} color={colors.success} />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>
                    Account Created!
                  </Text>
                  <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                    We sent a confirmation link to {emailStripped || 'your email'}. Check your inbox
                    to verify your account, then sign in.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={backToSignIn}
                    style={styles.successBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Back to Sign In"
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark || colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientBtn}
                    >
                      <Text style={[styles.gradientBtnText, { color: onGradient }]}>
                        Back to Sign In
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Form */
                <>
                  {isSignUp && (
                    <FadeSlideIn delay={80}>
                      <AuthField
                        colors={colors}
                        label="Full Name"
                        icon="person-outline"
                        value={name}
                        onChangeText={(v) => {
                          setName(v);
                          if (error) setError('');
                        }}
                        placeholder="Genesis Diaz"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        isFocused={focusedField === 'name'}
                        hasError={!!error && !name.trim()}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField('')}
                      />
                    </FadeSlideIn>
                  )}

                  <FadeSlideIn delay={isSignUp ? 120 : 100}>
                    <AuthField
                      colors={colors}
                      label="Email Address"
                      icon="mail-outline"
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v);
                        if (error) setError('');
                      }}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="emailAddress"
                      returnKeyType="next"
                      isFocused={focusedField === 'email'}
                      hasError={!!error && !VALID_EMAIL.test(email.trim())}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                    />
                  </FadeSlideIn>

                  <FadeSlideIn delay={isSignUp ? 160 : 150}>
                    <AuthField
                      colors={colors}
                      label="Password"
                      icon="lock-closed-outline"
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        if (error) setError('');
                      }}
                      placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                      secure
                      showSecret={showPassword}
                      onToggleSecret={() => setShowPassword(!showPassword)}
                      autoComplete={isSignUp ? 'new-password' : 'password'}
                      textContentType={isSignUp ? 'newPassword' : 'password'}
                      returnKeyType={isSignUp ? 'next' : 'go'}
                      onSubmitEditing={isSignUp ? undefined : handleSubmit}
                      isFocused={focusedField === 'password'}
                      hasError={!!error && !password}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField('')}
                    />
                    {isSignUp && <StrengthMeter password={password} colors={colors} />}
                  </FadeSlideIn>

                  {isSignUp && (
                    <FadeSlideIn delay={200}>
                      <AuthField
                        colors={colors}
                        label="Confirm Password"
                        icon="shield-checkmark-outline"
                        value={confirm}
                        onChangeText={(v) => {
                          setConfirm(v);
                          if (error) setError('');
                        }}
                        placeholder="Re-enter your password"
                        secure
                        showSecret={showConfirm}
                        onToggleSecret={() => setShowConfirm(!showConfirm)}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit}
                        isFocused={focusedField === 'confirm'}
                        hasError={!!error && confirm !== password}
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField('')}
                      />
                    </FadeSlideIn>
                  )}

                  {!!error && (
                    <FadeSlideIn delay={0}>
                      <View
                        style={[
                          styles.alertBox,
                          {
                            backgroundColor: colors.error + '15',
                            borderColor: colors.error + '30',
                          },
                        ]}
                        accessibilityLiveRegion="polite"
                      >
                        <Ionicons name="alert-circle" size={16} color={colors.error} />
                        <Text style={[styles.alertText, { color: colors.error }]}>{error}</Text>
                      </View>
                    </FadeSlideIn>
                  )}

                  <FadeSlideIn delay={isSignUp ? 240 : 200}>
                    <View style={styles.submitWrap}>
                      <Button
                        title={isSignUp ? 'Create Account' : 'Sign In'}
                        icon={isSignUp ? 'arrow-forward' : 'log-in-outline'}
                        iconPosition={isSignUp ? 'right' : 'left'}
                        onPress={handleSubmit}
                        variant="primary"
                        gradient
                        loading={loading}
                        fullWidth
                      />
                    </View>
                  </FadeSlideIn>

                  {!isSignUp && (
                    <FadeSlideIn delay={250}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('ForgotPassword', { email: emailStripped })
                        }
                        style={styles.forgotTouch}
                        accessibilityRole="link"
                        accessibilityLabel="Forgot password?"
                      >
                        <Text style={[styles.forgotLink, { color: colors.textSecondary }]}>
                          Forgot password?{' '}
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>Reset it</Text>
                        </Text>
                      </TouchableOpacity>
                    </FadeSlideIn>
                  )}

                  <Divider colors={colors} />

                  <FadeSlideIn delay={isSignUp ? 280 : 300}>
                    <SocialSignInButtons
                      googleLabel="Continue with Google"
                      onSuccess={() => {
                        // Session is set by Supabase onAuthStateChange → navigator switches automatically
                      }}
                      onError={(err) => setError(err)}
                    />
                  </FadeSlideIn>

                  {isSignUp && (
                    <FadeSlideIn delay={320}>
                      <View style={styles.termsRow}>
                        <Text style={[styles.terms, { color: colors.textLight }]}>
                          By continuing, you agree to our{' '}
                        </Text>
                        <TouchableOpacity
                          accessibilityRole="link"
                          accessibilityLabel="Terms"
                          style={styles.termsLink}
                          onPress={() => {}}
                        >
                          <Text
                            style={[styles.terms, { color: colors.primary, fontWeight: '600' }]}
                          >
                            Terms
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.terms, { color: colors.textLight }]}> and </Text>
                        <TouchableOpacity
                          accessibilityRole="link"
                          accessibilityLabel="Privacy Policy"
                          style={styles.termsLink}
                          onPress={() => {}}
                        >
                          <Text
                            style={[styles.terms, { color: colors.primary, fontWeight: '600' }]}
                          >
                            Privacy Policy
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </FadeSlideIn>
                  )}
                </>
              )}
            </View>
          </FadeSlideIn>

          {!created && (
            <FadeSlideIn delay={340}>
              <TouchableOpacity
                onPress={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
                style={styles.switchRow}
                accessibilityRole="button"
                accessibilityLabel={isSignUp ? 'Go to Sign In' : 'Go to Sign Up'}
              >
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <Text style={[styles.switchLink, { color: colors.primary }]}>
                  {isSignUp ? ' Sign In' : ' Create Account'}
                </Text>
              </TouchableOpacity>
            </FadeSlideIn>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    ...shadows.sm,
  },

  hero: {
    alignItems: 'center',
    paddingBottom: 40,
    borderBottomLeftRadius: borderRadius.xxxl,
    borderBottomRightRadius: borderRadius.xxxl,
    overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -50,
  },
  heroOrb2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: -40,
  },
  heroOrb3: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 90,
    left: 40,
  },

  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: 0 },

  card: {
    marginTop: -18,
    borderRadius: borderRadius.xxxl,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.lg,
  },

  segWrap: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 999,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  segBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

  fieldBlock: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    height: 56,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 6 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { marginLeft: spacing.md, fontSize: 12, fontWeight: '700' },

  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1 },

  submitWrap: { marginTop: spacing.sm, marginBottom: spacing.md },

  forgotTouch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  forgotLink: { fontSize: 14, fontWeight: '600' },

  terms: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  termsLink: { minHeight: 44, justifyContent: 'center' },

  successWrap: { alignItems: 'center', paddingVertical: spacing.md },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  successDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  successBtn: { width: '100%', borderRadius: borderRadius.lg },
  gradientBtn: {
    height: 54,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  gradientBtnText: { fontSize: 17, fontWeight: '700' },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
    marginTop: spacing.lg,
  },
  switchText: { fontSize: 15 },
  switchLink: { fontSize: 15, fontWeight: '700' },
});
