import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

const DIFFICULTY_COLORS = {
  beginner: '#4CAF50',
  intermediate: '#FF9800', 
  advanced: '#F44336'
};

export default function VocabularyExercise({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [robertaAvailable, setRobertaAvailable] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [difficulty, setDifficulty] = useState('beginner');
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

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
        <Text style={styles.title}>Vocabulary Exercise</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}/{totalAttempts}</Text>
        </View>
      </View>

      <View style={styles.difficultySelector}>
        {['beginner', 'intermediate', 'advanced'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.difficultyButton,
              difficulty === level && { backgroundColor: DIFFICULTY_COLORS[level] }
            ]}
            onPress={() => setDifficulty(level)}
          >
            <Text style={[
              styles.difficultyText,
              difficulty === level && styles.difficultyTextActive
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {!currentExercise ? (
          <View style={styles.startContainer}>
            <Ionicons name="book-outline" size={64} color="#4CAF50" />
            <Text style={styles.startTitle}>Tagalog Vocabulary Practice</Text>
            <Text style={styles.startDescription}>
              Practice your Tagalog vocabulary with fill-in-the-blank exercises powered by RoBERTa Tagalog Base.
            </Text>
            <TouchableOpacity 
              style={styles.startButton} 
              onPress={generateExercise}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.startButtonText}>Start Exercise</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.exerciseContainer}>
            <View style={styles.exerciseCard}>
              <Text style={styles.instruction}>Complete the sentence:</Text>
              <Text style={styles.template}>
                {currentExercise.exercise.template.replace('<mask>', '_____')}
              </Text>
              
              {showResult ? (
                <View style={styles.resultContainer}>
                  <Text style={[
                    styles.resultText,
                    { color: userAnswer.trim().toLowerCase() === currentExercise.exercise.correct_answer?.toLowerCase() ? '#4CAF50' : '#F44336' }
                  ]}>
                    {userAnswer.trim().toLowerCase() === currentExercise.exercise.correct_answer?.toLowerCase() ? '✓ Correct!' : '✗ Try again'}
                  </Text>
                  <Text style={styles.correctAnswer}>
                    Correct answer: {currentExercise.exercise.correct_answer}
                  </Text>
                  <TouchableOpacity style={styles.nextButton} onPress={getNextExercise}>
                    <Text style={styles.nextButtonText}>Next Exercise</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type your answer..."
                    value={userAnswer}
                    onChangeText={setUserAnswer}
                    onSubmitEditing={checkAnswer}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.checkButton} onPress={checkAnswer}>
                    <Text style={styles.checkButtonText}>Check</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.predictionsContainer}>
                <Text style={styles.predictionsTitle}>AI Suggestions:</Text>
                {currentExercise.exercise.predictions.slice(0, 3).map((pred, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.predictionItem}
                    onPress={() => setUserAnswer(pred.word)}
                  >
                    <Text style={styles.predictionWord}>{pred.word}</Text>
                    <Text style={styles.predictionScore}>{(pred.score * 100).toFixed(1)}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.skipButton} onPress={getNextExercise}>
              <Text style={styles.skipButtonText}>Skip Exercise</Text>
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
  scoreContainer: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  difficultyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#e0e0e0',
  },
  difficultyText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
  },
  difficultyTextActive: {
    color: '#fff',
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
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseContainer: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 12,
  },
  template: {
    fontSize: 20,
    color: '#333',
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkButtonText: {
    color: '#fff',
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
    color: '#666',
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  predictionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  predictionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionWord: {
    fontSize: 16,
    color: '#333',
  },
  predictionScore: {
    fontSize: 14,
    color: '#666',
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
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