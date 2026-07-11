// ========================================================
// ========================================================
// SINCRONIZAÇÃO AUTOMÁTICA — File System Access API
//
// Conecta a subpasta "Apontamento de Atividades" (dentro da
// pasta mestre) uma única vez. São 3 arquivos .txt INDEPENDENTES
// (cada um processado e renderizado separadamente), identificados
// por palavra-chave no nome:
//   - nome contém "horizontal"        -> Movimentação Horizontal
//   - nome contém "vertical"          -> Movimentação Vertical
//   - nome contém "separac" (Demanda) -> Demanda de Separação por Pavilhão
// Cada um só é reprocessado quando ELE MESMO muda — não
// depende dos outros dois estarem presentes. Se só existir
// 1 ou 2 dos 3 arquivos na pasta, sincroniza só os que achar.
//
// Reaproveita 100% da lógica já existente no projeto:
// parseMovimentacao(texto, comSentido), parseDemandaSeparacao(texto),
// renderResultado(tipo), renderDemandaSeparacao(), atualizarArmazenagensPendentes().
//
// IMPORTANTE: renomeie os arquivos na pasta mestre pra conter
// "horizontal", "vertical" ou "separação"/"separacao" no nome
// (ex: "Movimentacao_Horizontal.txt", "Vertical_hoje.txt",
// "70 - Demanda Separação.txt").
// ========================================================
// ========================================================

const SYNC_DB_NAME = "apontamento-atividades-sync-db";
const SYNC_STORE_NAME = "handles";
const SYNC_HANDLE_KEY = "pastaApontamento";
const SYNC_INTERVALO_MS = 5000; // checa a cada 5s

let syncDirHandle = null;

let syncArquivoHorizontalHandle = null;
let syncArquivoVerticalHandle = null;
let syncArquivoSeparacaoHandle = null;

let syncLastModifiedHorizontal = 0;
let syncLastModifiedVertical = 0;
let syncLastModifiedSeparacao = 0;

let syncIntervalId = null;

// ---------- IndexedDB: persistir o handle da pasta ----------

function syncAbrirDB(){

    return new Promise((resolve, reject)=>{

        const req = indexedDB.open(SYNC_DB_NAME, 1);

        req.onupgradeneeded = ()=>
        req.result.createObjectStore(SYNC_STORE_NAME);

        req.onsuccess = ()=> resolve(req.result);

        req.onerror = ()=> reject(req.error);

    });

}

async function syncSalvarHandle(handle){

    const db = await syncAbrirDB();

    return new Promise((resolve, reject)=>{

        const tx = db.transaction(SYNC_STORE_NAME, "readwrite");

        tx.objectStore(SYNC_STORE_NAME).put(handle, SYNC_HANDLE_KEY);

        tx.oncomplete = resolve;

        tx.onerror = ()=> reject(tx.error);

    });

}

async function syncCarregarHandle(){

    const db = await syncAbrirDB();

    return new Promise((resolve, reject)=>{

        const tx = db.transaction(SYNC_STORE_NAME, "readonly");

        const req = tx.objectStore(SYNC_STORE_NAME).get(SYNC_HANDLE_KEY);

        req.onsuccess = ()=> resolve(req.result || null);

        req.onerror = ()=> reject(req.error);

    });

}

async function syncLimparHandle(){

    const db = await syncAbrirDB();

    const tx = db.transaction(SYNC_STORE_NAME, "readwrite");

    tx.objectStore(SYNC_STORE_NAME).delete(SYNC_HANDLE_KEY);

}

async function syncGarantirPermissao(handle){

    const opcoes = { mode: "read" };

    if((await handle.queryPermission(opcoes)) === "granted") return true;

    if((await handle.requestPermission(opcoes)) === "granted") return true;

    return false;

}

// ---------- UI ----------

function syncSetStatus(tipo, textoExtra){

    const el = document.getElementById("syncStatus");

    if(!el) return;

    const mapa = {

        off: [
            "sync-off",
            '<span class="sync-dot"></span> Sincronização desligada'
        ],

        scan: [
            "sync-scan",
            '<span class="sync-dot"></span> Procurando arquivos na pasta...'
        ],

        on: [
            "sync-on",
            '<span class="sync-dot"></span> Conectado — monitorando' +
            (textoExtra ? ` (${textoExtra})` : "")
        ]

    };

    el.className = mapa[tipo][0];
    el.innerHTML = mapa[tipo][1];

    const btnConectar = document.getElementById("btnConectarPasta");
    const btnDesconectar = document.getElementById("btnDesconectarPasta");

    if(btnConectar) btnConectar.style.display = tipo === "off" ? "inline-block" : "none";
    if(btnDesconectar) btnDesconectar.style.display = tipo === "off" ? "none" : "inline-block";

}

