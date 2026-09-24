import { CnpjData, PeriodoAnterior, SituacaoSimei, SituacaoSimples } from '../types';
import { cleanCnpj, formatCnpj } from './cnpjUtils';

/**
 * Analisa o HTML retornado pela página de consulta do Simples Nacional da Receita Federal
 * (https://consopt.www8.receita.fazenda.gov.br/consultaoptantes)
 * e extrai com precisão a Situação no Simples Nacional, SIMEI e Eventos/Lançamentos Futuros
 * obtidos inclusive após a ativação do #btnMaisInfo.
 */
export function parseReceitaOptantesHtml(htmlString: string, sourceCnpjFallback?: string): CnpjData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // 1. Extração do CNPJ
  let cnpjRaw = '';
  let cnpjFormatted = '';

  // Procura por texto ou campo contendo CNPJ
  const bodyText = doc.body ? doc.body.textContent || '' : htmlString;
  
  // Procura padrão formatado: XX.XXX.XXX/XXXX-XX
  const cnpjMatch = bodyText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cnpjMatch) {
    cnpjFormatted = cnpjMatch[0];
    cnpjRaw = cleanCnpj(cnpjFormatted);
  } else if (sourceCnpjFallback) {
    cnpjRaw = cleanCnpj(sourceCnpjFallback);
    cnpjFormatted = formatCnpj(cnpjRaw);
  }

  // Se houver input de CNPJ na tela
  if (!cnpjRaw) {
    const cnpjInput = doc.querySelector<HTMLInputElement>('#Cnpj, input[name="Cnpj"]');
    if (cnpjInput && cnpjInput.value) {
      cnpjRaw = cleanCnpj(cnpjInput.value);
      cnpjFormatted = formatCnpj(cnpjRaw);
    }
  }

  // 2. Extração da Razão Social / Nome Empresarial
  let razaoSocial = 'Não identificada';
  const razaoMatch = bodyText.match(/Nome\s+Empresarial\s*:\s*([^\r\n<]+)/i) ||
                     bodyText.match(/Razão\s+Social\s*:\s*([^\r\n<]+)/i);
  if (razaoMatch && razaoMatch[1]) {
    razaoSocial = razaoMatch[1].trim();
  } else {
    // Tenta encontrar em divs ou células de tabela
    const strongs = doc.querySelectorAll('strong, b, span.label-titulo');
    for (const el of Array.from(strongs)) {
      const text = el.textContent?.toLowerCase() || '';
      if (text.includes('nome empresarial') || text.includes('razão social')) {
        const parent = el.parentElement;
        if (parent) {
          const full = parent.textContent || '';
          const parts = full.split(':');
          if (parts.length > 1 && parts[1].trim()) {
            razaoSocial = parts[1].trim();
            break;
          }
        }
      }
    }
  }

  // 3. Extração da Situação no Simples Nacional
  let situacaoSimples: SituacaoSimples = 'NAO_OPTANTE';
  let situacaoSimplesDesc = 'Não informado';
  let dataOpcaoSimples: string | undefined;
  let dataExclusaoSimples: string | undefined;

  const simplesRegex = /Situação\s+no\s+Simples\s+Nacional\s*:\s*([^\r\n<]+)/i;
  const simplesMatch = bodyText.match(simplesRegex);

  if (simplesMatch && simplesMatch[1]) {
    situacaoSimplesDesc = simplesMatch[1].trim();
  } else {
    // Busca por nós do DOM
    const allElements = doc.querySelectorAll('div, p, span, td');
    for (const el of Array.from(allElements)) {
      const text = el.textContent || '';
      if (text.includes('Situação no Simples Nacional:')) {
        const parts = text.split('Situação no Simples Nacional:');
        if (parts[1]) {
          situacaoSimplesDesc = parts[1].trim().split('\n')[0].trim();
          break;
        }
      }
    }
  }

  const lowerSimples = situacaoSimplesDesc.toLowerCase();
  if (lowerSimples.includes('optante pelo simples nacional')) {
    if (lowerSimples.includes('não') || lowerSimples.includes('nao')) {
      situacaoSimples = 'NAO_OPTANTE';
    } else {
      situacaoSimples = 'OPTANTE';
      const dateMatch = situacaoSimplesDesc.match(/desde\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch) {
        dataOpcaoSimples = dateMatch[1];
      }
    }
  } else if (lowerSimples.includes('excluída') || lowerSimples.includes('excluida')) {
    situacaoSimples = 'EXCLUIDA';
    const dateMatch = situacaoSimplesDesc.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      dataExclusaoSimples = dateMatch[1];
    }
  } else if (lowerSimples.includes('não optante') || lowerSimples.includes('nao optante')) {
    situacaoSimples = 'NAO_OPTANTE';
  }

  // 4. Extração da Situação no SIMEI
  let situacaoSimei: SituacaoSimei = 'NAO_OPTANTE_SIMEI';
  let situacaoSimeiDesc = 'NÃO optante pelo SIMEI';
  let dataOpcaoSimei: string | undefined;

  const simeiMatch = bodyText.match(/Situação\s+no\s+SIMEI\s*:\s*([^\r\n<]+)/i);
  if (simeiMatch && simeiMatch[1]) {
    situacaoSimeiDesc = simeiMatch[1].trim();
    const lowerSimei = situacaoSimeiDesc.toLowerCase();
    if (lowerSimei.includes('optante pelo simei') && !lowerSimei.includes('não') && !lowerSimei.includes('nao')) {
      situacaoSimei = 'OPTANTE_SIMEI';
      const dateMatch = situacaoSimeiDesc.match(/desde\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch) dataOpcaoSimei = dateMatch[1];
    } else if (lowerSimei.includes('desenquadrado')) {
      situacaoSimei = 'DESENQUADRADO';
    }
  }

  // 5. Extração de Lançamentos / Eventos Futuros (Foco do usuário)
  // O botão #btnMaisInfo revela a seção "Eventos Futuros" ou "Agendamentos"
  let temEventoFuturo = false;
  let eventoFuturoTipo: 'EXCLUSAO_AGENDADA' | 'OPCAO_AGENDADA' | 'DESENQUADRAMENTO_AGENDADO' | 'OUTRO' | undefined;
  let eventoFuturoTitulo: string | undefined;
  let eventoFuturoDataEfeito: string | undefined;
  let eventoFuturoDetalhes: string | undefined;

  // Busca seções de eventos futuros
  const eventosFuturosRegex = /(?:Eventos\s+Futuros|Lançamentos\s+Futuros|Agendamentos)[\s\S]*?(?:Períodos\s+Anteriores|Dados\s+do\s+CNPJ|Opções\s+Anteriores|$)/i;
  const eventosBlockMatch = bodyText.match(eventosFuturosRegex);
  const blockContent = eventosBlockMatch ? eventosBlockMatch[0] : bodyText;

  // Frases que indicam ausência de eventos futuros:
  const noEventPhrases = [
    'não existem eventos futuros cadastrados',
    'nao existem eventos futuros cadastrados',
    'não existem eventos futuros',
    'nao existem eventos futuros',
    'não há eventos futuros',
    'não existem agendamentos',
    'nenhum evento futuro cadastrado'
  ];

  const hasNoEventsStatement = noEventPhrases.some(phrase => blockContent.toLowerCase().includes(phrase));

  // Indicadores de evento futuro real existente:
  const exclusaoFuturaMatch = blockContent.match(/(?:Exclus[ãa]o\s+do\s+Simples\s+Nacional\s+(?:com\s+efeitos\s+a\s+partir\s+de|em)\s+(\d{2}\/\d{2}\/\d{4})[^\n\r<]*)/i);
  const opcaoFuturaMatch = blockContent.match(/(?:Opç[ãa]o\s+com\s+efeitos\s+a\s+partir\s+de\s+(\d{2}\/\d{2}\/\d{4})[^\n\r<]*)/i);
  const desenquadramentoMatch = blockContent.match(/(?:Desenquadramento\s+do\s+SIMEI\s+(?:com\s+efeitos\s+a\s+partir\s+de|em)\s+(\d{2}\/\d{2}\/\d{4})[^\n\r<]*)/i);

  if (exclusaoFuturaMatch) {
    temEventoFuturo = true;
    eventoFuturoTipo = 'EXCLUSAO_AGENDADA';
    eventoFuturoTitulo = exclusaoFuturaMatch[0].trim();
    eventoFuturoDataEfeito = exclusaoFuturaMatch[1];
    eventoFuturoDetalhes = `Atenção: A empresa possui exclusão do Simples Nacional agendada para ${eventoFuturoDataEfeito}. Necessita de regularização de débitos ou defesa administrativa.`;
  } else if (opcaoFuturaMatch) {
    temEventoFuturo = true;
    eventoFuturoTipo = 'OPCAO_AGENDADA';
    eventoFuturoTitulo = opcaoFuturaMatch[0].trim();
    eventoFuturoDataEfeito = opcaoFuturaMatch[1];
    eventoFuturoDetalhes = `Opção pelo Simples Nacional solicitada com deferimento agendado para vigorar a partir de ${eventoFuturoDataEfeito}.`;
  } else if (desenquadramentoMatch) {
    temEventoFuturo = true;
    eventoFuturoTipo = 'DESENQUADRAMENTO_AGENDADO';
    eventoFuturoTitulo = desenquadramentoMatch[0].trim();
    eventoFuturoDataEfeito = desenquadramentoMatch[1];
    eventoFuturoDetalhes = `Desenquadramento do SIMEI agendado para ${eventoFuturoDataEfeito}. A empresa passará a recolher como ME/EPP do Simples Nacional.`;
  } else if (!hasNoEventsStatement && (blockContent.includes('Exclusão agendada') || blockContent.includes('Efeitos a partir de'))) {
    temEventoFuturo = true;
    eventoFuturoTipo = 'OUTRO';
    eventoFuturoTitulo = 'Lançamento/Evento Futuro Detectado';
    eventoFuturoDetalhes = blockContent.slice(0, 200).trim();
  }

  // 6. Períodos Anteriores revelados pelo botão #btnMaisInfo
  const periodosAnteriores: PeriodoAnterior[] = [];
  const tabelas = doc.querySelectorAll('table');
  for (const table of Array.from(tabelas)) {
    const thText = table.textContent || '';
    if (thText.includes('Opções Anteriores') || thText.includes('Períodos Anteriores') || thText.includes('Exclusões')) {
      const rows = table.querySelectorAll('tbody tr');
      for (const row of Array.from(rows)) {
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '');
        if (cells.length >= 2) {
          periodosAnteriores.push({
            tipo: cells[0] || 'Período',
            periodo: cells[1] || '',
            motivo: cells[2] || undefined
          });
        }
      }
    }
  }

  // Verifica se o botão #btnMaisInfo está presente no documento
  const hasBtnMaisInfo = !!doc.querySelector('#btnMaisInfo') || htmlString.includes('id="btnMaisInfo"');

  return {
    id: `cnpj-${cnpjRaw || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cnpj: cnpjFormatted || formatCnpj(cnpjRaw),
    cnpjRaw: cnpjRaw || '00000000000000',
    razaoSocial: razaoSocial || 'EMPRESA NÃO IDENTIFICADA',
    situacaoSimples,
    situacaoSimplesDesc,
    dataOpcaoSimples,
    dataExclusaoSimples,
    situacaoSimei,
    situacaoSimeiDesc,
    dataOpcaoSimei,
    temEventoFuturo,
    eventoFuturoTipo,
    eventoFuturoTitulo,
    eventoFuturoDataEfeito,
    eventoFuturoDetalhes,
    clicouMaisInfo: hasBtnMaisInfo,
    periodosAnteriores,
    fonteOrigem: 'HTML_UPLOAD',
    dataConsulta: new Date().toLocaleString('pt-BR'),
    rawHtmlSnippet: htmlString.slice(0, 1500)
  };
}
