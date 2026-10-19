// ======================================================
// TÓPICO PROFESSOR: ALERTAS SSE
// ======================================================
//
// Eventos diferentes permitem que o frontend
// identifique o tipo e a severidade do alerta.
//

function criarAlertasService({
    transmitirEvento
}) {

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

    return {
        emitirAlerta
    };
}

module.exports = {
    criarAlertasService
};