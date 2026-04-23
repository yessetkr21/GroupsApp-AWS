FROM node:20-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src/ ./src/
# Copy proto definition
COPY proto/ ./proto/

RUN mkdir -p /app/logs && chown node:node /app/logs

USER node

EXPOSE 50051

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
