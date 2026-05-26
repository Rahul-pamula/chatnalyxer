FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build for web
RUN npx expo export --platform web

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run uses PORT env variable
ENV PORT=8080
EXPOSE 8080

# Update nginx to use PORT from env
CMD sed -i "s/listen 8080/listen $PORT/g" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
