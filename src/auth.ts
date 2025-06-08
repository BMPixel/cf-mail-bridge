import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, ErrorCode } from './types';

export class AuthService {
    private secret: Uint8Array;
    
    constructor(jwtSecret: string) {
        this.secret = new TextEncoder().encode(jwtSecret);
    }

    async hashPassword(password: string): Promise<string> {
        // Generate random salt
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        // Import password as key material
        const passwordBuffer = new TextEncoder().encode(password);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive key using PBKDF2-SHA256 with 100,000 iterations
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256 // 32 bytes
        );

        // Combine salt and hash
        const hashArray = new Uint8Array(derivedBits);
        const combined = new Uint8Array(48); // 16 bytes salt + 32 bytes hash
        combined.set(salt, 0);
        combined.set(hashArray, 16);

        // Convert to base64
        return btoa(String.fromCharCode(...combined));
    }

    async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        try {
            // Decode base64 hash
            const combined = Uint8Array.from(atob(hashedPassword), c => c.charCodeAt(0));
            const salt = combined.slice(0, 16);
            const storedHash = combined.slice(16);

            // Import password as key material
            const passwordBuffer = new TextEncoder().encode(password);
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                'PBKDF2',
                false,
                ['deriveBits']
            );

            // Derive key using same parameters
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                256
            );

            const derivedHash = new Uint8Array(derivedBits);
            
            // Compare hashes
            return this.compareArrays(storedHash, derivedHash);
        } catch (error) {
            console.error('[AUTH] Password verification error:', error);
            return false;
        }
    }

    private compareArrays(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result === 0;
    }

    async generateToken(username: string): Promise<string> {
        console.log(`[AUTH] Generating token for user: ${username}`);
        const now = Math.floor(Date.now() / 1000);
        const payload: JWTPayload = {
            sub: username,
            iat: now,
            exp: now + (24 * 60 * 60) // 24 hours
        };

        return await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .sign(this.secret);
    }

    async verifyToken(token: string): Promise<JWTPayload | null> {
        try {
            console.log('[AUTH] Verifying JWT token');
            const { payload } = await jwtVerify(token, this.secret);
            console.log(`[AUTH] Token verified for user: ${payload.sub}`);
            return payload as JWTPayload;
        } catch (error) {
            console.log('[AUTH] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    validateUsername(username: string): string | null {
        if (!username || typeof username !== 'string') {
            return ErrorCode.INVALID_USERNAME;
        }

        if (username.length < 3 || username.length > 50) {
            return ErrorCode.INVALID_USERNAME;
        }

        // Allow lowercase letters, numbers, and hyphens
        if (!/^[a-z0-9-]+$/.test(username)) {
            return ErrorCode.INVALID_USERNAME;
        }

        return null;
    }

    validatePassword(password: string): string | null {
        if (!password || typeof password !== 'string') {
            return ErrorCode.INVALID_PASSWORD;
        }

        if (password.length < 8 || password.length > 128) {
            return ErrorCode.INVALID_PASSWORD;
        }

        return null;
    }

    extractTokenFromHeader(authHeader: string | null): string | null {
        if (!authHeader) return null;
        
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }
        
        return parts[1];
    }
}