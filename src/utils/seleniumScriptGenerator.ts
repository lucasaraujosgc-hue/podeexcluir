/**
 * Gera o script completo em Python com Selenium WebDriver
 * configurado para consultar https://consopt.www8.receita.fazenda.gov.br/consultaoptantes,
 * preencher o CNPJ, clicar em #btnMaisInfo e extrair a Situação no Simples Nacional
 * e se existe algum Lançamento/Evento Futuro.
 */
export function generatePythonSeleniumScript(options: {
  cnpjs?: string[];
  inputFileName?: string;
  outputFileName?: string;
  headless?: boolean;
  delaySeconds?: number;
}): string {
  const {
    cnpjs = [],
    inputFileName = 'cnpjs_para_consulta.xlsx',
    outputFileName = 'resultado_simples_nacional.xlsx',
    headless = false,
    delaySeconds = 3
  } = options;

  const cnpjListCode = cnpjs.length > 0 
    ? `    # CNPJs fornecidos no app:\n    lista_cnpjs = [\n` + cnpjs.map(c => `        "${c}",`).join('\n') + `\n    ]`
    : `    # Lendo do arquivo Excel/CSV:\n    arquivo_entrada = "${inputFileName}"\n    if os.path.exists(arquivo_entrada):\n        if arquivo_entrada.endswith('.csv'):\n            df = pd.read_csv(arquivo_entrada, dtype=str)\n        else:\n            df = pd.read_excel(arquivo_entrada, dtype=str)\n        # Detecta coluna de CNPJ\n        col_cnpj = [c for c in df.columns if 'cnpj' in c.lower() or 'doc' in c.lower()][0] if any('cnpj' in c.lower() or 'doc' in c.lower() for c in df.columns) else df.columns[0]\n        lista_cnpjs = df[col_cnpj].dropna().astype(str).str.replace(r'\\D', '', regex=True).tolist()\n    else:\n        print(f"[!] Arquivo {arquivo_entrada} não encontrado. Usando CNPJs de exemplo.")\n        lista_cnpjs = ["00000000000191", "33000167000101"]`;

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Robô de Automação com Selenium para Consulta de Optantes pelo Simples Nacional
Alvo: https://consopt.www8.receita.fazenda.gov.br/consultaoptantes
Objetivo:
  1. Consultar em lote os CNPJs
  2. Localizar e clicar no botão #btnMaisInfo ("Mais informações")
  3. Extrair Situação no Simples Nacional, Situação no SIMEI e Lançamentos/Eventos Futuros
  4. Salvar os resultados em planilha Excel (.xlsx)

Instalação de dependências:
  pip install selenium webdriver-manager pandas openpyxl beautifulsoup4
"""

import os
import re
import time
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

URL_CONSULTA = "https://consopt.www8.receita.fazenda.gov.br/consultaoptantes"

def configurar_driver(headless=${headless ? 'True' : 'False'}):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def extrair_dados_pagina(html_source, cnpj_atual):
    soup = BeautifulSoup(html_source, 'html.parser')
    texto_geral = soup.get_text(separator=' ')
    
    # 1. Razão Social
    razao_social = "Não identificada"
    match_razao = re.search(r'(?:Nome\\s+Empresarial|Raz[ãa]o\\s+Social)\\s*:\\s*([^\\n\\r<]+)', texto_geral, re.IGNORECASE)
    if match_razao:
        razao_social = match_razao.group(1).strip()

    # 2. Situação no Simples Nacional
    situacao_simples = "Não informada"
    match_simples = re.search(r'Situaç[ãa]o\\s+no\\s+Simples\\s+Nacional\\s*:\\s*([^\\n\\r<]+)', texto_geral, re.IGNORECASE)
    if match_simples:
        situacao_simples = match_simples.group(1).strip()
    
    # Classificação simplificada
    is_optante = "Optante pelo Simples Nacional" in situacao_simples and "não" not in situacao_simples.lower()
    is_excluida = "excluída" in situacao_simples.lower() or "excluida" in situacao_simples.lower()
    status_simples = "OPTANTE" if is_optante else ("EXCLUIDA" if is_excluida else "NAO_OPTANTE")

    # 3. Situação no SIMEI
    situacao_simei = "NÃO optante pelo SIMEI"
    match_simei = re.search(r'Situaç[ãa]o\\s+no\\s+SIMEI\\s*:\\s*([^\\n\\r<]+)', texto_geral, re.IGNORECASE)
    if match_simei:
        situacao_simei = match_simei.group(1).strip()

    # 4. Extração de Lançamentos / Eventos Futuros
    # Foco primordial: verificar se existe algum lançamento futuro agendado
    tem_evento_futuro = False
    tipo_evento_futuro = "Nenhum"
    data_efeito_futuro = ""
    detalhes_evento_futuro = ""

    # Procura no bloco de eventos futuros
    bloco_eventos_match = re.search(r'(?:Eventos\\s+Futuros|Lançamentos\\s+Futuros|Agendamentos)[\\s\\S]*?(?:Períodos\\s+Anteriores|Dados\\s+do\\s+CNPJ|$)', texto_geral, re.IGNORECASE)
    bloco_eventos = bloco_eventos_match.group(0) if bloco_eventos_match else texto_geral

    frases_sem_evento = [
        "não existem eventos futuros cadastrados",
        "nao existem eventos futuros cadastrados",
        "não existem eventos futuros",
        "nao existem eventos futuros",
        "não há eventos futuros",
        "nenhum evento futuro"
    ]
    sem_evento = any(frase in bloco_eventos.lower() for frase in frases_sem_evento)

    # Verifica exclusão futura agendada (ex: exclusão por débitos / ADE no fim do ano)
    match_exclusao_futura = re.search(r'Exclus[ãa]o\\s+do\\s+Simples\\s+Nacional\\s+(?:com\\s+efeitos\\s+a\\s+partir\\s+de|em)\\s+(\\d{2}/\\d{2}/\\d{4})', bloco_eventos, re.IGNORECASE)
    match_opcao_futura = re.search(r'Opç[ãa]o\\s+(?:pelo\\s+Simples\\s+Nacional\\s+)?com\\s+efeitos\\s+a\\s+partir\\s+de\\s+(\\d{2}/\\d{2}/\\d{4})', bloco_eventos, re.IGNORECASE)

    if match_exclusao_futura:
        tem_evento_futuro = True
        tipo_evento_futuro = "Exclusão Futura Agendada"
        data_efeito_futuro = match_exclusao_futura.group(1)
        detalhes_evento_futuro = f"Atenção: Exclusão do Simples Nacional agendada com efeitos a partir de {data_efeito_futuro}."
    elif match_opcao_futura:
        tem_evento_futuro = True
        tipo_evento_futuro = "Opção Futura Agendada"
        data_efeito_futuro = match_opcao_futura.group(1)
        detalhes_evento_futuro = f"Opção pelo Simples com efeitos a partir de {data_efeito_futuro}."
    elif not sem_evento and ("exclusão agendada" in bloco_eventos.lower() or "efeitos a partir de" in bloco_eventos.lower()):
        tem_evento_futuro = True
        tipo_evento_futuro = "Outro Evento Futuro Detectado"
        detalhes_evento_futuro = bloco_eventos[:250].strip()

    return {
        "CNPJ": cnpj_atual,
        "Razão Social": razao_social,
        "Situação Simples Nacional": situacao_simples,
        "Status Simples": status_simples,
        "Situação SIMEI": situacao_simei,
        "Possui Lançamento Futuro?": "SIM" if tem_evento_futuro else "NÃO",
        "Tipo Evento Futuro": tipo_evento_futuro,
        "Data Efeito Futuro": data_efeito_futuro,
        "Detalhes Evento Futuro": detalhes_evento_futuro,
        "Data Consulta": time.strftime("%d/%m/%Y %H:%M:%S")
    }

def main():
    print("=" * 65)
    print("  ROBÔ DE CONSULTA DE OPTANTES DO SIMPLES NACIONAL (SELENIUM)")
    print("  Extração de Situação Cadastral e Lançamentos Futuros")
    print("=" * 65)

${cnpjListCode}

    print(f"[*] Total de CNPJs na fila para consulta: {len(lista_cnpjs)}")
    
    driver = configurar_driver(headless=False)
    wait = WebDriverWait(driver, 15)
    resultados = []

    try:
        for idx, cnpj in enumerate(lista_cnpjs, 1):
            cnpj_limpo = re.sub(r'\\D', '', str(cnpj)).zfill(14)
            print(f"\\n[{idx}/{len(lista_cnpjs)}] Consultando CNPJ: {cnpj_limpo}...")
            
            driver.get(URL_CONSULTA)
            time.sleep(${delaySeconds})

            try:
                # 1. Localiza campo de entrada do CNPJ
                campo_cnpj = wait.until(EC.presence_of_element_located((By.ID, "Cnpj")))
                campo_cnpj.clear()
                campo_cnpj.send_keys(cnpj_limpo)
                
                # 2. Localiza botão Consultar ou hCaptcha
                btn_consultar = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], .btn-verde")
                
                print(" -> Verificando CAPTCHA...")
                # Como a Receita Federal utiliza hCaptcha, caso não haja bypass automático,
                # o script aguarda o usuário resolver ou aguarda o envio do formulário:
                try:
                    btn_consultar.click()
                except Exception:
                    pass
                
                # Aguarda até que a tela de resultado ou o botão #btnMaisInfo apareça
                print(" -> Aguardando resolução da consulta (resolva o captcha se solicitado)...")
                try:
                    # Espera pelo botão Mais Informações ou pelo painel de resultado
                    btn_mais_info = WebDriverWait(driver, 60).until(
                        EC.presence_of_element_located((By.ID, "btnMaisInfo"))
                    )
                    
                    print(" -> Botão #btnMaisInfo encontrado com sucesso!")
                    # 3. Clica em <button id="btnMaisInfo">
                    driver.execute_script("arguments[0].scrollIntoView(true);", btn_mais_info)
                    time.sleep(1)
                    try:
                        btn_mais_info.click()
                    except Exception:
                        driver.execute_script("arguments[0].click();", btn_mais_info)
                    
                    # Aguarda expansão dos dados adicionais
                    time.sleep(2)
                    
                    # 4. Extração completa dos dados
                    dados = extrair_dados_pagina(driver.page_source, cnpj_limpo)
                    print(f" [OK] Situação: {dados['Status Simples']} | Evento Futuro: {dados['Possui Lançamento Futuro?']}")
                    if dados['Possui Lançamento Futuro?'] == 'SIM':
                        print(f"      [ALERTA] {dados['Tipo Evento Futuro']} - Data: {dados['Data Efeito Futuro']}")
                    
                    resultados.append(dados)

                except Exception as e_info:
                    print(f" [!] Não foi possível expandir #btnMaisInfo ou página não respondeu: {e_info}")
                    # Tenta extrair o que estiver na tela
                    dados = extrair_dados_pagina(driver.page_source, cnpj_limpo)
                    dados["Erro"] = "Timeout aguardando resultado ou captcha"
                    resultados.append(dados)

            except Exception as e_cnpj:
                print(f" [X] Erro ao processar CNPJ {cnpj_limpo}: {e_cnpj}")
                resultados.append({
                    "CNPJ": cnpj_limpo,
                    "Razão Social": "Erro na consulta",
                    "Situação Simples Nacional": "Erro",
                    "Status Simples": "ERRO",
                    "Situacao SIMEI": "-",
                    "Possui Lançamento Futuro?": "NÃO",
                    "Detalhes Evento Futuro": str(e_cnpj),
                    "Data Consulta": time.strftime("%d/%m/%Y %H:%M:%S")
                })
            
            time.sleep(${delaySeconds})

    finally:
        driver.quit()
        print("\\n[!] Navegador fechado.")

    # 5. Salva os resultados consolidados em Excel (.xlsx)
    if resultados:
        df_resultado = pd.DataFrame(resultados)
        nome_saida = "${outputFileName}"
        df_resultado.to_excel(nome_saida, index=False)
        print(f"\\n[SUCESSO] Resultados salvos com êxito em: {os.path.abspath(nome_saida)}")
        print(f"          Total processados: {len(resultados)}")
        com_evento = sum(1 for r in resultados if r.get('Possui Lançamento Futuro?') == 'SIM')
        print(f"          Empresas com Evento Futuro: {com_evento}")

if __name__ == "__main__":
    main()
`;
}

/**
 * Gera o arquivo requirements.txt para o script Python
 */
export function generateRequirementsTxt(): string {
  return `selenium>=4.18.0
webdriver-manager>=4.0.1
pandas>=2.2.0
openpyxl>=3.1.2
beautifulsoup4>=4.12.3
`;
}

/**
 * Gera um script alternativo em Node.js com Playwright
 */
export function generatePlaywrightScript(cnpjs: string[] = []): string {
  const cnpjArrayStr = JSON.stringify(cnpjs.length > 0 ? cnpjs : ['00000000000191', '33000167000101'], null, 2);

  return `// Script Playwright para Consulta de Optantes pelo Simples Nacional
// Execute: npm install playwright xlsx
// npx playwright install chromium
// node robo_playwright.js

const { chromium } = require('playwright');
const XLSX = require('xlsx');

const CNPJS = ${cnpjArrayStr};

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const resultados = [];

  for (const cnpj of CNPJS) {
    const cnpjLimpo = cnpj.replace(/\\D/g, '').padStart(14, '0');
    console.log(\`Consultando CNPJ: \${cnpjLimpo}...\`);

    await page.goto('https://consopt.www8.receita.fazenda.gov.br/consultaoptantes');
    await page.fill('#Cnpj', cnpjLimpo);

    console.log('Resolva o CAPTCHA se necessário...');
    await page.click('button.h-captcha, button[type="submit"]');

    try {
      // Aguarda e clica em #btnMaisInfo
      await page.waitForSelector('#btnMaisInfo', { timeout: 45000 });
      await page.click('#btnMaisInfo');
      await page.waitForTimeout(1500);

      const html = await page.content();
      const temExclusaoFutura = html.includes('Exclusão') && (html.includes('efeitos a partir de') || html.includes('agendada'));
      
      resultados.push({
        CNPJ: cnpjLimpo,
        Possui_Evento_Futuro: temExclusaoFutura ? 'SIM' : 'NÃO',
        Data_Consulta: new Date().toISOString()
      });
    } catch (err) {
      console.error(\`Erro no CNPJ \${cnpjLimpo}:\`, err.message);
    }
  }

  await browser.close();
  const ws = XLSX.utils.json_to_sheet(resultados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
  XLSX.writeFile(wb, 'resultado_playwright.xlsx');
  console.log('Finalizado com sucesso!');
}

main();
`;
}
