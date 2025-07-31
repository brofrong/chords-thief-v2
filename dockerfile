# Use the official Bun image as base
FROM oven/bun:alpine

# Install git and GitHub CLI
RUN apk add --no-cache git github-cli


# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "./src/index.ts"]
