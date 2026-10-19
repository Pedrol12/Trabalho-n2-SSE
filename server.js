const express =
    require("express");

// ======================================================
// TÓPICO PROFESSOR: ESTADO EM MEMÓRIA MODULARIZADO
// ======================================================

const {
    silos
} =
    require("./src/state/silos");

const {
    clientesSSE
} =
    require("./src/state/clientesSSE");

const {
    logsAuditoria,
    gerarIdLog
} =
    require("./src/state/logs");

// ======================================================
// TÓPICO PROFESSOR: SERVICES
// ======================================================

const {
    criarSilosService
} =
    require("./src/services/silos.service");

const {
    criarLogsService
} =
    require("./src/services/logs.service");

const {
    criarAlertasService
} =
    require("./src/services/alertas.service");

const {
    criarAutomacaoService
} =
    require("./src/services/automacao.service");

const {
    criarSensoresService
} =
    require("./src/services/sensores.service");

const {
    criarAtuadoresService
} =
    require("./src/services/atuadores.service");

// ======================================================
// TÓPICO PROFESSOR: MÓDULOS SSE
// ======================================================

const {
    criarEventosSSE
} =
    require("./src/sse/eventos");

const {
    criarConexaoSSE
} =
    require("./src/sse/conexao");

const {
    iniciarHeartbeatSSE
} =
    require("./src/sse/heartbeat");

// ======================================================
// TÓPICO PROFESSOR: CONTROLLERS E ROTAS
// ======================================================

const {
    criarSilosController
} =
    require("./src/controllers/silos.controller");

const {
    criarSilosRoutes
} =
    require("./src/routes/silos.routes");

const {
    criarSSERoutes
} =
    require("./src/routes/sse.routes");

// ======================================================
// CONFIGURAÇÃO
// ======================================================

const app =
    express();

const PORT =
    3000;

const INTERVALO_TELEMETRIA_MS =
    2000;

const HEARTBEAT_SSE_MS =
    15000;

app.use(
    express.json()
);

// ======================================================
// TÓPICO PROFESSOR: COMPOSIÇÃO DOS MÓDULOS
// ======================================================

const {
    buscarSilo,
    obterEstadoSilos
} =
    criarSilosService({
        silos
    });

const {
    enviarEvento,
    transmitirEvento,
    transmitirSensores
} =
    criarEventosSSE({
        clientesSSE,
        obterEstadoSilos
    });

const {
    registrarLog
} =
    criarLogsService({
        logsAuditoria,
        gerarIdLog,
        transmitirEvento
    });

const {
    emitirAlerta
} =
    criarAlertasService({
        transmitirEvento
    });

const {
    aplicarAutomacoes
} =
    criarAutomacaoService({
        registrarLog,
        emitirAlerta
    });

const {
    atualizarSensores,
    exibirTelemetria
} =
    criarSensoresService({
        silos,
        aplicarAutomacoes
    });

const {
    controlarAtuadores,
    voltarAutomatico
} =
    criarAtuadoresService({
        buscarSilo,
        registrarLog,
        aplicarAutomacoes,
        transmitirSensores,
        transmitirEvento
    });

const {
    conectarSSE
} =
    criarConexaoSSE({
        clientesSSE,
        logsAuditoria,
        enviarEvento,
        obterEstadoSilos
    });

const controller =
    criarSilosController({
        silos,
        logsAuditoria,
        buscarSilo,
        obterEstadoSilos,
        controlarAtuadores,
        voltarAutomatico
    });

// ======================================================
// TÓPICO PROFESSOR: ROTAS HTTP
// ======================================================

app.get(
    "/",
    controller.statusServidor
);

app.get(
    "/api/logs",
    controller.listarLogs
);

app.use(
    "/api/silos",
    criarSilosRoutes({
        controller
    })
);

// ======================================================
// TÓPICO PROFESSOR: ROTAS SSE
// ======================================================

app.use(
    "/",
    criarSSERoutes({
        conectarSSE
    })
);

// ======================================================
// TÓPICO PROFESSOR: HEARTBEAT SSE
// ======================================================

iniciarHeartbeatSSE({
    clientesSSE,

    intervaloMs:
        HEARTBEAT_SSE_MS
});

// ======================================================
// TÓPICO PROFESSOR: MOTOR DE TELEMETRIA
// ======================================================
//
// Sensores são atualizados a cada 2 segundos.
// Depois o novo estado é enviado aos clientes SSE.
//

setInterval(
    () => {

        atualizarSensores();

        transmitirSensores();

        exibirTelemetria();
    },

    INTERVALO_TELEMETRIA_MS
);

// ======================================================
// INICIALIZAÇÃO
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Servidor rodando em http://localhost:${PORT}`
        );

        console.log(
            `SSE disponível em http://localhost:${PORT}/events`
        );

        console.log(
            `SSE alternativo em http://localhost:${PORT}/api/silos/stream`
        );

        console.log(
            `Logs disponíveis em http://localhost:${PORT}/api/logs`
        );

        console.log(
            "Controle manual: POST /api/silos/:id/atuadores"
        );

        console.log(
            "Backend SSE modularizado."
        );

        console.log(
            "Heartbeat SSE ativo."
        );
    }
);