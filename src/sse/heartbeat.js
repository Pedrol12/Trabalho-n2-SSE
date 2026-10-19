// ======================================================
// TÓPICO PROFESSOR: HEARTBEAT SSE
// ======================================================
//
// Envia comentários SSE periodicamente.
//
// Linhas iniciadas por ":" são ignoradas pelo
// EventSource, mas mantêm a conexão HTTP ativa.
//

function iniciarHeartbeatSSE({
    clientesSSE,
    intervaloMs = 15000
}) {

    return setInterval(
        () => {

            for (
                const cliente
                of clientesSSE
            ) {

                try {

                    cliente.write(
                        ": heartbeat\n\n"
                    );

                } catch (erro) {

                    clientesSSE.delete(
                        cliente
                    );
                }
            }
        },

        intervaloMs
    );
}

module.exports = {
    iniciarHeartbeatSSE
};