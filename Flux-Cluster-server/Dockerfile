FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests first to leverage Docker cache
COPY package*.json ./

# Install dependencies (including nodemon for live reloading)
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the WebSocket port
EXPOSE 8080

# Run the app using your package.json start script
CMD ["npm", "start"]