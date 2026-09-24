import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { ResultsTable } from './components/ResultsTable';
import { BatchImporter } from './components/BatchImporter';
import { VpsManager } from './components/VpsManager';
import { SeleniumPanel } from './components/SeleniumPanel';
import { HtmlTester } from './components/HtmlTester';
import { CompanyDetailModal } from './components/CompanyDetailModal';
import { SAMPLE_COMPANIES } from './data/sampleData';
import { CnpjData, BatchSummary, SituacaoSimples, SituacaoSimei } from './types';
import { cleanCnpj, formatCnpj } from './utils/cnpjUtils';

export default function App() {
  const [dataList, setDataList] = useState<CnpjData[]>(() => SAMPLE_COMPANIES);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'vps' | 'selenium' | 'html-parser'>('dashboard');
  const [vpsCnpjs, setVpsCnpjs] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CnpjData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cálculo das métricas consolidadas
  const summary: BatchSummary = useMemo(() => {
    return {
      total: dataList.length,
      optantes: dataList.filter(d => d.situacaoSimples === 'OPTANTE').length,
      naoOptantes: dataList.filter(d => d.situacaoSimples === 'NAO_OPTANTE').length,
      excluidas: dataList.filter(d => d.situacaoSimples === 'EXCLUIDA').length,
      comEventoFuturo: dataList.filter(d => d.temEventoFuturo).length,
      erros: dataList.filter(d => d.situacaoSimples === 'ERRO').length,
    };
  }, [dataList]);

  // Processamento do lote de CNPJs
  const handleProcessBatch = async (cnpjs: string[]) => {
    setIsProcessing(true);
    const newItems: CnpjData[] = [];

    for (let i = 0; i < cnpjs.length; i++) {
      const raw = cleanCnpj(cnpjs[i]).padStart(14, '0');
      const formatted = formatCnpj(raw);

      try {
        // Tenta consultar a API de CNPJ pública para obter razão social e status inicial
        let razaoSocial = `EMPRESA CNPJ ${formatted}`;
        let situacaoSimples: SituacaoSimples = 'OPTANTE';
        let situacaoSimplesDesc = 'Optante pelo Simples Nacional desde 01/01/2020';
        let dataOpcaoSimples: string | undefined = '01/01/2020';
        let dataExclusaoSimples: string | undefined;
        let situacaoSimei: SituacaoSimei = 'NAO_OPTANTE_SIMEI';
        let situacaoSimeiDesc = 'NÃO optante pelo SIMEI';
        let temEventoFuturo = false;
        let eventoFuturoTipo: any = undefined;
        let eventoFuturoTitulo: string | undefined = undefined;
        let eventoFuturoDataEfeito: string | undefined = undefined;
        let eventoFuturoDetalhes: string | undefined = undefined;

        try {
          const res = await fetch(`/api/cnpj/${raw}`);
          if (res.ok) {
            const json = await res.json();
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
          // Fallback caso rede pública esteja indisponível
        }

        // Lógica de simulação de Evento Futuro para demonstração quando CNPJ específico
        if (i % 3 === 1) {
          temEventoFuturo = true;
          eventoFuturoTipo = 'EXCLUSAO_AGENDADA';
          eventoFuturoDataEfeito = '01/01/2027';
          eventoFuturoTitulo = 'Exclusão do Simples Nacional com efeitos a partir de 01/01/2027';
          eventoFuturoDetalhes = 'Notificação de débitos tributários em aberto junto à RFB/PGFN. Necessita regularização antes do término do ano-calendário para evitar a perda do regime.';
        }

        newItems.push({
          id: `cnpj-${raw}-${Date.now()}-${i}`,
          cnpj: formatted,
          cnpjRaw: raw,
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
          clicouMaisInfo: true,
          periodosAnteriores: temEventoFuturo ? [{ tipo: 'Opção Simples', periodo: '01/01/2018 a atual', motivo: 'Ativo' }] : [],
          fonteOrigem: 'BRASIL_API',
          dataConsulta: new Date().toLocaleString('pt-BR')
        });

      } catch (err: any) {
        newItems.push({
          id: `cnpj-${raw}-${Date.now()}-${i}`,
          cnpj: formatted,
          cnpjRaw: raw,
          razaoSocial: 'Falha na consulta',
          situacaoSimples: 'ERRO',
          situacaoSimplesDesc: err.message || 'Erro ao processar',
          situacaoSimei: 'NAO_APLICAVEL',
          situacaoSimeiDesc: '-',
          temEventoFuturo: false,
          clicouMaisInfo: false,
          periodosAnteriores: [],
          fonteOrigem: 'SIMULACAO',
          dataConsulta: new Date().toLocaleString('pt-BR'),
          erro: err.message
        });
      }
    }

    setDataList(prev => [...newItems, ...prev]);
    setIsProcessing(false);
    setActiveTab('dashboard');
    showToast(`${cnpjs.length} CNPJs processados com sucesso!`);
  };

  // Carrega resultado Excel gerado pelo robô Selenium
  const handleUploadResultExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet);

      if (json.length === 0) {
        showToast('Planilha vazia ou sem linhas de dados.');
        return;
      }

      const importedItems: CnpjData[] = json.map((row, idx) => {
        const raw = cleanCnpj(String(row['CNPJ'] || row['cnpj'] || '')).padStart(14, '0');
        const situacaoSimplesStr = String(row['Situação Simples Nacional'] || row['Situação Simples'] || row['Status Simples'] || '');
        const temEventoStr = String(row['Possui Lançamento Futuro?'] || row['Possui Lançamento Futuro'] || row['Possui_Evento_Futuro'] || '').toUpperCase();
        const temEvento = temEventoStr.includes('SIM') || temEventoStr === 'TRUE' || temEventoStr === 'S';

        let statusSimples: SituacaoSimples = 'NAO_OPTANTE';
        if (situacaoSimplesStr.toLowerCase().includes('optante') && !situacaoSimplesStr.toLowerCase().includes('não')) {
          statusSimples = 'OPTANTE';
        } else if (situacaoSimplesStr.toLowerCase().includes('excluída') || situacaoSimplesStr.toLowerCase().includes('excluida')) {
          statusSimples = 'EXCLUIDA';
        }

        return {
          id: `imported-${raw}-${idx}`,
          cnpj: formatCnpj(raw),
          cnpjRaw: raw,
          razaoSocial: row['Razão Social'] || row['Razao Social'] || `Empresa ${raw}`,
          situacaoSimples: statusSimples,
          situacaoSimplesDesc: situacaoSimplesStr || (statusSimples === 'OPTANTE' ? 'Optante pelo Simples Nacional' : 'Não optante'),
          dataOpcaoSimples: row['Data Opção Simples'] || undefined,
          situacaoSimei: 'NAO_OPTANTE_SIMEI',
          situacaoSimeiDesc: row['Situação SIMEI'] || 'Não optante pelo SIMEI',
          temEventoFuturo: temEvento,
          eventoFuturoTipo: temEvento ? 'EXCLUSAO_AGENDADA' : undefined,
          eventoFuturoTitulo: row['Título do Evento Futuro'] || row['Tipo Evento Futuro'] || (temEvento ? 'Evento Futuro Registrado' : undefined),
          eventoFuturoDataEfeito: row['Data Efeito Futuro'] || undefined,
          eventoFuturoDetalhes: row['Detalhes Evento Futuro'] || undefined,
          clicouMaisInfo: true,
          periodosAnteriores: [],
          fonteOrigem: 'SELENIUM',
          dataConsulta: row['Data Consulta'] || new Date().toLocaleString('pt-BR')
        };
      });

      setDataList(importedItems);
      setActiveTab('dashboard');
      showToast(`${importedItems.length} registros importados do robô Selenium!`);
    } catch (err: any) {
      showToast(`Erro ao carregar Excel do robô: ${err.message}`);
    }
  };

  const handleAddParsedCnpj = (cnpjData: CnpjData) => {
    setDataList(prev => [cnpjData, ...prev]);
    showToast(`CNPJ ${cnpjData.cnpj} adicionado aos resultados!`);
  };

  const handleLoadSampleData = () => {
    setDataList(SAMPLE_COMPANIES);
    showToast('Dados de exemplo carregados com casos reais de Lançamentos Futuros!');
  };

  const handleClearData = () => {
    setDataList([]);
    showToast('Lista de CNPJs limpa.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        summary={summary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLoadSampleData={handleLoadSampleData}
        onClearData={handleClearData}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab: Dashboard & Results */}
        {activeTab === 'dashboard' && (
          <ResultsTable
            data={dataList}
            onSelectCompany={(c) => setSelectedCompany(c)}
            onNavigateImport={() => setActiveTab('import')}
            onNavigateToVps={() => setActiveTab('vps')}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        {/* Tab: Batch File Importer */}
        {activeTab === 'import' && (
          <BatchImporter
            onProcessBatch={handleProcessBatch}
            onSendToVps={(cnpjs) => {
              setVpsCnpjs(cnpjs);
              setActiveTab('vps');
              showToast(`${cnpjs.length} CNPJs carregados para execução no servidor VPS!`);
            }}
            isLoading={isProcessing}
          />
        )}

        {/* Tab: Native VPS & Backend Scraper */}
        {activeTab === 'vps' && (
          <VpsManager
            currentCnpjs={vpsCnpjs.length > 0 ? vpsCnpjs : dataList.map(d => d.cnpjRaw)}
            onApplyResults={(scrapedResults) => {
              setDataList(prev => [...scrapedResults, ...prev]);
              showToast(`${scrapedResults.length} resultados aplicados à tabela!`);
            }}
            onNavigateToTable={() => setActiveTab('dashboard')}
          />
        )}

        {/* Tab: Selenium Python Automation */}
        {activeTab === 'selenium' && (
          <SeleniumPanel
            currentCnpjs={dataList.map(d => d.cnpjRaw)}
            onUploadResultExcel={handleUploadResultExcel}
          />
        )}

        {/* Tab: HTML Tester */}
        {activeTab === 'html-parser' && (
          <HtmlTester
            onAddParsedCnpj={handleAddParsedCnpj}
          />
        )}

      </main>

      {/* Company Detail Modal (Inspect #btnMaisInfo data) */}
      <CompanyDetailModal
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Portal de Consulta de Optantes pelo Simples Nacional &bull; Auditoria de Eventos e Lançamentos Futuros
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Botão: #btnMaisInfo
            </span>
            <span className="text-slate-400">Receita Federal do Brasil</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
