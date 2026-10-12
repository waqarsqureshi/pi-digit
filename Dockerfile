# Use the official Node.js 22 slim image as the base
FROM node:22-slim

# Install Python 3 to satisfy the application's daemon process dependency
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build production frontend assets (creates dist/ for production serving)
RUN npm run build

# Expose the port defined by Cloud Run (default is 3000)
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Run the startup script
CMD ["npm", "start"]
