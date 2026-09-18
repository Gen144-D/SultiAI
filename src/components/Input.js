import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borderRadius, spacing, typography } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function Input({
  label, icon, value, onChangeText, placeholder, secureTextEntry, error,
  keyboardType, autoCapitalize, multiline, containerStyle, inputStyle, rightIcon,
  onRightIconPress, id, name, autoComplete, testID, editable = true,
  returnKeyType, onSubmitEditing, autoFocus, maxLength,
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[
        styles.inputRow,
        { backgroundColor: editable ? colors.surfaceSecondary : colors.surface,
          borderColor,
          ...(focused && !error ? { shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } : {}),
        },
        multiline && styles.multiline,
      ]}>
        {icon && <Ionicons name={icon} size={20} color={error ? colors.error : focused ? colors.primary : colors.textLight} style={styles.leftIcon} />}
        <TextInput
          id={id}
          name={name}
          testID={testID}
          style={[
            styles.input,
            { color: colors.text },
            icon && { marginLeft: spacing.sm },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          autoComplete={autoComplete}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          maxLength={maxLength}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          {...(error ? { accessibilityInvalid: true } : {})}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={label ? `${label} action` : 'Action'}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { ...typography.caption, fontWeight: '600', marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1.5, paddingHorizontal: spacing.md },
  leftIcon: { marginRight: spacing.xs },
  rightBtn: { marginLeft: spacing.xs, padding: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  multiline: { minHeight: 100, alignItems: 'flex-start' },
  multilineInput: { minHeight: 80 },
  error: { fontSize: 12, marginTop: spacing.xs, fontWeight: '500' },
});