function syncAtualizarUltimaChecagem(){

    const el = document.getElementById("syncUltimaChecagem");

    if(!el) return;

    el.style.display = "inline";

    el.textContent =
    "Última checagem: " +
    new Date().toLocaleTimeString("pt-BR");

}

// ---------- Varredura da subpasta ----------

function syncNormalizar(texto){

    return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

}

const SYNC_PALAVRA_HORIZONTAL = "horizontal";
const SYNC_PALAVRA_VERTICAL = "vertical";
const SYNC_PALAVRA_SEPARACAO = "separac";

async function syncVarrerPasta(){

    syncSetStatus("scan");

    syncArquivoHorizontalHandle = null;
    syncArquivoVerticalHandle = null;
    syncArquivoSeparacaoHandle = null;

    for await (const [nome, handle] of syncDirHandle.entries()){

        if(handle.kind !== "file") continue;

        if(!nome.toLowerCase().endsWith(".txt")) continue;

        const nomeNormalizado = syncNormalizar(nome);

        if(
            !syncArquivoHorizontalHandle &&
            nomeNormalizado.includes(SYNC_PALAVRA_HORIZONTAL)
        ){

            syncArquivoHorizontalHandle = handle;

        }else if(
            !syncArquivoVerticalHandle &&
            nomeNormalizado.includes(SYNC_PALAVRA_VERTICAL)
        ){

            syncArquivoVerticalHandle = handle;

        }else if(
            !syncArquivoSeparacaoHandle &&
            nomeNormalizado.includes(SYNC_PALAVRA_SEPARACAO)
        ){

            syncArquivoSeparacaoHandle = handle;

        }

    }

    if(
        !syncArquivoHorizontalHandle &&
        !syncArquivoVerticalHandle &&
        !syncArquivoSeparacaoHandle
    ){

        alert(
            "Não encontrei nenhum arquivo reconhecível nessa pasta.\n\n" +
            "O nome do arquivo precisa conter \"horizontal\", " +
            '"vertical" ou "separação"/"separacao" (ex: ' +
            '"Movimentacao_Horizontal.txt", "Vertical_hoje.txt", ' +
            '"70 - Demanda Separação.txt").'
        );

        return false;

    }

    return true;

}

// ---------- Processamento automático (reaproveita as funções originais) ----------

async function syncProcessarHorizontal(){

    try{

        const arquivo =
        await syncArquivoHorizontalHandle.getFile();

        const texto =
        await syncLerComoTexto(arquivo, "ISO-8859-1");

        dadosHorizontal =
        parseMovimentacao(texto, false);

        renderResultado("horizontal");

        document.getElementById("nomeHorizontal").innerText =
        "🔗 " + arquivo.name + " (auto)";

        console.log("Sync: Movimentação Horizontal atualizada");

    }catch(erro){

        console.error(erro);

    }

}

async function syncProcessarVertical(){

    try{

        const arquivo =
        await syncArquivoVerticalHandle.getFile();

        const texto =
        await syncLerComoTexto(arquivo, "ISO-8859-1");

        dadosVertical =
        parseMovimentacao(texto, true);

        renderResultado("vertical");

        document.getElementById("nomeVertical").innerText =
        "🔗 " + arquivo.name + " (auto)";

        console.log("Sync: Movimentação Vertical atualizada");

    }catch(erro){

        console.error(erro);

    }

}

async function syncProcessarSeparacao(){

    try{

        const arquivo =
        await syncArquivoSeparacaoHandle.getFile();

        const texto =
        await syncLerComoTexto(arquivo, "ISO-8859-1");

        dadosDemandaSeparacao =
        parseDemandaSeparacao(texto);

        renderDemandaSeparacao();

        atualizarArmazenagensPendentes();

        document.getElementById("resultado-demanda-separacao")
        ?.classList.remove("oculto");

        document.getElementById("nomeDemandaSeparacao").innerText =
        "🔗 " + arquivo.name + " (auto)";

        console.log("Sync: Demanda de Separação atualizada");

    }catch(erro){

        console.error(erro);

    }

}

function syncLerComoTexto(arquivo, encoding){

    return new Promise((resolve, reject)=>{

        const reader = new FileReader();

        reader.onload = e => resolve(e.target.result);

        reader.onerror = () => reject(
            new Error("Falha ao ler " + arquivo.name)
        );

        reader.readAsText(arquivo, encoding);

    });

}

// ---------- Loop de monitoramento ----------

