#!/usr/bin/env bash
# ==============================================================================
# Script de Instalação e Deploy Automático na VPS (Ubuntu 20.04 / 22.04 / 24.04 ou Debian)
# Sistema: Consulta em Lote de Optantes do Simples Nacional + Lançamentos Futuros
# ==============================================================================

set -e

echo "================================================================="
echo "  CONFIGURAÇÃO AUTOMÁTICA DA VPS PARA CONSULTA SIMPLES NACIONAL  "
echo "================================================================="

# 1. Atualização dos pacotes do sistema
echo "[1/6] Atualizando repositórios do sistema..."
sudo apt-get update -y
sudo apt-get install -y curl wget git gnupg ca-certificates build-essential

# 2. Instalação do Node.js 20 LTS
echo "[2/6] Instalando Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js instalado: $(node -v)"
echo "NPM instalado: $(npm -v)"

# 3. Instalação do Google Chrome Stable Oficial (necessário para o Selenium/Puppeteer)
echo "[3/6] Instalando Google Chrome Stable..."
if ! command -v google-chrome &> /dev/null; then
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt-get update -y
    sudo apt-get install -y google-chrome-stable
fi
echo "Google Chrome instalado: $(google-chrome --version)"

# 4. Instalação do Python3 e Selenium (para execução opcional de scripts Python)
echo "[4/6] Configurando ambiente Python..."
sudo apt-get install -y python3 python3-pip python3-venv
pip3 install --break-system-packages --upgrade pip selenium webdriver-manager pandas openpyxl beautifulsoup4 || pip3 install --upgrade pip selenium webdriver-manager pandas openpyxl beautifulsoup4 || true

# 5. Instalação das dependências do projeto e build
echo "[5/6] Instalando dependências e compilando aplicação..."
npm install --legacy-peer-deps
npm run build

# 6. Instalação do PM2 para manter a aplicação rodando 24/7
echo "[6/6] Configurando gerenciador de processos PM2..."
sudo npm install -g pm2
pm2 delete consulta-simples 2>/dev/null || true
pm2 start "npx tsx server.ts" --name "consulta-simples"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

IP_PUBLICO=$(curl -s ifconfig.me || echo "SEU_IP_VPS")

echo ""
echo "================================================================="
echo "  [SUCESSO] APLICAÇÃO INSTALADA E RODANDO NA SUA VPS!            "
echo "================================================================="
echo "  Acesse no navegador: http://${IP_PUBLICO}:3000"
echo "  Para ver logs do robô em tempo real: pm2 logs consulta-simples"
echo "  Para reiniciar o serviço: pm2 restart consulta-simples"
echo "================================================================="
