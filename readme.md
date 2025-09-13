[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/nfishel48-conduit-badge.png)](https://mseep.ai/app/nfishel48-conduit)

# Conduit 🌉

**Unchain your GraphQL API for Large Language Models.**

Conduit is a lightweight, automated bridge that exposes any GraphQL API as a set of tools consumable by Large Language Models (LLMs) via the Model Context Protocol (MCP).

It's a "set-it-and-forget-it" microservice. Simply point it at your GraphQL endpoint, and it handles the rest. Whenever you update your API, Conduit automatically discovers the new queries and mutations and exposes them to your AI agents with zero maintenance required.

### ✨ Features

* **Zero-Maintenance:** Automatically discovers your API's capabilities using introspection. No manual tool definition is needed.
* **Protocol Compliant:** Implements the core MCP endpoints (`/listTools`, `/getToolSchema`, `/executeTool`) out of the box.
* **Dynamic Execution:** Translates LLM tool calls into valid GraphQL queries/mutations and executes them against your API.
* **Smart Port Management:** Automatically detects port conflicts and finds available alternatives with detailed error reporting.
* **WebSocket Support:** Optional WebSocket server for real-time MCP communication alongside HTTP transport.
* **Enhanced Logging:** Comprehensive logging system with configurable levels and formatted output for better debugging.
* **Container-Ready:** Comes with a `Dockerfile` and Kubernetes manifests for easy deployment alongside your existing services.
* **Lightweight & Fast:** Built with Express.js for a minimal footprint and reliable performance.

### 🏗️ Architecture

The Conduit bridge is a stateless microservice that sits between your LLM client and your GraphQL API.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Yarn or npm
- A GraphQL API endpoint

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd conduit
   yarn install
   ```

2. **Configure your environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start the development server:**
   ```bash
   yarn dev
   ```

The server will automatically:
- Check for port availability
- Find alternative ports if needed
- Set up HTTP and optionally WebSocket servers
- Provide detailed startup information

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Basic Configuration
PORT=5173                              # HTTP server port
GRAPHQL_API_URL=http://localhost:4000/graphql  # Your GraphQL API
API_AUTH_TOKEN=your-token-here         # Optional API authentication

# WebSocket Configuration  
ENABLE_WEBSOCKET=true                  # Enable WebSocket MCP transport
WS_PORT=5174                          # WebSocket server port (auto if not set)

# Port Management
PORT_MAX_ATTEMPTS=10                   # Max attempts to find available port
PORT_RANGE=100                        # Range of ports to search
SKIP_PORT_CHECK=false                 # Skip automatic port checking

# Logging
LOG_LEVEL=info                        # error, warn, info, debug
LOG_TIMESTAMP=true                    # Include timestamps
LOG_COLORS=true                       # Colored output
```

### Port Management Features

Conduit includes intelligent port management to handle the common "Port is already in use" error:

- **Automatic Detection:** Checks if preferred ports are available before starting
- **Smart Alternatives:** Automatically finds alternative ports within a configurable range
- **Process Information:** Shows which processes are using conflicting ports
- **Detailed Logging:** Provides clear error messages and troubleshooting suggestions

#### Handling Port Conflicts

When a port conflict occurs, Conduit will:

1. **Check the preferred port** (from `PORT` environment variable)
2. **Show conflicting processes** with PID information
3. **Search for alternatives** in the specified range
4. **Provide helpful suggestions:**
   ```
   💡 Suggestions:
      1. Kill the process using: kill -9 <PID>
      2. Use a different port with: PORT=<new_port> npm run dev
      3. Set environment variable: export PORT=<new_port>
   ```

## 🔌 WebSocket Support

Conduit supports both HTTP and WebSocket transports for MCP communication:

### Enabling WebSocket

```bash
# In your .env file
ENABLE_WEBSOCKET=true
WS_PORT=5174  # Optional: specify port, otherwise auto-assigned
```

### WebSocket Features

- **Automatic Port Management:** Finds available ports for WebSocket server
- **Real-time Communication:** Persistent connections for better performance
- **Full MCP Protocol Support:** All MCP methods work over WebSocket
- **Connection Monitoring:** Detailed logging of client connections and disconnections
- **Error Handling:** Graceful handling of connection issues

### Usage Examples

**HTTP Transport:**
```bash
curl -X POST http://localhost:5173/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

**WebSocket Transport:**
```javascript
const ws = new WebSocket('ws://localhost:5174');
ws.send(JSON.stringify({
  "jsonrpc": "2.0", 
  "id": 1, 
  "method": "tools/list"
}));
```

## 📊 Enhanced Logging

Conduit provides comprehensive logging with multiple levels and formatted output:

### Log Levels

- **ERROR:** Critical errors and failures
- **WARN:** Warnings and non-critical issues  
- **INFO:** General information and status updates
- **DEBUG:** Detailed debugging information

### Log Categories

Each log entry is categorized for easy filtering:

- `[SERVER]` - HTTP server events
- `[WS]` - WebSocket server events  
- `[MCP]` - MCP protocol messages
- `[PORT]` - Port management operations

### Example Output

```
[2024-01-15T10:30:45.123Z] [INFO] [server] 🚀 Starting Conduit server...
[2024-01-15T10:30:45.125Z] [INFO] [port] 🔍 Checking port availability starting from 5173...
[2024-01-15T10:30:45.127Z] [SUCCESS] [port] ✅ Port 5173 is available
[2024-01-15T10:30:45.130Z] [SUCCESS] [server] ✅ Server started successfully!
[2024-01-15T10:30:45.131Z] [INFO] [server] 🌐 Local:    http://localhost:5173
[2024-01-15T10:30:45.132Z] [INFO] [server] 📡 MCP endpoint: http://localhost:5173/mcp
[2024-01-15T10:30:45.135Z] [SUCCESS] [ws] ✅ WebSocket server started on port 5174
[2024-01-15T10:30:45.136Z] [INFO] [ws] 🔌 WebSocket endpoint: ws://localhost:5174
```

## 🔧 Troubleshooting

### Common Issues

#### "WebSocket server error: Port is already in use"

This error occurs when the WebSocket server cannot bind to its configured port.

**Solutions:**

1. **Check what's using the port:**
   ```bash
   # The server will automatically show this information
   lsof -i :5174  # macOS/Linux
   netstat -ano | findstr :5174  # Windows
   ```

2. **Use a different port:**
   ```bash
   WS_PORT=5175 npm run dev
   ```

3. **Let Conduit auto-assign a port:**
   ```bash
   # Remove WS_PORT from .env or set it to empty
   ENABLE_WEBSOCKET=true
   # WS_PORT=  # Auto-assigned
   ```

4. **Disable WebSocket if not needed:**
   ```bash
   ENABLE_WEBSOCKET=false
   ```

#### "GraphQL API not responding"

**Check your configuration:**
```bash
# Verify your GraphQL endpoint is accessible
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

#### Enable debug logging for detailed information:
```bash
LOG_LEVEL=debug npm run dev
```

### Port Conflict Prevention

To avoid port conflicts:

1. **Use non-standard ports:** Start with ports like 8000+ instead of common ones
2. **Check running services:** Use `lsof -i` or `netstat` to see what's running
3. **Use port ranges:** Configure `PORT_RANGE` to search a wider range
4. **Environment-specific ports:** Use different ports per environment

## 🚦 Server Status Information

When Conduit starts successfully, you'll see:

```
📋 Configuration Summary:
   HTTP Server: localhost:5173
   WebSocket Server: localhost:5174
   GraphQL API: http://localhost:4000/graphql
   Log Level: info
   Environment: development

🌐 Server Access Information:
   Local HTTP:    http://localhost:5173
   MCP Endpoint:  http://localhost:5173/mcp
   WebSocket:     ws://localhost:5174
   GraphQL API:   http://localhost:4000/graphql

🛑 Press Ctrl+C to stop the server
```
