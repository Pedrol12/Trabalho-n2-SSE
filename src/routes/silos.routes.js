const express =
    require("express");

// ======================================================
// TÓPICO PROFESSOR: ROTAS HTTP MODULARIZADAS
// ======================================================

function criarSilosRoutes({
    controller
}) {

    const router =
        express.Router();

    router.get(
        "/",
        controller.listarSilos
    );

    router.get(
        "/:id",
        controller.buscarSiloPorId
    );

    router.post(
        "/:id/atuadores",
        controller.executarControleManual
    );

    router.post(
        "/:id/automatico",
        controller.executarModoAutomatico
    );

    return router;
}

module.exports = {
    criarSilosRoutes
};