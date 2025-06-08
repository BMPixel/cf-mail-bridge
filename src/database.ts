import { User, Message, MessageResponse, ErrorCode } from './types';

export class DatabaseService {
    constructor(private db: D1Database) {}

    async createUser(username: string, passwordHash: string): Promise<User | string> {
        try {
            const result = await this.db.prepare(`
                INSERT INTO users (username, password_hash)
                VALUES (?, ?)
                RETURNING id, username, password_hash, created_at, last_access
            `).bind(username, passwordHash).first<User>();

            if (!result) {
                return ErrorCode.INTERNAL_ERROR;
            }

            return result;
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return ErrorCode.USER_EXISTS;
            }
            return ErrorCode.INTERNAL_ERROR;
        }
    }

    async getUserByUsername(username: string): Promise<User | null> {
        try {
            const user = await this.db.prepare(`
                SELECT id, username, password_hash, created_at, last_access
                FROM users
                WHERE username = ?
            `).bind(username).first<User>();

            return user || null;
        } catch (error) {
            return null;
        }
    }

    async updateUserLastAccess(userId: number): Promise<boolean> {
        try {
            await this.db.prepare(`
                UPDATE users
                SET last_access = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(userId).run();

            return true;
        } catch (error) {
            return false;
        }
    }

    async createMessage(
        userId: number,
        messageId: string | null,
        fromAddress: string,
        toAddress: string,
        subject: string | null,
        bodyText: string | null,
        bodyHtml: string | null,
        rawHeaders: string | null,
        rawSize: number | null
    ): Promise<Message | null> {
        try {
            const result = await this.db.prepare(`
                INSERT INTO messages (
                    user_id, message_id, from_address, to_address,
                    subject, body_text, body_html, raw_headers, raw_size
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id, user_id, message_id, from_address, to_address,
                         subject, body_text, body_html, raw_headers, raw_size, received_at
            `).bind(
                userId, messageId, fromAddress, toAddress,
                subject, bodyText, bodyHtml, rawHeaders, rawSize
            ).first<Message>();

            return result || null;
        } catch (error) {
            console.error('Error creating message:', error);
            return null;
        }
    }

    async getMessagesByUserId(
        userId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ messages: MessageResponse[]; count: number; hasMore: boolean }> {
        try {
            console.log(`[DB] Fetching messages for user ${userId} (limit: ${limit}, offset: ${offset})`);
            // Get total count
            const countResult = await this.db.prepare(`
                SELECT COUNT(*) as count
                FROM messages
                WHERE user_id = ?
            `).bind(userId).first<{ count: number }>();

            const totalCount = countResult?.count || 0;
            console.log(`[DB] Total messages for user ${userId}: ${totalCount}`);

            // Get messages with pagination
            const messages = await this.db.prepare(`
                SELECT id, message_id, from_address as "from", subject,
                       body_text, body_html, received_at, raw_size as size
                FROM messages
                WHERE user_id = ?
                ORDER BY received_at DESC
                LIMIT ? OFFSET ?
            `).bind(userId, limit, offset).all<MessageResponse>();

            const hasMore = offset + limit < totalCount;

            return {
                messages: messages.results || [],
                count: totalCount,
                hasMore
            };
        } catch (error) {
            console.error(`[DB] Error fetching messages for user ${userId}:`, error);
            return {
                messages: [],
                count: 0,
                hasMore: false
            };
        }
    }

    async getMessageById(messageId: number, userId: number): Promise<MessageResponse | null> {
        try {
            const message = await this.db.prepare(`
                SELECT id, message_id, from_address as "from", subject,
                       body_text, body_html, received_at, raw_size as size
                FROM messages
                WHERE id = ? AND user_id = ?
            `).bind(messageId, userId).first<MessageResponse>();

            return message || null;
        } catch (error) {
            console.error('Error getting message by ID:', error);
            return null;
        }
    }

    async getUserByEmail(email: string): Promise<User | null> {
        // Extract username from email (part before @)
        const username = email.split('@')[0];
        return this.getUserByUsername(username);
    }

    async executeTransaction<T>(
        operations: (tx: D1Database) => Promise<T>
    ): Promise<T | null> {
        try {
            // D1 doesn't support explicit transactions yet, but we can use batch operations
            return await operations(this.db);
        } catch (error) {
            console.error('Transaction error:', error);
            return null;
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.db.prepare('SELECT 1').first();
            return true;
        } catch (error) {
            return false;
        }
    }
}