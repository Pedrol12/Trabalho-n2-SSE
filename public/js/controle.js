import { criarConexaoSSE } from './sse.js';

const $ = (id) => document.getElementById(id);

// Qual silo controlar (URL: tela3-controle.html?siloId=2)
const siloId = Number(new URLSearchParams(window.location.search).get('siloId'));

// Identificação do operador enviada nos comandos (aparece no log)
const OPERADOR = 'OP-882';

const ESTADOS = {
    NORMAL:              { classe: '',        rotulo: '✅ NORMAL' },
    CO2_ELEVADO:         { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: CO2 ELEVADO' },
    ALERTA_TEMPERATURA:  { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: TEMPERATURA ALTA' },
    CO2_CRITICO:         { classe: 'critico', rotulo: '🚨 CRÍTICO: CO2' },
    CRITICO_TEMPERATURA: { classe: 'critico', rotulo: '🚨 CRÍTICO: TEMPERATURA' }
};

let silo = null;                 // estado atual do silo desta tela
let timerFeedback = null;
let timerAviso = null;
const logs = new Map();          // id do log -> registro (evita duplicar)


// DESENHAR O PAINEL

function render() {
    if (!silo) return;

    const estado = ESTADOS[silo.alarme] || { classe: 'alerta', rotulo: `⚠️ ${silo.alarme}` };
    const manual = silo.modoOperacao === 'MANUAL';

    $('titulo').textContent = `Controle - ${silo.codigo}`;
    $('codigo').textContent = silo.codigo;
    $('estado').textContent = estado.rotulo;
    $('painel-dados').className = `card ${estado.classe}`;

    $('c-temp').textContent = `${silo.temperatura} °C`;
    $('c-co2').textContent = `${silo.co2} ppm`;
    $('c-nivel').textContent = `${silo.nivel} %`;
    $('c-carga').textContent = silo.statusCarga === 'BLOQUEADO_PARA_CARGA' ? '⛔ BLOQUEADA' : '✔ LIBERADA';
    $('c-comporta').textContent = silo.comporta;
    $('c-exaustor').textContent = silo.exaustor;

    $('link-detalhe').href = `tela2-detalhe.html?siloId=${silo.id}`;

    // Chave e botões: manual habilita os comandos, automático bloqueia
    $('toggle-modo').checked = manual;
    $('rotulo-modo').textContent = manual ? '🖐 MODO MANUAL' : '🤖 MODO AUTOMÁTICO';
    $('dica-modo').textContent = manual
        ? 'Comandos liberados. O servidor não automatiza este silo enquanto estiver em manual.'
        : 'Comandos manuais bloqueados. Passe para Manual para usar os botões.';

    for (const id of ['btn-abrir', 'btn-fechar', 'btn-ligar', 'btn-desligar']) {
        $(id).disabled = !manual;
    }
}

// FEEDBACK (mensagem de sucesso / erro)

function mostrarFeedback(texto, sucesso) {
    const el = $('feedback');
    el.textContent = (sucesso ? '✔ ' : '✖ ') + texto;
    el.className = `feedback ${sucesso ? 'sucesso' : 'erro'}`;
    el.hidden = false;
    clearTimeout(timerFeedback);
    timerFeedback = setTimeout(() => { el.hidden = true; }, 5000);
}

function mostrarAviso(texto, critico = false) {
    $('aviso').textContent = texto;
    $('aviso').className = critico ? 'aviso critico' : 'aviso';
    $('aviso').hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { $('aviso').hidden = true; }, 8000);
}


// ENVIAR COMANDOS AO SERVIDOR (POST)

async function enviarPost(url, corpo) {
    try {
        const resposta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });
        const dados = await resposta.json();
        return { ok: resposta.ok && dados.sucesso !== false, dados };
    } catch (erro) {
        return { ok: false, dados: { erro: 'Falha de comunicação com o servidor.' } };
    }
}


async function comandar(comportaComando, exaustorComando) {
    const { ok, dados } = await enviarPost(`/api/silos/${siloId}/atuadores`, {
        comportaComando,
        exaustorComando,
        operadorId: OPERADOR
    });
    mostrarFeedback(ok ? dados.mensagem : (dados.erro || 'Erro ao executar comando.'), ok);
    if (ok && dados.silo) {                 
        silo = { ...silo, ...dados.silo };
        render();
    }
}

