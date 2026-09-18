import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

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
  const [loading, setLoading] = useState(false);
  const [robertaAvailable, setRobertaAvailable] = useState(false);
  const [inputText, setInputText] = useState('');
  const [completions, setCompletions] = useState(null);
  const [selectedCompletion, setSelectedCompletion] = useState(null);
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    checkRobertaStatus();
  }, []);

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

  const useExample = (template) => {
    setInputText(template);
    setCompletions(null);
    setSelectedCompletion(null);
  };

  if (!robertaAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>RoBERTa Not Available</Text>
          <Text style={styles.errorMessage}>
            The RoBERTa Tagalog model is not available. Please ensure the Python AI service is running.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Sentence Completion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            Use {'<mask>'} in your sentence where you want AI to predict the missing word.
          </Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, !customMode && styles.modeButtonActive]}
            onPress={() => setCustomMode(false)}
          >
            <Text style={[styles.modeButtonText, !customMode && styles.modeButtonTextActive]}>
              Examples
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, customMode && styles.modeButtonActive]}
            onPress={() => setCustomMode(true)}
          >
            <Text style={[styles.modeButtonText, customMode && styles.modeButtonTextActive]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {!customMode ? (
          <View style={styles.examplesSection}>
            <Text style={styles.sectionTitle}>Try these examples:</Text>
            {EXAMPLE_TEMPLATES.map((template, index) => (
              <TouchableOpacity
                key={index}
                style={styles.exampleItem}
                onPress={() => useExample(template)}
              >
                <Text style={styles.exampleText}>{template.replace('<mask>', '_____')}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.customSection}>
            <Text style={styles.sectionTitle}>Create your own sentence:</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g., Ang pangalan ko ay <mask>."
              value={inputText}
              onChangeText={setInputText}
              multiline
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.completeButton, !inputText && styles.completeButtonDisabled]}
              onPress={completeSentence}
              disabled={!inputText || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>Complete Sentence</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {completions && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>AI Completions:</Text>
            
            {selectedCompletion && (
              <View style={styles.selectedCard}>
                <Text style={styles.selectedLabel}>Best Match:</Text>
                <Text style={styles.selectedText}>{selectedCompletion.completed_sentence}</Text>
                <View style={styles.selectedMeta}>
                  <Text style={styles.selectedWord}>Predicted: {selectedCompletion.predicted_word}</Text>
                  <Text style={styles.selectedConfidence}>
                    Confidence: {(selectedCompletion.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.alternativesContainer}>
              <Text style={styles.alternativesTitle}>All predictions:</Text>
              {completions.completions.map((completion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alternativeItem,
                    selectedCompletion === completion && styles.alternativeItemSelected
                  ]}
                  onPress={() => selectCompletion(completion)}
                >
                  <View style={styles.alternativeContent}>
                    <Text style={styles.alternativeText}>{completion.completed_sentence}</Text>
                    <Text style={styles.alternativeMeta}>
                      {completion.predicted_word} ({(completion.confidence * 100).toFixed(1)}%)
                    </Text>
                  </View>
                  {selectedCompletion === completion && (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.tryAgainButton} onPress={() => {
              setCompletions(null);
              setSelectedCompletion(null);
            }}>
              <Text style={styles.tryAgainButtonText}>Try Another Sentence</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: '#1976D2',
    fontSize: 14,
    marginLeft: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
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
  modeButtonActive: {
    backgroundColor: '#2196F3',
  },
  modeButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  examplesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  exampleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exampleText: {
    fontSize: 16,
    color: '#333',
  },
  customSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  selectedCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  selectedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedWord: {
    fontSize: 14,
    color: '#666',
  },
  selectedConfidence: {
    fontSize: 14,
    color: '#666',
  },
  alternativesContainer: {
    marginBottom: 16,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  alternativeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alternativeItemSelected: {
    backgroundColor: '#F1F8E9',
  },
  alternativeContent: {
    flex: 1,
  },
  alternativeText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  alternativeMeta: {
    fontSize: 12,
    color: '#999',
  },
  tryAgainButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    color: '#fff',
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
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
  },
});