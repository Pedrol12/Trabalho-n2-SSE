const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());

// ======================================================
// SILOS EM MEMÓRIA
// ======================================================

// Alguns valores começam próximos/acima dos limites
// para facilitar os testes das automações.
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

// Clientes conectados ao SSE
const clientesSSE = new Set();

// Últimas 20 ocorrências
const logsAuditoria = [];

let proximoIdLog = 1;

// ======================================================
// FUNÇÕES AUXILIARES
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
// LOG DE AUDITORIA
// ======================================================

function registrarLog(
    silo,
    tipo,
    descricao,
    origem = "AUTOMATICO"
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

        origem
    };

    logsAuditoria.push(registro);

    // Mantém somente as últimas 20 ocorrências
    if (logsAuditoria.length > 20) {
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
// ALERTAS SSE
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
// MOTOR DE AUTOMAÇÃO
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

    // Guarda todos os estados calculados
    // pelo servidor para o frontend apenas renderizar.
    silo.alertas = {
        co2Atencao,
        co2Critico,
        temperaturaAlta,
        temperaturaCritica,
        capacidadeMaxima
    };

    // ==================================================
    // CO2 >= 1500
    // ABRE COMPORTA AUTOMATICAMENTE
    // ==================================================

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

    // ==================================================
    // TEMPERATURA >= 30
    // LIGA EXAUSTOR AUTOMATICAMENTE
    // ==================================================

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

    // ==================================================
    // NÍVEL >= 98%
    // BLOQUEIA CARGA
    // ==================================================

    const novoStatusCarga =
        capacidadeMaxima
            ? "BLOQUEADO_PARA_CARGA"
            : "LIBERADO";

    if (
        silo.statusCarga !==
        novoStatusCarga
    ) {
        const statusAnterior =
            silo.statusCarga;

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
                `Carga liberada. Nível do silo caiu para ${silo.nivel}%. Estado anterior: ${statusAnterior}.`
            );
        }
    }

    // ==================================================
    // DEFINE O ALARME PRINCIPAL
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

    // Só registra quando o estado muda.
    // Assim não criamos o mesmo log a cada 2 segundos.
    if (
        novoAlarme !== alarmeAnterior &&
        novoAlarme !== "NORMAL"
    ) {
        registrarLog(
            silo,
            "ALARME",
            `Alarme alterado de ${alarmeAnterior} para ${novoAlarme}.`
        );

        // ==================================================
        // TEMPERATURA >= 35
        // EVENTO EMERGENCIAL
        // ==================================================

        if (temperaturaCritica) {
            emitirAlerta(
                "critical_alarm",
                silo,
                "CRITICA",
                `RISCO DE SUPERAQUECIMENTO no ${silo.codigo}: ${silo.temperatura}°C.`
            );
        }

        // ==================================================
        // CO2 >= 1000
        // ALERTA DE ATENÇÃO
        // ==================================================

        else if (co2Atencao) {
            emitirAlerta(
                "automation_alert",
                silo,
                co2Critico
                    ? "CRITICA"
                    : "ATENCAO",

                `CO2 elevado no ${silo.codigo}: ${silo.co2} ppm.`
            );
        }

        // ==================================================
        // TEMP >= 30 E < 35
        // ==================================================

        else if (temperaturaAlta) {
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
// SIMULAÇÃO DOS SENSORES
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

        // Depois da leitura,
        // o servidor avalia as regras.
        aplicarAutomacoes(silo);
    }
}

// ======================================================
// ESTADO DOS SILOS
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
// ROTAS HTTP
// ======================================================

app.get(
    "/",
    (req, res) => {
        res.send(
            "Servidor SSE de monitoramento de silos funcionando!"
        );
    }
);

// Estado atual
app.get(
    "/api/silos",
    (req, res) => {
        res.json(
            obterEstadoSilos()
        );
    }
);

// Consulta um silo específico
app.get(
    "/api/silos/:id",
    (req, res) => {
        const id =
            Number(req.params.id);

        const silo =
            silos.find(
                (item) =>
                    item.id === id
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

// Consulta as últimas 20 ocorrências
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
// CONEXÃO SSE
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

    if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
    }

    // Tentativa de reconexão em 3 segundos
    res.write(
        "retry: 3000\n\n"
    );

    clientesSSE.add(res);

    console.log(
        `Cliente SSE conectado. Total: ${clientesSSE.size}`
    );

    // Envia o estado imediatamente
    enviarEvento(
        res,
        "sensor_update",
        obterEstadoSilos()
    );

    // Envia também os logs atuais
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

// O trabalho cita /events
app.get(
    "/events",
    conectarSSE
);

// Também mantemos a rota usada
// na especificação de mensagens
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
    }
);