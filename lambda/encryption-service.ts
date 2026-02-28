/**
 * Encryption Service
 * 
 * Provides encryption and decryption functionality using AES-256-GCM.
 * Retrieves encryption keys from AWS Secrets Manager with caching to minimize API calls.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */

import { SecretsManager } from 'aws-sdk';
import * as crypto from 'crypto';

/**
 * Configuration for encryption service
 */
interface EncryptionConfig {
  secretName: string;
  region?: string;
  cacheTTLMs?: number; // Cache time-to-live in milliseconds
}

/**
 * Cached encryption key with expiry
 */
interface CachedKey {
  key: Buffer;
  expiresAt: number;
}

/**
 * Encryption result containing ciphertext and metadata
 */
interface EncryptionResult {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
}

const DEFAULT_CONFIG: Partial<EncryptionConfig> = {
  region: process.env.AWS_REGION || 'us-east-1',
  cacheTTLMs: 5 * 60 * 1000, // 5 minutes default cache TTL
};

/**
 * EncryptionService class
 * 
 * Handles encryption and decryption of sensitive data using AES-256-GCM.
 * Implements key caching to reduce Secrets Manager API calls.
 */
export class EncryptionService {
  private secretsManager: SecretsManager;
  private config: EncryptionConfig;
  private keyCache: Map<string, CachedKey>;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits for GCM
  private readonly keyLength = 32; // 256 bits

  constructor(config: EncryptionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as EncryptionConfig;
    this.secretsManager = new SecretsManager({
      region: this.config.region,
    });
    this.keyCache = new Map();
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * 
   * @param plaintext - The data to encrypt
   * @returns Base64 encoded string containing ciphertext, IV, and auth tag
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const key = await this.getEncryptionKey();
    
    // Generate random IV for each encryption (ensures different ciphertext for same plaintext)
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt the data
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and ciphertext into single string
    const result: EncryptionResult = {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
    
    return JSON.stringify(result);
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * 
   * @param encryptedData - Base64 encoded string containing ciphertext, IV, and auth tag
   * @returns Decrypted plaintext
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }

    let result: EncryptionResult;
    try {
      result = JSON.parse(encryptedData);
    } catch (error) {
      throw new Error('Invalid encrypted data format');
    }

    if (!result.ciphertext || !result.iv || !result.authTag) {
      throw new Error('Encrypted data missing required fields');
    }

    const key = await this.getEncryptionKey();
    
    // Parse IV and auth tag from base64
    const iv = Buffer.from(result.iv, 'base64');
    const authTag = Buffer.from(result.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let plaintext: string;
    try {
      plaintext = decipher.update(result.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
    } catch (error) {
      throw new Error('Decryption failed: Invalid ciphertext or authentication tag');
    }
    
    return plaintext;
  }

  /**
   * Retrieve encryption key from AWS Secrets Manager with caching
   * 
   * @returns Encryption key as Buffer
   */
  async getEncryptionKey(): Promise<Buffer> {
    const now = Date.now();
    
    // Check if key is cached and not expired
    const cached = this.keyCache.get(this.config.secretName);
    if (cached && cached.expiresAt > now) {
      return cached.key;
    }

    // Fetch key from Secrets Manager
    try {
      const response = await this.secretsManager
        .getSecretValue({ SecretId: this.config.secretName })
        .promise();

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      // Parse secret (expecting JSON with 'key' or 'encryptionKey' field)
      let secretData: any;
      try {
        secretData = JSON.parse(response.SecretString);
      } catch {
        // If not JSON, treat entire string as key
        secretData = { key: response.SecretString };
      }

      const keyValue = secretData.key || secretData.encryptionKey;
      if (!keyValue) {
        throw new Error('Secret does not contain encryption key');
      }

      // Convert key to Buffer (expecting hex or base64 encoded key)
      let keyBuffer: Buffer;
      if (keyValue.length === this.keyLength * 2) {
        // Hex encoded (64 characters for 256 bits)
        keyBuffer = Buffer.from(keyValue, 'hex');
      } else {
        // Base64 encoded
        keyBuffer = Buffer.from(keyValue, 'base64');
      }

      if (keyBuffer.length !== this.keyLength) {
        throw new Error(`Invalid key length: expected ${this.keyLength} bytes, got ${keyBuffer.length} bytes`);
      }

      // Cache the key
      this.keyCache.set(this.config.secretName, {
        key: keyBuffer,
        expiresAt: now + (this.config.cacheTTLMs || 5 * 60 * 1000),
      });

      return keyBuffer;
    } catch (error: any) {
      throw new Error(`Failed to retrieve encryption key: ${error.message}`);
    }
  }

  /**
   * Clear the key cache (useful for testing or forcing key refresh)
   */
  clearCache(): void {
    this.keyCache.clear();
  }

  /**
   * Generate a new encryption key (for key rotation)
   * 
   * @returns Hex-encoded 256-bit key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Create and export a singleton instance
 * Configuration should be provided via environment variables
 */
export const encryptionService = new EncryptionService({
  secretName: process.env.DB_ENCRYPTION_SECRET_ARN || process.env.ENCRYPTION_KEY_SECRET_NAME || 'TaskManager/DBEncryptionKey',
  region: process.env.AWS_REGION,
  cacheTTLMs: parseInt(process.env.ENCRYPTION_KEY_CACHE_TTL_MS || '300000', 10),
});
