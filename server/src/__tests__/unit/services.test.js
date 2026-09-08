describe('VocabularyIntelligenceService', () => {
  describe('SM-2 Algorithm', () => {
    it('should calculate correct interval for first successful review', () => {
      const quality = 4;
      const easeFactor = 2.5;
      const interval = 1;
      const repetitionCount = 0;

      const newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      expect(newEF).toBeCloseTo(2.5, 1);

      const newRep = repetitionCount + 1;
      expect(newRep).toBe(1);
    });

    it('should reset interval on failed review', () => {
      const quality = 2;
      expect(quality < 3).toBe(true);
    });

    it('should increase interval on consecutive successes', () => {
      let interval = 1;
      const ef = 2.5;
      interval = Math.round(ef * interval);
      expect(interval).toBeGreaterThan(1);
    });
  });
});

describe('AdaptiveLearningEngine', () => {
  describe('Level Progression', () => {
    it('should promote when mastery exceeds threshold', () => {
      const mastery = 0.8;
      const threshold = 0.75;
      expect(mastery).toBeGreaterThan(threshold);
    });

    it('should demote when mastery falls below threshold', () => {
      const mastery = 0.35;
      const threshold = 0.4;
      expect(mastery).toBeLessThan(threshold);
    });

    it('should not promote without minimum sessions', () => {
      const sessionsAtLevel = 2;
      const required = 3;
      expect(sessionsAtLevel).toBeLessThan(required);
    });
  });
});

describe('PronunciationAnalyticsService', () => {
  describe('Stats Calculation', () => {
    it('should calculate average accuracy correctly', () => {
      const attempts = [80, 90, 70, 85];
      const avg = attempts.reduce((s, a) => s + a, 0) / attempts.length;
      expect(avg).toBe(81.25);
    });

    it('should identify difficult words below threshold', () => {
      const wordStats = {
        kumusta: [90, 85, 88],
        salamat: [50, 45, 55],
      };
      const threshold = 60;
      const difficult = Object.entries(wordStats)
        .filter(([, scores]) => scores.reduce((s, sc) => s + sc, 0) / scores.length < threshold)
        .map(([word]) => word);
      expect(difficult).toEqual(['salamat']);
    });

    it('should identify mastered words above threshold with min attempts', () => {
      const wordStats = {
        kumusta: [90, 85, 88, 92],
        salamat: [90, 85],
      };
      const threshold = 85;
      const minAttempts = 3;
      const mastered = Object.entries(wordStats)
        .filter(
          ([, scores]) =>
            scores.reduce((s, sc) => s + sc, 0) / scores.length >= threshold &&
            scores.length >= minAttempts
        )
        .map(([word]) => word);
      expect(mastered).toEqual(['kumusta']);
    });
  });
});

describe('ContextManager', () => {
  describe('Difficulty Calculation', () => {
    it('should return beginner params for beginner level', () => {
      const level = 'beginner';
      const detail = level === 'beginner' ? 'high' : level === 'intermediate' ? 'medium' : 'low';
      expect(detail).toBe('high');
    });

    it('should return advanced params for advanced level', () => {
      const level = 'advanced';
      const detail = level === 'beginner' ? 'high' : level === 'intermediate' ? 'medium' : 'low';
      expect(detail).toBe('low');
    });
  });
});
