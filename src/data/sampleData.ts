import { CnpjData } from '../types';

export const SAMPLE_COMPANIES: CnpjData[] = [
  {
    id: 'emp-1',
    cnpj: '00.000.000/0001-91',
    cnpjRaw: '00000000000191',
    razaoSocial: 'BANCO DO BRASIL SA',
    situacaoSimples: 'NAO_OPTANTE',
    situacaoSimplesDesc: 'NÃO optante pelo Simples Nacional',
    situacaoSimei: 'NAO_OPTANTE_SIMEI',
    situacaoSimeiDesc: 'NÃO optante pelo SIMEI',
    temEventoFuturo: false,
    clicouMaisInfo: true,
    periodosAnteriores: [],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:30:15'
  },
  {
    id: 'emp-2',
    cnpj: '14.285.714/0001-08',
    cnpjRaw: '14285714000108',
    razaoSocial: 'TECH SOLUTIONS ASSESSORIA E DESENVOLVIMENTO LTDA',
    situacaoSimples: 'OPTANTE',
    situacaoSimplesDesc: 'Optante pelo Simples Nacional desde 01/01/2018',
    dataOpcaoSimples: '01/01/2018',
    situacaoSimei: 'NAO_OPTANTE_SIMEI',
    situacaoSimeiDesc: 'NÃO optante pelo SIMEI',
    // CASO DE ALERTA MÁXIMO - LANÇAMENTO FUTURO DETECTADO
    temEventoFuturo: true,
    eventoFuturoTipo: 'EXCLUSAO_AGENDADA',
    eventoFuturoTitulo: 'Exclusão do Simples Nacional com efeitos a partir de 01/01/2027',
    eventoFuturoDataEfeito: '01/01/2027',
    eventoFuturoDetalhes: 'Exclusão pelo motivo de existência de débitos tributários com a Receita Federal do Brasil / Procuradoria-Geral da Fazenda Nacional (ADE nº 0984/2026). Regularize antes de 31/12 para manter a opção.',
    clicouMaisInfo: true,
    periodosAnteriores: [
      { tipo: 'Opção Anterior', periodo: '01/01/2014 a 31/12/2016', motivo: 'Exclusão por débitos' }
    ],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:32:00'
  },
  {
    id: 'emp-3',
    cnpj: '28.910.456/0001-22',
    cnpjRaw: '28910456000122',
    razaoSocial: 'RESTAURANTE E PIZZARIA SABOR BRASIL LTDA - ME',
    situacaoSimples: 'OPTANTE',
    situacaoSimplesDesc: 'Optante pelo Simples Nacional desde 10/05/2019',
    dataOpcaoSimples: '10/05/2019',
    situacaoSimei: 'NAO_OPTANTE_SIMEI',
    situacaoSimeiDesc: 'NÃO optante pelo SIMEI',
    temEventoFuturo: false,
    clicouMaisInfo: true,
    periodosAnteriores: [],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:33:10'
  },
  {
    id: 'emp-4',
    cnpj: '45.123.789/0001-55',
    cnpjRaw: '45123789000155',
    razaoSocial: 'TRANSPORTE E LOGISTICA RAPIDO EXPRESS LTDA',
    situacaoSimples: 'EXCLUIDA',
    situacaoSimplesDesc: 'Excluída do Simples Nacional em 31/12/2024',
    dataExclusaoSimples: '31/12/2024',
    situacaoSimei: 'NAO_OPTANTE_SIMEI',
    situacaoSimeiDesc: 'NÃO optante pelo SIMEI',
    // CASO DE AGENDAMENTO DE OPÇÃO FUTURA
    temEventoFuturo: true,
    eventoFuturoTipo: 'OPCAO_AGENDADA',
    eventoFuturoTitulo: 'Opção pelo Simples Nacional solicitada para vigorar em 01/01/2027',
    eventoFuturoDataEfeito: '01/01/2027',
    eventoFuturoDetalhes: 'Solicitação de nova opção pelo Simples Nacional deferida preliminarmente, com vigência condicionada à ausência de débitos impeditivos.',
    clicouMaisInfo: true,
    periodosAnteriores: [
      { tipo: 'Opção Simples', periodo: '01/01/2020 a 31/12/2024', motivo: 'Exclusão voluntária / excesso de sublimite' }
    ],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:34:40'
  },
  {
    id: 'emp-5',
    cnpj: '38.456.123/0001-99',
    cnpjRaw: '38456123000199',
    razaoSocial: 'JOAO SILVA ELETRICA E REPAROS MEI',
    situacaoSimples: 'OPTANTE',
    situacaoSimplesDesc: 'Optante pelo Simples Nacional desde 03/02/2021',
    dataOpcaoSimples: '03/02/2021',
    situacaoSimei: 'OPTANTE_SIMEI',
    situacaoSimeiDesc: 'Optante pelo SIMEI desde 03/02/2021',
    dataOpcaoSimei: '03/02/2021',
    temEventoFuturo: false,
    clicouMaisInfo: true,
    periodosAnteriores: [],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:35:12'
  },
  {
    id: 'emp-6',
    cnpj: '19.876.543/0001-11',
    cnpjRaw: '19876543000111',
    razaoSocial: 'COMERCIO VAREJISTA DE CALCADOS SILVA E SOUZA LTDA',
    situacaoSimples: 'OPTANTE',
    situacaoSimplesDesc: 'Optante pelo Simples Nacional desde 01/01/2022',
    dataOpcaoSimples: '01/01/2022',
    situacaoSimei: 'NAO_OPTANTE_SIMEI',
    situacaoSimeiDesc: 'NÃO optante pelo SIMEI',
    temEventoFuturo: true,
    eventoFuturoTipo: 'EXCLUSAO_AGENDADA',
    eventoFuturoTitulo: 'Exclusão do Simples Nacional agendada para 01/01/2027',
    eventoFuturoDataEfeito: '01/01/2027',
    eventoFuturoDetalhes: 'Notificação de exclusão recebida via DTE (Domicílio Tributário Eletrônico). O contribuinte tem até 30 dias para regularizar os débitos fiscais listados.',
    clicouMaisInfo: true,
    periodosAnteriores: [],
    fonteOrigem: 'SIMULACAO',
    dataConsulta: '24/09/2026 14:36:00'
  }
];

