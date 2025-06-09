import { SignJWT, jwtVerify } from 'jose';

export class AuthTestHelper {
  static readonly JWT_SECRET = 'test-secret-key';
  static readonly TEST_USERNAME = 'testuser';
  static readonly TEST_PASSWORD = 'testpassword123';

  static async generateTestJWT(payload: any = {}, options: any = {}): Promise<string> {
    const secret = new TextEncoder().encode(this.JWT_SECRET);
    const jwt = new SignJWT({
      username: this.TEST_USERNAME,
      ...payload
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(options.expiresIn || '2h');

    return await jwt.sign(secret);
  }

  static async verifyTestJWT(token: string): Promise<any> {
    const secret = new TextEncoder().encode(this.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  }

  static async generateExpiredJWT(): Promise<string> {
    const secret = new TextEncoder().encode(this.JWT_SECRET);
    const jwt = new SignJWT({ username: this.TEST_USERNAME })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago

    return await jwt.sign(secret);
  }

  static generateAuthHeader(token: string): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
  }

  static createMockPasswordHash(password: string): string {
    // Simple mock hash for testing
    return Buffer.from(`mock-hash:${password}`).toString('base64');
  }

  static validateMockPasswordHash(password: string, hash: string): boolean {
    const expectedHash = this.createMockPasswordHash(password);
    return hash === expectedHash;
  }
}