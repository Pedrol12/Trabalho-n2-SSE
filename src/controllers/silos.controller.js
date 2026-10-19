// ======================================================
// TÓPICO PROFESSOR: CONTROLLER HTTP
// ======================================================
//
// Recebe a requisição HTTP e chama os services.
//

function criarSilosController({
    silos,
    logsAuditoria,
    buscarSilo,
    obterEstadoSilos,
    controlarAtuadores,
    voltarAutomatico
}) {

    function statusServidor(
        req,
        res
    ) {

        res.send(
            "Servidor SSE de monitoramento de silos funcionando!"
        );
    }

    function listarSilos(
        req,
        res
    ) {

        res.json(
            obterEstadoSilos()
        );
    }

    function buscarSiloPorId(
        req,
        res
    ) {

        const silo =
            buscarSilo(
                req.params.id
            );

        if (
            !silo
        ) {

            return res
                .status(404)
                .json({
                    erro:
                        "Silo não encontrado."
                });
        }

        res.json(
            silo
        );
    }

    function listarLogs(
        req,
        res
    ) {

        res.json({
            total:
                logsAuditoria.length,

            logs:
                logsAuditoria
        });
    }

    function executarControleManual(
        req,
        res
    ) {

        const resultado =
            controlarAtuadores(
                req.params.id,
                req.body
            );

        return res
            .status(
                resultado.status
            )
            .json(
                resultado.corpo
            );
    }

    function executarModoAutomatico(
        req,
        res
    ) {

        const resultado =
            voltarAutomatico(
                req.params.id,
                req.body
            );

        return res
            .status(
                resultado.status
            )
            .json(
                resultado.corpo
            );
    }

    return {
        statusServidor,
        listarSilos,
        buscarSiloPorId,
        listarLogs,
        executarControleManual,
        executarModoAutomatico
    };
}

module.exports = {
    criarSilosController
};