export const SAMPLE_HTML_RECEITA_COM_EVENTO = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Consulta Optantes</title>
    <link rel="stylesheet" href="https://ajax.aspnetcdn.com/ajax/bootstrap/3.3.7/css/bootstrap.min.css" />
</head>
<body>
<div id="conteudoPage" class="container body-content" style='background-color:#FFFFFF'>
    <div class="row">
        <h4><span class="glyphicon glyphicon-chevron-right" aria-hidden="true" style="font-size:small"></span>Consulta Optantes</h4>
    </div>
    <div class="panel panel-default">
        <div class="panel-heading"><h3 class="panel-title">Dados do CNPJ</h3></div>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-4"><strong>CNPJ:</strong> 14.285.714/0001-08</div>
                <div class="col-md-8"><strong>Nome Empresarial:</strong> TECH SOLUTIONS ASSESSORIA E DESENVOLVIMENTO LTDA</div>
            </div>
            <div class="row" style="margin-top:10px">
                <div class="col-md-12">
                    <span class="label-titulo">Situação no Simples Nacional:</span>
                    <span>Optante pelo Simples Nacional desde 01/01/2018</span>
                </div>
            </div>
            <div class="row" style="margin-top:5px">
                <div class="col-md-12">
                    <span class="label-titulo">Situação no SIMEI:</span>
                    <span>NÃO optante pelo SIMEI</span>
                </div>
            </div>
            
            <div class="row" style="margin-top:15px">
                <div class="col-md-12">
                    <button id="btnMaisInfo" class="btn btn-default" style="background-color:#d4efc9;color: #267e02;">
                        <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> Mais informações
                    </button>
                </div>
            </div>

            <!-- Conteúdo expandido após clique em #btnMaisInfo -->
            <div id="maisInfo" style="margin-top:15px">
                <div class="panel panel-danger">
                    <div class="panel-heading"><strong>Eventos Futuros</strong></div>
                    <div class="panel-body">
                        <p class="text-danger"><strong>Exclusão do Simples Nacional com efeitos a partir de 01/01/2027</strong></p>
                        <p>Motivo: Débitos tributários não regularizados junto à Receita Federal e PGFN (Ato Declaratório Executivo ADE).</p>
                    </div>
                </div>

                <div class="panel panel-info">
                    <div class="panel-heading"><strong>Períodos Anteriores</strong></div>
                    <div class="panel-body">
                        <table class="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Tipo de Período</th>
                                    <th>Vigência</th>
                                    <th>Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Opção Anterior</td>
                                    <td>01/01/2014 a 31/12/2016</td>
                                    <td>Exclusão por Débitos</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;

export const SAMPLE_HTML_RECEITA_SEM_EVENTO = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Consulta Optantes</title>
</head>
<body>
<div id="conteudoPage" class="container body-content">
    <div class="panel panel-default">
        <div class="panel-body">
            <div><strong>CNPJ:</strong> 28.910.456/0001-22</div>
            <div><strong>Nome Empresarial:</strong> RESTAURANTE E PIZZARIA SABOR BRASIL LTDA - ME</div>
            <div><strong>Situação no Simples Nacional:</strong> Optante pelo Simples Nacional desde 10/05/2019</div>
            <div><strong>Situação no SIMEI:</strong> NÃO optante pelo SIMEI</div>
            <button id="btnMaisInfo" class="btn btn-default" style="background-color:#d4efc9;color: #267e02;">
                <span class="glyphicon glyphicon-plus"></span> Mais informações
            </button>
            <div id="maisInfo">
                <div class="panel panel-default">
                    <div class="panel-heading">Eventos Futuros</div>
                    <div class="panel-body">
                        <p>Não existem eventos futuros cadastrados para este CNPJ.</p>
                    </div>
                </div>
                <div class="panel panel-default">
                    <div class="panel-heading">Períodos Anteriores</div>
                    <div class="panel-body">
                        <p>Não existem períodos anteriores cadastrados.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;
