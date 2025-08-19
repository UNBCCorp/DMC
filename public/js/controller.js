import Model from './model.js';
import View from './view.js';
// Archivo: js/controller.js
class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.lockedLayer = null;
    }

    async init() {
        try {
            await this.model.cargarDatos();
            const geojsonData = this.model.getGeojsonData();
            const datosSidebar = this.model.getDatosSidebar();
            
            if (!geojsonData || !datosSidebar) throw new Error("Datos insuficientes del backend.");

            this.view.renderizarMapaPrincipal(geojsonData, this.handleComunaMouseover, this.handleComunaMouseout, this.handleComunaClick);
            this.view.renderizarSidebar(datosSidebar);
            this.view.renderizarMinimapas(geojsonData, this.handleMinimapClick);
            this.view.bindEvents(this.handleCerrarPanel, this.handleCerrarModal);
        } catch (error) {
            console.error("Error crítico en la inicialización:", error);
        }
    }

    // --- MANEJADORES DE EVENTOS ---
    handleComunaMouseover = (layer) => { if (layer !== this.lockedLayer) this.view.resaltarComuna(layer); }
    handleComunaMouseout = (layer) => { if (layer !== this.lockedLayer) this.view.resetearResaltado(layer); }
    handleMinimapClick = (titulo, geojsonData, clave) => { this.view.mostrarModalMapa(titulo, geojsonData, clave); }
    handleCerrarModal = () => { this.view.ocultarModalMapa(); }
    
    handleComunaClick = (layer) => {
        if (!layer || !layer.feature) { // Clic fuera de una comuna
            this.handleCerrarPanel();
            return;
        }
        if (this.lockedLayer) this.view.resetearResaltado(this.lockedLayer);
        this.lockedLayer = layer;
        this.view.bloquearCapa(layer);
        
        const cutCom = layer.feature.properties.CUT_COM;
        const historial = this.model.getDatosHistoricosComunales()[cutCom] || [];
        this.view.mostrarPanelDetalle(layer.feature.properties, historial);
    }
    
    handleCerrarPanel = () => {
        this.view.ocultarPanelDetalle();
        if (this.lockedLayer) {
            this.view.resetearResaltado(this.lockedLayer);
            this.lockedLayer = null;
        }
    }
}
export default Controller;