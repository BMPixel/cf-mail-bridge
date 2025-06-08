import { 
    Env, 
    RegisterRequest, 
    LoginRequest, 
    ApiResponse, 
    ErrorCode, 
    RegisterResponse, 
    LoginResponse, 
    MessagesResponse, 
    ErrorResponse 
} from './types';
import { AuthService } from './auth';
import { DatabaseService } from './database';
import { EmailHandler } from './email-handler';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const startTime = Date.now();
        console.log(`[${method}] ${url.pathname} - Request started`);
        
        try {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method;

            // CORS headers for all responses
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };

            // Handle preflight requests
            if (method === 'OPTIONS') {
                return new Response(null, { headers: corsHeaders });
            }

            // Initialize services
            const authService = new AuthService(env.JWT_SECRET);
            const dbService = new DatabaseService(env.DB);
            const emailHandler = new EmailHandler(dbService);

            // Route handling
            if (path === '/' && method === 'GET') {
                return handleHomepage(corsHeaders);
            }

            if (path === '/register' && method === 'GET') {
                return handleRegisterPage(corsHeaders);
            }

            if (path === '/health' && method === 'GET') {
                return handleHealthCheck(dbService, corsHeaders);
            }

            // API routes
            if (path === '/api/v1/register' && method === 'POST') {
                return handleRegister(request, authService, dbService, corsHeaders);
            }

            if (path === '/api/v1/login' && method === 'POST') {
                return handleLogin(request, authService, dbService, corsHeaders);
            }

            if (path === '/api/v1/refresh' && method === 'POST') {
                return handleRefresh(request, authService, dbService, corsHeaders);
            }

            if (path === '/api/v1/messages' && method === 'GET') {
                return handleGetMessages(request, authService, dbService, corsHeaders);
            }

            if (path.startsWith('/api/v1/messages/') && method === 'GET') {
                const messageId = path.split('/').pop();
                return handleGetMessage(request, authService, dbService, messageId, corsHeaders);
            }

            // 404 for unmatched routes
            return createErrorResponse(ErrorCode.NOT_FOUND, 'Endpoint not found', 404, corsHeaders);

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[${method}] ${path} - Worker error (${duration}ms):`, error);
            return createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Internal server error', 500);
        } finally {
            const duration = Date.now() - startTime;
            console.log(`[${method}] ${path} - Request completed in ${duration}ms`);
        }
    },

    async email(message: any, env: Env, ctx: ExecutionContext): Promise<void> {
        const startTime = Date.now();
        console.log(`[EMAIL] Processing incoming email from: ${message.from} to: ${message.to}`);
        
        try {
            const dbService = new DatabaseService(env.DB);
            const emailHandler = new EmailHandler(dbService);
            
            await emailHandler.processCloudflareEmail(message);
            
            const duration = Date.now() - startTime;
            console.log(`[EMAIL] Email processed successfully in ${duration}ms`);
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[EMAIL] Email processing failed (${duration}ms):`, error);
        }
    }
};

async function handleHomepage(corsHeaders: Record<string, string>): Promise<Response> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Email Bridge Service</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #333; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .api-info { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Email Bridge Service</h1>
        <p>Welcome to the Email Bridge API service. This service provides email message queuing functionality.</p>
        
        <div class="api-info">
            <h3>Available Endpoints:</h3>
            <ul>
                <li><strong>POST /api/v1/register</strong> - Register a new user</li>
                <li><strong>POST /api/v1/login</strong> - User login</li>
                <li><strong>GET /api/v1/messages</strong> - Get message list (requires auth)</li>
                <li><strong>GET /health</strong> - Health check</li>
            </ul>
        </div>
        
        <p><a href="/register">Register for an account</a></p>
    </div>
