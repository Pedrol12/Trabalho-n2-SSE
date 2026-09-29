import { criarConexaoSSE } from './sse.js';

const $ = (id) => document.getElementById(id);

// Descobre qual silo mostrar 
const params = new URLSearchParams(window.location.search);
const siloId = Number(params.get('siloId'));

const ESTADOS = {
    NORMAL:              { classe: '',        rotulo: '✅ NORMAL' },
    CO2_ELEVADO:         { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: CO2 ELEVADO' },
    ALERTA_TEMPERATURA:  { classe: 'alerta',  rotulo: '⚠️ ATENÇÃO: TEMPERATURA ALTA' },
    CO2_CRITICO:         { classe: 'critico', rotulo: '🚨 CRÍTICO: CO2' },
    CRITICO_TEMPERATURA: { classe: 'critico', rotulo: '🚨 CRÍTICO: TEMPERATURA' }
};

function mostrarErro(texto) {
    $('erro').textContent = texto;
    $('erro').hidden = false;
}

// Preenche a tela com os dados de um silo 
function render(silo) {
    const estado = ESTADOS[silo.alarme] || { classe: 'alerta', rotulo: `⚠️ ${silo.alarme}` };
    const bloqueado = silo.statusCarga === 'BLOQUEADO_PARA_CARGA';

    $('titulo').textContent = `Detalhe - ${silo.codigo}`;
    $('codigo').textContent = silo.codigo;
    $('estado').textContent = estado.rotulo;
    $('v-temp').textContent = `${silo.temperatura} °C`;
    $('v-umid').textContent = `${silo.umidade} %`;
    $('v-co2').textContent = `${silo.co2} ppm`;
    $('v-nivel').textContent = `${silo.nivel} %`;
    $('v-comporta').textContent = silo.comporta;
    $('v-exaustor').textContent = silo.exaustor;
    $('v-modo').textContent = silo.modoOperacao;
    $('v-carga').textContent = bloqueado ? '⛔ BLOQUEADA' : '✔ LIBERADA';

    // Cor do painel conforme o alarme calculado pelo servidor
    $('painel-dados').className = `card ${estado.classe}`;

    // Botão que leva ao controle do MESMO silo
    $('link-controle').href = `tela3-controle.html?siloId=${silo.id}`;

    const alturaTotal = 190;
    const alturaNivel = (alturaTotal * silo.nivel) / 100;
    const nivel = $('svg-nivel');
    nivel.setAttribute('height', alturaNivel);
    nivel.setAttribute('y', 250 - alturaNivel);
    nivel.setAttribute('fill', bloqueado ? '#e03131' : '#1c7ed6');   // vermelho se cheio
    $('svg-texto').textContent = `${silo.nivel}%`;

    // Comporta: verde = aberta, cinza escuro = fechada
    const aberta = silo.comporta === 'ABERTA';
    $('svg-comporta').setAttribute('fill', aberta ? '#2f9e44' : '#495057');
    $('leg-comporta').textContent = aberta ? '🟢 ABERTA' : '⚫ FECHADA';

    // Exaustor: verde = ligado, cinza = desligado
    const ligado = silo.exaustor === 'LIGADO';
    $('svg-exaustor').setAttribute('fill', ligado ? '#2f9e44' : '#adb5bd');
    $('leg-exaustor').textContent = ligado ? '🟢 LIGADO' : '⚪ DESLIGADO';
}

async function carregarSilo() {
    if (!siloId) {
        mostrarErro('Silo não informado na URL. Volte ao dashboard e clique em "Ver Detalhes".');
        return;
    }
    try {
        const resposta = await fetch(`/api/silos/${siloId}`);
        if (!resposta.ok) {
            mostrarErro(`Silo ${siloId} não encontrado.`);
            return;
        }
        render(await resposta.json());
    } catch (erro) {
        mostrarErro('Não foi possível carregar o silo. O servidor está no ar?');
    }
}

carregarSilo();

let jaConectouAntes = false;

criarConexaoSSE({
    onStatus(status) {
        const badge = $('badge-sse');
        if (status === 'CONECTADO') {
            badge.textContent = '● SSE conectado';
            badge.className = 'badge badge-ok';
            if (jaConectouAntes) carregarSilo();     // reconectou
            jaConectouAntes = true;
        } else {
            badge.textContent = '● SSE falha (reconectando...)';
            badge.className = 'badge badge-falha';
        }
    },

    // A cada ~2s chegam TODOS os silos
    sensor_update(dados) {
        const silo = dados.silos.find((s) => s.id === siloId);
        if (silo) {
            $('erro').hidden = true;
            render(silo);
        }
    }
});