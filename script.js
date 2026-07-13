// ========================================
// APONTAMENTO DE ATIVIDADES
// Movimentação Horizontal / Vertical / Separação
// ========================================

let dadosHorizontal = [];
let dadosVertical = [];
let dadosDemandaSeparacao = [];

const ORDEM_PAVILHAO_SEPARACAO = [
    "Pavilhão 1",
    "Pavilhão 2",
    "Sorter",
    "Câmara Fria / Outros"
];

const limites = {
    horizontal: 60,
    vertical: 60
};


// ========================================
// UTILITÁRIOS
// ========================================

function nomeArquivoSelecionado(idInput, idLabel){

    const input =
    document.getElementById(idInput);

    const label =
    document.getElementById(idLabel);

    label.innerText =
    input.files.length
    ? input.files[0].name
    : "Nenhum arquivo selecionado";

}

function extrairSkuDescricao(produtoRaw){

    if(!produtoRaw){

        return {
            sku: "-",
            descricao: "-"
        };

    }

    const partes =
    produtoRaw.split(" - ");

    const sku =
    (partes[0] || "-").trim();

    let descricao =
    partes.slice(1)
    .join(" - ")
    .trim();

    if(descricao.endsWith("-")){

        descricao =
        descricao
        .slice(0, -1)
        .trim();

    }

    return {
        sku,
        descricao: descricao || "-"
    };

}

function formatarTempo(minutos){

    const totalMin =
    Math.round(minutos);

    if(totalMin < 60){

        return `${totalMin}min`;

    }

    const horas =
    Math.floor(totalMin / 60);

    const min =
    totalMin % 60;

    return `${horas}h ${min.toString().padStart(2,"0")}min`;

}

function computarKpis(dados, limite){

    const total =
    dados.length;

    const criticas =
    dados.filter(
        d => d.tempoMinutos >= limite
    ).length;

    const pctCritico =
    total
    ? (criticas / total * 100)
    : 0;

    const maiorTempo =
    dados.reduce(
        (m,d) => Math.max(m, d.tempoMinutos),
        0
    );

    return {
        total,
        criticas,
        pctCritico,
        maiorTempo
    };

}

function montarTopTempos(dadosOrdenados, formatarLinha, quantidade){

    const top =
    dadosOrdenados.slice(0, quantidade || 5);

    if(!top.length){

        return `
        <p class="vazio-estado">
            Processe o arquivo para ver o Top 5.
        </p>
        `;

    }

    const medalhas =
    ["🥇","🥈","🥉"];

    let html = "";

    top.forEach((item,indice)=>{

        const selo =
        medalhas[indice] || `${indice+1}º`;

        html += `
        <div class="top-item top-${indice+1}">
            <span class="medalha">${selo}</span>
            <span class="top-info">${formatarLinha(item)}</span>
            <span class="top-tempo">${formatarTempo(item.tempoMinutos)}</span>
        </div>
        `;

    });

    return html;

}

function montarTopContagem(itensOrdenados, formatarLinha, formatarValor, quantidade){

    const top =
    itensOrdenados.slice(0, quantidade || 5);

    if(!top.length){

        return `
        <p class="vazio-estado">
            Processe o arquivo para ver o Top 5.
        </p>
        `;

    }

    const medalhas =
    ["🥇","🥈","🥉"];

    let html = "";

    top.forEach((item,indice)=>{

        const selo =
        medalhas[indice] || `${indice+1}º`;

        html += `
        <div class="top-item top-${indice+1}">
            <span class="medalha">${selo}</span>
            <span class="top-info">${formatarLinha(item)}</span>
            <span class="top-tempo">${formatarValor(item)}</span>
        </div>
        `;

    });

    return html;

}


// ========================================
// LEITURA — MOVIMENTAÇÃO (HORIZONTAL / VERTICAL)
// ========================================

