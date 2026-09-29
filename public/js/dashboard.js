import { criarConexaoSSE } from './sse.js';   // conexão com o servidor

// Elementos da página
const grade   = document.getElementById('grade');
const badge   = document.getElementById('badge-sse');
const aviso   = document.getElementById('aviso');
const filtro  = document.getElementById('filtro-alertas');
const btnSom  = document.getElementById('btn-som');

let silos = [];
let somAtivo = false;
let audioCtx = null;
let jaConectouAntes = false;
let timerAviso = null;
const piscando = new Set();

const ESTADOS = {
    NORMAL:              { classe: '',        rotulo: '✅ NORMAL' },
    CO2_ELEVADO:         { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: CO2 ELEVADO' },
    ALERTA_TEMPERATURA:  { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: TEMPERATURA ALTA' },
    CO2_CRITICO:         { classe: 'critico', rotulo: '🚨 CRÍTICO: CO2' },
    CRITICO_TEMPERATURA: { classe: 'critico', rotulo: '🚨 CRÍTICO: TEMPERATURA' }
};

function estadoDe(silo) {
    return ESTADOS[silo.alarme] || { classe: 'alerta', rotulo: `⚠️ ${silo.alarme}` };
}

function temAlerta(silo) {
    return silo.alarme !== 'NORMAL' || silo.statusCarga === 'BLOQUEADO_PARA_CARGA';
}

// Desenha os cards (chamada a cada dado novo ou ao mudar o filtro)
function render() {
    const lista = filtro.checked ? silos.filter(temAlerta) : silos;

    if (lista.length === 0) {
        grade.innerHTML = '<p>Nenhum silo para exibir.</p>';
        return;
    }

    grade.innerHTML = lista.map((silo) => {
        const estado = estadoDe(silo);
        const classes = ['card', estado.classe, piscando.has(silo.id) ? 'piscando' : '']
            .filter(Boolean).join(' ');
        const bloqueado = silo.statusCarga === 'BLOQUEADO_PARA_CARGA';

        return `
        <article class="${classes}">
            <div class="card-topo">
                <h2>${silo.codigo}</h2>
                <span class="estado">${estado.rotulo}</span>
            </div>

            <dl class="dados">
                <div><dt>Temperatura</dt><dd>${silo.temperatura} °C</dd></div>
                <div><dt>Umidade</dt><dd>${silo.umidade} %</dd></div>
                <div><dt>CO2</dt><dd>${silo.co2} ppm</dd></div>
                <div><dt>Nível</dt><dd>${silo.nivel} %</dd></div>
                <div><dt>Comporta</dt><dd>${silo.comporta}</dd></div>
                <div><dt>Exaustor</dt><dd>${silo.exaustor}</dd></div>
            </dl>

            <!-- Barra de nível de 0 a 100% -->
            <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${silo.nivel}">
                <div class="barra-preenchimento ${bloqueado ? 'cheio' : ''}" style="width:${silo.nivel}%"></div>
            </div>
            <p class="barra-legenda">Nível: ${silo.nivel}%</p>

            <span class="tag">Modo: ${silo.modoOperacao}</span>
            <span class="tag ${bloqueado ? 'tag-bloqueado' : ''}">
                ${bloqueado ? '⛔ CARGA BLOQUEADA' : '✔ CARGA LIBERADA'}
            </span>

            <!-- Navegação: leva o id do silo na URL (?siloId=) -->
            <div class="acoes">
                <a class="btn" href="tela2-detalhe.html?siloId=${silo.id}">Ver Detalhes</a>
                <a class="btn btn-sec" href="tela3-controle.html?siloId=${silo.id}">Controle</a>
            </div>
        </article>`;
    }).join('');
}

// Mostra a mensagem do servidor por 8 segundos.
function mostrarAviso(texto, critico = false) {
    aviso.textContent = texto;
    aviso.className = critico ? 'aviso critico' : 'aviso';
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.hidden = true; }, 8000);
}

// Gera um "beep" pelo próprio navegador
function tocarSom() {
    if (!somAtivo || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const ganho = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    ganho.gain.value = 0.15;
    osc.connect(ganho);
    ganho.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
}

// Se a conexão cair e voltar, busca o estado atual de novo via REST.
async function sincronizar() {
    try {
        const resposta = await fetch('/api/silos');
        const dados = await resposta.json();
        silos = dados.silos;
        render();
    } catch (erro) {
        console.error('Falha ao sincronizar /api/silos', erro);
    }
}

btnSom.addEventListener('click', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    somAtivo = !somAtivo;
    btnSom.textContent = somAtivo ? '🔊 Som ativado' : '🔇 Ativar som';
    if (somAtivo) tocarSom();
});

// Filtro "Apenas Alertas"
filtro.addEventListener('change', render);

// Conexão em tempo real: o que fazer em cada evento
criarConexaoSSE({

    // Estado da conexão: troca o badge
    onStatus(status) {
        if (status === 'CONECTADO') {
            badge.textContent = '● SSE conectado';
            badge.className = 'badge badge-ok';
            if (jaConectouAntes) sincronizar();   // reconectou: busca estado de novo
            jaConectouAntes = true;
        } else {
            badge.textContent = '● SSE falha (reconectando...)';
            badge.className = 'badge badge-falha';
        }
    },

    // A cada ~2s: dados novos de todos os silos
    sensor_update(dados) {
        silos = dados.silos;
        render();
    },

    // Automação agiu (ex: abriu comporta)
    automation_alert(dado) {
        mostrarAviso(`⚠️ ${dado.mensagem}`, dado.severidade === 'CRITICA');
    },

    // Silo cheio
    capacity_alert(dado) {
        mostrarAviso(`⛔ ${dado.mensagem}`);
    },

    // Alarme crítico
    critical_alarm(dado) {
        mostrarAviso(`🚨 ${dado.mensagem}`, true);
        piscando.add(dado.siloId);
        setTimeout(() => { piscando.delete(dado.siloId); render(); }, 5000);
        tocarSom();
        render();
    }
});