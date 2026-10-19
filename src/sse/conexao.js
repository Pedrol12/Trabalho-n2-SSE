// ======================================================
// TÓPICO PROFESSOR: CONEXÃO SSE
// ======================================================
//
// Configura os headers necessários para manter
// a resposta HTTP aberta.
//
// retry: 3000 orienta o EventSource do frontend
// a tentar reconectar após aproximadamente 3 segundos.
//

function criarConexaoSSE({
    clientesSSE,
    logsAuditoria,
    enviarEvento,
    obterEstadoSilos
}) {

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

        // TÓPICO PROFESSOR: RECONEXÃO AUTOMÁTICA SSE
        res.write(
            "retry: 3000\n\n"
        );

        clientesSSE.add(
            res
        );

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

                clientesSSE.delete(
                    res
                );

                console.log(
                    `Cliente SSE desconectado. Total: ${clientesSSE.size}`
                );
            }
        );
    }

    return {
        conectarSSE
    };
}

module.exports = {
    criarConexaoSSE
};