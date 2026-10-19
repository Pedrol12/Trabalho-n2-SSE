// ======================================================
// TÓPICO PROFESSOR: ESTADO DOS SILOS EM MEMÓRIA
// ======================================================
//
// Os dados atuais dos silos ficam em memória.
//
// Diferente de um banco de dados, estas informações
// são perdidas quando o processo Node é encerrado.
//

const silos = [
    {
        id: 1,
        codigo: "SILO-01",

        temperatura: 27.0,
        umidade: 13.2,
        co2: 1200,
        nivel: 99.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    },

    {
        id: 2,
        codigo: "SILO-02",

        temperatura: 31.5,
        umidade: 14.1,
        co2: 1650,
        nivel: 84.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    },

    {
        id: 3,
        codigo: "SILO-03",

        temperatura: 36.0,
        umidade: 12.8,
        co2: 800,
        nivel: 65.0,

        comporta: "FECHADA",
        exaustor: "DESLIGADO",

        modoOperacao: "AUTOMATICO",

        alarme: "NORMAL",
        statusCarga: "LIBERADO",

        alertas: {
            co2Atencao: false,
            co2Critico: false,
            temperaturaAlta: false,
            temperaturaCritica: false,
            capacidadeMaxima: false
        }
    }
];

module.exports = {
    silos
};