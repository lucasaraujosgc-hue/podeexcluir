import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { scraperManager, findChromeExecutable } from './server/scraper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Iniciar consulta em lote no servidor VPS
  app.post('/api/scrape/start', async (req, res) => {
    try {
      const { cnpjs, captchaKey, captchaService, headless, delayMs, chromePath } = req.body;

      if (!cnpjs || !Array.isArray(cnpjs) || cnpjs.length === 0) {
        return res.status(400).json({ error: 'Nenhum CNPJ fornecido para consulta no servidor.' });
      }

      const job = await scraperManager.startJob({
        cnpjs,
        captchaKey,
        captchaService,
        headless,
        delayMs,
        chromePath,
      });

      return res.json({ success: true, job });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Falha ao iniciar robô no servidor' });
    }
  });

  // Obter status e logs em tempo real da consulta em execução no servidor
  app.get('/api/scrape/status', (_req, res) => {
    const state = scraperManager.getJobState();
    return res.json(state);
  });

  // Cancelar consulta em execução
  app.post('/api/scrape/cancel', (_req, res) => {
    scraperManager.cancelJob();
    return res.json({ success: true, message: 'Solicitação de cancelamento enviada.' });
  });

  // Diagnóstico do ambiente VPS (Chrome instalado, CPU, Memória)
  app.get('/api/system/check', (_req, res) => {
    const chromePath = findChromeExecutable();
    return res.json({
      chromeDetected: !!chromePath,
      chromePath: chromePath || null,
      platform: os.platform(),
      arch: os.arch(),
      totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemMb: Math.round(os.freemem() / (1024 * 1024)),
      nodeVersion: process.version,
      status: 'ready',
    });
  });

  // API endpoint to query public CNPJ data via BrasilAPI as live fallback
  app.get('/api/cnpj/:cnpj', async (req, res) => {
    const rawCnpj = req.params.cnpj.replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve conter 14 dígitos numéricos' });
    }

    try {
      // Query BrasilAPI
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ConsultaOptantesApp/1.0' }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'CNPJ não encontrado na base pública' });
        }
        return res.status(response.status).json({ error: `Erro na consulta da base pública (${response.status})` });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao consultar CNPJ' });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Setup Vite in development or serve static in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
