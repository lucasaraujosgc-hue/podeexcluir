import React from 'react';
import { X, AlertTriangle, CheckCircle2, Building, Calendar, Info, FileText, Copy, Check, ExternalLink } from 'lucide-react';
import { CnpjData } from '../types';

interface CompanyDetailModalProps {
  company: CnpjData | null;
  onClose: () => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  company,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!company) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(company.cnpj);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 text-sm font-semibold tracking-wide">
                {company.cnpj}
              </span>
              <button
                onClick={handleCopy}
                title="Copiar CNPJ"
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
              {company.razaoSocial}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* LANÇAMENTO FUTURO BANNER - DESTAQUE MÁXIMO */}
          <div className={`p-4 rounded-xl border transition-all ${
            company.temEventoFuturo
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-start gap-3">
              {company.temEventoFuturo ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              )}
              
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lançamento / Evento Futuro
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                    company.temEventoFuturo
                      ? 'bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {company.temEventoFuturo ? 'SIM - EVENTO ENCONTRADO' : 'NÃO POSSUI'}
                  </span>
                </div>

                {company.temEventoFuturo ? (
                  <div className="space-y-1 text-xs text-amber-950">
                    <p className="font-bold text-sm text-amber-900">
                      {company.eventoFuturoTitulo}
                    </p>
                    {company.eventoFuturoDataEfeito && (
                      <p className="font-medium text-amber-900">
                        Data de Vigência dos Efeitos: <span className="font-bold underline">{company.eventoFuturoDataEfeito}</span>
                      </p>
                    )}
                    {company.eventoFuturoDetalhes && (
                      <p className="text-amber-800 leading-relaxed bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 mt-1">
                        {company.eventoFuturoDetalhes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-800 font-medium">
                    Consulta confirmou ausência de eventos ou exclusões futuras cadastradas na base da Receita Federal para este CNPJ.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dados Gerais do Simples e SIMEI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Simples Nacional */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Simples Nacional
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  company.situacaoSimples === 'OPTANTE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : company.situacaoSimples === 'EXCLUIDA'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {company.situacaoSimples}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {company.situacaoSimplesDesc}
              </p>
              {company.dataOpcaoSimples && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Início da opção: <strong>{company.dataOpcaoSimples}</strong></span>
                </div>
              )}
            </div>

            {/* SIMEI */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  SIMEI (MEI)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  company.situacaoSimei === 'OPTANTE_SIMEI'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {company.situacaoSimei}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {company.situacaoSimeiDesc}
              </p>
            </div>

          </div>

          {/* Dados Revelados pelo botão #btnMaisInfo: Períodos Anteriores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Histórico Extraído do Botão Mais Informações (#btnMaisInfo)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {company.periodosAnteriores.length} registros
              </span>
            </div>

            {company.periodosAnteriores.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Tipo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Período / Vigência</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Motivo / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {company.periodosAnteriores.map((p, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-slate-800">{p.tipo}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{p.periodo}</td>
                        <td className="px-3 py-2 text-slate-600">{p.motivo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic text-center">
                Não constam períodos anteriores registrados para este CNPJ.
              </div>
            )}
          </div>

          {/* Metadados da Consulta */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Data da Auditoria: {company.dataConsulta}</span>
            <span>Origem: {company.fonteOrigem}</span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
