// ======================================================
// TÓPICO PROFESSOR: SERVIÇO DE SILOS
// ======================================================
//
// Centraliza consultas e leitura do estado atual.
//

function criarSilosService({
    silos
}) {

    function buscarSilo(
        id
    ) {

        return silos.find(
            (silo) =>
                silo.id ===
                Number(id)
        );
    }

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

    return {
        buscarSilo,
        obterEstadoSilos
    };
}

module.exports = {
    criarSilosService
};