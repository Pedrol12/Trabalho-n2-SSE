const express =
    require("express");

// ======================================================
// TÓPICO PROFESSOR: ROTAS SSE
// ======================================================

function criarSSERoutes({
    conectarSSE
}) {

    const router =
        express.Router();

    router.get(
        "/events",
        conectarSSE
    );

    router.get(
        "/api/silos/stream",
        conectarSSE
    );

    return router;
}

module.exports = {
    criarSSERoutes
};