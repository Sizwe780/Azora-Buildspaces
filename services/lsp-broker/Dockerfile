FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip curl && \
    pip3 install --break-system-packages python-lsp-server

RUN npm install -g typescript-language-server typescript

WORKDIR /app

COPY services/lsp-broker/index.ts ./
COPY tsconfig.json ./

RUN npm install -g ts-node ws @types/ws

EXPOSE 3001

CMD ["ts-node", "--esm", "index.ts"]
