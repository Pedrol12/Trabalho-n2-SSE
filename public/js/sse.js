
// Cria a ligação em tempo real com o backend (rota /events)

export function criarConexaoSSE(handlers = {}) {
    // Abre a conexão com o backend
    const eventos = new EventSource('/events');

    // Conexão estabelecida -> tela mostra "conectado" (verde)
    eventos.onopen = () => handlers.onStatus?.('CONECTADO');

    // Conexão caiu -> tela mostra "falha" (vermelho).
    // O navegador tenta reconectar sozinho (o servidor manda retry: 3000).
    eventos.onerror = () => handlers.onStatus?.('FALHA');

    for (const nome of [
        'sensor_update',        
        'automation_alert',    
        'critical_alarm',       
        'capacity_alert',       
        'audit_log',          
        'audit_log_snapshot',   
        'actuator_update'       
    ]) {
        eventos.addEventListener(nome, (event) => {
            handlers[nome]?.(JSON.parse(event.data));
        });
    }

    return eventos;
}