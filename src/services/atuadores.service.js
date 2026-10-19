// ======================================================
// TÓPICO PROFESSOR: CONTROLE DOS ATUADORES
// ======================================================
//
// Contém as regras para comandos manuais
// e retorno ao modo automático.
//

function criarAtuadoresService({
    buscarSilo,
    registrarLog,
    aplicarAutomacoes,
    transmitirSensores,
    transmitirEvento
}) {

    function controlarAtuadores(
        id,
        dados
    ) {

        const silo =
            buscarSilo(
                id
            );

        if (
            !silo
        ) {

            return {
                status: 404,

                corpo: {
                    sucesso: false,
                    erro:
                        "Silo não encontrado."
                }
            };
        }

        const {
            comportaComando = "MANTER",
            exaustorComando = "MANTER",
            operadorId =
                "OPERADOR-NAO-INFORMADO"
        } = dados;

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

            return {
                status: 400,

                corpo: {
                    sucesso: false,
                    erro:
                        "Comando de comporta inválido."
                }
            };
        }

        if (
            !comandosExaustor.includes(
                exaustor
            )
        ) {

            return {
                status: 400,

                corpo: {
                    sucesso: false,
                    erro:
                        "Comando de exaustor inválido."
                }
            };
        }

        silo.modoOperacao =
            "MANUAL";

        registrarLog(
            silo,
            "MODO_OPERACAO",
            `Modo alterado para MANUAL pelo operador ${operadorId}.`,
            "MANUAL",
            operadorId
        );

        if (
            comporta ===
                "ABRIR"
        ) {

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

        if (
            comporta ===
                "FECHAR"
        ) {

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

        if (
            exaustor ===
                "LIGAR"
        ) {

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

        if (
            exaustor ===
                "DESLIGAR"
        ) {

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

        return {
            status: 200,

            corpo: {
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
            }
        };
    }

    function voltarAutomatico(
        id,
        dados
    ) {

        const silo =
            buscarSilo(
                id
            );

        if (
            !silo
        ) {

            return {
                status: 404,

                corpo: {
                    sucesso: false,
                    erro:
                        "Silo não encontrado."
                }
            };
        }

        const operadorId =
            dados.operadorId ||
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

        aplicarAutomacoes(
            silo
        );

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

        return {
            status: 200,

            corpo: {
                sucesso: true,

                mensagem:
                    "Silo retornou ao modo automático.",

                silo
            }
        };
    }

    return {
        controlarAtuadores,
        voltarAutomatico
    };
}

module.exports = {
    criarAtuadoresService
};