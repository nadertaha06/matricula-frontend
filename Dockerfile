FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
RUN npm run build
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
