# syntax=docker/dockerfile:1

FROM node:22.23.2-bookworm-slim AS build

ARG VITE_API_ORIGIN
ARG VITE_SITE_ORIGIN
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}
ENV VITE_SITE_ORIGIN=${VITE_SITE_ORIGIN}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build \
    && npm cache clean --force

FROM nginxinc/nginx-unprivileged:1.28.0-alpine AS runtime

USER root
RUN apk upgrade --no-cache

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:8080/container-health"]

CMD ["nginx", "-g", "daemon off;"]
