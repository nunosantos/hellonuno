# Build stage
FROM node:25-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

# Build the app
RUN npm run build

# Production stage with nginx-unprivileged (designed for non-root)
FROM docker.io/nginxinc/nginx-unprivileged:alpine AS runtime

# Copy custom nginx config (nginx-unprivileged uses /etc/nginx/conf.d/)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
