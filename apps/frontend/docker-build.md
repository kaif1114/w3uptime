# Building the Frontend Docker Image

## Quick Start

From the **root directory** of the turborepo, run:

```bash
# Build the image
docker build -f apps/frontend/dockerfile -t w3uptime-frontend .

# Run the container
docker run -p 3000:3000 w3uptime-frontend
```

## Build Commands

### Development Build
```bash
# Build with build args for development
docker build -f apps/frontend/dockerfile -t w3uptime-frontend:dev .
```

### Production Build
```bash
# Build for production (default)
docker build -f apps/frontend/dockerfile -t w3uptime-frontend:latest .
```

### With Environment Variables
```bash
# Build with environment variables
docker build -f apps/frontend/dockerfile \
  --build-arg NODE_ENV=production \
  -t w3uptime-frontend:latest .
```

## Running the Container

### Basic Run
```bash
docker run -p 3000:3000 w3uptime-frontend
```

### With Environment Variables
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NEXTAUTH_SECRET="your-secret" \
  w3uptime-frontend
```

### With Volume Mounting (for development)
```bash
docker run -p 3000:3000 \
  -v $(pwd)/apps/frontend:/app/apps/frontend \
  w3uptime-frontend
```

## Docker Compose Integration

Add this service to your `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: apps/frontend/dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - timescaledb
    networks:
      - app-network
```

## Troubleshooting

### Build Issues
- Make sure you're running the build command from the **root directory**, not from `apps/frontend/`
- Ensure all package.json files are present in workspace packages
- Check that the Prisma schema exists at `packages/db/prisma/schema.prisma`

### Runtime Issues
- Verify environment variables are set correctly
- Check that the database is accessible from the container
- Ensure ports are not conflicting with other services

### Performance
- The image uses multi-stage builds for optimal size
- Dependencies are cached in separate layers for faster rebuilds
- Only production dependencies are included in the final image
