// ========================================
// APONTAMENTO DE ATIVIDADES
// Movimentação Horizontal / Vertical / Separação
// ========================================

let dadosHorizontal = [];
let dadosVertical = [];
let dadosSeparacao = [];

const limites = {
    horizontal: 60,
    vertical: 60,
    separacao: 240
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

function montarTopTempos(dadosOrdenados, formatarLinha){

    const top =
    dadosOrdenados.slice(0,3);

    if(!top.length){

        return "";

    }

    const medalhas =
    ["🥇","🥈","🥉"];

    let html = "";

    top.forEach((item,indice)=>{

        html += `
        <div class="top-item top-${indice+1}">
            <span class="medalha">${medalhas[indice]}</span>
            <span class="top-info">${formatarLinha(item)}</span>
            <span class="top-tempo">${formatarTempo(item.tempoMinutos)}</span>
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
// LEITURA — SEPARAÇÃO (XLSX)
// ========================================

function parseSeparacao(arrayBuffer){

    const workbook =
    XLSX.read(
        arrayBuffer,
        {type:"array"}
    );

    const planilha =
    workbook.Sheets[
        workbook.SheetNames[0]
    ];

    const linhas =
    XLSX.utils.sheet_to_json(
        planilha,
        {
            header: 1,
            raw: true,
            defval: null
        }
    );

    const dados = [];

    for(let i=1; i<linhas.length; i++){

        const l = linhas[i];

        if(!l || l[0] === null || l[0] === undefined){

            continue;

        }

        const tempoRaw = l[13];

        if(tempoRaw === null || tempoRaw === undefined || typeof tempoRaw !== "number"){

            continue;

        }

        // Valor de tempo vem como célula de horário (h:mm) do Excel.
        // Descartamos a parte inteira (dia-âncora, artefato do formato)
        // e usamos só a fração do dia, convertida para minutos.
        const fracaoDia =
        tempoRaw - Math.floor(tempoRaw);

        const tempoMinutos =
        fracaoDia * 24 * 60;

        dados.push({
            prioridade: l[0] ?? "-",
            carga: l[1] ?? "-",
            dep: l[2] ?? "-",
            box: l[3] ?? "-",
            palete: l[4] ?? "-",
            lote: l[5] ?? "-",
            agrupamento: l[6] ?? "-",
            linha: l[7] ?? "-",
            peso: l[8] ?? 0,
            volumeM3: l[9] ?? 0,
            itens: l[10] ?? 0,
            volumeCx: l[11] ?? 0,
            operacao: l[12] ?? "-",
            tempoMinutos
        });

    }

    return dados;

}

function processarSeparacao(){

    const input =
    document.getElementById("arquivoSeparacao");

    if(!input.files.length){

        alert(
            "Selecione o arquivo de Separação."
        );

        return;

    }

    const reader = new FileReader();

    reader.onload = e=>{

        try{

            dadosSeparacao =
            parseSeparacao(e.target.result);

            renderResultado("separacao");

        }catch(erro){

            console.error(erro);

            alert(
                "Não foi possível ler o arquivo de Separação. Verifique se é um .xlsx válido."
            );

        }

    };

    reader.onerror = ()=>{

        alert(
            "Não foi possível ler o arquivo de Separação."
        );

    };

    reader.readAsArrayBuffer(
        input.files[0]
    );

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
        },

        separacao: {
            dados: dadosSeparacao,
            prefixoKpi: "kpiSeparacao",
            corpoTabela: "corpoSeparacao",
            topContainer: "topSeparacao",
            linhaHtml: linhaSeparacao,
            topLinha: item => `Carga ${item.carga} — Box ${item.box} — ${item.agrupamento}`
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

function linhaSeparacao(item, limite){

    const critico =
    item.tempoMinutos >= limite;

    return `
    <tr class="${critico ? "linha-critica" : ""}">
        <td>${item.prioridade}</td>
        <td>${item.carga}</td>
        <td>${item.box}</td>
        <td>${item.palete}</td>
        <td>${item.lote}</td>
        <td style="text-align:left;">${item.agrupamento}</td>
        <td style="text-align:left;">${item.linha}</td>
        <td>${Number(item.peso).toLocaleString("pt-BR",{maximumFractionDigits:2})}</td>
        <td>${Number(item.volumeM3).toLocaleString("pt-BR",{maximumFractionDigits:4})}</td>
        <td>${item.itens}</td>
        <td>${item.volumeCx}</td>
        <td>${item.operacao}</td>
        <td class="col-tempo">${formatarTempo(item.tempoMinutos)}</td>
        <td>
            <span class="badge ${critico ? "badge-critico" : "badge-ok"}">
                ${critico ? "Crítico" : "OK"}
            </span>
        </td>
    </tr>
    `;

}
