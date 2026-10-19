// ======================================================
// TÓPICO PROFESSOR: SIMULAÇÃO DOS SENSORES
// ======================================================

function criarSensoresService({
    silos,
    aplicarAutomacoes
}) {

    function limitar(
        valor,
        minimo,
        maximo
    ) {

        return Math.min(
            Math.max(
                valor,
                minimo
            ),
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

    function atualizarSensores() {

        for (
            const silo
            of silos
        ) {

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

            aplicarAutomacoes(
                silo
            );
        }
    }

    function exibirTelemetria() {

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
    }

    return {
        atualizarSensores,
        exibirTelemetria
    };
}

module.exports = {
    criarSensoresService
};