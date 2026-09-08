const crypto = require('crypto');

// Inline implementations for testing
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return password === stored;
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return verify === hash;
}

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should return a string with salt:hash format', () => {
      const password = 'testPassword123';
      const hashed = hashPassword(password);
      expect(hashed).toContain(':');
      const parts = hashed.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // 16 bytes hex
      expect(parts[1]).toHaveLength(128); // 64 bytes hex
    });

    it('should generate different hashes for same password', () => {
      const password = 'testPassword123';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const password = 'mySecretPass';
      const hashed = hashPassword(password);
      expect(verifyPassword(password, hashed)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'mySecretPass';
      const hashed = hashPassword(password);
      expect(verifyPassword('wrongPassword', hashed)).toBe(false);
    });

    it('should handle legacy plain text comparison', () => {
      expect(verifyPassword('plainPass', 'plainPass')).toBe(true);
      expect(verifyPassword('wrongPass', 'plainPass')).toBe(false);
    });

    it('should handle empty stored value', () => {
      expect(verifyPassword('', '')).toBe(true);
      expect(verifyPassword('pass', '')).toBe(false);
    });
  });
});