function syncPararMonitoramento(){

    if(syncIntervalId){

        clearInterval(syncIntervalId);

        syncIntervalId = null;

    }

}

function syncIniciarMonitoramento(){

    syncPararMonitoramento();

    const nomesDetectados = [

        syncArquivoHorizontalHandle?.name,
        syncArquivoVerticalHandle?.name,
        syncArquivoSeparacaoHandle?.name

    ].filter(Boolean).join(" + ");

    syncSetStatus("on", nomesDetectados);

    syncIntervalId = setInterval(
        syncChecarMudancas,
        SYNC_INTERVALO_MS
    );

}

async function syncChecarMudancas(){

    try{

        if(syncArquivoHorizontalHandle){

            const file = await syncArquivoHorizontalHandle.getFile();

            if(file.lastModified !== syncLastModifiedHorizontal){

                syncLastModifiedHorizontal = file.lastModified;

                await syncProcessarHorizontal();

            }

        }

        if(syncArquivoVerticalHandle){

            const file = await syncArquivoVerticalHandle.getFile();

            if(file.lastModified !== syncLastModifiedVertical){

                syncLastModifiedVertical = file.lastModified;

                await syncProcessarVertical();

            }

        }

        if(syncArquivoSeparacaoHandle){

            const file = await syncArquivoSeparacaoHandle.getFile();

            if(file.lastModified !== syncLastModifiedSeparacao){

                syncLastModifiedSeparacao = file.lastModified;

                await syncProcessarSeparacao();

            }

        }

        syncAtualizarUltimaChecagem();

    }catch(erro){

        console.error(
            "Erro ao checar mudanças na pasta:",
            erro
        );

    }

}

// ---------- Ações de UI (botões) ----------

async function conectarPastaApontamento(){

    try{

        syncDirHandle = await window.showDirectoryPicker();

        await syncSalvarHandle(syncDirHandle);

        const encontrou = await syncVarrerPasta();

        if(!encontrou){

            syncSetStatus("off");

            return;

        }

        // primeira carga imediata de cada arquivo encontrado
        if(syncArquivoHorizontalHandle){

            await syncProcessarHorizontal();

            const file = await syncArquivoHorizontalHandle.getFile();
            syncLastModifiedHorizontal = file.lastModified;

        }

        if(syncArquivoVerticalHandle){

            await syncProcessarVertical();

            const file = await syncArquivoVerticalHandle.getFile();
            syncLastModifiedVertical = file.lastModified;

        }

        if(syncArquivoSeparacaoHandle){

            await syncProcessarSeparacao();

            const file = await syncArquivoSeparacaoHandle.getFile();
            syncLastModifiedSeparacao = file.lastModified;

        }

        syncIniciarMonitoramento();

    }catch(erro){

        if(erro.name !== "AbortError"){

            console.error(erro);

            alert("Erro ao conectar a pasta: " + erro.message);

        }

    }

}

async function desconectarPastaApontamento(){

    syncPararMonitoramento();

    syncDirHandle = null;
    syncArquivoHorizontalHandle = null;
    syncArquivoVerticalHandle = null;
    syncArquivoSeparacaoHandle = null;
    syncLastModifiedHorizontal = 0;
    syncLastModifiedVertical = 0;
    syncLastModifiedSeparacao = 0;

    await syncLimparHandle();

    syncSetStatus("off");

    const elChecagem = document.getElementById("syncUltimaChecagem");

    if(elChecagem) elChecagem.style.display = "none";

}

// ---------- Reconexão automática ao abrir a página ----------

(async function syncTentarReconectar(){

    const handleSalvo = await syncCarregarHandle();

    if(!handleSalvo) return;

    const temPermissao = await syncGarantirPermissao(handleSalvo);

    if(!temPermissao){

        // não força popup de permissão sem interação do usuário;
        // ele clica em "Conectar Pasta" de novo se precisar
        return;

    }

    syncDirHandle = handleSalvo;

    const encontrou = await syncVarrerPasta();

    if(!encontrou) return;

    if(syncArquivoHorizontalHandle){

        await syncProcessarHorizontal();

        const file = await syncArquivoHorizontalHandle.getFile();
        syncLastModifiedHorizontal = file.lastModified;

    }

    if(syncArquivoVerticalHandle){

        await syncProcessarVertical();

        const file = await syncArquivoVerticalHandle.getFile();
        syncLastModifiedVertical = file.lastModified;

    }

    if(syncArquivoSeparacaoHandle){

        await syncProcessarSeparacao();

        const file = await syncArquivoSeparacaoHandle.getFile();
        syncLastModifiedSeparacao = file.lastModified;

    }

    syncIniciarMonitoramento();

})();
