const express = require("express");

const app = express();

const PORT = 3000;

// Permite receber JSON
app.use(express.json());

// ======================================================
// SILOS EM MEMÓRIA
// ======================================================

const silos = [
    {
        id: 1,
        codigo: "SILO-01",
        temperatura: 24.5,
        umidade: 13.2,
        co2: 650,
        nivel: 72.0,
        comporta: "FECHADA",
        exaustor: "DESLIGADO",
        alarme: "NORMAL",
        statusCarga: "LIBERADO"
    },
    {
        id: 2,
        codigo: "SILO-02",
        temperatura: 26.0,
        umidade: 14.1,
        co2: 780,
        nivel: 84.0,
        comporta: "FECHADA",
        exaustor: "DESLIGADO",
        alarme: "NORMAL",
        statusCarga: "LIBERADO"
    },
    {
        id: 3,
        codigo: "SILO-03",
        temperatura: 23.8,
        umidade: 12.8,
        co2: 590,
        nivel: 65.0,
        comporta: "FECHADA",
        exaustor: "DESLIGADO",
        alarme: "NORMAL",
        statusCarga: "LIBERADO"
    }
];

// Clientes conectados ao SSE
const clientesSSE = new Set();

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function limitar(valor, minimo, maximo) {
    return Math.min(
        Math.max(valor, minimo),
        maximo
    );
}

function variar(valor, variacao, minimo, maximo) {
    const diferenca =
        (Math.random() * 2 - 1) * variacao;

    return limitar(
        valor + diferenca,
        minimo,
        maximo
    );
}

// Atualiza os sensores
function atualizarSensores() {
    for (const silo of silos) {
        silo.temperatura = Number(
            variar(
                silo.temperatura,
                0.8,
                18,
                38
            ).toFixed(1)
        );

        silo.umidade = Number(
            variar(
                silo.umidade,
                0.5,
                8,
                25
            ).toFixed(1)
        );

        silo.co2 = Math.round(
            variar(
                silo.co2,
                80,
                400,
                1800
            )
        );

        silo.nivel = Number(
            variar(
                silo.nivel,
                0.4,
                0,
                100
            ).toFixed(1)
        );
    }
}

// Retorna estado atual
function obterEstadoSilos() {
    return {
        timestamp: new Date().toISOString(),

        silos: silos.map((silo) => ({
            ...silo
        }))
    };
}

// Envia evento SSE
function enviarEvento(res, nomeEvento, dados) {
    res.write(`event: ${nomeEvento}\n`);
    res.write(`data: ${JSON.stringify(dados)}\n\n`);
}

// Envia para todos os clientes SSE
function transmitirSensores() {
    const dados = obterEstadoSilos();

    for (const cliente of clientesSSE) {
        enviarEvento(
            cliente,
            "sensor_update",
            dados
        );
    }
}

// ======================================================
// ROTAS
// ======================================================

app.get("/", (req, res) => {
    res.send(
        "Servidor SSE de monitoramento de silos funcionando!"
    );
});

app.get("/api/silos", (req, res) => {
    res.json(
        obterEstadoSilos()
    );
});

// ======================================================
// SSE
// ======================================================

function conectarSSE(req, res) {
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

    res.write("retry: 3000\n\n");

    clientesSSE.add(res);

    console.log(
        `Cliente SSE conectado. Total: ${clientesSSE.size}`
    );

    enviarEvento(
        res,
        "sensor_update",
        obterEstadoSilos()
    );

    req.on("close", () => {
        clientesSSE.delete(res);

        console.log(
            `Cliente SSE desconectado. Total: ${clientesSSE.size}`
        );
    });
}

app.get("/events", conectarSSE);

app.get(
    "/api/silos/stream",
    conectarSSE
);

// ======================================================
// SIMULAÇÃO
// ======================================================

setInterval(() => {
    atualizarSensores();

    transmitirSensores();

    console.log(
        "Telemetria atualizada:",
        silos.map((silo) => ({
            silo: silo.codigo,
            temperatura: silo.temperatura,
            umidade: silo.umidade,
            co2: silo.co2,
            nivel: silo.nivel
        }))
    );

}, 2000);

// ======================================================
// INICIA SERVIDOR
// ======================================================

app.listen(PORT, () => {
    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );

    console.log(
        `SSE disponível em http://localhost:${PORT}/events`
    );

    console.log(
        `SSE alternativo em http://localhost:${PORT}/api/silos/stream`
    );
});