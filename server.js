const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());

// ======================================================
// SILOS EM MEMÓRIA
// ======================================================

const silos = [
    {
        id: 1,
        codigo: "SILO-01",

        temperatura: 27.0,
        umidade: 13.2,
        co2: 1200,
        nivel: 99.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    },

    {
        id: 2,
        codigo: "SILO-02",

        temperatura: 31.5,
        umidade: 14.1,
        co2: 1650,
        nivel: 84.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    },

    {
        id: 3,
        codigo: "SILO-03",

        temperatura: 36.0,
        umidade: 12.8,
        co2: 800,
        nivel: 65.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    }
];

const clientesSSE = new Set();

const logsAuditoria = [];

let proximoIdLog = 1;

// ======================================================
// AUXILIARES
// ======================================================

function limitar(
    valor,
    minimo,
    maximo
) {
    return Math.min(
        Math.max(valor, minimo),
        maximo
    );
}

function variar(
    valor,
    variacao,
    minimo,
    maximo
) {
    const diferenca =
        (Math.random() * 2 - 1) *
        variacao;

    return limitar(
        valor + diferenca,
        minimo,
        maximo
    );
}

function buscarSilo(id) {
    return silos.find(
        (silo) =>
            silo.id === Number(id)
    );
}

// ======================================================
// SSE
// ======================================================

function enviarEvento(
    res,
    nomeEvento,
    dados
) {
    res.write(
        `event: ${nomeEvento}\n`
    );

    res.write(
        `data: ${JSON.stringify(dados)}\n\n`
    );
}

function transmitirEvento(
    nomeEvento,
    dados
) {
    for (const cliente of clientesSSE) {
        enviarEvento(
            cliente,
            nomeEvento,
            dados
        );
    }
}

// ======================================================
// LOG
// ======================================================

function registrarLog(
    silo,
    tipo,
    descricao,
    origem = "AUTOMATICO",
    operadorId = null
) {
    const registro = {
        id: proximoIdLog++,

        timestamp:
            new Date().toISOString(),

        siloId:
            silo.id,

        codigoSilo:
            silo.codigo,

        tipo,

        descricao,

        origem,

        operadorId
    };

    logsAuditoria.push(registro);

    if (
        logsAuditoria.length > 20
    ) {
        logsAuditoria.shift();
    }

    console.log(
        `[LOG] ${silo.codigo} - ${tipo}: ${descricao}`
    );

    transmitirEvento(
        "audit_log",
        registro
    );
}

// ======================================================
// ALERTAS
// ======================================================

function emitirAlerta(
    nomeEvento,
    silo,
    severidade,
    mensagem
) {
    transmitirEvento(
        nomeEvento,
        {
            timestamp:
                new Date().toISOString(),

            siloId:
                silo.id,

            codigoSilo:
                silo.codigo,

            severidade,

            mensagem,

            temperatura:
                silo.temperatura,

            co2:
                silo.co2,

            nivel:
                silo.nivel
        }
    );
}

// ======================================================
// AUTOMAÇÃO
// ======================================================