function parseMovimentacao(texto, comSentido){

    const linhas =
    texto
    .split(/\r?\n/)
    .filter(l => l.trim().length);

    linhas.shift();

    const dados = [];

    linhas.forEach(linha=>{

        const campos =
        linha.split(";");

        let p, origem, destino, sentido, produtoRaw, tempoRaw;

        if(comSentido){

            [p, origem, destino, sentido, produtoRaw, tempoRaw] = campos;

        }else{

            [p, origem, destino, produtoRaw, tempoRaw] = campos;

        }

        if(produtoRaw === undefined){

            return;

        }

        const {sku, descricao} =
        extrairSkuDescricao(produtoRaw);

        const tempoMinutos =
        parseFloat(
            (tempoRaw || "0")
            .replace(",",".")
        ) || 0;

        const item = {
            p: p || "-",
            origem: origem || "-",
            destino: destino || "-",
            sku,
            descricao,
            tempoMinutos
        };

        if(comSentido){

            item.sentido = sentido || "-";

        }

        dados.push(item);

    });

    return dados;

}

function processarHorizontal(){

    const input =
    document.getElementById("arquivoHorizontal");

    if(!input.files.length){

        alert(
            "Selecione o arquivo de Movimentação Horizontal."
        );

        return;

    }

    const reader = new FileReader();

    reader.onload = e=>{

        dadosHorizontal =
        parseMovimentacao(
            e.target.result,
            false
        );

        renderResultado("horizontal");

        atualizarArmazenagensPendentes();

    };

    reader.onerror = ()=>{

        alert(
            "Não foi possível ler o arquivo de Movimentação Horizontal."
        );

    };

    reader.readAsText(
        input.files[0],
        "ISO-8859-1"
    );

}

function processarVertical(){

    const input =
    document.getElementById("arquivoVertical");

    if(!input.files.length){

        alert(
            "Selecione o arquivo de Movimentação Vertical."
        );

        return;

    }

    const reader = new FileReader();

    reader.onload = e=>{

        dadosVertical =
        parseMovimentacao(
            e.target.result,
            true
        );

        renderResultado("vertical");

        atualizarArmazenagensPendentes();

    };

    reader.onerror = ()=>{

        alert(
            "Não foi possível ler o arquivo de Movimentação Vertical."
        );

    };

    reader.readAsText(
        input.files[0],
        "ISO-8859-1"
    );

}



// ========================================
// LEITURA — DEMANDA DE SEPARAÇÃO POR PAVILHÃO
// (Consulta 70 - Demanda Separação, .txt ; ISO-8859-1)
// ========================================

