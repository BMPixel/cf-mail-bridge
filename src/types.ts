export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
}

export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at: string;
    last_access?: string;
}

export interface Message {
    id: number;
    user_id: number;
    message_id?: string;
    from_address: string;
    to_address: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
    raw_headers?: string;
    raw_size?: number;
    received_at: string;
}

export interface MessageResponse {
    id: number;
    message_id?: string;
    from: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
    received_at: string;
    size?: number;
}

export interface RegisterRequest {
    username: string;
    password: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterResponse {
    success: true;
    data: {
        username: string;
        email: string;
        token: string;
    };
}

export interface LoginResponse {
    success: true;
    data: {
        token: string;
        expires_at: string;
    };
}

export interface MessagesResponse {
    success: true;
    data: {
        messages: MessageResponse[];
        count: number;
        has_more: boolean;
    };
}

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

export type ApiResponse = RegisterResponse | LoginResponse | MessagesResponse | ErrorResponse;

export interface JWTPayload {
    sub: string; // username
    iat: number; // issued at
    exp: number; // expiration time
}

export interface EmailMessage {
    from: string;
    to: string;
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    size?: number;
}

export enum ErrorCode {
    INVALID_REQUEST = 'INVALID_REQUEST',
    INVALID_USERNAME = 'INVALID_USERNAME',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    USER_EXISTS = 'USER_EXISTS',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    UNAUTHORIZED = 'UNAUTHORIZED',
    NOT_FOUND = 'NOT_FOUND',
    RATE_LIMIT = 'RATE_LIMIT',
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}