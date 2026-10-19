// ======================================================
// TÓPICO PROFESSOR: ENVIO DE EVENTOS SSE
// ======================================================
//
// SSE envia eventos do servidor para os clientes
// através de uma conexão HTTP mantida aberta.
//

function criarEventosSSE({
    clientesSSE,
    obterEstadoSilos
}) {

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

        for (
            const cliente
            of clientesSSE
        ) {

            enviarEvento(
                cliente,
                nomeEvento,
                dados
            );
        }
    }

    function transmitirSensores() {

        transmitirEvento(
            "sensor_update",
            obterEstadoSilos()
        );
    }

    return {
        enviarEvento,
        transmitirEvento,
        transmitirSensores
    };
}

module.exports = {
    criarEventosSSE
};