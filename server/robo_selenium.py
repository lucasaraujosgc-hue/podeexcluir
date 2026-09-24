#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Robô de Automação Selenium para Consulta de Optantes pelo Simples Nacional
Alvo: https://consopt.www8.receita.fazenda.gov.br/consultaoptantes
Ações:
  - Digita o CNPJ no campo #Cnpj
  - Aguarda resolução e clica no botão #btnMaisInfo
  - Extrai Situação no Simples Nacional e Lançamentos/Eventos Futuros
  - Salva em Excel ou gera saída JSON
"""

import sys
import json
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

def obter_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")

    chrome_bin = os.environ.get("CHROME_PATH", "/usr/bin/google-chrome-stable")
    if os.path.exists(chrome_bin):
        options.binary_location = chrome_bin

    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception:
        driver = webdriver.Chrome(options=options)
    return driver

def extrair_dados_html(html, cnpj):
    soup = BeautifulSoup(html, 'html.parser')
    texto = soup.get_text(separator=' ')

    # 1. Razão Social
    razao = "Não identificada"
    m_razao = re.search(r'(?:Nome\s+Empresarial|Raz[ãa]o\s+Social)\s*:\s*([^\n\r<]+)', texto, re.I)
    if m_razao:
        razao = m_razao.group(1).strip()

    # 2. Situação Simples
    situacao_simples = "Não informada"
    m_simples = re.search(r'Situaç[ãa]o\s+no\s+Simples\s+Nacional\s*:\s*([^\n\r<]+)', texto, re.I)
    if m_simples:
        situacao_simples = m_simples.group(1).strip()

    status_simples = "OPTANTE" if ("Optante pelo Simples" in situacao_simples and "não" not in situacao_simples.lower()) else ("EXCLUIDA" if "excluída" in situacao_simples.lower() else "NAO_OPTANTE")

    # 3. Lançamentos / Eventos Futuros (Foco primordial)
    tem_evento_futuro = False
    tipo_evento_futuro = "Nenhum"
    data_efeito = ""
    detalhes_futuro = ""

    m_exclusao = re.search(r'Exclus[ãa]o\s+do\s+Simples\s+Nacional\s+(?:com\s+efeitos\s+a\s+partir\s+de|em)\s+(\d{2}/\d{2}/\d{4})', texto, re.I)
    m_opcao = re.search(r'Opç[ãa]o\s+(?:pelo\s+Simples\s+)?com\s+efeitos\s+a\s+partir\s+de\s+(\d{2}/\d{2}/\d{4})', texto, re.I)

    if m_exclusao:
        tem_evento_futuro = True
        tipo_evento_futuro = "Exclusão Futura Agendada"
        data_efeito = m_exclusao.group(1)
        detalhes_futuro = f"Atenção: Exclusão com efeitos a partir de {data_efeito}"
    elif m_opcao:
        tem_evento_futuro = True
        tipo_evento_futuro = "Opção Futura Agendada"
        data_efeito = m_opcao.group(1)
        detalhes_futuro = f"Opção com efeitos a partir de {data_efeito}"
    elif "não existem eventos futuros" not in texto.lower() and ("exclusão agendada" in texto.lower() or "efeitos a partir de" in texto.lower()):
        tem_evento_futuro = True
        tipo_evento_futuro = "Outro Evento Futuro"

    return {
        "cnpj": cnpj,
        "razaoSocial": razao,
        "situacaoSimples": status_simples,
        "situacaoSimplesDesc": situacao_simples,
        "temEventoFuturo": tem_evento_futuro,
        "eventoFuturoTipo": tipo_evento_futuro,
        "eventoFuturoDataEfeito": data_efeito,
        "eventoFuturoDetalhes": detalhes_futuro,
        "clicouMaisInfo": True,
        "dataConsulta": time.strftime("%d/%m/%Y %H:%M:%S")
    }

def consultar_cnpjs(lista_cnpjs, headless=True, delay=2.5):
    driver = obter_driver(headless=headless)
    wait = WebDriverWait(driver, 20)
    resultados = []

    try:
        for idx, cnpj in enumerate(lista_cnpjs, 1):
            cnpj_limpo = re.sub(r'\D', '', str(cnpj)).zfill(14)
            print(f"[{idx}/{len(lista_cnpjs)}] Consultando {cnpj_limpo}...", file=sys.stderr)
            
            driver.get(URL_CONSULTA)
            time.sleep(delay)

            campo = wait.until(EC.presence_of_element_located((By.ID, "Cnpj")))
            campo.clear()
            campo.send_keys(cnpj_limpo)

            btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], .btn-verde")
            try:
                btn.click()
            except Exception:
                pass

            # Aguarda e clica em #btnMaisInfo
            try:
                btn_mais_info = WebDriverWait(driver, 35).until(
                    EC.presence_of_element_located((By.ID, "btnMaisInfo"))
                )
                driver.execute_script("arguments[0].scrollIntoView(true);", btn_mais_info)
                time.sleep(0.5)
                driver.execute_script("arguments[0].click();", btn_mais_info)
                time.sleep(1.5)
            except Exception as e:
                print(f"Aviso no botão #btnMaisInfo: {e}", file=sys.stderr)

            dados = extrair_dados_html(driver.page_source, cnpj_limpo)
            resultados.append(dados)
            time.sleep(delay)

    finally:
        driver.quit()

    return resultados

if __name__ == "__main__":
    cnpjs = sys.argv[1:] if len(sys.argv) > 1 else ["00000000000191", "14285714000108"]
    res = consultar_cnpjs(cnpjs, headless=True)
    print(json.dumps(res, indent=2, ensure_ascii=False))
