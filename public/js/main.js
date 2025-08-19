// js/main.js
import Model from './model.js';
import View from './view.js';
import Controller from './controller.js';

// Espera a que el DOM esté completamente cargado para empezar.
document.addEventListener('DOMContentLoaded', () => {
    // 1. Se crean las instancias de cada componente.
    const model = new Model();
    const view = new View();
    
    // 2. Se inyectan el modelo y la vista en el controlador.
    const app = new Controller(model, view);

    // 3. Se inicia la aplicación.
    app.init();
});