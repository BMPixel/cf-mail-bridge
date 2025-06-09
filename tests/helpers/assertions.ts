import { expect } from 'vitest';

export class TestAssertions {
  // Response assertions
  static async assertResponseStatus(response: Response, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus);
  }

  static async assertResponseJson(response: Response, expectedData?: any) {
    expect(response.headers.get('content-type')).toContain('application/json');
    const data = await response.json();
    if (expectedData) {
      expect(data).toEqual(expectedData);
    }
    return data;
  }

  static async assertResponseError(response: Response, expectedError?: string) {
    const data = await this.assertResponseJson(response);
    expect(data).toHaveProperty('error');
    if (expectedError) {
      expect(data.error).toContain(expectedError);
    }
    return data;
  }

  // Database assertions
  static assertUserExists(user: any, expectedUsername: string) {
    expect(user).toBeDefined();
    expect(user.username).toBe(expectedUsername);
    expect(user.id).toBeTypeOf('number');
    expect(user.created_at).toBeDefined();
  }

  static assertMessageExists(message: any, expectedData?: any) {
    expect(message).toBeDefined();
    expect(message.id).toBeTypeOf('number');
    expect(message.user_id).toBeTypeOf('number');
    expect(message.received_at).toBeDefined();
    
    if (expectedData) {
      if (expectedData.subject) expect(message.subject).toBe(expectedData.subject);
      if (expectedData.from) expect(message.from_address).toBe(expectedData.from);
      if (expectedData.to) expect(message.to_address).toBe(expectedData.to);
    }
  }

  // JWT assertions
  static assertValidJWT(token: string) {
    expect(token).toBeTypeOf('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    
    // Decode header and payload to verify structure
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    expect(header.alg).toBe('HS256');
    expect(payload.username).toBeDefined();
    expect(payload.exp).toBeTypeOf('number');
    expect(payload.iat).toBeTypeOf('number');
  }

  // Email assertions
  static assertValidEmailStructure(email: any) {
    expect(email).toBeDefined();
    expect(email.from).toBeDefined();
    expect(email.to).toBeDefined();
    expect(email.subject).toBeDefined();
    expect(email.text || email.html).toBeDefined();
  }

  // Performance assertions
  static assertPerformance(executionTime: number, maxTime: number, operation: string) {
    expect(executionTime).toBeLessThan(maxTime);
    if (executionTime > maxTime * 0.8) {
      console.warn(`Performance warning: ${operation} took ${executionTime}ms (max: ${maxTime}ms)`);
    }
  }

  // Security assertions
  static assertNoSQLInjection(query: string, userInput: string) {
    // Basic check that user input hasn't been directly concatenated
    expect(query.toLowerCase()).not.toContain(userInput.toLowerCase());
  }

  static assertPasswordHashed(password: string, hash: string) {
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(password.length);
    expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
  }
}