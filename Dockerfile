# Multi-stage Dockerfile para VPS com suporte a Google Chrome Headless, Selenium e Puppeteer
FROM node:20-bookworm-slim

# Evita prompts interativos durante apt-get
ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV PORT=3000

WORKDIR /app

# Instala dependências do sistema e repositório oficial do Google Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    curl \
    python3 \
    python3-pip \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Instala Google Chrome Stable
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copia arquivos de definição de dependências e configuração do npm
COPY package.json package-lock.json* .npmrc* ./

# Instala dependências do Node.js com tolerância a peer dependencies
RUN npm install --legacy-peer-deps

# Copia todo o código fonte
COPY . .

# Build do frontend Vite para produção
RUN npm run build

# Expõe a porta configurada
EXPOSE 3000

# Executa o servidor de backend Node.js com TypeScript
CMD ["npx", "tsx", "server.ts"]
