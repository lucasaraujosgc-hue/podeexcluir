import React, { useState } from 'react';
import { Search, Download, Filter, AlertTriangle, CheckCircle2, ChevronRight, Eye, Copy, Check, FileSpreadsheet, ArrowUpDown, Server } from 'lucide-react';
import { CnpjData } from '../types';
import { exportToExcel, exportToCsv } from '../utils/excelExport';

interface ResultsTableProps {
  data: CnpjData[];
  onSelectCompany: (company: CnpjData) => void;
  onNavigateImport: () => void;
  onNavigateToVps?: () => void;
  onLoadSampleData: () => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  onSelectCompany,
  onNavigateImport,
  onNavigateToVps,
  onLoadSampleData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'OPTANTE' | 'NAO_OPTANTE' | 'EXCLUIDA' | 'COM_EVENTO_FUTURO'>('TODOS');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtros
  const filteredData = data.filter(item => {
    // Busca por termo
    const search = searchTerm.toLowerCase().trim();
    const matchesSearch = !search || 
      item.cnpj.toLowerCase().includes(search) ||
      item.cnpjRaw.includes(search) ||
      item.razaoSocial.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    // Filtro por status
    if (statusFilter === 'COM_EVENTO_FUTURO') {
      return item.temEventoFuturo;
    }
    if (statusFilter === 'OPTANTE') {
      return item.situacaoSimples === 'OPTANTE';
    }
    if (statusFilter === 'NAO_OPTANTE') {
      return item.situacaoSimples === 'NAO_OPTANTE';
    }
    if (statusFilter === 'EXCLUIDA') {
      return item.situacaoSimples === 'EXCLUIDA';
    }

    return true;
  });

  const handleCopy = (cnpj: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cnpj);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const countComEvento = data.filter(d => d.temEventoFuturo).length;
  const countOptantes = data.filter(d => d.situacaoSimples === 'OPTANTE').length;
  const countNaoOptantes = data.filter(d => d.situacaoSimples === 'NAO_OPTANTE').length;
  const countExcluidas = data.filter(d => d.situacaoSimples === 'EXCLUIDA').length;

