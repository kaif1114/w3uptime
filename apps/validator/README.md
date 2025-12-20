# W3Uptime Validator CLI

A secure, decentralized validator CLI application for the W3Uptime monitoring network. This validator connects to the W3Uptime hub, receives website monitoring tasks, and submits cryptographically signed results to earn rewards.

## Features

###  Security-First Design
- **Import-Only Wallets**: Users import existing private keys from their own wallets (MetaMask, etc.)
- **Automatic Key Derivation**: Public keys are automatically derived from private keys
- **Encrypted Keystore**: Private keys stored using AES-128-CTR encryption with scrypt key derivation
- **Signed Messages**: All communications use cryptographic signatures with nonce/timestamp protection
- **Session Management**: Configurable session timeouts with secure memory cleanup
- **Paranoid Mode**: Optional mode requiring password for each signing operation

###  Robust Networking
- **Auto-Reconnection**: Automatic reconnection with exponential backoff
- **Message Queuing**: Queues messages during network interruptions
- **WebSocket Communication**: Real-time communication with the hub
- **Connection Monitoring**: Heartbeat/ping mechanism for connection health

### 📊 Advanced Monitoring
- **HTTP/HTTPS Support**: Monitor websites with various protocols
- **Latency Measurement**: High-precision latency tracking
- **Content Validation**: Optional content and regex matching
- **SSL Certificate Checks**: Validate SSL certificates (advanced mode)
- **Concurrent Monitoring**: Configurable concurrent request limits

### ⚙️ Configuration Management
- **JSON Configuration**: Human-readable configuration files
- **Environment Variables**: Support for environment-based configuration
- **CLI Configuration**: Modify settings via command line
- **Default Settings**: Sensible defaults for all settings

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Network access to W3Uptime hub

### Build from Source
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Install globally (optional)
npm link
```

## Quick Start

### 1. Initialize Validator
```bash
# Import existing private key and create configuration (public key derived automatically)
w3uptime-validator init --private-key <your-private-key> --wallet-name my-validator
```

### 2. Configure Hub Connection
```bash
# Set hub URL (if different from default)
w3uptime-validator config set hub.url ws://your-hub-url:8080
```

### 3. Start Validator
```bash
# Start with default wallet
w3uptime-validator start

# Or specify wallet
w3uptime-validator start --wallet my-validator

# Enable paranoid mode (password required for each signing)
w3uptime-validator start --paranoid
```

## Commands Reference

### `init` - Initialize Validator
Initialize validator configuration and import existing wallet.

```bash
w3uptime-validator init [options]

Options:
  -w, --wallet-name <name>  Name for the wallet
  -k, --private-key <key>   Private key to import (required)
  --hub-url <url>          Hub WebSocket URL (default: ws://localhost:8080)
```

### `start` - Start Validator
Start the validator daemon to begin monitoring websites.

```bash
w3uptime-validator start [options]

Options:
  -w, --wallet <name>      Wallet name to use
  -d, --daemon            Run as daemon (background process)
  --paranoid              Enable paranoid mode
```

### `status` - Show Status
Display validator status, configuration, and statistics.

```bash
w3uptime-validator status
```

### `wallet` - Wallet Management
Manage validator wallets.

```bash
# List all wallets
w3uptime-validator wallet list

# Import wallet from private key (public key derived automatically)
w3uptime-validator wallet import <name>
```

### `config` - Configuration Management
Manage validator configuration.

```bash
# Show current configuration
w3uptime-validator config show

# Set configuration value
w3uptime-validator config set <key> <value>

# Reset to defaults
w3uptime-validator config reset
```

## Configuration

### Configuration File Location
- **Linux/macOS**: `~/.w3uptime/validator-config.json`
- **Windows**: `%USERPROFILE%\.w3uptime\validator-config.json`

### Configuration Options

#### Hub Connection
```json
{
  "hub": {
    "url": "ws://localhost:8080",
    "reconnectInterval": 5000,
    "maxReconnectAttempts": 10,
    "pingInterval": 30000,
    "connectionTimeout": 10000
  }
}
```

#### Security Settings
```json
{
  "security": {
    "sessionTimeoutMinutes": 30,
    "keystoreDir": "~/.w3uptime/keystore",
    "paranoidMode": false,
    "secureMemory": true
  }
}
```

#### Monitoring Settings
```json
{
  "monitoring": {
    "defaultTimeout": 30000,
    "maxConcurrentRequests": 10,
    "retryAttempts": 2,
    "retryDelay": 1000,
    "userAgent": "W3Uptime-Validator/1.0"
  }
}
```

#### Logging Settings
```json
{
  "logging": {
    "level": "info",
    "maxFileSize": "10MB",
    "maxFiles": 5
  }
}
```

### Environment Variables

You can override configuration using environment variables:

```bash
export W3UPTIME_HUB_URL="ws://your-hub:8080"
export W3UPTIME_SESSION_TIMEOUT="60"
export W3UPTIME_PARANOID_MODE="true"
export W3UPTIME_LOG_LEVEL="debug"
export W3UPTIME_LOG_FILE="/var/log/w3uptime-validator.log"
```

## Security Considerations

### Private Key Management
- Users must provide their own existing private key from external wallets (e.g., MetaMask)
- Public key is automatically derived from the private key using elliptic curve cryptography
- Private keys are used locally for message signing, public keys are sent to hub for verification
- Private keys are encrypted using AES-128-CTR with scrypt key derivation  
- Keys are stored in the keystore directory with restrictive file permissions
- Memory containing private keys is cleared after session timeout
- Use strong passwords (minimum 8 characters recommended)

### Network Security
- All messages to the hub are cryptographically signed
- Nonce and timestamp prevent replay attacks
- SSL/TLS should be used for WebSocket connections in production

### Operational Security
- Run validator in a secure environment
- Use paranoid mode for maximum security (requires password for each signing)
- Regularly backup keystore files
- Monitor validator logs for suspicious activity

## Troubleshooting

### Common Issues

#### Connection Failed
```
Failed to connect to hub
```
- Check hub URL in configuration
- Verify network connectivity
- Ensure hub is running and accessible

#### Authentication Failed
```
Authentication failed: Invalid password
```
- Verify wallet password
- Check keystore file integrity
- Ensure wallet exists in keystore directory

#### Signature Verification Failed
```
Hub error: Invalid signature
```
- Check system clock synchronization
- Verify private key integrity
- Restart validator to refresh session

#### High Memory Usage
- Enable secure memory cleanup in configuration
- Reduce session timeout duration
- Use paranoid mode to minimize key exposure time

### Debug Mode
Enable debug logging for detailed troubleshooting:

```bash
w3uptime-validator config set logging.level debug
```

Or use environment variable:
```bash
W3UPTIME_LOG_LEVEL=debug w3uptime-validator start
```

## Development

### Project Structure
```
src/
├── cli/           # Command-line interface
├── config/        # Configuration management
├── crypto/        # Cryptographic functions (keystore, signing)
├── monitoring/    # Website monitoring engine
├── network/       # WebSocket client
└── services/      # Validator service orchestration
```

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
npm run fix  # Auto-fix issues
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/your-org/w3uptime/issues)
- Documentation: [W3Uptime Docs](https://docs.w3uptime.com)
- Community: [Discord/Telegram]