function normalizarTexto(str){

    return (str || "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

}

function derivarPavilhaoSeparacao(linhaSeparacao){

    const l =
    normalizarTexto(linhaSeparacao);

    if(l.startsWith("PV1")){

        return "Pavilhão 1";

    }

    if(l.startsWith("PV2")){

        return "Pavilhão 2";

    }

    if(l.includes("SORTER")){

        return "Sorter";

    }

    return "Câmara Fria / Outros";

}

function derivarTipoSeparacao(destino){

    const d =
    normalizarTexto(destino);

    if(d.includes("NAO SORTER")){

        return "Não Sorter";

    }

    if(d.includes("SORTER")){

        return "Sorter";

    }

    return "Outros";

}

function parseDemandaSeparacao(texto){

    const linhasArq =
    texto
    .split(/\r?\n/)
    .filter(l => l.trim().length);

    linhasArq.shift();

    const dados = [];

    linhasArq.forEach(linha=>{

        const c =
        linha.split(";");

        if(c.length < 17){

            return;

        }

        const [
            box, codTip, indModo, nroCarga, nroEmpresa,
            destino, codDep, nroPalete, seqLote, linhaSep,
            pesoRaw, volRaw, itensRaw, volCxRaw,
            dtGeracao, dtGeraPalete, dtRetirada
        ] = c;

        const peso =
        parseFloat(
            (pesoRaw || "0").replace(",",".")
        ) || 0;

        const volumeM3 =
        parseFloat(
            (volRaw || "0").replace(",",".")
        ) || 0;

        const itens =
        parseInt(itensRaw, 10) || 0;

        const volumeCx =
        parseInt(volCxRaw, 10) || 0;

        dados.push({
            box: box || "-",
            carga: nroCarga || "-",
            destino: destino || "-",
            coddep: codDep || "-",
            palete: nroPalete || "-",
            lote: seqLote || "-",
            linha: linhaSep || "-",
            pavilhao: derivarPavilhaoSeparacao(linhaSep),
            tipo: derivarTipoSeparacao(destino),
            peso,
            volumeM3,
            itens,
            volumeCx,
            dtGeracao: dtGeracao || "-",
            dtRetirada: dtRetirada || "-"
        });

    });

    return dados;

}

function processarDemandaSeparacao(){

    const input =
    document.getElementById("arquivoDemandaSeparacao");

    if(!input.files.length){

        alert(
            "Selecione o arquivo da Consulta 70 - Demanda Separação."
        );

        return;

    }

    const reader = new FileReader();

    reader.onload = e=>{

        try{

            dadosDemandaSeparacao =
            parseDemandaSeparacao(e.target.result);

            renderDemandaSeparacao();

            atualizarArmazenagensPendentes();

            document.getElementById(
                "resultado-demanda-separacao"
            ).classList.remove("oculto");

        }catch(erro){

            console.error(erro);

            alert(
                "Não foi possível ler o arquivo da Consulta 70 - Demanda Separação."
            );

        }

    };

    reader.onerror = ()=>{

        alert(
            "Não foi possível ler o arquivo da Consulta 70 - Demanda Separação."
        );

    };

    reader.readAsText(
        input.files[0],
        "ISO-8859-1"
    );

}


// ========================================
// RENDERIZAÇÃO — DEMANDA DE SEPARAÇÃO POR PAVILHÃO
// ========================================

function agruparDemandaSeparacao(dados){

    const mapa = new Map();

    dados.forEach(item=>{

        if(!mapa.has(item.pavilhao)){

            mapa.set(item.pavilhao, new Map());

        }

        const porLinha =
        mapa.get(item.pavilhao);

        if(!porLinha.has(item.linha)){

            porLinha.set(item.linha, {
                sorter: [],
                naoSorter: [],
                outros: []
            });

        }

        const grupo =
        porLinha.get(item.linha);

        if(item.tipo === "Sorter"){

            grupo.sorter.push(item);

        }else if(item.tipo === "Não Sorter"){

            grupo.naoSorter.push(item);

        }else{

            grupo.outros.push(item);

        }

    });

    return mapa;

}

function ordenarChavesPavilhao(mapa){

    const chaves =
    [...mapa.keys()];

    return chaves.sort((a,b)=>{

        const ia =
        ORDEM_PAVILHAO_SEPARACAO.indexOf(a);

        const ib =
        ORDEM_PAVILHAO_SEPARACAO.indexOf(b);

        if(ia === -1 && ib === -1){

            return a.localeCompare(b);

        }

        if(ia === -1){

            return 1;

        }

        if(ib === -1){

            return -1;

        }

        return ia - ib;

    });

}

function renderDemandaSeparacao(){

    const dados =
    dadosDemandaSeparacao;

    const totalAtividades =
    dados.length;

    const totalSorter =
    dados.filter(d => d.tipo === "Sorter").length;

    const pctSorter =
    totalAtividades
    ? (totalSorter / totalAtividades * 100)
    : 0;

    const mapa =
    agruparDemandaSeparacao(dados);

    document.getElementById("kpiDemandaTotal").innerText =
    totalAtividades.toLocaleString("pt-BR");

    document.getElementById("kpiDemandaPavilhoes").innerText =
    mapa.size.toLocaleString("pt-BR");

    document.getElementById("kpiDemandaSorterPct").innerText =
    pctSorter.toLocaleString("pt-BR",{maximumFractionDigits:1}) + "%";

    // linha com mais atividades (agregando todos os pavilhões)
    const contagemPorLinha = new Map();

    dados.forEach(item=>{

        contagemPorLinha.set(
            item.linha,
            (contagemPorLinha.get(item.linha) || 0) + 1
        );

    });

    let topLinha = "-";
    let topLinhaQtd = 0;

    contagemPorLinha.forEach((qtd, linha)=>{

        if(qtd > topLinhaQtd){

            topLinhaQtd = qtd;
            topLinha = linha;

        }

    });

    document.getElementById("kpiDemandaTopLinha").innerText =
    topLinhaQtd
    ? `${topLinha} (${topLinhaQtd})`
    : "-";

    const topLinhasOrdenadas =
    [...contagemPorLinha.entries()]
    .map(([linha, qtd]) => ({linha, qtd}))
    .sort((a,b) => b.qtd - a.qtd);

    const topDemandaEl =
    document.getElementById("topDemanda");

    if(topDemandaEl){

        topDemandaEl.innerHTML =
        montarTopContagem(
            topLinhasOrdenadas,
            item => item.linha,
            item => `${item.qtd} ativ.`
        );

    }

    const container =
    document.getElementById("blocoPavilhoesSeparacao");

    if(!totalAtividades){

        container.innerHTML = `
        <p class="vazio-estado">
            Nenhuma atividade encontrada no arquivo.
        </p>
        `;

        return;

    }

    const chaves =
    ordenarChavesPavilhao(mapa);

    container.innerHTML =
    chaves.map(pavilhao=>{

        const porLinha =
        mapa.get(pavilhao);

        let totalPavilhao = 0;
        let pesoPavilhao = 0;
        let volumePavilhao = 0;
        let itensPavilhao = 0;

        const linhasOrdenadas =
        [...porLinha.entries()]
        .map(([linha, grupo])=>{

            const todos =
            [...grupo.sorter, ...grupo.naoSorter, ...grupo.outros];

            const totalLinha =
            todos.length;

            const peso =
            todos.reduce((s,i)=>s+i.peso,0);

            const volumeM3 =
            todos.reduce((s,i)=>s+i.volumeM3,0);

            const itens =
            todos.reduce((s,i)=>s+i.itens,0);

            const volumeCx =
            todos.reduce((s,i)=>s+i.volumeCx,0);

            totalPavilhao += totalLinha;
            pesoPavilhao += peso;
            volumePavilhao += volumeM3;
            itensPavilhao += itens;

            return {
                linha,
                sorter: grupo.sorter.length,
                naoSorter: grupo.naoSorter.length,
                outros: grupo.outros.length,
                totalLinha,
                peso,
                volumeM3,
                itens,
                volumeCx
            };

        })
        .sort((a,b) => b.totalLinha - a.totalLinha);

        const linhasHtml =
        linhasOrdenadas.map(l => `
        <tr>
            <td style="text-align:left;">${l.linha}</td>
            <td>${l.sorter}</td>
            <td>${l.naoSorter}</td>
            <td>${l.outros}</td>
            <td class="col-tempo">${l.totalLinha}</td>
            <td>${l.peso.toLocaleString("pt-BR",{maximumFractionDigits:1})}</td>
            <td>${l.volumeM3.toLocaleString("pt-BR",{maximumFractionDigits:3})}</td>
            <td>${l.itens.toLocaleString("pt-BR")}</td>
            <td>${l.volumeCx.toLocaleString("pt-BR")}</td>
        </tr>
        `).join("");

        return `
        <div class="grupo-pavilhao">

            <div class="grupo-pavilhao-header">
                <h3>${pavilhao}</h3>
                <span class="badge-pavilhao">${totalPavilhao.toLocaleString("pt-BR")} atividades</span>
            </div>

            <div class="tabela-container">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Linha de Separação</th>
                            <th>Sorter</th>
                            <th>Não Sorter</th>
                            <th>Outros</th>
                            <th>Total</th>
                            <th>Peso (kg)</th>
                            <th>Volume (m³)</th>
                            <th>Itens</th>
                            <th>Volume (cx)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                        <tr class="linha-total-pavilhao">
                            <td style="text-align:left;">Total ${pavilhao}</td>
                            <td colspan="2"></td>
                            <td></td>
                            <td class="col-tempo">${totalPavilhao.toLocaleString("pt-BR")}</td>
                            <td>${pesoPavilhao.toLocaleString("pt-BR",{maximumFractionDigits:1})}</td>
                            <td>${volumePavilhao.toLocaleString("pt-BR",{maximumFractionDigits:3})}</td>
                            <td>${itensPavilhao.toLocaleString("pt-BR")}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
        `;

    }).join("");

}


// ========================================
// ARMAZENAGENS PENDENTES POR PAVILHÃO
// (reaproveita dadosHorizontal / dadosVertical já processados)
// ========================================

function atualizarArmazenagensPendentes(){

    const container =
    document.getElementById("blocoArmazenagensPendentes");

    if(!container){

        return;

    }

    const combinado = [
        ...dadosHorizontal.map(d => ({...d, tipoMov:"Horizontal", limite:limites.horizontal})),
        ...dadosVertical.map(d => ({...d, tipoMov:"Vertical", limite:limites.vertical}))
    ];

    const total =
    combinado.length;

    const criticas =
    combinado.filter(d => d.tempoMinutos >= d.limite).length;

    const maiorTempo =
    combinado.reduce((m,d) => Math.max(m, d.tempoMinutos), 0);

    const kpiTotal =
    document.getElementById("kpiArmzTotal");

    const kpiCriticas =
    document.getElementById("kpiArmzCriticas");

    const kpiMaior =
    document.getElementById("kpiArmzMaior");

    if(kpiTotal) kpiTotal.innerText = total.toLocaleString("pt-BR");
    if(kpiCriticas) kpiCriticas.innerText = criticas.toLocaleString("pt-BR");
    if(kpiMaior) kpiMaior.innerText = formatarTempo(maiorTempo);

    if(!total){

        container.innerHTML = `
        <p class="vazio-estado">
            Nenhum dado carregado ainda. Processe as seções de Movimentação Horizontal e/ou Vertical acima.
        </p>
        `;

        return;

    }

    const porPavilhao = new Map();

    combinado.forEach(item=>{

        const chave =
        "Pavilhão " + (item.p || "-");

        if(!porPavilhao.has(chave)){

            porPavilhao.set(chave, []);

        }

        porPavilhao.get(chave).push(item);

    });

    const chaves =
    [...porPavilhao.keys()]
    .sort((a,b)=>{

        const na = parseInt(a.replace(/\D/g,""),10);
        const nb = parseInt(b.replace(/\D/g,""),10);

        if(isNaN(na) || isNaN(nb)){

            return a.localeCompare(b);

        }

        return na - nb;

    });

    container.innerHTML =
    chaves.map(chave=>{

        const itens =
        [...porPavilhao.get(chave)]
        .sort((a,b) => b.tempoMinutos - a.tempoMinutos);

        const criticasGrupo =
        itens.filter(i => i.tempoMinutos >= i.limite).length;

        const linhasHtml =
        itens.map(i=>{

            const critico =
            i.tempoMinutos >= i.limite;

            return `
            <tr class="${critico ? "linha-critica" : ""}">
                <td>${i.tipoMov}</td>
                <td>${i.origem}</td>
                <td>${i.destino}</td>
                <td>${i.sentido || "-"}</td>
                <td>${i.sku}</td>
                <td style="text-align:left;">${i.descricao}</td>
                <td class="col-tempo">${formatarTempo(i.tempoMinutos)}</td>
                <td>
                    <span class="badge ${critico ? "badge-critico" : "badge-ok"}">
                        ${critico ? "Crítico" : "OK"}
                    </span>
                </td>
            </tr>
            `;

        }).join("");

        return `
        <div class="grupo-pavilhao">

            <div class="grupo-pavilhao-header">
                <h3>${chave}</h3>
                <span class="badge-pavilhao">
                    ${itens.length.toLocaleString("pt-BR")} pendentes${criticasGrupo ? ` · ${criticasGrupo} críticas` : ""}
                </span>
            </div>

            <div class="tabela-container">
                <table class="tabela">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Origem</th>
                            <th>Destino</th>
                            <th>Sentido</th>
                            <th>SKU</th>
                            <th>Descrição</th>
                            <th>Tempo Pendente</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>
            </div>

        </div>
        `;

    }).join("");

}


// ========================================
// RENDERIZAÇÃO
// ========================================

function aplicarLimite(tipo){

    const input =
    document.getElementById(
        "limite" + tipo.charAt(0).toUpperCase() + tipo.slice(1)
    );

    const valor =
    parseFloat(input.value);

    limites[tipo] =
    isNaN(valor)
    ? 0
    : valor;

    renderResultado(tipo);

}

function renderResultado(tipo){

    const mapa = {

        horizontal: {
            dados: dadosHorizontal,
            prefixoKpi: "kpiHorizontal",
            corpoTabela: "corpoHorizontal",
            topContainer: "topHorizontal",
            linhaHtml: linhaMovimentacao,
            topLinha: item => `${item.sku} — ${item.descricao} (P${item.p})`
        },

        vertical: {
            dados: dadosVertical,
            prefixoKpi: "kpiVertical",
            corpoTabela: "corpoVertical",
            topContainer: "topVertical",
            linhaHtml: linhaMovimentacao,
            topLinha: item => `${item.sku} — ${item.descricao} (P${item.p})`
        }

    };

    const config = mapa[tipo];

    if(!config){

        return;

    }

    const limite =
    limites[tipo];

    const dadosOrdenados =
    [...config.dados]
    .sort((a,b)=>b.tempoMinutos - a.tempoMinutos);

    const kpis =
    computarKpis(
        config.dados,
        limite
    );

    document.getElementById(
        config.prefixoKpi + "Total"
    ).innerText =
    kpis.total.toLocaleString("pt-BR");

    document.getElementById(
        config.prefixoKpi + "Maior"
    ).innerText =
    formatarTempo(kpis.maiorTempo);

    document.getElementById(
        config.prefixoKpi + "Pct"
    ).innerText =
    kpis.pctCritico
    .toLocaleString(
        "pt-BR",
        {maximumFractionDigits:1}
    ) + "%";

    document.getElementById(
        config.prefixoKpi + "Criticas"
    ).innerText =
    kpis.criticas.toLocaleString("pt-BR");

    document.getElementById(
        config.topContainer
    ).innerHTML =
    montarTopTempos(
        dadosOrdenados,
        config.topLinha
    );

    const corpo =
    document.getElementById(
        config.corpoTabela
    );

    if(!dadosOrdenados.length){

        corpo.innerHTML = `
        <tr>
            <td colspan="20" class="vazio-estado">
                Nenhuma tarefa encontrada.
            </td>
        </tr>
        `;

    }else{

        corpo.innerHTML =
        dadosOrdenados
        .map(item => config.linhaHtml(item, limite))
        .join("");

    }

    document.getElementById(
        "resultado-" + tipo
    ).classList.remove("oculto");

}

function linhaMovimentacao(item, limite){

    const critico =
    item.tempoMinutos >= limite;

    const colunaSentido =
    "sentido" in item
    ? `<td>${item.sentido}</td>`
    : "";

    return `
    <tr class="${critico ? "linha-critica" : ""}">
        <td>${item.p}</td>
        <td>${item.origem}</td>
        <td>${item.destino}</td>
        ${colunaSentido}
        <td>${item.sku}</td>
        <td style="text-align:left;">${item.descricao}</td>
        <td class="col-tempo">${formatarTempo(item.tempoMinutos)}</td>
        <td>
            <span class="badge ${critico ? "badge-critico" : "badge-ok"}">
                ${critico ? "Crítico" : "OK"}
            </span>
        </td>
    </tr>
    `;

}

// ========================================
// RESUMO EXECUTIVO — WHATSAPP
// Combina Horizontal + Vertical + Demanda de
// Separação num texto único pronto pra colar.
// ========================================

function formatarPct(valor){

    return valor.toLocaleString("pt-BR",{maximumFractionDigits:1}) + "%";

}

function blocoSecaoMovimentacao(titulo, emoji, dados, limite){

    if(!dados.length){

        return `${emoji} *${titulo}*\n   • Sem dados processados ainda\n`;

    }

    const kpis =
    computarKpis(dados, limite);

    return (
        `${emoji} *${titulo}*\n` +
        `   • Total: ${kpis.total.toLocaleString("pt-BR")}\n` +
        `   • Críticas (≥${limite}min): ${kpis.criticas.toLocaleString("pt-BR")} (${formatarPct(kpis.pctCritico)})\n` +
        `   • Maior tempo: ${formatarTempo(kpis.maiorTempo)}\n`
    );

}

function blocoSecaoSeparacao(){

    const dados =
    dadosDemandaSeparacao;

    if(!dados.length){

        return `📦 *DEMANDA DE SEPARAÇÃO*\n   • Sem dados processados ainda\n`;

    }

    const totalAtividades =
    dados.length;

    const totalSorter =
    dados.filter(d => d.tipo === "Sorter").length;

    const pctSorter =
    totalAtividades
    ? (totalSorter / totalAtividades * 100)
    : 0;

    const mapa =
    agruparDemandaSeparacao(dados);

    const contagemPorLinha = new Map();

    dados.forEach(item=>{

        contagemPorLinha.set(
            item.linha,
            (contagemPorLinha.get(item.linha) || 0) + 1
        );

    });

    let topLinha = "-";
    let topLinhaQtd = 0;

    contagemPorLinha.forEach((qtd, linha)=>{

        if(qtd > topLinhaQtd){

            topLinhaQtd = qtd;
            topLinha = linha;

        }

    });

    return (
        `📦 *DEMANDA DE SEPARAÇÃO*\n` +
        `   • Total de atividades: ${totalAtividades.toLocaleString("pt-BR")}\n` +
        `   • Pavilhões ativos: ${mapa.size}\n` +
        `   • % Sorter: ${formatarPct(pctSorter)}\n` +
        `   • Linha com mais demanda: ${topLinhaQtd ? `${topLinha} (${topLinhaQtd})` : "-"}\n`
    );

}

function blocoCombinado(){

    const combinado = [
        ...dadosHorizontal.map(d => ({...d, limite: limites.horizontal})),
        ...dadosVertical.map(d => ({...d, limite: limites.vertical}))
    ];

    if(!combinado.length){

        return "";

    }

    const total =
    combinado.length;

    const criticas =
    combinado.filter(d => d.tempoMinutos >= d.limite).length;

    const pctCritico =
    total ? (criticas / total * 100) : 0;

    const maiorTempo =
    combinado.reduce((m,d) => Math.max(m, d.tempoMinutos), 0);

    return (
        `────────────────\n` +
        `📊 *COMBINADO (Horizontal + Vertical)*\n` +
        `   • Total: ${total.toLocaleString("pt-BR")}\n` +
        `   • Críticas: ${criticas.toLocaleString("pt-BR")} (${formatarPct(pctCritico)})\n` +
        `   • Maior tempo: ${formatarTempo(maiorTempo)}\n`
    );

}

function gerarResumoExecutivo(){

    const agora =
    new Date().toLocaleString("pt-BR",{
        day:"2-digit",
        month:"2-digit",
        year:"numeric",
        hour:"2-digit",
        minute:"2-digit"
    });

    let texto =
    `📋 *RESUMO EXECUTIVO — APONTAMENTO DE ATIVIDADES*\n` +
    `🗓️ ${agora}\n` +
    `────────────────\n\n`;

    texto += blocoSecaoMovimentacao(
        "MOVIMENTAÇÃO HORIZONTAL", "🔄", dadosHorizontal, limites.horizontal
    ) + "\n";

    texto += blocoSecaoMovimentacao(
        "MOVIMENTAÇÃO VERTICAL", "🔼", dadosVertical, limites.vertical
    ) + "\n";

    texto += blocoSecaoSeparacao() + "\n";

    texto += blocoCombinado();

    document.getElementById("textoResumoExecutivo").value = texto.trim();

}

function copiarResumoExecutivo(){

    const campo =
    document.getElementById("textoResumoExecutivo");

    if(!campo.value.trim()){

        gerarResumoExecutivo();

    }

    navigator.clipboard.writeText(campo.value)
    .then(()=>{

        alert("Resumo executivo copiado! Já pode colar no WhatsApp.");

    })
    .catch(()=>{

        campo.select();
        document.execCommand("copy");
        alert("Resumo executivo copiado! Já pode colar no WhatsApp.");

    });

}
