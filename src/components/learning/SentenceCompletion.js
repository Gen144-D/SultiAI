import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { readableOnGradient } from '../../theme/moduleColors';

const EXAMPLE_TEMPLATES = [
  'Ang pangalan ko ay <mask>.',
  'Gusto ko <mask> ng pagkaon.',
  'Nasaan ang <mask>?',
  'Mahal ko ang aking <mask>.',
  'Kumusta <mask>?',
  'Salamat <mask>.',
  'Nag-aaral ako ng <mask>.',
  'Pwede ba <mask> mangulata?'
];

export default function SentenceCompletion({ onBack }) {
  const { colors, onPrimary } = useTheme();
  const [loading, setLoading] = useState(false);
  const [robertaAvailable, setRobertaAvailable] = useState(false);
  const [inputText, setInputText] = useState('');
  const [completions, setCompletions] = useState(null);
  const [selectedCompletion, setSelectedCompletion] = useState(null);
  const [customMode, setCustomMode] = useState(false);

  const checkRobertaStatus = async () => {
    try {
      const status = await api.robertaStatus();
      setRobertaAvailable(status.available);
      if (!status.available) {
        Alert.alert(
          'RoBERTa Not Available',
          'The RoBERTa Tagalog model is not available. Please ensure the Python AI service is running.',
          [{ text: 'OK', onPress: onBack }]
        );
      }
    } catch (error) {
      console.error('Failed to check RoBERTa status:', error);
      setRobertaAvailable(false);
    }
  };

  useEffect(() => {
    // setRobertaAvailable runs after `await`, so it cannot cascade renders on
    // mount; the Compiler rule cannot prove that boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkRobertaStatus();
  }, []);

  const completeSentence = async () => {
    if (!robertaAvailable) {
      Alert.alert('Service Unavailable', 'RoBERTa Tagalog model is not available');
      return;
    }

    if (!inputText.includes('<mask>')) {
      Alert.alert(
        'Invalid Input',
        'Please include <mask> in your sentence where you want the prediction.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use Example', onPress: () => setInputText(EXAMPLE_TEMPLATES[0]) }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await api.robertaSentenceCompletion(inputText);
      setCompletions(result);
      setSelectedCompletion(result.best_completion);
    } catch (error) {
      console.error('Failed to complete sentence:', error);
      Alert.alert('Error', 'Failed to complete sentence');
    } finally {
      setLoading(false);
    }
  };

  const selectCompletion = (completion) => {
    setSelectedCompletion(completion);
  };

  const selectExample = (template) => {
    setInputText(template);
    setCompletions(null);
    setSelectedCompletion(null);
  };

  if (!robertaAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>RoBERTa Not Available</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            The RoBERTa Tagalog model is not available. Please ensure the Python AI service is running.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.primary }]}
            onPress={onBack}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Sentence Completion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '1F' }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Use {'<mask>'} in your sentence where you want AI to predict the missing word.
          </Text>
        </View>

        <View style={[styles.modeToggle, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              !customMode && { backgroundColor: colors.primary },
            ]}
            onPress={() => setCustomMode(false)}
          >
            <Text
              style={[
                styles.modeButtonText,
                { color: !customMode ? onPrimary : colors.textSecondary },
              ]}
            >
              Examples
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              customMode && { backgroundColor: colors.primary },
            ]}
            onPress={() => setCustomMode(true)}
          >
            <Text
              style={[
                styles.modeButtonText,
                { color: customMode ? onPrimary : colors.textSecondary },
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {!customMode ? (
          <View style={[styles.examplesSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Try these examples:</Text>
            {EXAMPLE_TEMPLATES.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.exampleItem, { borderBottomColor: colors.border }]}
                onPress={() => selectExample(template)}
              >
                <Text style={[styles.exampleText, { color: colors.text }]}>
                  {template.replace('<mask>', '_____')}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.customSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Create your own sentence:
            </Text>
            <TextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g., Ang pangalan ko ay <mask>."
              placeholderTextColor={colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: inputText ? colors.success : colors.surfaceSecondary,
                },
              ]}
              onPress={completeSentence}
              disabled={!inputText || loading}
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    inputText
                      ? readableOnGradient([colors.success])
                      : colors.textLight
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.completeButtonText,
                    {
                      color: inputText
                        ? readableOnGradient([colors.success])
                        : colors.textLight,
                    },
                  ]}
                >
                  Complete Sentence
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {completions && (
          <View style={[styles.resultsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Completions:</Text>

            {selectedCompletion && (
              <View
                style={[
                  styles.selectedCard,
                  {
                    backgroundColor: colors.success + '1F',
                    borderLeftColor: colors.success,
                  },
                ]}
              >
                <Text style={[styles.selectedLabel, { color: colors.success }]}>
                  Best Match:
                </Text>
                <Text style={[styles.selectedText, { color: colors.text }]}>
                  {selectedCompletion.completed_sentence}
                </Text>
                <View style={styles.selectedMeta}>
                  <Text style={[styles.selectedWord, { color: colors.textSecondary }]}>
                    Predicted: {selectedCompletion.predicted_word}
                  </Text>
                  <Text style={[styles.selectedConfidence, { color: colors.textSecondary }]}>
                    Confidence: {(selectedCompletion.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.alternativesContainer}>
              <Text style={[styles.alternativesTitle, { color: colors.textSecondary }]}>
                All predictions:
              </Text>
              {completions.completions.map((completion, index) => {
                const isSelected = selectedCompletion === completion;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alternativeItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.success + '14' },
                    ]}
                    onPress={() => selectCompletion(completion)}
                  >
                    <View style={styles.alternativeContent}>
                      <Text style={[styles.alternativeText, { color: colors.text }]}>
                        {completion.completed_sentence}
                      </Text>
                      <Text style={[styles.alternativeMeta, { color: colors.textLight }]}>
                        {completion.predicted_word} ({(completion.confidence * 100).toFixed(1)}%)
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.tryAgainButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCompletions(null);
                setSelectedCompletion(null);
              }}
            >
              <Text style={[styles.tryAgainButtonText, { color: onPrimary }]}>
                Try Another Sentence
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  examplesSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exampleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exampleText: {
    fontSize: 16,
  },
  customSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  completeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    borderRadius: 12,
    padding: 16,
  },
  selectedCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 18,
    marginBottom: 8,
  },
  selectedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedWord: {
    fontSize: 14,
  },
  selectedConfidence: {
    fontSize: 14,
  },
  alternativesContainer: {
    marginBottom: 16,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  alternativeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeText: {
    fontSize: 15,
    marginBottom: 2,
  },
  alternativeMeta: {
    fontSize: 12,
  },
  tryAgainButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
  },
});
