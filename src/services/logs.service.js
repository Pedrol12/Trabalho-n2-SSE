// ======================================================
// TÓPICO PROFESSOR: AUDITORIA
// ======================================================

function criarLogsService({
    logsAuditoria,
    gerarIdLog,
    transmitirEvento
}) {

    function registrarLog(
        silo,
        tipo,
        descricao,
        origem = "AUTOMATICO",
        operadorId = null
    ) {

        const registro = {
            id:
                gerarIdLog(),

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

        logsAuditoria.push(
            registro
        );

        if (
            logsAuditoria.length >
            20
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

        return registro;
    }

    return {
        registrarLog
    };
}

module.exports = {
    criarLogsService
};