function aplicarAutomacoes(silo) {
    const co2Atencao =
        silo.co2 >= 1000;

    const co2Critico =
        silo.co2 >= 1500;

    const temperaturaAlta =
        silo.temperatura >= 30;

    const temperaturaCritica =
        silo.temperatura >= 35;

    const capacidadeMaxima =
        silo.nivel >= 98;

    silo.alertas = {
        co2Atencao,
        co2Critico,
        temperaturaAlta,
        temperaturaCritica,
        capacidadeMaxima
    };

    // ==================================================
    // AUTOMAÇÕES DE ATUADORES
    // Só funcionam em modo AUTOMATICO
    // ==================================================

    if (
        silo.modoOperacao ===
        "AUTOMATICO"
    ) {
        if (
            co2Critico &&
            silo.comporta !== "ABERTA"
        ) {
            silo.comporta =
                "ABERTA";

            registrarLog(
                silo,
                "COMPORTA_AUTOMATICA",
                `Comporta aberta automaticamente. CO2 em ${silo.co2} ppm.`
            );

            emitirAlerta(
                "automation_alert",
                silo,
                "ALTA",
                `CO2 crítico no ${silo.codigo}. Comporta aberta automaticamente.`
            );
        }

        if (
            temperaturaAlta &&
            silo.exaustor !== "LIGADO"
        ) {
            silo.exaustor =
                "LIGADO";

            registrarLog(
                silo,
                "EXAUSTOR_AUTOMATICO",
                `Exaustor ligado automaticamente. Temperatura em ${silo.temperatura}°C.`
            );

            emitirAlerta(
                "automation_alert",
                silo,
                "ALTA",
                `Temperatura elevada no ${silo.codigo}. Exaustor ligado automaticamente.`
            );
        }
    }

    // ==================================================
    // CAPACIDADE
    // Continua sendo regra de segurança
    // ==================================================

    const novoStatusCarga =
        capacidadeMaxima
            ? "BLOQUEADO_PARA_CARGA"
            : "LIBERADO";

    if (
        silo.statusCarga !==
        novoStatusCarga
    ) {
        silo.statusCarga =
            novoStatusCarga;

        if (capacidadeMaxima) {
            registrarLog(
                silo,
                "BLOQUEIO_CARGA",
                `Carga bloqueada. Nível do silo em ${silo.nivel}%.`
            );

            emitirAlerta(
                "capacity_alert",
                silo,
                "ALTA",
                `${silo.codigo} atingiu capacidade máxima. Carga bloqueada.`
            );
        } else {
            registrarLog(
                silo,
                "LIBERACAO_CARGA",
                `Carga liberada. Nível do silo em ${silo.nivel}%.`
            );
        }
    }

    // ==================================================
    // ALARME
    // ==================================================

    let novoAlarme =
        "NORMAL";

    if (temperaturaCritica) {
        novoAlarme =
            "CRITICO_TEMPERATURA";

    } else if (co2Critico) {
        novoAlarme =
            "CO2_CRITICO";

    } else if (co2Atencao) {
        novoAlarme =
            "CO2_ELEVADO";

    } else if (temperaturaAlta) {
        novoAlarme =
            "ALERTA_TEMPERATURA";
    }

    const alarmeAnterior =
        silo.alarme;

    silo.alarme =
        novoAlarme;

    if (
        novoAlarme !== alarmeAnterior &&
        novoAlarme !== "NORMAL"
    ) {
        registrarLog(
            silo,
            "ALARME",
            `Alarme alterado de ${alarmeAnterior} para ${novoAlarme}.`
        );

        if (temperaturaCritica) {
            emitirAlerta(
                "critical_alarm",
                silo,
                "CRITICA",
                `RISCO DE SUPERAQUECIMENTO no ${silo.codigo}: ${silo.temperatura}°C.`
            );

        } else if (co2Atencao) {
            emitirAlerta(
                "automation_alert",
                silo,
                co2Critico
                    ? "CRITICA"
                    : "ATENCAO",

                `CO2 elevado no ${silo.codigo}: ${silo.co2} ppm.`
            );

        } else if (temperaturaAlta) {
            emitirAlerta(
                "automation_alert",
                silo,
                "ATENCAO",

                `Temperatura elevada no ${silo.codigo}: ${silo.temperatura}°C.`
            );
        }
    }
}

// ======================================================
// SIMULAÇÃO
// ======================================================

function atualizarSensores() {
    for (const silo of silos) {
        silo.temperatura =
            Number(
                variar(
                    silo.temperatura,
                    0.8,
                    18,
                    38
                ).toFixed(1)
            );

        silo.umidade =
            Number(
                variar(
                    silo.umidade,
                    0.5,
                    8,
                    25
                ).toFixed(1)
            );

        silo.co2 =
            Math.round(
                variar(
                    silo.co2,
                    80,
                    400,
                    1800
                )
            );

        silo.nivel =
            Number(
                variar(
                    silo.nivel,
                    0.4,
                    0,
                    100
                ).toFixed(1)
            );

        aplicarAutomacoes(silo);
    }
}

