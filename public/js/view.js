// js/view.js
// Archivo: js/view.js
window.View = class View {
    constructor() {
        // Contenedores principales
        this.mapContainer = document.getElementById('mapaValparaisoLeaflet');
        this.panelDetalle = document.getElementById('panel-detalle-comuna');
        this.modalMapContainer = document.getElementById('modalMapContainer');

        // Instancias
        this.mapa = null;
        this.geoJsonLayer = null;
        this.infoControl = null;
        this.detalleChartInstance = null;
        this.regionalChartInstance = null;
        this.currentModalMapInstance = null;

        // Constantes de estilo
        this.COLORES_SEQUIA = { 'SA': '#d9d9d9', 'D0': '#ffff00', 'D1': '#fcd37f', 'D2': '#ffaa00', 'D3': '#E60000', 'D4': '#730000', 'DEFAULT': '#B0B0B0' };
    }
    ocultarModalMapa() { document.getElementById('mapModal').style.display = 'none'; }
    resaltarComuna(layer) { layer.setStyle({ weight: 3, color: '#333' }); layer.bringToFront(); this.infoControl.update(layer.feature.properties); }
    resetearResaltado(layer) { this.geoJsonLayer.resetStyle(layer); this.infoControl.update(); }
    bloquearCapa(layer) { layer.setStyle({ weight: 4, color: '#000' }); layer.bringToFront(); }
    mostrarModalMapa(titulo, geojsonData, clave) {
        document.getElementById('modalMapTitle').textContent = `Persistencia ${titulo}`;
        if (this.currentModalMapInstance) this.currentModalMapInstance.remove();
        this.modalMapContainer.innerHTML = '';
        document.getElementById('mapModal').style.display = 'block';
        setTimeout(() => {
            this.currentModalMapInstance = L.map(this.modalMapContainer, { center: [-33.0, -71.2], zoom: 8 });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.currentModalMapInstance);
            const layer = L.geoJson(geojsonData, { style: f => this._estiloPersistencia(f, clave) }).addTo(this.currentModalMapInstance);
            this.currentModalMapInstance.fitBounds(layer.getBounds().pad(0.1));
        }, 10);
    }

    renderizarMapa(geojsonData, onComunaMouseover, onComunaMouseout, onComunaClick) {
        if (!this.mapContainer || !L) {
            console.error("El contenedor del mapa o Leaflet no está disponible.");
            return;
        }

        // Inicializar el mapa
        this.mapa = L.map(this.mapContainer).setView([-33.0, -71.2], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }).addTo(this.mapa);

        // Añadir el control de información
        this._crearControlInfo();
        this.infoControl.addTo(this.mapa);

        // Añadir la capa GeoJSON con los datos fusionados
        this.geoJsonLayer = L.geoJson(geojsonData, {
            style: (feature) => this._estiloPorSequia(feature),
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => onComunaMouseover(e.target),
                    mouseout: (e) => onComunaMouseout(e.target),
                    click: (e) => onComunaClick(e.target)
                });
            }
        }).addTo(this.mapa);
        
        this.mapa.fitBounds(this.geoJsonLayer.getBounds());
    }

    // Métodos de la vista para interactividad
    resaltarComuna(layer) {
        layer.setStyle({ weight: 3, color: '#333', fillOpacity: 0.85 });
        layer.bringToFront();
        this.infoControl.update(layer.feature.properties);
    }

    resetearResaltado(layer) {
        this.geoJsonLayer.resetStyle(layer);
        this.infoControl.update();
    }

    // Métodos privados de la vista
    _estiloPorSequia(feature) {
        const props = feature.properties;
        let categoriaDominante = 'SA';
        let maxValor = -1;

        ['D4', 'D3', 'D2', 'D1', 'D0', 'SA'].forEach(cat => {
            const valor = parseFloat(props[cat]);
            if (!isNaN(valor) && valor > maxValor) {
                maxValor = valor;
                categoriaDominante = cat;
            }
        });

        return {
            fillColor: this.COLORES_SEQUIA[categoriaDominante] || this.COLORES_SEQUIA.DEFAULT,
            weight: 1, opacity: 1, color: '#666', fillOpacity: 0.7
        };
    }

    _crearControlInfo() {
        this.infoControl = L.control({ position: 'topright' });
        this.infoControl.onAdd = () => {
            this._div = L.DomUtil.create('div', 'info p-2 bg-light border rounded shadow-sm');
            this.infoControl.update();
            return this._div;
        };
        this.infoControl.update = (props) => {
            this._div.innerHTML = props
                ? `<b>${props.COMUNA || 'Comuna'}</b>`
                : 'Pase el mouse sobre una comuna';
        };
    }

    _getColorForIndex(indexValue) {
        if (indexValue === null || typeof indexValue === 'undefined' || isNaN(parseFloat(indexValue))) {
            return '#CCCCCC'; // Gris para sin datos
        }
        const val = parseFloat(indexValue);

        // Valores húmedos/lluviosos (SPI positivo)
        if (val >= 2.5) return '#005954';  // Ext. Lluvioso
        if (val >= 2.0) return '#338b85';  // Muy Lluvioso
        if (val >= 1.5) return '#5dc1b9';  // Lluvioso
        if (val >= 1.0) return '#9ce0db';  // Lig. Lluvioso
        if (val >= 0.5) return '#d5ffff';  // Normal Lluvioso
        
        // Valores secos (SPI negativo)
        if (val <= -2.5) return '#801300'; // Ext. Seco
        if (val <= -2.0) return '#EA2B00'; // Muy Seco
        if (val <= -1.5) return '#ffaa00'; // Seco
        if (val <= -1.0) return '#fcd370'; // Lig. Seco
        if (val <= -0.5) return '#ffff00'; // Normal Seco
        
        // Rango Normal (-0.5 a 0.5)
        return '#FFFFFF'; // Blanco para rango Normal
    }

    _estiloPersistencia(feature, propiedadPersistencia) {
        return {
            fillColor: this._getColorForIndex(feature.properties[propiedadPersistencia]),
            weight: 0.5,
            opacity: 1,
            color: '#888',
            fillOpacity: 0.8
        };
    }
    mostrarPanelDetalle(comunaProps, historialComuna) {
        document.getElementById('detalle-comuna-nombre').textContent = comunaProps.COMUNA;
        let tablaHtml = `<table class="table table-sm">`;
        ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'].forEach(cat => {
            tablaHtml += `<tr><td><strong>${cat}:</strong></td><td>${comunaProps[cat] ?? 'N/A'}%</td></tr>`;
        });
        tablaHtml += `</table><div id="detalle-comuna-grafico" style="width:100%; height:250px;"></div>`;
        document.getElementById('detalle-comuna-contenido').innerHTML = tablaHtml;
        this._crearGraficoComunal(historialComuna);
        this.panelDetalle.style.display = 'block';
    }

    ocultarPanelDetalle() {
        this.panelDetalle.style.display = 'none';
        if (this.detalleChartInstance) this.detalleChartInstance.destroy();
    }
    bindEvents(handlerCerrarPanel, handlerCerrarModal) {
        document.getElementById('cerrar-panel-detalle')?.addEventListener('click', handlerCerrarPanel);
        document.querySelector('.map-modal-close-button')?.addEventListener('click', handlerCerrarModal);
        document.getElementById('mapModal')?.addEventListener('click', e => { if (e.target.id === 'mapModal') handlerCerrarModal(); });
    }
    bindCerrarPanel(handler) {
        this.botonCerrarPanel?.addEventListener('click', handler);
    }
    
    _crearGraficoComunal(comunaProps, historialComuna) {
        if (this.detalleChartInstance) this.detalleChartInstance.destroy();

        if (!historialComuna || historialComuna.length === 0) {
            document.getElementById('detalle-comuna-grafico').innerHTML = '<p class="text-center small p-2">No hay datos históricos.</p>';
            return;
        }

        const categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        const labels = historialComuna.map(r => new Date(r.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
        const datasetsData = {};
        categorias.forEach(cat => {
            datasetsData[cat] = historialComuna.map(r => parseFloat(r[cat]) || 0);
        });

        const seriesData = [
            { name: 'SA', color: this.COLORES_SEQUIA.SA, data: datasetsData.SA },
            { name: 'D0', color: this.COLORES_SEQUIA.D0, data: datasetsData.D0 },
            { name: 'D1', color: this.COLORES_SEQUIA.D1, data: datasetsData.D1 },
            { name: 'D2', color: this.COLORES_SEQUIA.D2, data: datasetsData.D2 },
            { name: 'D3', color: this.COLORES_SEQUIA.D3, data: datasetsData.D3 },
            { name: 'D4', color: this.COLORES_SEQUIA.D4, data: datasetsData.D4 }
        ];

        this.detalleChartInstance = Highcharts.chart('detalle-comuna-grafico', {
            chart: { type: 'area' },
            title: { text: null },
            xAxis: { categories: labels, labels: { style: { fontSize: '8px' } } },
            yAxis: { min: 0, max: 100, title: { text: '%' } },
            tooltip: { pointFormat: '{series.name}: <b>{point.y:.1f}%</b><br/>', shared: true },
            plotOptions: { area: { stacking: 'percent' } },
            series: seriesData,
            credits: { enabled: false },
            legend: { itemStyle: { fontSize: '10px' } }
        });
    }
    renderizarMinimapas(geojsonData, onMinimapClick) {
        console.log('Iniciando renderizado de minimapas...');
        const periodos = [
            { id: 'mapaPersistencia3m', clave: 'p_3m', titulo: '3 Meses' },
            { id: 'mapaPersistencia9m', clave: 'p_9m', titulo: '9 Meses' },
            { id: 'mapaPersistencia12m', clave: 'p_12m', titulo: '12 Meses' },
            { id: 'mapaPersistencia24m', clave: 'p_24m', titulo: '24 Meses' },
            { id: 'mapaPersistencia48m', clave: 'p_48m', titulo: '48 Meses' },
        ];
        
        periodos.forEach(p => {
            const container = document.getElementById(p.id);
            if (!container) {
                console.warn(`Contenedor ${p.id} no encontrado`);
                return;
            }
            
            console.log(`Procesando minimapa ${p.id} con clave ${p.clave}`);
            
            // Verificar si hay datos de persistencia para esta clave
            const tieneDatos = geojsonData.features.some(f => 
                f.properties[p.clave] !== null && 
                f.properties[p.clave] !== undefined
            );
            console.log(`Minimapa ${p.id} tiene datos:`, tieneDatos);
            
            // Limpiar contenido anterior (incluyendo spinner)
            container.innerHTML = '';
            
            // Limpiar mapa anterior si existe
            if (container._leaflet_id) {
                console.log(`Limpiando minimapa existente: ${p.id}`);
                container._leaflet_id = undefined;
            }
            
            try {
                const map = L.map(p.id, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: false });
                const geoJsonLayer = L.geoJson(geojsonData, { 
                    style: f => this._estiloPersistencia(f, p.clave) 
                }).addTo(map);
                
                // Verificar que el geoJsonLayer tenga bounds válidos antes de ajustar
                if (geoJsonLayer.getBounds().isValid()) {
                    map.fitBounds(geoJsonLayer.getBounds().pad(0.05));
                } else {
                    // Fallback: centrar en Valparaíso si no hay bounds válidos
                    map.setView([-33.0, -71.2], 8);
                }
                
                container.addEventListener('click', () => onMinimapClick(p.titulo, geojsonData, p.clave));
                console.log(`Minimapa ${p.id} inicializado correctamente`);
                
            } catch (error) {
                console.error(`Error inicializando minimapa ${p.id}:`, error);
                // Mostrar mensaje de error en lugar del spinner
                container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><small class="text-muted">Error al cargar</small></div>';
            }
        });
    }
    renderizarSidebar(datosSidebar) {
        if (!datosSidebar || !datosSidebar.promedios) {
            console.warn('Datos del sidebar no disponibles');
            return;
        }
        
        // Actualizar tabla de promedios
        for (const cat in datosSidebar.promedios) {
            const el = document.getElementById(`avg-${cat.toLowerCase()}`);
            if (el) el.textContent = `${datosSidebar.promedios[cat]}%`;
        }
        // Crear gráfico regional
        if (!datosSidebar.historico || !datosSidebar.historico.series) {
            console.warn('Datos históricos no disponibles para el gráfico');
            return;
        }
        
        if (this.regionalChartInstance) this.regionalChartInstance.destroy();
        const categorias = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'];
        const seriesData = categorias.map(cat => ({
            name: cat,
            color: this.COLORES_SEQUIA[cat],
            data: datosSidebar.historico.series[cat] || []
        }));
        this.regionalChartInstance = Highcharts.chart('timeSeriesChartRegionalSidebar', {
            chart: { type: 'area' }, title: { text: null },
            xAxis: { categories: datosSidebar.historico.labels, labels: { style: { fontSize: '8px' } } },
            yAxis: { min: 0, max: 100, title: { text: '%' } },
            tooltip: { pointFormat: '{series.name}: <b>{point.y:.1f}%</b><br/>', shared: true },
            plotOptions: { area: { stacking: 'percent' } },
            series: seriesData, credits: { enabled: false }, legend: { enabled: false }
        });
    }
    renderizarMapaPrincipal(geojsonData, onComunaMouseover, onComunaMouseout, onComunaClick) {
        // Verificar si ya existe un mapa y limpiarlo
        if (this.mapa) {
            console.log('Limpiando mapa existente...');
            this.mapa.remove();
            this.mapa = null;
            this.geoJsonLayer = null;
            this.infoControl = null;
        }

        // Verificar si el contenedor ya tiene un mapa inicializado
        if (this.mapContainer._leaflet_id) {
            console.log('Limpiando contenedor del mapa...');
            this.mapContainer._leaflet_id = undefined;
            this.mapContainer.innerHTML = '';
        }

        // Verificar que el contenedor esté disponible
        if (!this.mapContainer || !L) {
            console.error("El contenedor del mapa o Leaflet no está disponible.");
            return;
        }

        console.log('Inicializando nuevo mapa...');
        this.mapa = L.map(this.mapContainer).setView([-33.0, -71.2], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapa);
        this._crearControlInfo();
        this.infoControl.addTo(this.mapa);
        this.geoJsonLayer = L.geoJson(geojsonData, {
            style: (feature) => this._estiloPorSequia(feature),
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: (e) => onComunaMouseover(e.target),
                    mouseout: (e) => onComunaMouseout(e.target),
                    click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        onComunaClick(e.target);
                    }
                });
            }
        }).addTo(this.mapa);
        this.mapa.fitBounds(this.geoJsonLayer.getBounds());
        this.mapa.on('click', onComunaClick); // Para cerrar el panel al hacer clic fuera
    }
}

// Exportado como window.View