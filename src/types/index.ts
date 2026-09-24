export type SituacaoSimples = 'OPTANTE' | 'NAO_OPTANTE' | 'EXCLUIDA' | 'PENDENTE' | 'ERRO';
export type SituacaoSimei = 'OPTANTE_SIMEI' | 'NAO_OPTANTE_SIMEI' | 'DESENQUADRADO' | 'NAO_APLICAVEL';

export interface PeriodoAnterior {
  tipo: string; // 'Opção' ou 'Exclusão'
  periodo?: string;
  dataInicio?: string;
  dataFim?: string;
  motivo?: string;
}

export interface CnpjData {
  id: string;
  cnpj: string; // Formatado: 00.000.000/0000-00
  cnpjRaw: string; // Apenas números: 14 dígitos
  razaoSocial: string;
  
  // Situação no Simples Nacional
  situacaoSimples: SituacaoSimples;
  situacaoSimplesDesc: string; // Ex: "Optante pelo Simples Nacional desde 01/01/2018"
  dataOpcaoSimples?: string;
  dataExclusaoSimples?: string;
  
  // Situação no SIMEI
  situacaoSimei: SituacaoSimei;
  situacaoSimeiDesc: string; // Ex: "NÃO optante pelo SIMEI" ou "Optante pelo SIMEI desde..."
  dataOpcaoSimei?: string;
  
  // Lançamentos / Eventos Futuros (Foco solicitado pelo usuário)
  temEventoFuturo: boolean;
  eventoFuturoTipo?: 'EXCLUSAO_AGENDADA' | 'OPCAO_AGENDADA' | 'DESENQUADRAMENTO_AGENDADO' | 'OUTRO';
  eventoFuturoTitulo?: string; // Ex: "Exclusão do Simples Nacional com efeitos a partir de 01/01/2025"
  eventoFuturoDataEfeito?: string;
  eventoFuturoDetalhes?: string;
  
  // Dados revelados pelo #btnMaisInfo
  clicouMaisInfo: boolean;
  periodosAnteriores: PeriodoAnterior[];
  
  // Metadados da consulta
  fonteOrigem: 'SELENIUM' | 'HTML_UPLOAD' | 'BRASIL_API' | 'SIMULACAO';
  dataConsulta: string;
  rawHtmlSnippet?: string;
  erro?: string;
}

export interface BatchSummary {
  total: number;
  optantes: number;
  naoOptantes: number;
  excluidas: number;
  comEventoFuturo: number;
  erros: number;
}
