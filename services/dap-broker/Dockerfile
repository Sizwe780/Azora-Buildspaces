FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip curl && \
    pip3 install --break-system-packages debugpy

RUN npm install -g @vscode/debugadapter ts-node typescript

WORKDIR /app

COPY services/dap-broker/index.ts ./
COPY tsconfig.json ./

EXPOSE 3002

CMD ["ts-node", "--esm", "index.ts"]
