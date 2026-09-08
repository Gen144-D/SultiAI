module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting (no code change)
        'refactor', // Code refactoring
        'perf',     // Performance
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI configuration
        'chore',    // Maintenance
        'revert',   // Revert
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
  },
};
