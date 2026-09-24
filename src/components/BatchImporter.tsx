import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Check, AlertCircle, Download, ListFilter, Play, Sparkles, Server } from 'lucide-react';
import { parseFileForCnpjs, cleanCnpj, formatCnpj, extractCnpjsFromText, validateCnpj } from '../utils/cnpjUtils';
import { downloadTemplateExcel } from '../utils/excelExport';
import { CnpjData } from '../types';

interface BatchImporterProps {
  onProcessBatch: (cnpjs: string[], mode: 'consultar' | 'apenas_carregar') => Promise<void>;
  onSendToVps?: (cnpjs: string[]) => void;
  isLoading: boolean;
}

export const BatchImporter: React.FC<BatchImporterProps> = ({
  onProcessBatch,
  onSendToVps,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'manual'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedColumn, setDetectedColumn] = useState('');
  const [cnpjsFound, setCnpjsFound] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [manualText, setManualText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setErrorMessage('');
    setSelectedFile(file);
    setIsParsing(true);

    try {
      const result = await parseFileForCnpjs(file);
      setDetectedColumn(result.detectedColumnName);
      setCnpjsFound(result.cnpjs);
      setPreviewRows(result.rawPreview);

      if (result.cnpjs.length === 0) {
        setErrorMessage('Nenhum CNPJ com 14 dígitos pôde ser identificado nesta planilha. Verifique o formato.');
      }
    } catch (err: any) {
      setErrorMessage(`Erro ao ler arquivo: ${err.message || 'Formato não suportado'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleManualParse = () => {
    const list = extractCnpjsFromText(manualText);
    setCnpjsFound(list);
    if (list.length === 0) {
      setErrorMessage('Nenhum CNPJ de 14 dígitos encontrado no texto.');
    } else {
      setErrorMessage('');
    }
  };

  const handleStartProcessing = (mode: 'consultar' | 'apenas_carregar') => {
    if (cnpjsFound.length === 0) {
      setErrorMessage('Por favor, carregue uma lista com ao menos 1 CNPJ.');
      return;
    }
    onProcessBatch(cnpjsFound, mode);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Importador em Lote Inteligente
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Suba sua Planilha .XLSX ou .CSV de CNPJs
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Nosso sistema identifica automaticamente a coluna com os documentos, limpa caracteres especiais, valida os dígitos e prepara a extração da <strong>Situação no Simples Nacional</strong> e verificação de <strong>Lançamentos Futuros</strong>.
            </p>
          </div>

          <button
            onClick={downloadTemplateExcel}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all shrink-0 backdrop-blur-xs"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Baixar Planilha Modelo</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
        <button
          onClick={() => { setActiveTab('file'); setErrorMessage(''); }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'file'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-emerald-600" />
          <span>Upload de Arquivo (.xlsx / .csv)</span>
        </button>

        <button
          onClick={() => { setActiveTab('manual'); setErrorMessage(''); }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'manual'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Colar CNPJs Manualmente</span>
        </button>
      </div>

      {/* Tab: File Upload */}
      {activeTab === 'file' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, .txt"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  {selectedFile ? (
                    <span className="text-emerald-700 font-semibold">{selectedFile.name}</span>
                  ) : (
                    <span>Clique para selecionar ou arraste o arquivo aqui</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Texto Delimitado (.csv, .txt)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Manual Paste */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Cole a lista de CNPJs (com ou sem pontuação, separados por linha, vírgula ou espaço)
          </label>
          <textarea
            rows={6}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={`00.000.000/0001-91\n14.285.714/0001-08\n28910456000122\n33.000.167/0001-01`}
            className="w-full text-xs sm:text-sm font-mono p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleManualParse}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Identificar CNPJs no Texto</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Results / Detected summary */}
      {cnpjsFound.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{cnpjsFound.length} CNPJs Identificados e Validados</span>
              </h3>
              {detectedColumn && (
                <p className="text-xs text-slate-500">
                  Coluna detectada na planilha: <strong className="text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{detectedColumn}</strong>
                </p>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Pronto para iniciar auditoria cadastral
            </div>
          </div>

          {/* Quick List Preview of detected CNPJs */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {cnpjsFound.slice(0, 20).map((c, i) => (
                <div key={i} className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 truncate">
                  {formatCnpj(c)}
                </div>
              ))}
            </div>
            {cnpjsFound.length > 20 && (
              <p className="text-center text-xs text-slate-500 mt-2 font-medium">
                ... e mais {cnpjsFound.length - 20} CNPJs na lista
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            {onSendToVps && (
              <button
                onClick={() => onSendToVps(cnpjsFound)}
                className="px-4 py-3 text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md shadow-slate-900/10 transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Executar no Servidor VPS (Backend)</span>
              </button>
            )}

            <button
              onClick={() => handleStartProcessing('consultar')}
              disabled={isLoading}
              className="px-5 py-3 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isLoading ? 'Processando Lote...' : 'Consulta Rápida'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