  return (
    <div className="space-y-5">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        <div 
          onClick={() => setStatusFilter('TODOS')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            statusFilter === 'TODOS' ? 'border-slate-800 ring-2 ring-slate-800/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de CNPJs</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{data.length}</div>
          <span className="text-[11px] text-slate-400">Processados na auditoria</span>
        </div>

        <div 
          onClick={() => setStatusFilter('OPTANTE')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            statusFilter === 'OPTANTE' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Optantes Simples
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{countOptantes}</div>
          <span className="text-[11px] text-emerald-600/80">Ativos no regime</span>
        </div>

        <div 
          onClick={() => setStatusFilter('NAO_OPTANTE')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all shadow-xs ${
            statusFilter === 'NAO_OPTANTE' ? 'border-slate-700 ring-2 ring-slate-700/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Não Optantes / Excluídas
          </span>
          <div className="text-2xl font-black text-slate-700 mt-1">{countNaoOptantes + countExcluidas}</div>
          <span className="text-[11px] text-slate-400">Fora do regime</span>
        </div>

        {/* LANÇAMENTO FUTURO - O ALERTA PRINCIPAL */}
        <div 
          onClick={() => setStatusFilter('COM_EVENTO_FUTURO')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-xs ${
            statusFilter === 'COM_EVENTO_FUTURO' 
              ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-500/20' 
              : countComEvento > 0 
                ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/50' 
                : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Com Lançamento Futuro
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1">{countComEvento}</div>
          <span className="text-[11px] font-medium text-amber-800">
            {countComEvento > 0 ? 'Atenção a exclusões agendadas!' : 'Nenhum lançamento futuro'}
          </span>
        </div>

      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Toolbar: Search, Filters & Export */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por CNPJ ou Razão Social..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Export & VPS Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToVps && (
              <button
                onClick={onNavigateToVps}
                className="px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-slate-700"
              >
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Executar no Servidor VPS</span>
              </button>
            )}

            <button
              onClick={() => exportToExcel(filteredData)}
              disabled={data.length === 0}
              className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => exportToCsv(filteredData)}
              disabled={data.length === 0}
              className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filtrar:
          </span>
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'TODOS' ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            Todos ({data.length})
          </button>
          <button
            onClick={() => setStatusFilter('OPTANTE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'OPTANTE' ? 'bg-emerald-700 text-white font-semibold' : 'text-emerald-800 hover:bg-emerald-100/70'
            }`}
          >
            Optantes ({countOptantes})
          </button>
          <button
            onClick={() => setStatusFilter('NAO_OPTANTE')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'NAO_OPTANTE' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            Não Optantes ({countNaoOptantes})
          </button>
          <button
            onClick={() => setStatusFilter('EXCLUIDA')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'EXCLUIDA' ? 'bg-red-700 text-white font-semibold' : 'text-red-700 hover:bg-red-100/70'
            }`}
          >
            Excluídas ({countExcluidas})
          </button>
          <button
            onClick={() => setStatusFilter('COM_EVENTO_FUTURO')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
              statusFilter === 'COM_EVENTO_FUTURO' ? 'bg-amber-600 text-white' : 'text-amber-900 bg-amber-100 hover:bg-amber-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Com Lançamento Futuro ({countComEvento})</span>
          </button>
        </div>

        {/* Table */}
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-bold tracking-wider">CNPJ</th>
                  <th className="px-4 py-3 text-left font-bold tracking-wider">Razão Social / Nome Empresarial</th>
                  <th className="px-4 py-3 text-left font-bold tracking-wider">Situação no Simples Nacional</th>
                  <th className="px-4 py-3 text-left font-bold tracking-wider">
                    <div className="flex items-center gap-1 text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lançamento / Evento Futuro</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-bold tracking-wider">SIMEI</th>
                  <th className="px-4 py-3 text-center font-bold tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCompany(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* CNPJ with copy */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-800 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{item.cnpj}</span>
                        <button
                          onClick={(e) => handleCopy(item.cnpj, item.id, e)}
                          title="Copiar CNPJ"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-500 transition-all"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Razão Social */}
                    <td className="px-4 py-3.5 text-slate-900 font-medium max-w-xs truncate">
                      {item.razaoSocial}
                    </td>

                    {/* Situação no Simples Nacional */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                          item.situacaoSimples === 'OPTANTE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.situacaoSimples === 'EXCLUIDA'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.situacaoSimples === 'OPTANTE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span>{item.situacaoSimples}</span>
                        </span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[180px]">
                          {item.dataOpcaoSimples ? `desde ${item.dataOpcaoSimples}` : item.situacaoSimplesDesc}
                        </span>
                      </div>
                    </td>

                    {/* Lançamento / Evento Futuro (O Grande Foco) */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.temEventoFuturo ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-amber-100 text-amber-900 border border-amber-300 w-fit animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{item.eventoFuturoTipo === 'EXCLUSAO_AGENDADA' ? 'EXCLUSÃO AGENDADA' : 'EVENTO AGENDADO'}</span>
                          </span>
                          <span className="text-[11px] text-amber-900 font-semibold mt-0.5 max-w-[220px] truncate">
                            {item.eventoFuturoTitulo || `Efeitos: ${item.eventoFuturoDataEfeito}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          Nenhum
                        </span>
                      )}
                    </td>

                    {/* SIMEI */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {item.situacaoSimei === 'OPTANTE_SIMEI' ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          MEI Optante
                        </span>
                      ) : (
                        <span>Não optante</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectCompany(item); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        title="Ver dados do botão #btnMaisInfo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mais Info</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">
                {data.length === 0 ? 'Nenhum CNPJ na Lista Ainda' : 'Nenhum CNPJ corresponde aos filtros'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {data.length === 0
                  ? 'Importe sua planilha .xlsx ou .csv com CNPJs, ou carregue os dados de teste para visualizar os alertas.'
                  : 'Tente alterar os termos de busca ou remover os filtros aplicados.'}
              </p>
            </div>
            {data.length === 0 && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={onNavigateImport}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                >
                  Importar Planilha .XLSX / .CSV
                </button>
                <button
                  onClick={onLoadSampleData}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200"
                >
                  Carregar Exemplo Real
                </button>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
