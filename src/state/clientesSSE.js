// ======================================================
// TÓPICO PROFESSOR: CLIENTES SSE EM MEMÓRIA
// ======================================================
//
// Guarda as conexões HTTP que permanecem abertas.
//
// Cada Response representa um cliente conectado
// ao fluxo Server-Sent Events.
//

const clientesSSE =
    new Set();

module.exports = {
    clientesSSE
};