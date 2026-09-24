import React, { useState, useEffect, useRef } from 'react';
import { Server, Play, Square, Terminal, CheckCircle2, AlertTriangle, RefreshCw, Cpu, HardDrive, ShieldCheck, Copy, Check, FileSpreadsheet, Download, ExternalLink, Settings2, Sparkles } from 'lucide-react';
import { CnpjData } from '../types';
import { exportToExcel } from '../utils/excelExport';

interface VpsManagerProps {
  currentCnpjs: string[];
  onApplyResults: (results: CnpjData[]) => void;
  onNavigateToTable: () => void;
}

interface SystemInfo {
  chromeDetected: boolean;
  chromePath: string | null;
  platform: string;
  arch: string;
  totalMemMb: number;
  freeMemMb: number;
  nodeVersion: string;
  status: string;
}

interface JobStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  total: number;
  currentIdx: number;
  currentCnpj: string;
  logs: Array<{
    id: string;
    time: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
  }>;
  results: CnpjData[];
}

export const VpsManager: React.FC<VpsManagerProps> = ({
  currentCnpjs,
  onApplyResults,
  onNavigateToTable,
}) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    id: 'none',
    status: 'idle',
    total: 0,
    currentIdx: 0,
    currentCnpj: '',
    logs: [],
    results: [],
  });

  const [cnpjsInput, setCnpjsInput] = useState<string>(() =>
    currentCnpjs.length > 0 ? currentCnpjs.join('\n') : '14285714000108\n00000000000191\n28910456000122'
  );
  const [delayMs, setDelayMs] = useState<number>(2500);
  const [headless, setHeadless] = useState<boolean>(true);
  const [captchaService, setCaptchaService] = useState<'none' | '2captcha' | 'anticaptcha'>('none');
  const [captchaKey, setCaptchaKey] = useState<string>('');
  const [activeDeployTab, setActiveDeployTab] = useState<'docker' | 'bash'>('docker');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<any>(null);

  // Consulta status do sistema (Chrome, Memória, CPU)
  const fetchSystemCheck = async () => {
    try {
      const res = await fetch('/api/system/check');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch {
      // Falha silenciosa
    }
  };

  // Consulta status do job em execução no servidor
  const fetchJobStatus = async () => {
    try {
      const res = await fetch('/api/scrape/status');
      if (res.ok) {
        const data: JobStatus = await res.json();
        setJobStatus(data);
      }
    } catch {
      // Falha silenciosa
    }
  };

  useEffect(() => {
    fetchSystemCheck();
    fetchJobStatus();

    // Inicia polling a cada 1.2 segundos
    pollingRef.current = setInterval(() => {
      fetchJobStatus();
    }, 1200);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Rola logs do terminal para o fim automaticamente
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [jobStatus.logs]);

  // Atualiza CNPJs caso mudem externamente
  useEffect(() => {
    if (currentCnpjs.length > 0) {
      setCnpjsInput(currentCnpjs.join('\n'));
    }
  }, [currentCnpjs]);

  const handleStartScrape = async () => {
    const list = cnpjsInput
      .split(/[\r\n,;]+/)
      .map((c) => c.replace(/\D/g, ''))
      .filter((c) => c.length === 14);

    if (list.length === 0) {
      alert('Insira pelo menos um CNPJ com 14 dígitos numéricos para consulta.');
      return;
    }

    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpjs: list,
          delayMs,
          headless,
          captchaService,
          captchaKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro: ${err.error || 'Não foi possível iniciar no servidor'}`);
        return;
      }

      fetchJobStatus();
    } catch (err: any) {
      alert(`Falha na requisição: ${err.message}`);
    }
  };

  const handleCancelScrape = async () => {
    try {
      await fetch('/api/scrape/cancel', { method: 'POST' });
      fetchJobStatus();
    } catch {
      // Ignora erro
    }
  };

  const handleApplyToTable = () => {
    if (jobStatus.results.length > 0) {
      onApplyResults(jobStatus.results);
      onNavigateToTable();
    }
  };

  const isRunning = jobStatus.status === 'running';
  const progressPercent =
    jobStatus.total > 0 ? Math.round((jobStatus.currentIdx / jobStatus.total) * 100) : 0;
  const countFuturo = jobStatus.results.filter((r) => r.temEventoFuturo).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Hero Banner VPS */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Server className="w-3.5 h-3.5" />
              <span>Execução Nativa no Servidor / VPS</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Robô de Consulta Automatizada no Backend
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              O backend da aplicação executa o navegador headless, acessa o portal da Receita Federal, preenche o CNPJ, clica em <span className="font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">#btnMaisInfo</span> e extrai a Situação e se há <strong>Lançamento/Evento Futuro</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchSystemCheck}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verificar VPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics / Server Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Status do Chrome no VPS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${systemInfo?.chromeDetected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navegador no VPS
            </span>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
              {systemInfo?.chromeDetected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Google Chrome Ativo</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Pronto p/ Docker/VPS</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
              {systemInfo?.chromePath || 'Configurado via Dockerfile'}
            </p>
          </div>
        </div>

        {/* Recursos de Memória */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Memória do Servidor
            </span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {systemInfo ? `${systemInfo.freeMemMb} MB livres / ${systemInfo.totalMemMb} MB` : 'Consultando...'}
            </div>
            <p className="text-[10px] text-slate-500">
              Plataforma: {systemInfo?.platform || 'linux'} ({systemInfo?.arch || 'x64'})
            </p>
          </div>
        </div>

        {/* Motor em Execução */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Status da Fila de Consulta
            </span>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              {isRunning ? (
                <span className="text-emerald-600 font-bold">Em execução no backend</span>
              ) : jobStatus.status === 'completed' ? (
                <span className="text-slate-700">Consulta concluída</span>
              ) : (
                <span className="text-slate-500">Aguardando comando</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {jobStatus.total > 0 ? `${jobStatus.results.length}/${jobStatus.total} finalizados` : 'Nenhum job rodando'}
            </p>
          </div>
        </div>

      </div>

      {/* Main Runner Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                <span>Configuração da Execução no Servidor</span>
              </h3>
              <span className="text-[11px] text-slate-400">Parâmetros</span>
            </div>

            {/* CNPJs Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Lista de CNPJs (um por linha):
              </label>
              <textarea
                rows={6}
                disabled={isRunning}
                value={cnpjsInput}
                onChange={(e) => setCnpjsInput(e.target.value)}
                placeholder="14285714000108&#10;00000000000191&#10;28910456000122"
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-slate-100"
              />
              <p className="text-[10px] text-slate-400">
                Você pode importar de planilha na aba "Importar XLSX/CSV" ou colar diretamente acima.
              </p>
            </div>

            {/* Execution Options */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Intervalo (Delay):</label>
                <select
                  disabled={isRunning}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value={1500}>1.5 segundos</option>
                  <option value={2500}>2.5 segundos (Recomendado)</option>
                  <option value={5000}>5.0 segundos (Seguro)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Modo de Navegador:</label>
                <select
                  disabled={isRunning}
                  value={headless ? 'headless' : 'visible'}
                  onChange={(e) => setHeadless(e.target.value === 'headless')}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="headless">Headless (Invisível)</option>
                  <option value="visible">Com Janela Visível</option>
                </select>
              </div>
            </div>

            {/* Captcha Resolver Option */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Resolução de Captcha:</span>
                <span className="text-[10px] text-slate-500 font-medium">Opcional</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['none', '2captcha', 'anticaptcha'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setCaptchaService(s)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      captchaService === s
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s === 'none' ? 'Padrão' : s === '2captcha' ? '2Captcha' : 'Anti-Captcha'}
                  </button>
                ))}
              </div>
              {captchaService !== 'none' && (
                <input
                  type="password"
                  disabled={isRunning}
                  value={captchaKey}
                  onChange={(e) => setCaptchaKey(e.target.value)}
                  placeholder={`Chave API do ${captchaService}...`}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={handleCancelScrape}
                  className="flex-1 py-3 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Cancelar Consulta</span>
                </button>
              ) : (
                <button
                  onClick={handleStartScrape}
                  className="flex-1 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Executar Consulta no Servidor VPS</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Live Terminal and Progress */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Terminal Box */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[480px]">
            
            {/* Terminal Header */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  Terminal de Logs do Servidor (Tempo Real)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Processando</span>
                  </span>
                )}
                <span className="text-[11px] text-slate-500 font-mono">
                  {jobStatus.logs.length} linhas
                </span>
              </div>
            </div>

            {/* Progress Bar (when active or finished) */}
            {jobStatus.total > 0 && (
              <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono mb-1">
                  <span>Progresso: {jobStatus.currentIdx}/{jobStatus.total} ({progressPercent}%)</span>
                  {jobStatus.currentCnpj && (
                    <span className="text-emerald-400">Atual: {jobStatus.currentCnpj}</span>
                  )}
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Console Log Feed */}
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed selection:bg-emerald-600 selection:text-white">
              {jobStatus.logs.length === 0 ? (
                <div className="text-slate-600 italic py-8 text-center">
                  Aguardando início da consulta. Clique em "Executar Consulta no Servidor VPS" para iniciar o navegador e a extração.
                </div>
              ) : (
                jobStatus.logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                    <span
                      className={`break-all ${
                        log.level === 'error'
                          ? 'text-red-400 font-bold'
                          : log.level === 'warn'
                          ? 'text-amber-300 font-semibold'
                          : log.level === 'success'
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Terminal Footer Bar with Results Action */}
            <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                Concluídos: <strong className="text-white">{jobStatus.results.length}</strong>
                {countFuturo > 0 && (
                  <span className="ml-2 text-amber-400 font-bold">
                    ({countFuturo} com Lançamento Futuro!)
                  </span>
                )}
              </div>

              {jobStatus.results.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportToExcel(jobStatus.results)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar Excel</span>
                  </button>
                  <button
                    onClick={handleApplyToTable}
                    className="px-3 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Visualizar na Tabela</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* VPS Deployment Guide Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Como Subir Esta Aplicação na Sua VPS</span>
            </h3>
            <p className="text-xs text-slate-500">
              Todos os arquivos necessários (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800">Dockerfile</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800">docker-compose.yml</code> e <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800">setup_vps.sh</code>) já estão gerados na raiz do projeto.
            </p>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              onClick={() => setActiveDeployTab('docker')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                activeDeployTab === 'docker' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Opção 1: Docker (Recomendado)
            </button>
            <button
              onClick={() => setActiveDeployTab('bash')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                activeDeployTab === 'bash' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Opção 2: Script Direto (Ubuntu/Debian)
            </button>
          </div>
        </div>

        {/* Deploy Tab Content */}
        {activeDeployTab === 'docker' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Com o Docker instalado na sua VPS, basta executar o comando abaixo na pasta do projeto. O container já instala o Google Chrome headless, fontes e dependências automaticamente:
            </p>
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto relative group">
              <code>
                docker compose up -d --build
              </code>
            </div>
            <p className="text-xs text-slate-500">
              A aplicação ficará disponível imediatamente na porta <strong>3000</strong> (ex: <code className="font-mono">http://IP_DA_SUA_VPS:3000</code>).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Se preferir rodar nativamente no Ubuntu/Debian com PM2 gerenciando o processo 24h por dia:
            </p>
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto relative group">
              <code>
                chmod +x setup_vps.sh && ./setup_vps.sh
              </code>
            </div>
            <p className="text-xs text-slate-500">
              Este script instala o Node.js 20, Google Chrome oficial, dependências, compila o build e sobe o serviço no PM2.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
