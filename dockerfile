# Use the official Bun image as base
FROM oven/bun:alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (if needed)
# RUN bun run build

# Expose port (if needed for web server)
# EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "src/index.ts"]
