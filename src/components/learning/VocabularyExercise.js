import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { readableOnGradient } from '../../theme/moduleColors';

export default function VocabularyExercise({ onBack }) {
  const { colors, onPrimary } = useTheme();
  const [loading, setLoading] = useState(false);
  const [robertaAvailable, setRobertaAvailable] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [difficulty, setDifficulty] = useState('beginner');
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const difficultyColor = (level) => {
    if (level === 'beginner') return colors.success;
    if (level === 'intermediate') return colors.warning;
    return colors.error;
  };

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

  const generateExercise = async () => {
    if (!robertaAvailable) {
      Alert.alert('Service Unavailable', 'RoBERTa Tagalog model is not available');
      return;
    }

    setLoading(true);
    try {
      const exercise = await api.robertaVocabularyExercise(difficulty);
      setCurrentExercise(exercise);
      setUserAnswer('');
      setShowResult(false);
    } catch (error) {
      console.error('Failed to generate exercise:', error);
      Alert.alert('Error', 'Failed to generate vocabulary exercise');
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = () => {
    if (!currentExercise || !userAnswer.trim()) return;

    const correctAnswer = currentExercise.exercise.correct_answer?.toLowerCase();
    const userAnswerLower = userAnswer.trim().toLowerCase();
    const isCorrect = userAnswerLower === correctAnswer;

    setShowResult(true);
    setTotalAttempts(prev => prev + 1);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const getNextExercise = () => {
    generateExercise();
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
        <Text style={[styles.title, { color: colors.text }]}>Vocabulary Exercise</Text>
        <View style={[styles.scoreContainer, { backgroundColor: colors.success }]}>
          <Text style={[styles.scoreText, { color: readableOnGradient([colors.success]) }]}>
            {score}/{totalAttempts}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.difficultySelector,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {['beginner', 'intermediate', 'advanced'].map((level) => {
          const active = difficulty === level;
          const tone = difficultyColor(level);
          return (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                { backgroundColor: active ? tone : colors.surfaceSecondary },
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: active ? readableOnGradient([tone]) : colors.textSecondary },
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content}>
        {!currentExercise ? (
          <View style={styles.startContainer}>
            <Ionicons name="book-outline" size={64} color={colors.success} />
            <Text style={[styles.startTitle, { color: colors.text }]}>
              Tagalog Vocabulary Practice
            </Text>
            <Text style={[styles.startDescription, { color: colors.textSecondary }]}>
              Practice your Tagalog vocabulary with fill-in-the-blank exercises powered by RoBERTa Tagalog Base.
            </Text>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.success }]}
              onPress={generateExercise}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={readableOnGradient([colors.success])} />
              ) : (
                <Text
                  style={[
                    styles.startButtonText,
                    { color: readableOnGradient([colors.success]) },
                  ]}
                >
                  Start Exercise
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.exerciseContainer}>
            <View style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.instruction, { color: colors.text }]}>
                Complete the sentence:
              </Text>
              <Text style={[styles.template, { color: colors.text }]}>
                {currentExercise.exercise.template.replace('<mask>', '_____')}
              </Text>

              {showResult ? (
                <View style={styles.resultContainer}>
                  <Text
                    style={[
                      styles.resultText,
                      {
                        color:
                          userAnswer.trim().toLowerCase() ===
                          currentExercise.exercise.correct_answer?.toLowerCase()
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {userAnswer.trim().toLowerCase() ===
                    currentExercise.exercise.correct_answer?.toLowerCase()
                      ? '✓ Correct!'
                      : '✗ Try again'}
                  </Text>
                  <Text style={[styles.correctAnswer, { color: colors.textSecondary }]}>
                    Correct answer: {currentExercise.exercise.correct_answer}
                  </Text>
                  <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: colors.primary }]}
                    onPress={getNextExercise}
                  >
                    <Text style={[styles.nextButtonText, { color: onPrimary }]}>
                      Next Exercise
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Type your answer..."
                    placeholderTextColor={colors.textLight}
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    onSubmitEditing={checkAnswer}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.checkButton, { backgroundColor: colors.success }]}
                    onPress={checkAnswer}
                  >
                    <Text
                      style={[
                        styles.checkButtonText,
                        { color: readableOnGradient([colors.success]) },
                      ]}
                    >
                      Check
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.predictionsContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.predictionsTitle, { color: colors.textSecondary }]}>
                  AI Suggestions:
                </Text>
                {currentExercise.exercise.predictions.slice(0, 3).map((pred, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.predictionItem, { borderBottomColor: colors.border }]}
                    onPress={() => setUserAnswer(pred.word)}
                  >
                    <Text style={[styles.predictionWord, { color: colors.text }]}>{pred.word}</Text>
                    <Text style={[styles.predictionScore, { color: colors.textSecondary }]}>
                      {(pred.score * 100).toFixed(1)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.surfaceSecondary }]}
              onPress={getNextExercise}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip Exercise
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
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  difficultyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  difficultyText: {
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  startButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseContainer: {
    flex: 1,
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instruction: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  template: {
    fontSize: 20,
    marginBottom: 20,
    lineHeight: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  checkButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkButtonText: {
    fontWeight: 'bold',
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  correctAnswer: {
    fontSize: 16,
    marginBottom: 12,
  },
  nextButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  nextButtonText: {
    fontWeight: 'bold',
  },
  predictionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  predictionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  predictionWord: {
    fontSize: 16,
  },
  predictionScore: {
    fontSize: 14,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontWeight: '600',
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
