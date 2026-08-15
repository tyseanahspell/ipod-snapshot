FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV CI=1
ENV EXPO_NO_TELEMETRY=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web --output-dir dist

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY scripts/media-server.mjs ./scripts/media-server.mjs
ENV NODE_ENV=production
ENV PORT=80
ENV STATIC_DIR=/app/dist
ENV MEDIA_ROOT=/media
EXPOSE 80
CMD ["node", "scripts/media-server.mjs"]
