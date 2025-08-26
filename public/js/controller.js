// Archivo: js/controller.js
window.Controller = class Controller {
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

            console.log('Datos GeoJSON recibidos:', geojsonData);
            console.log('Verificando datos de persistencia en primera feature:', geojsonData.features[0]?.properties);

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
        const datosHistoricos = this.model.getDatosHistoricosComunales();
        let historial = [];
        
        if (datosHistoricos) {
            // Buscar con el código completo (05101)
            if (datosHistoricos[cutCom]) {
                historial = datosHistoricos[cutCom];
            } 
            // Si no se encuentra y el código tiene 5 dígitos con cero inicial, buscar sin el cero (5101)
            else if (cutCom.length === 5 && cutCom[0] === '0') {
                const codigoSinCero = cutCom.substring(1);
                if (datosHistoricos[codigoSinCero]) {
                    historial = datosHistoricos[codigoSinCero];
                }
            }
        }
        
        console.log('Clic en comuna:', layer.feature.properties.COMUNA, 'CUT_COM:', cutCom);
        console.log('Datos históricos disponibles:', !!datosHistoricos);
        
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
// Exportado como window.Controller