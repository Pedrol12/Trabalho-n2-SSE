// ======================================================
// TÓPICO PROFESSOR: AUTOMAÇÃO DOS SILOS
// ======================================================
//
// As regras de negócio ficam separadas
// da camada HTTP e da camada SSE.
//

function criarAutomacaoService({
    registrarLog,
    emitirAlerta
}) {

    function aplicarAutomacoes(
        silo
    ) {

        const co2Atencao =
            silo.co2 >= 1000;

        const co2Critico =
            silo.co2 >= 1500;

        const temperaturaAlta =
            silo.temperatura >= 30;

        const temperaturaCritica =
            silo.temperatura >= 35;

        const capacidadeMaxima =
            silo.nivel >= 98;

        silo.alertas = {
            co2Atencao,
            co2Critico,
            temperaturaAlta,
            temperaturaCritica,
            capacidadeMaxima
        };

        // ==================================================
        // TÓPICO PROFESSOR: AUTOMAÇÃO DOS ATUADORES
        // ==================================================

        if (
            silo.modoOperacao ===
            "AUTOMATICO"
        ) {

            if (
                co2Critico &&
                silo.comporta !==
                    "ABERTA"
            ) {

                silo.comporta =
                    "ABERTA";

                registrarLog(
                    silo,
                    "COMPORTA_AUTOMATICA",
                    `Comporta aberta automaticamente. CO2 em ${silo.co2} ppm.`
                );

                emitirAlerta(
                    "automation_alert",
                    silo,
                    "ALTA",
                    `CO2 crítico no ${silo.codigo}. Comporta aberta automaticamente.`
                );
            }

            if (
                temperaturaAlta &&
                silo.exaustor !==
                    "LIGADO"
            ) {

                silo.exaustor =
                    "LIGADO";

                registrarLog(
                    silo,
                    "EXAUSTOR_AUTOMATICO",
                    `Exaustor ligado automaticamente. Temperatura em ${silo.temperatura}°C.`
                );

                emitirAlerta(
                    "automation_alert",
                    silo,
                    "ALTA",
                    `Temperatura elevada no ${silo.codigo}. Exaustor ligado automaticamente.`
                );
            }
        }

        // ==================================================
        // TÓPICO PROFESSOR: REGRA DE CAPACIDADE
        // ==================================================

        const novoStatusCarga =
            capacidadeMaxima
                ? "BLOQUEADO_PARA_CARGA"
                : "LIBERADO";

        if (
            silo.statusCarga !==
            novoStatusCarga
        ) {

            silo.statusCarga =
                novoStatusCarga;

            if (
                capacidadeMaxima
            ) {

                registrarLog(
                    silo,
                    "BLOQUEIO_CARGA",
                    `Carga bloqueada. Nível do silo em ${silo.nivel}%.`
                );

                emitirAlerta(
                    "capacity_alert",
                    silo,
                    "ALTA",
                    `${silo.codigo} atingiu capacidade máxima. Carga bloqueada.`
                );

            } else {

                registrarLog(
                    silo,
                    "LIBERACAO_CARGA",
                    `Carga liberada. Nível do silo em ${silo.nivel}%.`
                );
            }
        }

        // ==================================================
        // TÓPICO PROFESSOR: ALARME
        // ==================================================

        let novoAlarme =
            "NORMAL";

        if (
            temperaturaCritica
        ) {

            novoAlarme =
                "CRITICO_TEMPERATURA";

        } else if (
            co2Critico
        ) {

            novoAlarme =
                "CO2_CRITICO";

        } else if (
            co2Atencao
        ) {

            novoAlarme =
                "CO2_ELEVADO";

        } else if (
            temperaturaAlta
        ) {

            novoAlarme =
                "ALERTA_TEMPERATURA";
        }

        const alarmeAnterior =
            silo.alarme;

        silo.alarme =
            novoAlarme;

        if (
            novoAlarme !==
                alarmeAnterior &&

            novoAlarme !==
                "NORMAL"
        ) {

            registrarLog(
                silo,
                "ALARME",
                `Alarme alterado de ${alarmeAnterior} para ${novoAlarme}.`
            );

            if (
                temperaturaCritica
            ) {

                emitirAlerta(
                    "critical_alarm",
                    silo,
                    "CRITICA",
                    `RISCO DE SUPERAQUECIMENTO no ${silo.codigo}: ${silo.temperatura}°C.`
                );

            } else if (
                co2Atencao
            ) {

                emitirAlerta(
                    "automation_alert",
                    silo,

                    co2Critico
                        ? "CRITICA"
                        : "ATENCAO",

                    `CO2 elevado no ${silo.codigo}: ${silo.co2} ppm.`
                );

            } else if (
                temperaturaAlta
            ) {

                emitirAlerta(
                    "automation_alert",
                    silo,
                    "ATENCAO",
                    `Temperatura elevada no ${silo.codigo}: ${silo.temperatura}°C.`
                );
            }
        }
    }

    return {
        aplicarAutomacoes
    };
}

module.exports = {
    criarAutomacaoService
};