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

            // Datos GeoJSON cargados correctamente

            this.view.renderizarMapaPrincipal(geojsonData, this.handleComunaMouseover, this.handleComunaMouseout, this.handleComunaClick);
            this.view.renderizarSidebar(datosSidebar);
            this.view.renderizarMinimapas(geojsonData, this.handleMinimapClick);
            this.view.bindEvents(this.handleCerrarPanel, this.handleCerrarModal);
            
            // Actualizar título con el mes correspondiente a los datos
            this.actualizarTituloConMes();
        } catch (error) {
        }
    }

    // Función utilitaria para obtener el mes de los datos
    static obtenerMesDatos() {
        const hoy = new Date();
        const diaDeHoy = hoy.getDate();
        const fechaObjetivo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        // Misma lógica que en el backend para determinar el mes de los datos
        if (diaDeHoy < 17) {
            fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 2);
        } else {
            fechaObjetivo.setMonth(fechaObjetivo.getMonth() - 1);
        }
        
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        return {
            mesNombre: meses[fechaObjetivo.getMonth()],
            ano: fechaObjetivo.getFullYear(),
            fecha: fechaObjetivo
        };
    }

    // Función para actualizar el título con el mes de los datos
    actualizarTituloConMes() {
        const { mesNombre } = Controller.obtenerMesDatos();
        
        // Actualizar el título
        const tituloElement = document.getElementById('titulo-afectacion-categoria');
        if (tituloElement) {
            tituloElement.textContent = `Porcentaje de afectación y categoría - ${mesNombre}`;
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
        
        // Procesando clic en comuna
        
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