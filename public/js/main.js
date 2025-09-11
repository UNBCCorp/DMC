// js/main.js
// Espera a que el DOM esté completamente cargado para empezar.
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que las clases estén disponibles
    if (!window.Model || !window.View || !window.Controller) {
        return;
    }
    
    // 1. Se crean las instancias de cada componente.
    const model = new window.Model();
    const view = new window.View();
    
    // 2. Se inyectan el modelo y la vista en el controlador.
    const app = new window.Controller(model, view);

    // 3. Se inicia la aplicación.
    app.init();
});