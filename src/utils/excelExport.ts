import * as XLSX from 'xlsx';
import { CnpjData } from '../types';

/**
 * Exporta os resultados consolidados para uma planilha Excel (.xlsx) completa
 */
export function exportToExcel(data: CnpjData[], fileName = 'resultado_consulta_simples_nacional.xlsx') {
  const formattedRows = data.map((item, index) => ({
    '#': index + 1,
    'CNPJ': item.cnpj,
    'CNPJ (Apenas Números)': item.cnpjRaw,
    'Razão Social': item.razaoSocial,
    'Situação Simples Nacional': item.situacaoSimplesDesc,
    'Status Simples': item.situacaoSimples,
    'Data Opção Simples': item.dataOpcaoSimples || '-',
    'Data Exclusão Simples': item.dataExclusaoSimples || '-',
    'Situação SIMEI': item.situacaoSimeiDesc,
    'Possui Lançamento/Evento Futuro?': item.temEventoFuturo ? 'SIM' : 'NÃO',
    'Tipo de Evento Futuro': item.eventoFuturoTipo || (item.temEventoFuturo ? 'Evento Detectado' : 'Nenhum'),
    'Título do Evento Futuro': item.eventoFuturoTitulo || '-',
    'Data Efeito Futuro': item.eventoFuturoDataEfeito || '-',
    'Detalhes Evento Futuro': item.eventoFuturoDetalhes || '-',
    'Qtd Períodos Anteriores': item.periodosAnteriores.length,
    'Origem dos Dados': item.fonteOrigem,
    'Data da Consulta': item.dataConsulta,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // Ajusta larguras de coluna
  const colWidths = [
    { wch: 5 },  // #
    { wch: 20 }, // CNPJ
    { wch: 18 }, // CNPJ números
    { wch: 38 }, // Razão Social
    { wch: 38 }, // Situação Simples
    { wch: 16 }, // Status
    { wch: 18 }, // Data Opção
    { wch: 18 }, // Data Exclusão
    { wch: 28 }, // Situação SIMEI
    { wch: 30 }, // Possui Lançamento Futuro
    { wch: 25 }, // Tipo Evento Futuro
    { wch: 35 }, // Título Evento Futuro
    { wch: 18 }, // Data Efeito
    { wch: 50 }, // Detalhes
    { wch: 22 }, // Qtd Períodos
    { wch: 16 }, // Origem
    { wch: 20 }, // Data Consulta
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Optantes Simples Nacional');

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exporta para arquivo CSV
 */
export function exportToCsv(data: CnpjData[], fileName = 'resultado_consulta_simples_nacional.csv') {
  const formattedRows = data.map((item, index) => ({
    '#': index + 1,
    'CNPJ': item.cnpj,
    'Razao_Social': item.razaoSocial,
    'Situacao_Simples': item.situacaoSimplesDesc,
    'Status_Simples': item.situacaoSimples,
    'Situacao_SIMEI': item.situacaoSimeiDesc,
    'Possui_Evento_Futuro': item.temEventoFuturo ? 'SIM' : 'NAO',
    'Titulo_Evento_Futuro': item.eventoFuturoTitulo || '',
    'Data_Efeito_Futuro': item.eventoFuturoDataEfeito || '',
    'Detalhes_Evento_Futuro': item.eventoFuturoDetalhes || '',
    'Data_Consulta': item.dataConsulta,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Cria e baixa um modelo limpo de planilha XLSX para importação de CNPJs
 */
export function downloadTemplateExcel() {
  const templateData = [
    { 'CNPJ': '00.000.000/0001-91', 'Razao_Social': 'Banco do Brasil SA (Exemplo)', 'Observacao': 'Cliente Matriz' },
    { 'CNPJ': '33.000.167/0001-01', 'Razao_Social': 'Petroleo Brasileiro SA (Exemplo)', 'Observacao': 'Não Optante' },
    { 'CNPJ': '07.526.557/0001-00', 'Razao_Social': 'Ambev S.A. (Exemplo)', 'Observacao': 'Grande Porte' },
    { 'CNPJ': '12.345.678/0001-90', 'Razao_Social': 'Empresa Exemplo Simples LTDA', 'Observacao': 'Verificar Evento Futuro' },
    { 'CNPJ': '98.765.432/0001-10', 'Razao_Social': 'Comercio e Servicos Alfa ME', 'Observacao': 'Optante' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [{ wch: 24 }, { wch: 35 }, { wch: 30 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CNPJs para Consulta');

  XLSX.writeFile(workbook, 'modelo_importacao_cnpjs.xlsx');
}