</body>
</html>`;

    return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
}

async function handleRegisterPage(corsHeaders: Record<string, string>): Promise<Response> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Register - Email Bridge</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 400px; margin: 0 auto; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0052a3; }
        .message { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Register</h1>
        <form id="registerForm">
            <div class="form-group">
                <label for="username">Username (3-50 characters, letters/numbers/hyphens only):</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password (8-128 characters):</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Register</button>
        </form>
        <div id="message"></div>
        <p><a href="/">Back to home</a></p>
    </div>
    
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            try {
                const response = await fetch('/api/v1/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    messageDiv.innerHTML = '<div class="message success">Registration successful! Your email is: ' + data.data.email + '</div>';
                    document.getElementById('registerForm').reset();
                } else {
                    messageDiv.innerHTML = '<div class="message error">Error: ' + data.error.message + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="message error">Network error occurred</div>';
            }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
}

async function handleHealthCheck(
    dbService: DatabaseService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const isHealthy = await dbService.healthCheck();
    const status = isHealthy ? 200 : 503;
    
    return new Response(JSON.stringify({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
    }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function handleRegister(
    request: Request,
    authService: AuthService,
    dbService: DatabaseService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body: RegisterRequest = await request.json();
        
        // Validate input
        const usernameError = authService.validateUsername(body.username);
        if (usernameError) {
            return createErrorResponse(usernameError, 'Invalid username format', 400, corsHeaders);
        }
        
        const passwordError = authService.validatePassword(body.password);
        if (passwordError) {
            return createErrorResponse(passwordError, 'Invalid password format', 400, corsHeaders);
        }
        
        // Hash password
        const passwordHash = await authService.hashPassword(body.password);
        
        // Create user
        console.log(`[REGISTER] Creating user: ${body.username}`);
        const result = await dbService.createUser(body.username, passwordHash);
        if (typeof result === 'string') {
            console.log(`[REGISTER] User creation failed: ${result}`);
            const message = result === ErrorCode.USER_EXISTS ? 'Username already exists' : 'Registration failed';
            return createErrorResponse(result, message, 400, corsHeaders);
        }
        
        console.log(`[REGISTER] User created successfully: ${body.username}`);
        
        // Generate token
        const token = await authService.generateToken(body.username);
        
        const response: RegisterResponse = {
            success: true,
            data: {
                username: body.username,
                email: `${body.username}@agent.tai.chat`,
                token
            }
        };
        
        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return createErrorResponse(ErrorCode.INVALID_REQUEST, 'Invalid request format', 400, corsHeaders);
    }
}

async function handleLogin(
    request: Request,
    authService: AuthService,
    dbService: DatabaseService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body: LoginRequest = await request.json();
        
        // Find user
        console.log(`[LOGIN] Login attempt for user: ${body.username}`);
        const user = await dbService.getUserByUsername(body.username);
        if (!user) {
            console.log(`[LOGIN] User not found: ${body.username}`);
            return createErrorResponse(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401, corsHeaders);
        }
        
        // Verify password
        const isValidPassword = await authService.verifyPassword(body.password, user.password_hash);
        if (!isValidPassword) {
            console.log(`[LOGIN] Invalid password for user: ${body.username}`);
            return createErrorResponse(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401, corsHeaders);
        }
        
        console.log(`[LOGIN] Login successful for user: ${body.username}`);
        
        // Update last access
        await dbService.updateUserLastAccess(user.id);
        
        // Generate token
        const token = await authService.generateToken(body.username);
        
        const response: LoginResponse = {
            success: true,
            data: {
                token,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        };
        
        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return createErrorResponse(ErrorCode.INVALID_REQUEST, 'Invalid request format', 400, corsHeaders);
    }
}

async function handleRefresh(
    request: Request,
    authService: AuthService,
    dbService: DatabaseService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authService.extractTokenFromHeader(authHeader);
        
        if (!token) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Missing or invalid token', 401, corsHeaders);
        }
        
        const payload = await authService.verifyToken(token);
        if (!payload) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Invalid token', 401, corsHeaders);
        }
        
        // Generate new token
        const newToken = await authService.generateToken(payload.sub);
        
        const response: LoginResponse = {
            success: true,
            data: {
                token: newToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        };
        
        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Token refresh failed', 500, corsHeaders);
    }
}

async function handleGetMessages(
    request: Request,
    authService: AuthService,
    dbService: DatabaseService,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authService.extractTokenFromHeader(authHeader);
        
        if (!token) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Missing or invalid token', 401, corsHeaders);
        }
        
        const payload = await authService.verifyToken(token);
        if (!payload) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Invalid token', 401, corsHeaders);
        }
        
        // Get user
        const user = await dbService.getUserByUsername(payload.sub);
        if (!user) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'User not found', 401, corsHeaders);
        }
        
        // Parse query parameters
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        // Get messages
        const result = await dbService.getMessagesByUserId(user.id, limit, offset);
        
        const response: MessagesResponse = {
            success: true,
            data: {
                messages: result.messages,
                count: result.count,
                has_more: result.hasMore
            }
        };
        
        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to retrieve messages', 500, corsHeaders);
    }
}

async function handleGetMessage(
    request: Request,
    authService: AuthService,
    dbService: DatabaseService,
    messageId: string | undefined,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        if (!messageId || isNaN(parseInt(messageId))) {
            return createErrorResponse(ErrorCode.INVALID_REQUEST, 'Invalid message ID', 400, corsHeaders);
        }
        
        const authHeader = request.headers.get('Authorization');
        const token = authService.extractTokenFromHeader(authHeader);
        
        if (!token) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Missing or invalid token', 401, corsHeaders);
        }
        
        const payload = await authService.verifyToken(token);
        if (!payload) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'Invalid token', 401, corsHeaders);
        }
        
        // Get user
        const user = await dbService.getUserByUsername(payload.sub);
        if (!user) {
            return createErrorResponse(ErrorCode.UNAUTHORIZED, 'User not found', 401, corsHeaders);
        }
        
        // Get message
        const message = await dbService.getMessageById(parseInt(messageId), user.id);
        if (!message) {
            return createErrorResponse(ErrorCode.NOT_FOUND, 'Message not found', 404, corsHeaders);
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to retrieve message', 500, corsHeaders);
    }
}

function createErrorResponse(
    code: string,
    message: string,
    status: number,
    corsHeaders: Record<string, string> = {}
): Response {
    const errorResponse: ErrorResponse = {
        success: false,
        error: { code, message }
    };
    
    return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}