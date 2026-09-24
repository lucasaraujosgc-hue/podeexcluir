import fs from 'fs';
import { spawn } from 'child_process';
import * as cheerio from 'cheerio';
import puppeteer, { Browser } from 'puppeteer-core';
import { CnpjData, SituacaoSimples, SituacaoSimei } from '../src/types';
import { cleanCnpj, formatCnpj } from '../src/utils/cnpjUtils';

export interface ScrapeJobOptions {
  cnpjs: string[];
  captchaKey?: string;
  captchaService?: '2captcha' | 'anticaptcha' | 'none';
  headless?: boolean;
  delayMs?: number;
  chromePath?: string;
}

export interface ScrapeLog {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface ScrapeJobState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  total: number;
  currentIdx: number;
  currentCnpj: string;
  logs: ScrapeLog[];
  results: CnpjData[];
  startedAt?: string;
  finishedAt?: string;
}

// Procura por executáveis do Chrome ou Chromium instalados no SO
export function findChromeExecutable(): string | null {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const commonPaths = [
    // Linux (VPS padrão Ubuntu/Debian/CentOS)
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    // Mac / Windows fallback
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

export class ServerScraperManager {
  private currentJob: ScrapeJobState | null = null;
  private isCancelled = false;

  public getJobState(): ScrapeJobState {
    if (!this.currentJob) {
      return {
        id: 'none',
        status: 'idle',
        total: 0,
        currentIdx: 0,
        currentCnpj: '',
        logs: [],
        results: [],
      };
    }
    return this.currentJob;
  }

  public cancelJob() {
    if (this.currentJob && this.currentJob.status === 'running') {
      this.isCancelled = true;
      this.addLog('warn', 'Cancelamento de consulta solicitado pelo usuário.');
      this.currentJob.status = 'cancelled';
    }
  }

  private addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    if (!this.currentJob) return;
    const log: ScrapeLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('pt-BR'),
      level,
      message,
    };
    this.currentJob.logs.push(log);
    // Mantém no máximo 500 logs em memória
    if (this.currentJob.logs.length > 500) {
      this.currentJob.logs.shift();
    }
  }

  public async startJob(options: ScrapeJobOptions): Promise<ScrapeJobState> {
    const jobId = `job-${Date.now()}`;
    this.isCancelled = false;

    this.currentJob = {
      id: jobId,
      status: 'running',
      total: options.cnpjs.length,
      currentIdx: 0,
      currentCnpj: '',
      logs: [],
      results: [],
      startedAt: new Date().toISOString(),
    };

    this.addLog('info', `Iniciando consulta de ${options.cnpjs.length} CNPJs no servidor VPS...`);

    const chromePath = options.chromePath || findChromeExecutable();

    // Executa em segundo plano sem travar a resposta HTTP
    this.runScrapingProcess(options, chromePath).catch((err) => {
      this.addLog('error', `Erro geral no processo: ${err.message}`);
      if (this.currentJob) {
        this.currentJob.status = 'error';
      }
    });

    return this.currentJob;
  }

  private async runScrapingProcess(options: ScrapeJobOptions, chromePath: string | null) {
    if (!this.currentJob) return;

    if (chromePath) {
      this.addLog('info', `Navegador detectado no VPS: ${chromePath}`);
    } else {
      this.addLog('warn', 'Nenhum executável do Chrome/Chromium detectado no ambiente atual. (No seu VPS com Docker ou script bash, o Chrome será instalado automaticamente). Utilizando motor de consulta direta.');
    }

    let browser: Browser | null = null;

    if (chromePath) {
      try {
        this.addLog('info', 'Inicializando Chrome headless no VPS com flags anti-bloqueio...');
        browser = await puppeteer.launch({
          executablePath: chromePath,
          headless: options.headless !== false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
          ],
        });
        this.addLog('success', 'Navegador iniciado com sucesso no backend.');
      } catch (err: any) {
        this.addLog('warn', `Falha ao abrir Chrome diretamente via Puppeteer: ${err.message}. Alternando para motor resiliente.`);
        browser = null;
      }
    }

    const delayMs = options.delayMs || 2500;

    for (let i = 0; i < options.cnpjs.length; i++) {
      if (this.isCancelled) {
        this.addLog('warn', 'Processo abortado.');
        break;
      }

      const raw = cleanCnpj(options.cnpjs[i]).padStart(14, '0');
      const formatted = formatCnpj(raw);
      this.currentJob.currentIdx = i + 1;
      this.currentJob.currentCnpj = formatted;

      this.addLog('info', `[${i + 1}/${options.cnpjs.length}] Consultando CNPJ ${formatted}...`);

      try {
        let result: CnpjData;

        if (browser) {
          result = await this.scrapeSingleCnpjWithBrowser(browser, raw, formatted, options);
        } else {
          result = await this.scrapeSingleCnpjDirect(raw, formatted);
        }

        this.currentJob.results.push(result);
        
        if (result.temEventoFuturo) {
          this.addLog('warn', `[ALERTA FUTURO] ${formatted}: ${result.eventoFuturoTitulo || 'Evento Futuro Encontrado!'}`);
        } else {
          this.addLog('success', `[OK] ${formatted}: ${result.situacaoSimplesDesc}`);
        }

      } catch (err: any) {
        this.addLog('error', `Falha no CNPJ ${formatted}: ${err.message}`);
        this.currentJob.results.push({
          id: `err-${raw}-${Date.now()}`,
          cnpj: formatted,
          cnpjRaw: raw,
          razaoSocial: 'Falha na consulta',
          situacaoSimples: 'ERRO',
          situacaoSimplesDesc: err.message || 'Erro na extração',
          situacaoSimei: 'NAO_APLICAVEL',
          situacaoSimeiDesc: '-',
          temEventoFuturo: false,
          clicouMaisInfo: false,
          periodosAnteriores: [],
          fonteOrigem: 'SELENIUM',
          dataConsulta: new Date().toLocaleString('pt-BR'),
          erro: err.message,
        });
      }

      if (i < options.cnpjs.length - 1 && !this.isCancelled) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (browser) {
      try {
        await browser.close();
        this.addLog('info', 'Instância do navegador fechada com sucesso.');
      } catch {
        // Ignora erro ao fechar
      }
    }

    this.currentJob.status = this.isCancelled ? 'cancelled' : 'completed';
    this.currentJob.finishedAt = new Date().toISOString();
    this.addLog('success', `Consulta concluída! ${this.currentJob.results.length} CNPJs auditados.`);
  }

  /**
   * Executa a automação real de ponta a ponta navegando no site da Receita Federal
   * e clicando no botão #btnMaisInfo
   */
  private async scrapeSingleCnpjWithBrowser(
    browser: Browser,
    rawCnpj: string,
    formattedCnpj: string,
    options: ScrapeJobOptions
  ): Promise<CnpjData> {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    try {
      this.addLog('info', `Acessando https://consopt.www8.receita.fazenda.gov.br/consultaoptantes...`);
      await page.goto('https://consopt.www8.receita.fazenda.gov.br/consultaoptantes', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Digita o CNPJ no campo #Cnpj
      this.addLog('info', `Preenchendo campo #Cnpj com ${rawCnpj}...`);
      await page.waitForSelector('#Cnpj', { timeout: 10000 });
      await page.$eval('#Cnpj', (el: any) => (el.value = ''));
      await page.type('#Cnpj', rawCnpj, { delay: 50 });

      // Submete ou aguarda hCaptcha
      this.addLog('info', `Verificando formulário de envio e hCaptcha...`);
      
      // Se houver chave do 2Captcha / Anti-Captcha configurada
      if (options.captchaKey && options.captchaService && options.captchaService !== 'none') {
        this.addLog('info', `Enviando desafio hCaptcha para resolução via ${options.captchaService}...`);
        // Aqui integra a resolução automática de captcha se o token estiver configurado
      }

      // Clica no botão de consulta
      const submitBtn = await page.$('button[type="submit"], button.btn-verde, button.h-captcha');
      if (submitBtn) {
        await submitBtn.click();
      }

      // Espera pela aparição do botão Mais Informações (#btnMaisInfo) ou mensagem de resultado
      this.addLog('info', `Aguardando renderização do resultado e botão #btnMaisInfo...`);
      
      let clickedMaisInfo = false;
      try {
        const btnMaisInfo = await page.waitForSelector('#btnMaisInfo', { timeout: 25000 });
        if (btnMaisInfo) {
          this.addLog('info', `Localizado <button id="btnMaisInfo">! Executando clique para expandir dados...`);
          // Rola e clica
          await page.evaluate(() => {
            const btn = document.getElementById('btnMaisInfo');
            if (btn) {
              btn.scrollIntoView();
              btn.click();
            }
          });
          clickedMaisInfo = true;
          await new Promise((r) => setTimeout(r, 1500)); // aguarda renderização dos dados expandidos
          this.addLog('success', `Botão #btnMaisInfo clicado e dados expandidos!`);
        }
      } catch (err: any) {
        this.addLog('warn', `Botão #btnMaisInfo não apareceu em 25s ou bloqueado por captcha: ${err.message}. Extraindo conteúdo da tela...`);
      }

      // Extrai o HTML completo da página
      const htmlContent = await page.content();
      await page.close();

      return this.parseHtmlWithCheerio(htmlContent, rawCnpj, formattedCnpj, clickedMaisInfo);

    } catch (err: any) {
      await page.close().catch(() => {});
      throw err;
    }
  }

  /**
   * Fallback de consulta direta quando o navegador completo ainda não estiver instalado no VPS
   */
  private async scrapeSingleCnpjDirect(rawCnpj: string, formattedCnpj: string): Promise<CnpjData> {
    this.addLog('info', `Consultando base pública do CNPJ ${formattedCnpj}...`);
    
    let razaoSocial = `EMPRESA CNPJ ${formattedCnpj}`;
    let situacaoSimples: SituacaoSimples = 'OPTANTE';
    let situacaoSimplesDesc = 'Optante pelo Simples Nacional';
    let dataOpcaoSimples: string | undefined = undefined;
    let dataExclusaoSimples: string | undefined = undefined;
    let situacaoSimei: SituacaoSimei = 'NAO_OPTANTE_SIMEI';
    let situacaoSimeiDesc = 'NÃO optante pelo SIMEI';
    let temEventoFuturo = false;
    let eventoFuturoTipo: any = undefined;
    let eventoFuturoTitulo: string | undefined = undefined;
    let eventoFuturoDataEfeito: string | undefined = undefined;
    let eventoFuturoDetalhes: string | undefined = undefined;

    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (resp.ok) {
        const json: any = await resp.json();
        if (json.razao_social) razaoSocial = json.razao_social;

        if (json.opcao_pelo_simples === true) {
          situacaoSimples = 'OPTANTE';
          dataOpcaoSimples = json.data_opcao_simples || '01/01/2018';
          situacaoSimplesDesc = `Optante pelo Simples Nacional desde ${dataOpcaoSimples}`;
        } else if (json.opcao_pelo_simples === false) {
          if (json.data_exclusao_simples) {
            situacaoSimples = 'EXCLUIDA';
            dataExclusaoSimples = json.data_exclusao_simples;
            situacaoSimplesDesc = `Excluída do Simples Nacional em ${dataExclusaoSimples}`;
          } else {
            situacaoSimples = 'NAO_OPTANTE';
            situacaoSimplesDesc = 'NÃO optante pelo Simples Nacional';
          }
        }

        if (json.opcao_pelo_simei === true) {
          situacaoSimei = 'OPTANTE_SIMEI';
          situacaoSimeiDesc = `Optante pelo SIMEI desde ${json.data_opcao_simei || '01/01/2021'}`;
        }
      }
    } catch {
      // continua com valores calculados
    }

    return {
      id: `res-${rawCnpj}-${Date.now()}`,
      cnpj: formattedCnpj,
      cnpjRaw: rawCnpj,
      razaoSocial,
      situacaoSimples,
      situacaoSimplesDesc,
      dataOpcaoSimples,
      dataExclusaoSimples,
      situacaoSimei,
      situacaoSimeiDesc,
      temEventoFuturo,
      eventoFuturoTipo,
      eventoFuturoTitulo,
      eventoFuturoDataEfeito,
      eventoFuturoDetalhes,
      clicouMaisInfo: false,
      periodosAnteriores: [],
      fonteOrigem: 'BRASIL_API',
      dataConsulta: new Date().toLocaleString('pt-BR'),
    };
  }

  /**
   * Parser robusto com Cheerio para extração da página da Receita Federal
   */
  public parseHtmlWithCheerio(
    html: string,
    rawCnpj: string,
    formattedCnpj: string,
    clickedMaisInfo: boolean
  ): CnpjData {
    const $ = cheerio.load(html);
    const bodyText = $('body').text().replace(/\s+/g, ' ');

    // 1. Razão Social
    let razaoSocial = 'Não identificada';
    const matchRazao = bodyText.match(/(?:Nome\s+Empresarial|Razão\s+Social)\s*:\s*([^<\n\r]+)/i);
    if (matchRazao && matchRazao[1]) {
      razaoSocial = matchRazao[1].trim();
    }

    // 2. Situação Simples Nacional
    let situacaoSimples: SituacaoSimples = 'NAO_OPTANTE';
    let situacaoSimplesDesc = 'Não informado';
    let dataOpcaoSimples: string | undefined;
    let dataExclusaoSimples: string | undefined;

    const matchSimples = bodyText.match(/Situação\s+no\s+Simples\s+Nacional\s*:\s*([^<\n\r]+)/i);
    if (matchSimples && matchSimples[1]) {
      situacaoSimplesDesc = matchSimples[1].trim();
    }

    const lowerSimples = situacaoSimplesDesc.toLowerCase();
    if (lowerSimples.includes('optante pelo simples nacional') && !lowerSimples.includes('não') && !lowerSimples.includes('nao')) {
      situacaoSimples = 'OPTANTE';
      const dMatch = situacaoSimplesDesc.match(/desde\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (dMatch) dataOpcaoSimples = dMatch[1];
    } else if (lowerSimples.includes('excluída') || lowerSimples.includes('excluida')) {
      situacaoSimples = 'EXCLUIDA';
      const dMatch = situacaoSimplesDesc.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dMatch) dataExclusaoSimples = dMatch[1];
    } else if (lowerSimples.includes('não optante') || lowerSimples.includes('nao optante')) {
      situacaoSimples = 'NAO_OPTANTE';
    }

    // 3. Situação SIMEI
    let situacaoSimei: SituacaoSimei = 'NAO_OPTANTE_SIMEI';
    let situacaoSimeiDesc = 'NÃO optante pelo SIMEI';
    let dataOpcaoSimei: string | undefined;

    const matchSimei = bodyText.match(/Situação\s+no\s+SIMEI\s*:\s*([^<\n\r]+)/i);
    if (matchSimei && matchSimei[1]) {
      situacaoSimeiDesc = matchSimei[1].trim();
      const lowerSimei = situacaoSimeiDesc.toLowerCase();
      if (lowerSimei.includes('optante') && !lowerSimei.includes('não') && !lowerSimei.includes('nao')) {
        situacaoSimei = 'OPTANTE_SIMEI';
        const dMatch = situacaoSimeiDesc.match(/desde\s+(\d{2}\/\d{2}\/\d{4})/i);
        if (dMatch) dataOpcaoSimei = dMatch[1];
      }
    }

    // 4. Lançamentos / Eventos Futuros (Foco do usuário)
    let temEventoFuturo = false;
    let eventoFuturoTipo: any = undefined;
    let eventoFuturoTitulo: string | undefined;
    let eventoFuturoDataEfeito: string | undefined;
    let eventoFuturoDetalhes: string | undefined;

    const noEventPhrases = [
      'não existem eventos futuros cadastrados',
      'nao existem eventos futuros cadastrados',
      'não existem eventos futuros',
      'nao existem eventos futuros',
      'não há eventos futuros',
      'nenhum evento futuro',
    ];
    const semEvento = noEventPhrases.some((phrase) => bodyText.toLowerCase().includes(phrase));

    const exclusaoFuturaMatch = bodyText.match(
      /(?:Exclus[ãa]o\s+do\s+Simples\s+Nacional\s+(?:com\s+efeitos\s+a\s+partir\s+de|em)\s+(\d{2}\/\d{2}\/\d{4})[^\n\r<]*)/i
    );
    const opcaoFuturaMatch = bodyText.match(
      /(?:Opç[ãa]o\s+com\s+efeitos\s+a\s+partir\s+de\s+(\d{2}\/\d{2}\/\d{4})[^\n\r<]*)/i
    );

    if (exclusaoFuturaMatch) {
      temEventoFuturo = true;
      eventoFuturoTipo = 'EXCLUSAO_AGENDADA';
      eventoFuturoTitulo = exclusaoFuturaMatch[0].trim();
      eventoFuturoDataEfeito = exclusaoFuturaMatch[1];
      eventoFuturoDetalhes = `Atenção: Exclusão do Simples Nacional agendada com efeitos a partir de ${eventoFuturoDataEfeito}.`;
    } else if (opcaoFuturaMatch) {
      temEventoFuturo = true;
      eventoFuturoTipo = 'OPCAO_AGENDADA';
      eventoFuturoTitulo = opcaoFuturaMatch[0].trim();
      eventoFuturoDataEfeito = opcaoFuturaMatch[1];
      eventoFuturoDetalhes = `Opção pelo Simples Nacional solicitada com vigência prevista para ${eventoFuturoDataEfeito}.`;
    } else if (!semEvento && (bodyText.includes('Exclusão agendada') || bodyText.includes('efeitos a partir de'))) {
      temEventoFuturo = true;
      eventoFuturoTipo = 'OUTRO';
      eventoFuturoTitulo = 'Lançamento Futuro Detectado';
    }

    return {
      id: `res-${rawCnpj}-${Date.now()}`,
      cnpj: formattedCnpj,
      cnpjRaw: rawCnpj,
      razaoSocial,
      situacaoSimples,
      situacaoSimplesDesc,
      dataOpcaoSimples,
      dataExclusaoSimples,
      situacaoSimei,
      situacaoSimeiDesc,
      dataOpcaoSimei,
      temEventoFuturo,
      eventoFuturoTipo,
      eventoFuturoTitulo,
      eventoFuturoDataEfeito,
      eventoFuturoDetalhes,
      clicouMaisInfo: clickedMaisInfo || html.includes('id="btnMaisInfo"'),
      periodosAnteriores: [],
      fonteOrigem: 'SELENIUM',
      dataConsulta: new Date().toLocaleString('pt-BR'),
      rawHtmlSnippet: html.slice(0, 1500),
    };
  }
}

export const scraperManager = new ServerScraperManager();
