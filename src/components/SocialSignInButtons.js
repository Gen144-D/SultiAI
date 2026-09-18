import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';

WebBrowser.maybeCompleteAuthSession();

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialBtn: {
    flex: 1,
    height: 54,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 10,
    ...shadows.sm,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE0',
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'GeezaPro-Bold' : 'sans-serif-medium',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontWeight: '500',
  },
});

function getRedirectTo() {
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  return 'sultiai://callback';
}

const GOOGLE_SVG = (
  <View style={styles.googleIcon}>
    <Text style={styles.googleG}>G</Text>
  </View>
);

export default function SocialSignInButtons({ onSuccess, onError, style, googleLabel }) {
  const { colors } = useTheme();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGooglePress = useCallback(async () => {
    try {
      setGoogleLoading(true);

      const redirectTo = getRedirectTo();
      console.log('[GoogleAuth] Starting OAuth flow, platform:', Platform.OS, 'redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('[GoogleAuth] Supabase OAuth error:', error.message);
        throw error;
      }

      console.log('[GoogleAuth] OAuth URL received:', data?.url ? 'yes' : 'no');

      if (data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true, preferEphemeralSession: false }
        );

        console.log('[GoogleAuth] Browser result type:', result.type);

        if (result.type === 'success') {
          if (onSuccess) onSuccess('google');
        } else if (result.type === 'cancel') {
          console.log('Google sign-in cancelled');
        } else {
          const msg = 'Google sign-in was dismissed or failed.';
          if (onError) onError(msg);
        }
      }
    } catch (err) {
      console.error('[GoogleAuth] Error:', err.message || err);
      const msg = err?.message || 'Google sign-in failed. Please try again.';
      if (onError) onError(msg);
      else Alert.alert('Sign-In Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  }, [onSuccess, onError]);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleGooglePress}
        disabled={googleLoading}
        style={[styles.socialBtn, styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }, googleLoading && styles.btnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={googleLabel || 'Continue with Google'}
        accessibilityState={{ disabled: googleLoading, busy: googleLoading }}
        hitSlop={8}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={colors.textLight} />
        ) : (
          <>
            {GOOGLE_SVG}
            <Text style={[styles.btnText, { color: colors.text }]}>{googleLabel || 'Continue with Google'}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function Divider({ colors }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors?.border || '#E5E7EB' }]} />
      <Text style={[styles.dividerText, { color: colors?.textLight || '#9CA3AF' }]}>or continue with</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors?.border || '#E5E7EB' }]} />
    </View>
  );
}