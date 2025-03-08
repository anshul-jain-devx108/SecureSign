# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Set environment variable for Cloud Run
ENV PORT=8080

# Expose the port Cloud Run expects
EXPOSE 8080

# Command to start the server
CMD ["node", "server.js"]
