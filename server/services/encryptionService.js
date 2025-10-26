import crypto from 'crypto';

/**
 * Encryption Service for HIPAA-Compliant Data Protection
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  constructor() {
    // Validate encryption key on initialization
    const keyHex = process.env.ENCRYPTION_KEY;
    
    if (!keyHex || keyHex === 'GENERATE_64_CHAR_HEX_KEY_HERE') {
      console.warn('⚠️  WARNING: ENCRYPTION_KEY not set or using default value!');
      console.warn('⚠️  Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      // For development, generate a temporary key
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Using temporary encryption key for development');
        this.key = crypto.randomBytes(32);
      } else {
        throw new Error('ENCRYPTION_KEY must be set in production');
      }
    } else {
      if (keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
      this.key = Buffer.from(keyHex, 'hex');
    }
    
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // 128 bits for GCM
    this.authTagLength = 16; // 128 bits authentication tag
  }
  
  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Encrypted data in format: iv:authTag:ciphertext (all hex)
   */
  encrypt(plaintext) {
    if (!plaintext) return null;
    
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:ciphertext (all in hex)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data in format: iv:authTag:ciphertext
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      // Parse the encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Encrypt an object's specified fields
   * @param {Object} data - Object containing data to encrypt
   * @param {Array<string>} fields - Field names to encrypt
   * @returns {Object} Object with encrypted fields
   */
  encryptFields(data, fields) {
    const encrypted = { ...data };
    
    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt an object's specified fields
   * @param {Object} data - Object containing encrypted data
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Object} Object with decrypted fields
   */
  decryptFields(data, fields) {
    const decrypted = { ...data };
    
    for (const field of fields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error.message);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return decrypted;
  }
  
  /**
   * Hash sensitive data (one-way, for comparison only)
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hash (hex)
   */
  hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Random token (hex)
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Mask sensitive data for display (e.g., phone numbers, emails)
   * @param {string} data - Data to mask
   * @param {string} type - Type of data ('email', 'phone', 'trn')
   * @returns {string} Masked data
   */
  mask(data, type = 'default') {
    if (!data) return null;
    
    switch (type) {
      case 'email': {
        // Show first 2 chars and domain: ab***@example.com
        const [local, domain] = data.split('@');
        if (local && domain) {
          const masked = local.substring(0, 2) + '***';
          return `${masked}@${domain}`;
        }
        return data;
      }
        
      case 'phone':
        // Show last 4 digits: ***-***-1234
        if (data.length >= 4) {
          return '***-***-' + data.slice(-4);
        }
        return '***-***-****';
        
      case 'trn':
        // Show last 3 digits: ******123
        if (data.length >= 3) {
          return '*'.repeat(data.length - 3) + data.slice(-3);
        }
        return '*'.repeat(data.length);
        
      default:
        // Default: show first and last char
        if (data.length > 2) {
          return data[0] + '*'.repeat(data.length - 2) + data[data.length - 1];
        }
        return '*'.repeat(data.length);
    }
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

// Sensitive fields that should always be encrypted
export const SENSITIVE_FIELDS = [
  'trn',
  'contact_phone',
  'contact_email',
  'emergency_contact_phone',
  'emergency_contact_name'
];

// Export utility functions
export const encrypt = (data) => encryptionService.encrypt(data);
export const decrypt = (data) => encryptionService.decrypt(data);
export const encryptFields = (data, fields) => encryptionService.encryptFields(data, fields);
export const decryptFields = (data, fields) => encryptionService.decryptFields(data, fields);
export const hashData = (data) => encryptionService.hash(data);
export const maskData = (data, type) => encryptionService.mask(data, type);
export const generateToken = (length) => encryptionService.generateToken(length);
