import React, { useState } from 'react';
import { Bot, Download, Copy, Check, Terminal, ExternalLink, ShieldCheck, FileSpreadsheet, Play, Layers } from 'lucide-react';
import { generatePythonSeleniumScript, generateRequirementsTxt, generatePlaywrightScript } from '../utils/seleniumScriptGenerator';

interface SeleniumPanelProps {
  currentCnpjs: string[];
  onUploadResultExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SeleniumPanel: React.FC<SeleniumPanelProps> = ({
  currentCnpjs,
  onUploadResultExcel
}) => {
  const [activeLang, setActiveLang] = useState<'python' | 'playwright'>('python');
  const [headless, setHeadless] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [copied, setCopied] = useState(false);

  const pythonScript = generatePythonSeleniumScript({
    cnpjs: currentCnpjs,
    headless,
    delaySeconds
  });

  const playwrightScript = generatePlaywrightScript(currentCnpjs);

  const handleCopyCode = () => {
    const code = activeLang === 'python' ? pythonScript : playwrightScript;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPython = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'robo_consulta_optantes.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRequirements = () => {
    const blob = new Blob([generateRequirementsTxt()], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'requirements.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Bot className="w-3.5 h-3.5" />
              <span>Automação com Selenium WebDriver</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Robô de Consulta e Clique em <span className="text-emerald-400 font-mono text-base bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">#btnMaisInfo</span>
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Script completo pronto para execução local. Ele automatiza a navegação em <strong>https://consopt.www8.receita.fazenda.gov.br/consultaoptantes</strong>, clica no botão com estilo verde e extrai se existe algum <strong>Lançamento/Evento Futuro</strong> no Simples Nacional.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleDownloadPython}
              className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Script Python (.py)</span>
            </button>
            <button
              onClick={handleDownloadRequirements}
              className="px-3 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>requirements.txt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration & Import Return */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Step 1 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">Instale as Bibliotecas</h3>
          <p className="text-xs text-slate-500">
            No terminal do seu computador com Python 3 instalado, execute:
          </p>
          <div className="bg-slate-900 text-emerald-400 text-xs font-mono p-2 rounded-lg select-all">
            pip install -r requirements.txt
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">Execute o Robô</h3>
          <p className="text-xs text-slate-500">
            O robô abre o Chrome, preenche os {currentCnpjs.length > 0 ? `${currentCnpjs.length} CNPJs` : 'CNPJs da planilha'} e clica em #btnMaisInfo:
          </p>
          <div className="bg-slate-900 text-emerald-400 text-xs font-mono p-2 rounded-lg select-all">
            python robo_consulta_optantes.py
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">Carregue os Resultados</h3>
          <p className="text-xs text-slate-500">
            Suba o arquivo Excel gerado pelo robô para ver os gráficos e alertas:
          </p>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 w-full justify-center transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Importar resultado_simples_nacional.xlsx</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={onUploadResultExcel}
            />
          </label>
        </div>

      </div>

      {/* Code Viewer */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        
        {/* Code Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveLang('python')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeLang === 'python'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Python (Selenium WebDriver)
            </button>
            <button
              onClick={() => setActiveLang('playwright')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeLang === 'playwright'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js (Playwright)
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {activeLang === 'python' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={headless}
                  onChange={(e) => setHeadless(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                />
                <span>Modo Invisível (Headless)</span>
              </label>
            )}

            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-[500px] leading-relaxed select-all">
          <pre>{activeLang === 'python' ? pythonScript : playwrightScript}</pre>
        </div>

        {/* Footer info */}
        <div className="bg-slate-900/60 px-4 py-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Target: <code className="text-slate-200">#btnMaisInfo</code> selector &amp; <code className="text-slate-200">Eventos Futuros</code> regex extraction</span>
          </div>
          <div>
            {currentCnpjs.length > 0 ? `${currentCnpjs.length} CNPJs incorporados no código` : 'Configurado para carregar do Excel'}
          </div>
        </div>

      </div>

    </div>
  );
};