// ======================================================
// ESTADO
// ======================================================

function obterEstadoSilos() {
    return {
        timestamp:
            new Date().toISOString(),

        silos:
            silos.map(
                (silo) => ({
                    ...silo,

                    alertas: {
                        ...silo.alertas
                    }
                })
            )
    };
}

function transmitirSensores() {
    transmitirEvento(
        "sensor_update",
        obterEstadoSilos()
    );
}

// ======================================================
// ROTAS DE CONSULTA
// ======================================================

app.get(
    "/",
    (req, res) => {
        res.send(
            "Servidor SSE de monitoramento de silos funcionando!"
        );
    }
);

app.get(
    "/api/silos",
    (req, res) => {
        res.json(
            obterEstadoSilos()
        );
    }
);

app.get(
    "/api/silos/:id",
    (req, res) => {
        const silo =
            buscarSilo(
                req.params.id
            );

        if (!silo) {
            return res
                .status(404)
                .json({
                    erro:
                        "Silo não encontrado."
                });
        }

        res.json(silo);
    }
);

app.get(
    "/api/logs",
    (req, res) => {
        res.json({
            total:
                logsAuditoria.length,

            logs:
                logsAuditoria
        });
    }
);

// ======================================================
// CONTROLE MANUAL DOS ATUADORES
// ======================================================

app.post(
    "/api/silos/:id/atuadores",
    (req, res) => {
        const silo =
            buscarSilo(
                req.params.id
            );

        if (!silo) {
            return res
                .status(404)
                .json({
                    sucesso: false,
                    erro:
                        "Silo não encontrado."
                });
        }

        const {
            comportaComando = "MANTER",
            exaustorComando = "MANTER",
            operadorId = "OPERADOR-NAO-INFORMADO"
        } = req.body;

        const comporta =
            String(
                comportaComando
            ).toUpperCase();

        const exaustor =
            String(
                exaustorComando
            ).toUpperCase();

        const comandosComporta = [
            "ABRIR",
            "FECHAR",
            "MANTER"
        ];

        const comandosExaustor = [
            "LIGAR",
            "DESLIGAR",
            "MANTER"
        ];

        if (
            !comandosComporta.includes(
                comporta
            )
        ) {
            return res
                .status(400)
                .json({
                    sucesso: false,

                    erro:
                        "Comando de comporta inválido."
                });
        }

        if (
            !comandosExaustor.includes(
                exaustor
            )
        ) {
            return res
                .status(400)
                .json({
                    sucesso: false,

                    erro:
                        "Comando de exaustor inválido."
                });
        }

        // Ao usar um controle manual,
        // o silo passa para modo MANUAL.
        silo.modoOperacao =
            "MANUAL";

        registrarLog(
            silo,
            "MODO_OPERACAO",
            `Modo alterado para MANUAL pelo operador ${operadorId}.`,
            "MANUAL",
            operadorId
        );

        // ==================================================
        // COMPORTA
        // ==================================================

        if (comporta === "ABRIR") {
            silo.comporta =
                "ABERTA";

            registrarLog(
                silo,
                "COMPORTA_MANUAL",
                "Comporta aberta manualmente.",
                "MANUAL",
                operadorId
            );
        }

        if (comporta === "FECHAR") {
            silo.comporta =
                "FECHADA";

            registrarLog(
                silo,
                "COMPORTA_MANUAL",
                "Comporta fechada manualmente.",
                "MANUAL",
                operadorId
            );
        }

        // ==================================================
        // EXAUSTOR
        // ==================================================

        if (exaustor === "LIGAR") {
            silo.exaustor =
                "LIGADO";

            registrarLog(
                silo,
                "EXAUSTOR_MANUAL",
                "Exaustor ligado manualmente.",
                "MANUAL",
                operadorId
            );
        }

        if (exaustor === "DESLIGAR") {
            silo.exaustor =
                "DESLIGADO";

            registrarLog(
                silo,
                "EXAUSTOR_MANUAL",
                "Exaustor desligado manualmente.",
                "MANUAL",
                operadorId
            );
        }

        // Informa imediatamente os clientes SSE
        transmitirSensores();

        transmitirEvento(
            "actuator_update",
            {
                timestamp:
                    new Date().toISOString(),

                siloId:
                    silo.id,

                codigoSilo:
                    silo.codigo,

                comporta:
                    silo.comporta,

                exaustor:
                    silo.exaustor,

                modoOperacao:
                    silo.modoOperacao,

                operadorId
            }
        );

        res.json({
            sucesso: true,

            mensagem:
                "Comando manual executado com sucesso.",

            silo: {
                id:
                    silo.id,

                codigo:
                    silo.codigo,

                comporta:
                    silo.comporta,

                exaustor:
                    silo.exaustor,

                modoOperacao:
                    silo.modoOperacao
            }
        });
    }
);

