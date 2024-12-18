import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

interface TokenPayload {
  clientId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export class AuthManager {
  private readonly secretKey: string;
  private readonly tokenExpiration: string = '1h';
  private readonly apiKeys: Map<string, string> = new Map(); // clientId -> apiKey

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  generateToken(clientId: string, permissions: string[]): string {
    const payload: TokenPayload = {
      clientId,
      permissions
    };

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiration
    });
  }

  validateToken(token: string): {
    valid: boolean;
    clientId?: string;
    permissions?: string[];
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      return {
        valid: true,
        clientId: decoded.clientId,
        permissions: decoded.permissions
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      };
    }
  }

  generateApiKey(clientId: string): string {
    // Generate a secure random API key
    const apiKey = createHash('sha256')
      .update(clientId + Date.now() + Math.random().toString())
      .digest('hex');
    
    this.apiKeys.set(clientId, apiKey);
    return apiKey;
  }

  validateApiKey(apiKey: string): string | null {
    // Find the clientId associated with this API key
    for (const [clientId, storedKey] of this.apiKeys.entries()) {
      if (storedKey === apiKey) {
        return clientId;
      }
    }
    return null;
  }

  revokeApiKey(clientId: string): boolean {
    return this.apiKeys.delete(clientId);
  }

  // Helper method to check specific permissions
  hasPermission(token: string, requiredPermission: string): boolean {
    const validation = this.validateToken(token);
    if (!validation.valid || !validation.permissions) {
      return false;
    }
    return validation.permissions.includes(requiredPermission);
  }
}
