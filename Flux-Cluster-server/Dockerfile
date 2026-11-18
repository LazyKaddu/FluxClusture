FROM node:20-alpine
WORKDIR /app

# Install dependencies (production only for lean container size)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose server port (8080 default)
EXPOSE 8080

CMD ["node", "src/main.js"]
