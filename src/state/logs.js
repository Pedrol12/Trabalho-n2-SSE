// ======================================================
// TÓPICO PROFESSOR: LOGS EM MEMÓRIA
// ======================================================

const logsAuditoria =
    [];

let proximoIdLog =
    1;

function gerarIdLog() {

    return proximoIdLog++;
}

module.exports = {
    logsAuditoria,
    gerarIdLog
};