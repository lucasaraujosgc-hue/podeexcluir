import * as XLSX from 'xlsx';

/**
 * Remove caracteres não numéricos do CNPJ
 */
export function cleanCnpj(cnpj: string): string {
  if (!cnpj) return '';
  return cnpj.toString().replace(/\D/g, '');
}

/**
 * Formata um CNPJ no padrão 00.000.000/0000-00
 */
export function formatCnpj(val: string): string {
  const digits = cleanCnpj(val).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação com algoritmo oficial do dígito verificador do CNPJ
 */
export function validateCnpj(cnpj: string): boolean {
  const s = cleanCnpj(cnpj);
  if (s.length !== 14) return false;
  
  // Elimina sequências conhecidas inválidas (00000000000000, 11111111111111, etc)
  if (/^(\d)\1{13}$/.test(s)) return false;

  let tamanho = s.length - 2;
  let numeros = s.substring(0, tamanho);
  const digitos = s.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  tamanho = tamanho + 1;
  numeros = s.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1), 10);
}

/**
 * Extrai todos os CNPJs válidos ou candidatos de um texto arbitrário
 */
export function extractCnpjsFromText(text: string): string[] {
  if (!text) return [];
  
  // Expressão regular para CNPJs com ou sem máscara
  const regexMasked = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
  const regexRaw = /\b\d{14}\b/g;
  
  const found = new Set<string>();
  
  const maskedMatches = text.match(regexMasked);
  if (maskedMatches) {
    maskedMatches.forEach(c => found.add(cleanCnpj(c)));
  }
  
  const rawMatches = text.match(regexRaw);
  if (rawMatches) {
    rawMatches.forEach(c => found.add(cleanCnpj(c)));
  }

  // Também processa linhas individuais caso estejam sem pontuação
  const lines = text.split(/[\r\n,;]+/);
  for (const line of lines) {
    const cleaned = cleanCnpj(line);
    if (cleaned.length === 14) {
      found.add(cleaned);
    }
  }

  return Array.from(found);
}

/**
 * Lê um arquivo XLSX ou CSV e detecta automaticamente a coluna que contém CNPJs
 */
export async function parseFileForCnpjs(file: File): Promise<{
  cnpjs: string[];
  detectedColumnName: string;
  totalRows: number;
  rawPreview: any[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pega a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converte para JSON com cabeçalho
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!jsonData || jsonData.length === 0) {
          return resolve({ cnpjs: [], detectedColumnName: '', totalRows: 0, rawPreview: [] });
        }

        // Tenta descobrir a coluna que contém CNPJs
        const keys = Object.keys(jsonData[0]);
        let bestKey = '';
        let maxMatches = 0;

        // Prioridade 1: nome da coluna contém termos comuns
        const commonHeaders = ['cnpj', 'c.n.p.j', 'documento', 'doc', 'empresa_cnpj', 'cpf_cnpj', 'inscricao'];
        for (const key of keys) {
          const lower = key.toLowerCase().trim();
          if (commonHeaders.some(h => lower.includes(h))) {
            bestKey = key;
            break;
          }
        }

        // Prioridade 2: inspeciona valores nas primeiras 50 linhas
        if (!bestKey) {
          for (const key of keys) {
            let matches = 0;
            const sample = jsonData.slice(0, 50);
            for (const row of sample) {
              const val = cleanCnpj(String(row[key] || ''));
              if (val.length === 14) matches++;
            }
            if (matches > maxMatches) {
              maxMatches = matches;
              bestKey = key;
            }
          }
        }

        // Se ainda não encontrou, usa a primeira coluna
        if (!bestKey && keys.length > 0) {
          bestKey = keys[0];
        }

        const cnpjsFound = new Set<string>();
        for (const row of jsonData) {
          const val = cleanCnpj(String(row[bestKey] || ''));
          if (val.length === 14) {
            cnpjsFound.add(val);
          } else {
            // Verifica se está em alguma outra coluna
            for (const k of keys) {
              const altVal = cleanCnpj(String(row[k] || ''));
              if (altVal.length === 14) {
                cnpjsFound.add(altVal);
                break;
              }
            }
          }
        }

        resolve({
          cnpjs: Array.from(cnpjsFound),
          detectedColumnName: bestKey,
          totalRows: jsonData.length,
          rawPreview: jsonData.slice(0, 5)
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
