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
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        
        console.log(`[${method}] ${url.pathname} - Request started`);
        
        try {

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
            const emailHandler = new EmailHandler(dbService, env);

            // Route handling
            if (path === '/' && method === 'GET') {
                return handleHomepage(corsHeaders);
            }

            if (path === '/register' && method === 'GET') {
                return handleRegisterPage(corsHeaders);
            }

            if (path === '/login.html' && method === 'GET') {
                return new Response(null, {
                    status: 301,
                    headers: { ...corsHeaders, 'Location': '/login' }
                });
            }

            if (path === '/login' && method === 'GET') {
                return handleLoginPage(corsHeaders);
            }

            if (path === '/messages.html' && method === 'GET') {
                return new Response(null, {
                    status: 301,
                    headers: { ...corsHeaders, 'Location': '/messages' }
                });
            }

            if (path === '/messages' && method === 'GET') {
                return handleMessagesPage(corsHeaders);
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

            if (path === '/api/v1/send-test-email' && method === 'POST') {
                return handleSendTestEmail(request, emailHandler, corsHeaders);
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
            const emailHandler = new EmailHandler(dbService, env);
            
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
        
        <p><a href="/register">Register for an account</a> | <a href="/login">Login</a></p>
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
        <p><a href="/">Back to home</a> | <a href="/login">Login</a></p>
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

async function handleLoginPage(corsHeaders: Record<string, string>): Promise<Response> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Email Bridge</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }

        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
            font-size: 28px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            transition: border-color 0.3s;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #0066cc;
        }

        button {
            width: 100%;
            padding: 12px;
            background-color: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        button:hover {
            background-color: #0052a3;
        }

        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }

        .message {
            margin-top: 20px;
            padding: 12px;
            border-radius: 4px;
            text-align: center;
            display: none;
        }

        .message.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }

        .message.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }

        .links {
            margin-top: 20px;
            text-align: center;
        }

        .links a {
            color: #0066cc;
            text-decoration: none;
            margin: 0 10px;
        }

        .links a:hover {
            text-decoration: underline;
        }

        .spinner {
            display: none;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0066cc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>Login</h1>
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autofocus>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" id="submitBtn">Login</button>
        </form>
        <div id="message" class="message"></div>
        <div class="spinner" id="spinner"></div>
        <div class="links">
            <a href="/register">Register</a>
            <a href="/">Home</a>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            const submitBtn = document.getElementById('submitBtn');
            const spinner = document.getElementById('spinner');
            
            // Reset message
            messageDiv.className = 'message';
            messageDiv.textContent = '';
            messageDiv.style.display = 'none';
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            spinner.style.display = 'block';
            
            try {
                const response = await fetch('/api/v1/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Store token
                    localStorage.setItem('authToken', data.data.token);
                    localStorage.setItem('username', username);
                    
                    messageDiv.className = 'message success';
                    messageDiv.textContent = 'Login successful! Redirecting...';
                    messageDiv.style.display = 'block';
                    
                    // Redirect to messages page
                    setTimeout(() => {
                        window.location.href = '/messages';
                    }, 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.error.message || 'Login failed';
                    messageDiv.style.display = 'block';
                }
            } catch (error) {
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Network error. Please try again.';
                messageDiv.style.display = 'block';
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                spinner.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;
    
    return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
}

async function handleMessagesPage(corsHeaders: Record<string, string>): Promise<Response> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Messages - Email Bridge</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }

        .header {
            background-color: white;
            border-bottom: 1px solid #e0e0e0;
            padding: 20px;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            color: #333;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .username {
            color: #666;
            font-weight: 500;
        }

        .logout-btn {
            padding: 8px 16px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }

        .logout-btn:hover {
            background-color: #c82333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .messages-container {
            display: flex;
            gap: 20px;
            height: calc(100vh - 120px);
        }

        .messages-list {
            flex: 1;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .list-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background-color: #f8f9fa;
        }

        .refresh-btn {
            padding: 8px 16px;
            background-color: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }

        .refresh-btn:hover {
            background-color: #0052a3;
        }

        .refresh-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }

        .messages-content {
            flex: 1;
            overflow-y: auto;
        }

        .message-item {
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .message-item:hover {
            background-color: #f8f9fa;
        }

        .message-item.selected {
            background-color: #e3f2fd;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .message-from {
            font-weight: 600;
            color: #333;
            flex: 1;
            margin-right: 10px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .message-date {
            color: #666;
            font-size: 14px;
            white-space: nowrap;
        }

        .message-subject {
            color: #555;
            font-weight: 500;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .message-preview {
            color: #666;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .message-detail {
            flex: 2;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
            overflow-y: auto;
        }

        .detail-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            font-size: 18px;
        }

        .detail-header {
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .detail-subject {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }

        .detail-meta {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }

        .detail-body {
            line-height: 1.6;
            color: #333;
        }

        .detail-body pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }

        .error {
            text-align: center;
            padding: 20px;
            color: #dc3545;
        }

        .no-messages {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0066cc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .messages-container {
                flex-direction: column;
            }
            
            .message-detail {
                display: none;
            }
            
            .message-detail.mobile-visible {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 200;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>Email Messages</h1>
            <div class="user-info">
                <span class="username" id="username"></span>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="messages-container">
            <div class="messages-list">
                <div class="list-header">
                    <button class="refresh-btn" id="refreshBtn" onclick="loadMessages()">
                        <span id="refreshText">Refresh</span>
                    </button>
                </div>
                <div class="messages-content" id="messagesList">
                    <div class="loading">Loading messages...</div>
                </div>
            </div>
            
            <div class="message-detail" id="messageDetail">
                <div class="detail-placeholder">Select a message to view</div>
            </div>
        </div>
    </div>

    <script>
        let currentMessages = [];
        let selectedMessageId = null;
        let authToken = localStorage.getItem('authToken');
        let username = localStorage.getItem('username');

        // Check authentication
        if (!authToken) {
            window.location.href = '/login';
        }

        // Display username
        document.getElementById('username').textContent = username || 'User';

        // Load messages on page load
        window.addEventListener('DOMContentLoaded', () => {
            loadMessages();
        });

        async function loadMessages() {
            const refreshBtn = document.getElementById('refreshBtn');
            const refreshText = document.getElementById('refreshText');
            const messagesList = document.getElementById('messagesList');
            
            refreshBtn.disabled = true;
            refreshText.innerHTML = '<span class="spinner"></span>Loading...';
            
            try {
                const response = await fetch('/api/v1/messages', {
                    headers: {
                        'Authorization': \`Bearer \${authToken}\`
                    }
                });
                
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('username');
                    window.location.href = '/login';
                    return;
                }
                
                const data = await response.json();
                
                if (data.success) {
                    currentMessages = data.data.messages;
                    displayMessages();
                } else {
                    messagesList.innerHTML = \`<div class="error">Error: \${data.error.message}</div>\`;
                }
            } catch (error) {
                messagesList.innerHTML = '<div class="error">Failed to load messages. Please try again.</div>';
            } finally {
                refreshBtn.disabled = false;
                refreshText.textContent = 'Refresh';
            }
        }

        function displayMessages() {
            const messagesList = document.getElementById('messagesList');
            
            if (currentMessages.length === 0) {
                messagesList.innerHTML = '<div class="no-messages">No messages yet</div>';
                return;
            }
            
            messagesList.innerHTML = currentMessages.map(msg => \`
                <div class="message-item" onclick="selectMessage(\${msg.id})" data-id="\${msg.id}">
                    <div class="message-header">
                        <div class="message-from">\${escapeHtml(msg.from)}</div>
                        <div class="message-date">\${formatDate(msg.received_at)}</div>
                    </div>
                    <div class="message-subject">\${escapeHtml(msg.subject || '(No subject)')}</div>
                    <div class="message-preview">\${escapeHtml(getPreview(msg.body_text))}</div>
                </div>
            \`).join('');
        }

        function selectMessage(messageId) {
            // Update selected state
            document.querySelectorAll('.message-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.id === messageId.toString());
            });
            
            selectedMessageId = messageId;
            const message = currentMessages.find(m => m.id === messageId);
            
            if (message) {
                displayMessageDetail(message);
            }
        }

        function displayMessageDetail(message) {
            const messageDetail = document.getElementById('messageDetail');
            
            const bodyContent = message.body_html || 
                               (message.body_text ? \`<pre>\${escapeHtml(message.body_text)}</pre>\` : 
                               '<p>No content available</p>');
            
            messageDetail.innerHTML = \`
                <div class="detail-header">
                    <div class="detail-subject">\${escapeHtml(message.subject || '(No subject)')}</div>
                    <div class="detail-meta">
                        <div><strong>From:</strong> \${escapeHtml(message.from)}</div>
                        <div><strong>Date:</strong> \${formatDateTime(message.received_at)}</div>
                        \${message.size ? \`<div><strong>Size:</strong> \${formatSize(message.size)}</div>\` : ''}
                    </div>
                </div>
                <div class="detail-body">
                    \${message.body_html ? message.body_html : bodyContent}
                </div>
            \`;
        }

        function logout() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = '/login';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays < 7) {
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            } else {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        }

        function formatDateTime(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function formatSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }

        function getPreview(text) {
            if (!text) return '';
            return text.substring(0, 100).replace(/\\n/g, ' ');
        }
    </script>
</body>
</html>`;
    
    return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
}

async function handleSendTestEmail(
    request: Request,
    emailHandler: any,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const body = await request.json();
        const { to, subject, message, html } = body;
        
        if (!to) {
            return createErrorResponse(ErrorCode.INVALID_REQUEST, 'Email address is required', 400, corsHeaders);
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return createErrorResponse(ErrorCode.INVALID_REQUEST, 'Invalid email format', 400, corsHeaders);
        }
        
        console.log(`[SEND_EMAIL] Sending test email to: ${to}`);
        
        const emailOptions = {
            from: 'noreply@agent.tai.chat',
            to: to,
            subject: subject || 'Test Email from CF Mail Bridge',
            text: message || 'This is a test email sent from the Cloudflare Mail Bridge service using Resend.',
            html: html || createTestEmailHTML(),
            tags: [{ name: 'type', value: 'test' }]
        };
        
        const result = await emailHandler.sendEmail(emailOptions);
        
        if (result.success) {
            console.log(`[SEND_EMAIL] Email sent successfully to ${to}, ID: ${result.messageId}`);
            return new Response(JSON.stringify({
                success: true,
                data: {
                    messageId: result.messageId,
                    to: to,
                    subject: emailOptions.subject,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            console.error(`[SEND_EMAIL] Failed to send email to ${to}:`, result.error);
            return createErrorResponse(ErrorCode.INTERNAL_ERROR, result.error || 'Failed to send email', 500, corsHeaders);
        }
        
    } catch (error) {
        console.error('[SEND_EMAIL] Error processing request:', error);
        return createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to process email request', 500, corsHeaders);
    }
}

function createTestEmailHTML(): string {
    const timestamp = new Date().toISOString();
    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">🎉 Test Email Success!</h2>
    <p>This is a test email sent from the <strong>Cloudflare Mail Bridge</strong> service using <strong>Resend</strong>.</p>
    <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Service Information:</h3>
        <ul>
            <li><strong>Service:</strong> CF Mail Bridge</li>
            <li><strong>Email Provider:</strong> Resend</li>
            <li><strong>Domain:</strong> agent.tai.chat</li>
            <li><strong>Timestamp:</strong> ${timestamp}</li>
        </ul>
    </div>
    <p>If you received this email, the Resend integration is working correctly! 🚀</p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 12px;">
        This email was sent via the CF Mail Bridge service for testing purposes.
    </p>
</div>`;
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