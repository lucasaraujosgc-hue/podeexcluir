import React, { useState } from 'react';
import { Code2, Play, CheckCircle, AlertTriangle, HelpCircle, ArrowRight, Sparkles, FileCode } from 'lucide-react';
import { parseReceitaOptantesHtml } from '../utils/htmlParser';
import { SAMPLE_HTML_RECEITA_COM_EVENTO, SAMPLE_HTML_RECEITA_SEM_EVENTO } from '../data/sampleData';
import { CnpjData } from '../types';

interface HtmlTesterProps {
  onAddParsedCnpj: (data: CnpjData) => void;
}

export const HtmlTester: React.FC<HtmlTesterProps> = ({ onAddParsedCnpj }) => {
  const [htmlContent, setHtmlContent] = useState<string>(SAMPLE_HTML_RECEITA_COM_EVENTO);
  const [parsedResult, setParsedResult] = useState<CnpjData | null>(() => parseReceitaOptantesHtml(SAMPLE_HTML_RECEITA_COM_EVENTO));
  const [hasAdded, setHasAdded] = useState(false);

  const handleParse = (content: string) => {
    setHtmlContent(content);
    const res = parseReceitaOptantesHtml(content);
    setParsedResult(res);
    setHasAdded(false);
  };

  const handleAddCurrent = () => {
    if (parsedResult) {
      onAddParsedCnpj(parsedResult);
      setHasAdded(true);
      setTimeout(() => setHasAdded(false), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Intro */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Testador e Extrator de HTML da Receita Federal
            </h2>
            <p className="text-xs text-slate-500">
              Cole abaixo o código HTML da página de consulta para testar a extração imediata dos dados do Simples e o conteúdo do <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">#btnMaisInfo</code>.
            </p>
          </div>
        </div>

        {/* Example Selector Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 self-center font-medium">Modelos prontos:</span>
          <button
            onClick={() => handleParse(SAMPLE_HTML_RECEITA_COM_EVENTO)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Exemplo COM Lançamento Futuro (Exclusão Agendada)</span>
          </button>

          <button
            onClick={() => handleParse(SAMPLE_HTML_RECEITA_SEM_EVENTO)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exemplo Regular (Sem Lançamentos Futuros)</span>
          </button>
        </div>
      </div>

      {/* Grid: Editor on Left, Parsed Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Editor Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Código HTML da Consulta
            </span>
            <button
              onClick={() => handleParse(htmlContent)}
              className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Extrair Dados</span>
            </button>
          </div>
          <textarea
            value={htmlContent}
            onChange={(e) => handleParse(e.target.value)}
            className="flex-1 p-4 font-mono text-xs text-slate-800 bg-slate-950 text-emerald-300/90 outline-none resize-none overflow-y-auto leading-relaxed"
            placeholder="Cole aqui o HTML da página da Receita Federal..."
          />
        </div>

        {/* Extraction Result Area */}
        <div className="space-y-4">
          {parsedResult ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Resultado da Extração DOM
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {parsedResult.razaoSocial}
                  </h3>
                  <div className="text-xs font-mono text-emerald-700 font-semibold mt-0.5">
                    CNPJ: {parsedResult.cnpj}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    parsedResult.situacaoSimples === 'OPTANTE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : parsedResult.situacaoSimples === 'EXCLUIDA'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {parsedResult.situacaoSimples}
                  </span>
                </div>
              </div>

              {/* Situação no Simples Nacional */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Situação no Simples Nacional
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {parsedResult.situacaoSimplesDesc}
                </p>
                {parsedResult.dataOpcaoSimples && (
                  <p className="text-xs text-slate-600">
                    Data de início da opção: <strong className="text-slate-800">{parsedResult.dataOpcaoSimples}</strong>
                  </p>
                )}
              </div>

              {/* Lançamento Futuro (O Grande Destaque Solicitado) */}
              <div className={`p-4 rounded-xl border transition-all ${
                parsedResult.temEventoFuturo
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <div className="flex items-start gap-3">
                  {parsedResult.temEventoFuturo ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {parsedResult.temEventoFuturo ? 'Lançamento/Evento Futuro Detectado!' : 'Nenhum Lançamento Futuro'}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        parsedResult.temEventoFuturo
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {parsedResult.temEventoFuturo ? 'ATENÇÃO' : 'REGULAR'}
                      </span>
                    </div>

                    {parsedResult.temEventoFuturo ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-900">
                          {parsedResult.eventoFuturoTitulo}
                        </p>
                        {parsedResult.eventoFuturoDataEfeito && (
                          <p className="text-xs text-amber-800">
                            Data de Vigência: <strong>{parsedResult.eventoFuturoDataEfeito}</strong>
                          </p>
                        )}
                        {parsedResult.eventoFuturoDetalhes && (
                          <p className="text-xs text-amber-700 leading-relaxed pt-1">
                            {parsedResult.eventoFuturoDetalhes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-800">
                        Não existem eventos ou exclusões futuras agendadas para este CNPJ.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão #btnMaisInfo status */}
              <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                <span>Elemento <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">#btnMaisInfo</code> detectado:</span>
                <span className={`font-semibold ${parsedResult.clicouMaisInfo ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {parsedResult.clicouMaisInfo ? 'Sim (presente no HTML)' : 'Não'}
                </span>
              </div>

              {/* Action */}
              <button
                onClick={handleAddCurrent}
                className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {hasAdded ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Adicionado à Lista de Resultados!</span>
                  </>
                ) : (
                  <>
                    <span>Adicionar aos Resultados Gerais</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Cole o HTML ao lado para visualizar a extração instantânea.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
