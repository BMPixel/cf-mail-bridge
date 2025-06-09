export class TestDatabase {
  private db: D1Database;

  constructor() {
    this.db = (globalThis as any).testEnv?.DB;
    if (!this.db) {
      throw new Error('D1 Database not available in test environment');
    }
  }

  // User operations
  async createUser(username: string, passwordHash: string): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO users (username, password_hash) 
      VALUES (?, ?)
      RETURNING id
    `).bind(username, passwordHash).first<{ id: number }>();
    
    if (!result) {
      throw new Error('Failed to create user');
    }
    return result.id;
  }

  async getUser(username: string) {
    return await this.db.prepare('SELECT * FROM users WHERE username = ?')
      .bind(username).first();
  }

  async getUserById(id: number) {
    return await this.db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(id).first();
  }

  // Message operations
  async createMessage(userId: number, messageData: any): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO messages (
        user_id, from_address, to_address, subject, 
        body_text, body_html, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, FALSE)
      RETURNING id
    `).bind(
      userId,
      messageData.from,
      messageData.to,
      messageData.subject,
      messageData.text,
      messageData.html
    ).first<{ id: number }>();
    
    if (!result) {
      throw new Error('Failed to create message');
    }
    return result.id;
  }

  async getMessage(id: number) {
    return await this.db.prepare('SELECT * FROM messages WHERE id = ?')
      .bind(id).first();
  }

  async getMessagesByUser(userId: number, limit = 50, offset = 0) {
    const result = await this.db.prepare(`
      SELECT * FROM messages 
      WHERE user_id = ? 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();
    
    return result.results || [];
  }

  // Cleanup operations
  async clearUsers() {
    await this.db.exec('DELETE FROM users');
  }

  async clearMessages() {
    await this.db.exec('DELETE FROM messages');
  }

  async clearAll() {
    await this.clearMessages();
    await this.clearUsers();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.prepare('SELECT 1').first();
      return true;
    } catch (error) {
      return false;
    }
  }
}