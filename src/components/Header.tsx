import React from 'react';
import { FileSpreadsheet, Bot, CheckCircle2, AlertTriangle, RefreshCw, HelpCircle, Code2, Server } from 'lucide-react';
import { BatchSummary } from '../types';

interface HeaderProps {
  summary: BatchSummary;
  activeTab: 'dashboard' | 'import' | 'vps' | 'selenium' | 'html-parser';
  setActiveTab: (tab: 'dashboard' | 'import' | 'vps' | 'selenium' | 'html-parser') => void;
  onLoadSampleData: () => void;
  onClearData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  activeTab,
  setActiveTab,
  onLoadSampleData,
  onClearData
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Consulta Optantes <span className="text-emerald-700">Simples Nacional</span>
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Lote & Eventos Futuros
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Auditoria de Optantes, botão <span className="font-mono text-emerald-800 bg-emerald-50 px-1 rounded">#btnMaisInfo</span> e detecção de Lançamentos Futuros
              </p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
              <span className="font-medium text-slate-500">Total:</span>
              <strong className="font-bold text-slate-900">{summary.total}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Optantes:</span>
              <strong className="font-bold">{summary.optantes}</strong>
            </div>

            {summary.comEventoFuturo > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">Com Lançamento Futuro:</span>
                <strong className="font-bold">{summary.comEventoFuturo}</strong>
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto md:ml-2">
              <button
                onClick={onLoadSampleData}
                title="Carregar lote de exemplo com casos reais"
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Exemplo Real</span>
              </button>
              {summary.total > 0 && (
                <button
                  onClick={onClearData}
                  className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-100 pt-1 -mb-px">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Painel & Resultados ({summary.total})</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar XLSX / CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('vps')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'vps'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Executar no Servidor (VPS)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 animate-pulse">
              Código / Backend
            </span>
          </button>

          <button
            onClick={() => setActiveTab('selenium')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'selenium'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Robô Selenium (Python)</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              #btnMaisInfo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('html-parser')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'html-parser'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Testador de HTML</span>
          </button>
        </div>
      </div>
    </header>
  );
};
