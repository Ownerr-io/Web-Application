FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY lib/integrations-core ./lib/integrations-core
COPY lib/integrations-sync ./lib/integrations-sync
COPY artifacts/sync-worker ./artifacts/sync-worker

RUN npm install --workspace=@workspace/sync-worker --workspace=@workspace/integrations-sync --workspace=@workspace/integrations-core

ENV NODE_ENV=production
ENV SYNC_WORKER_HTTP=1
ENV SYNC_WORKER_HTTP_PORT=8787

EXPOSE 8787

CMD ["npm", "run", "start:http", "--workspace=@workspace/sync-worker"]