// ======================================================
// VOLTAR AO AUTOMÁTICO
// ======================================================

app.post(
    "/api/silos/:id/automatico",
    (req, res) => {
        const silo =
            buscarSilo(
                req.params.id
            );

        if (!silo) {
            return res
                .status(404)
                .json({
                    sucesso: false,

                    erro:
                        "Silo não encontrado."
                });
        }

        const operadorId =
            req.body.operadorId ||
            "OPERADOR-NAO-INFORMADO";

        silo.modoOperacao =
            "AUTOMATICO";

        registrarLog(
            silo,
            "MODO_OPERACAO",
            `Modo alterado para AUTOMATICO pelo operador ${operadorId}.`,
            "MANUAL",
            operadorId
        );

        // Ao retornar ao automático,
        // as regras são avaliadas imediatamente.
        aplicarAutomacoes(silo);

        transmitirSensores();

        transmitirEvento(
            "actuator_update",
            {
                timestamp:
                    new Date().toISOString(),

                siloId:
                    silo.id,

                codigoSilo:
                    silo.codigo,

                comporta:
                    silo.comporta,

                exaustor:
                    silo.exaustor,

                modoOperacao:
                    silo.modoOperacao,

                operadorId
            }
        );

        res.json({
            sucesso: true,

            mensagem:
                "Silo retornou ao modo automático.",

            silo
        });
    }
);

// ======================================================
// SSE
// ======================================================

function conectarSSE(
    req,
    res
) {
    res.setHeader(
        "Content-Type",
        "text/event-stream"
    );

    res.setHeader(
        "Cache-Control",
        "no-cache"
    );

    res.setHeader(
        "Connection",
        "keep-alive"
    );

    if (
        typeof res.flushHeaders ===
        "function"
    ) {
        res.flushHeaders();
    }

    res.write(
        "retry: 3000\n\n"
    );

    clientesSSE.add(res);

    console.log(
        `Cliente SSE conectado. Total: ${clientesSSE.size}`
    );

    enviarEvento(
        res,
        "sensor_update",
        obterEstadoSilos()
    );

    enviarEvento(
        res,
        "audit_log_snapshot",
        {
            logs:
                logsAuditoria
        }
    );

    req.on(
        "close",
        () => {
            clientesSSE.delete(res);

            console.log(
                `Cliente SSE desconectado. Total: ${clientesSSE.size}`
            );
        }
    );
}

app.get(
    "/events",
    conectarSSE
);

app.get(
    "/api/silos/stream",
    conectarSSE
);

// ======================================================
// MOTOR PRINCIPAL
// ======================================================

setInterval(
    () => {
        atualizarSensores();

        transmitirSensores();

        console.log(
            "\n=== TELEMETRIA ==="
        );

        console.table(
            silos.map(
                (silo) => ({
                    silo:
                        silo.codigo,

                    temp:
                        silo.temperatura,

                    umidade:
                        silo.umidade,

                    co2:
                        silo.co2,

                    nivel:
                        silo.nivel,

                    comporta:
                        silo.comporta,

                    exaustor:
                        silo.exaustor,

                    modo:
                        silo.modoOperacao,

                    alarme:
                        silo.alarme,

                    carga:
                        silo.statusCarga
                })
            )
        );

    },
    2000
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
    }
);