# Docker Setup for Missing Data Tool

This project is now containerized using Docker and Docker Compose for easy development and deployment.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Build and run both services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## Individual Service Commands

### Frontend Only
```bash
# Build frontend image
docker build -t missing-data-frontend ./frontend

# Run frontend container
docker run -p 5173:5173 -v $(pwd)/frontend:/app missing-data-frontend
```

### Backend Only
```bash
# Build backend image
docker build -t missing-data-backend ./backend

# Run backend container
docker run -p 8000:8000 -v $(pwd)/backend:/app missing-data-backend
```

## Development Workflow

The docker-compose setup includes volume mounts for both services, so you can make changes to your code and see them reflected immediately:

- Frontend changes will trigger hot reload
- Backend changes will trigger auto-reload (thanks to uvicorn's reload=True)

## Useful Commands

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build

# Clean up
docker-compose down -v
docker system prune -f
```

## Troubleshooting

- If you encounter permission issues on Windows, ensure Docker Desktop has access to your project directory
- If the frontend can't connect to the backend, check that the proxy configuration in vite.config.ts matches the backend service name
- For port conflicts, you can modify the port mappings in docker-compose.yml 