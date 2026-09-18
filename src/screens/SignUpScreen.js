import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';
import Button from '../components/Button';

function FadeSlideIn({ delay = 0, children, style }) {
  const fade = useMemo(() => new Animated.Value(0), []);
  const slide = useMemo(() => new Animated.Value(24), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: fade, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function SignUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signUp, authError } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState('');

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSignUp = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, name.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
    }
    // If success, UserContext sets user → AppNavigator switches to main tabs
  };

  const inputStyle = (field) => [
    styles.inputWrap,
    {
      backgroundColor: colors.surface,
      borderColor: error ? colors.error : focusedField === field ? colors.primary : colors.border,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Account</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <FadeSlideIn delay={0}>
            <Text style={[styles.title, { color: colors.text }]}>Join SultiAI</Text>
          </FadeSlideIn>
          <FadeSlideIn delay={50}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start your language learning journey today
            </Text>
          </FadeSlideIn>

          {/* Social Sign Up */}
          <FadeSlideIn delay={100}>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Sign up with Google"
              >
                <Ionicons name="logo-google" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </FadeSlideIn>

          {/* Divider */}
          <FadeSlideIn delay={150}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textLight }]}>or continue with email</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
          </FadeSlideIn>

          {/* Full Name */}
          <FadeSlideIn delay={200}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <View style={inputStyle('name')}>
              <Ionicons name="person-outline" size={18} color={error ? colors.error : focusedField === 'name' ? colors.primary : colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={(v) => { setName(v); if (error) setError(''); }}
                placeholder="Genesis Diaz"
                placeholderTextColor={colors.textLight}
                autoComplete="name"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
              />
            </View>
          </FadeSlideIn>

          {/* Email */}
          <FadeSlideIn delay={250}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <View style={inputStyle('email')}>
              <Ionicons name="mail-outline" size={18} color={error ? colors.error : focusedField === 'email' ? colors.primary : colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('')}
              />
            </View>
          </FadeSlideIn>

          {/* Password */}
          <FadeSlideIn delay={300}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={inputStyle('password')}>
              <Ionicons name="lock-closed-outline" size={18} color={error ? colors.error : focusedField === 'password' ? colors.primary : colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={password}
                onChangeText={(v) => { setPassword(v); if (error) setError(''); }}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </FadeSlideIn>


          {/* Error */}
          {!!error && (
            <FadeSlideIn delay={0}>
              <View
                style={[styles.errorBox, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            </FadeSlideIn>
          )}

          {/* Create Account Button */}
          <FadeSlideIn delay={300}>
            <View style={styles.submitBtn}>
              <Button
                title="Create Account"
                icon="arrow-forward"
                iconPosition="right"
                onPress={handleSignUp}
                variant="primary"
                gradient
                loading={loading}
                fullWidth
              />
            </View>
          </FadeSlideIn>

          {/* Switch to sign in */}
          <FadeSlideIn delay={350}>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignIn')}
              style={styles.switchRow}
              accessibilityRole="link"
              accessibilityLabel="Go to Sign In"
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                Already have an account?
              </Text>
              <Text style={[styles.switchLink, { color: colors.primary }]}> Sign In</Text>
            </TouchableOpacity>
          </FadeSlideIn>

          {/* Terms */}
          <FadeSlideIn delay={400}>
            <View style={styles.termsRow}>
              <Text style={[styles.terms, { color: colors.textLight }]}>By continuing, you agree to our </Text>
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel="Terms"
                style={styles.termsLink}
                onPress={() => {}}
              >
                <Text style={[styles.terms, { color: colors.primary, fontWeight: '600' }]}>Terms</Text>
              </TouchableOpacity>
              <Text style={[styles.terms, { color: colors.textLight }]}> and </Text>
              <TouchableOpacity
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
                style={styles.termsLink}
                onPress={() => {}}
              >
                <Text style={[styles.terms, { color: colors.primary, fontWeight: '600' }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </FadeSlideIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  title: { fontSize: 28, fontWeight: '800', marginBottom: spacing.sm },
  subtitle: { fontSize: 15, marginBottom: spacing.xxl, lineHeight: 22 },

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
  eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  socialRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: spacing.md, fontSize: 13, fontWeight: '500' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

  submitBtn: { marginTop: spacing.sm, marginBottom: spacing.md },

  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44, marginTop: spacing.sm, paddingBottom: spacing.md },
  switchText: { fontSize: 15 },
  switchLink: { fontSize: 15, fontWeight: '700' },

  terms: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  termsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: spacing.xl },
  termsLink: { minHeight: 44, justifyContent: 'center' },
});
