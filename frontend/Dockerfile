# Use Node.js 18 as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose port 5173 (default Vite dev server port)
EXPOSE 5173

# Start the development server
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"] 