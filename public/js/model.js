// Archivo: js/model.js
window.Model = class Model {
    constructor() {
        this.datos = null;
    }

    async cargarDatos() {
        try {
            const response = await fetch('/api/sequia');
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            this.datos = result;
        } catch (error) {
            console.error("Fallo al cargar datos desde el backend:", error);
            throw error;
        }
    }

    getGeojsonData() { return this.datos?.geojsonData; }
    getDatosHistoricosComunales() { return this.datos?.datosHistoricosComunales; }
    getDatosSidebar() { return this.datos?.datosSidebar; }
}
// Exportado como window.Model