$('btn-abrir').addEventListener('click',    () => comandar('ABRIR', 'MANTER'));
$('btn-fechar').addEventListener('click',   () => comandar('FECHAR', 'MANTER'));
$('btn-ligar').addEventListener('click',    () => comandar('MANTER', 'LIGAR'));
$('btn-desligar').addEventListener('click', () => comandar('MANTER', 'DESLIGAR'));

$('toggle-modo').addEventListener('change', async (evento) => {
    const chave = evento.target;
    chave.disabled = true;

    if (chave.checked) {
        await comandar('MANTER', 'MANTER');                       
    } else {
        const { ok, dados } = await enviarPost(`/api/silos/${siloId}/automatico`, {
            operadorId: OPERADOR
        });                                                      
        mostrarFeedback(ok ? dados.mensagem : (dados.erro || 'Erro ao voltar ao automático.'), ok);
        if (ok && dados.silo) silo = { ...silo, ...dados.silo };
    }

    chave.disabled = false;
    render();     // garante que a chave reflita o estado real do servidor
});


function escapar(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderLogs() {
    // Mais recentes primeiro, no máximo 20
    const lista = [...logs.values()].sort((a, b) => b.id - a.id).slice(0, 20);

    $('logs-corpo').innerHTML = lista.map((l) => `
        <tr>
            <td>${new Date(l.timestamp).toLocaleTimeString('pt-BR')}</td>
            <td>${escapar(l.codigoSilo)}</td>
            <td>${escapar(l.tipo)}</td>
            <td class="desc">${escapar(l.descricao)}</td>
            <td>${escapar(l.origem)}</td>
        </tr>`).join('');
}

function adicionarLogs(lista) {
    for (const l of lista) logs.set(l.id, l);
    renderLogs();
}

async function carregarLogs() {
    try {
        const resposta = await fetch('/api/logs');
        const dados = await resposta.json();
        adicionarLogs(dados.logs);
    } catch (erro) {
        console.error('Falha ao carregar /api/logs', erro);
    }
}

async function carregarSilo() {
    if (!siloId) {
        mostrarFeedback('Silo não informado na URL. Volte ao dashboard e clique em "Controle".', false);
        return;
    }
    try {
        const resposta = await fetch(`/api/silos/${siloId}`);
        if (!resposta.ok) {
            mostrarFeedback(`Silo ${siloId} não encontrado.`, false);
            return;
        }
        silo = await resposta.json();
        render();
    } catch (erro) {
        mostrarFeedback('Não foi possível carregar o silo. O servidor está no ar?', false);
    }
}

carregarSilo();
carregarLogs();

let jaConectouAntes = false;

criarConexaoSSE({
    onStatus(status) {
        const badge = $('badge-sse');
        if (status === 'CONECTADO') {
            badge.textContent = '● SSE conectado';
            badge.className = 'badge badge-ok';
            if (jaConectouAntes) { carregarSilo(); carregarLogs(); }   // reconexão: sincroniza
            jaConectouAntes = true;
        } else {
            badge.textContent = '● SSE falha (reconectando...)';
            badge.className = 'badge badge-falha';
        }
    },

    // A cada ~2s: atualiza só o silo desta tela
    sensor_update(dados) {
        const atual = dados.silos.find((s) => s.id === siloId);
        if (atual) { silo = atual; render(); }
    },

    actuator_update(dado) {
        if (dado.siloId === siloId && silo) {
            silo = {
                ...silo,
                comporta: dado.comporta,
                exaustor: dado.exaustor,
                modoOperacao: dado.modoOperacao
            };
            render();
        }
    },

    // Alertas do servidor sobre este silo
    automation_alert(dado) {
        if (dado.siloId === siloId) mostrarAviso(`⚠️ ${dado.mensagem}`, dado.severidade === 'CRITICA');
    },
    capacity_alert(dado) {
        if (dado.siloId === siloId) mostrarAviso(`⛔ ${dado.mensagem}`);
    },
    critical_alarm(dado) {
        if (dado.siloId === siloId) mostrarAviso(`🚨 ${dado.mensagem}`, true);
    },

    // Logs: histórico ao conectar + novas linhas em tempo real
    audit_log_snapshot(dado) { adicionarLogs(dado.logs); },
    audit_log(registro)      { adicionarLogs([registro]); }
});