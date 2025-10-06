// js/view.js
// Archivo: js/view.js
window.View = class View {
    constructor() {
        // Contenedores principales - inicializar de forma segura
        this.mapContainer = null;
        this.panelDetalle = null;
        this.modalMapContainer = null;
        
        // Inicializar contenedores cuando el DOM esté listo
        this._initializeContainers();

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
    
    _initializeContainers() {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._getContainers());
        } else {
            this._getContainers();
        }
    }
    
    _getContainers() {
        this.mapContainer = document.getElementById('mapaValparaisoLeaflet');
        this.panelDetalle = document.getElementById('panel-detalle-comuna');
        this.modalMapContainer = document.getElementById('modalMapContainer');
    }
    ocultarModalMapa() { 
        document.getElementById('mapModal').style.display = 'none'; 
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Limpiar listener de redimensionamiento
        if (this.modalResizeHandler) {
            window.removeEventListener('resize', this.modalResizeHandler);
            this.modalResizeHandler = null;
        }
        
        // Limpiar instancia del mapa modal
        if (this.currentModalMapInstance) {
            this.currentModalMapInstance.remove();
            this.currentModalMapInstance = null;
        }
    }
    bloquearCapa(layer) { layer.setStyle({ weight: 4, color: '#000' }); layer.bringToFront(); }
    mostrarModalMapa(titulo, geojsonData, clave) {
        document.getElementById('modalMapTitle').textContent = `Persistencia ${titulo}`;
        if (this.currentModalMapInstance) this.currentModalMapInstance.remove();
        this.modalMapContainer.innerHTML = '';
        
        // Obtener dimensiones del viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Configurar el modal principal para pantallas pequeñas
        const modal = document.getElementById('mapModal');
        const modalContent = modal.querySelector('.map-modal-content');
        
        if (viewportWidth < 768) { // Pantallas pequeñas
            modal.style.cssText = `
                display: block !important;
                position: fixed !important;
                z-index: 2000 !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                padding: 0 !important;
                margin: 0 !important;
            `;
            
            modalContent.style.cssText = `
                background-color: #fefefe !important;
                margin: 0 !important;
                padding: 10px !important;
                border: none !important;
                width: 100% !important;
                height: 100% !important;
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                box-sizing: border-box !important;
                border-radius: 0 !important;
                overflow: hidden !important;
            `;
            
            // Mejorar botón de cerrar para móviles
            const closeButton = modal.querySelector('.map-modal-close-button');
            if (closeButton) {
                closeButton.style.cssText = `
                    position: absolute !important;
                    top: 10px !important;
                    right: 15px !important;
                    font-size: 24px !important;
                    font-weight: bold !important;
                    color: #333 !important;
                    cursor: pointer !important;
                    z-index: 2001 !important;
                    background: rgba(255, 255, 255, 0.9) !important;
                    border-radius: 50% !important;
                    width: 35px !important;
                    height: 35px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    line-height: 1 !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                `;
            }
        } else {
            // Pantallas grandes - usar estilos normales
            modal.style.cssText = `
                display: block !important;
                position: fixed !important;
                z-index: 2000 !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: auto !important;
                background-color: rgba(0, 0, 0, 0.5) !important;
            `;
            
            modalContent.style.cssText = `
                background-color: #fefefe !important;
                margin: 5% auto !important;
                padding: 20px !important;
                border: 1px solid #888 !important;
                width: 85% !important;
                max-width: 900px !important;
                height: 80% !important;
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                border-radius: 8px !important;
            `;
            
            // Estilo normal del botón de cerrar para pantallas grandes
            const closeButton = modal.querySelector('.map-modal-close-button');
            if (closeButton) {
                closeButton.style.cssText = `
                    position: absolute !important;
                    top: 10px !important;
                    right: 25px !important;
                    font-size: 28px !important;
                    font-weight: bold !important;
                    color: #aaa !important;
                    cursor: pointer !important;
                    z-index: 2001 !important;
                    line-height: 1 !important;
                `;
            }
        }
        
        // Configurar el contenedor del mapa
        this.modalMapContainer.style.cssText = `
            width: 100% !important;
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            min-height: 0 !important;
        `;
        
        // Crear contenedor para el mapa con estilos responsivos
        const mapWrapper = document.createElement('div');
        
        // Calcular altura del mapa
        let mapHeight;
        if (viewportWidth < 768) {
            // En pantallas pequeñas, usar toda la altura disponible menos header
            mapHeight = viewportHeight - 80; // 80px para título y padding
        } else {
            // En pantallas grandes, usar altura calculada
            mapHeight = Math.min(450, viewportHeight * 0.6);
        }
        
        mapWrapper.style.cssText = `
            height: ${mapHeight}px !important;
            width: 100% !important;
            position: relative !important;
            display: block !important;
            box-sizing: border-box !important;
            flex: 1 !important;
            min-height: 0 !important;
        `;
        this.modalMapContainer.appendChild(mapWrapper);
        
        // Agregar estilos adicionales para prevenir scroll en móviles
        if (viewportWidth < 768) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }
        
        // Usar un timeout más largo para asegurar que el DOM esté completamente renderizado
        setTimeout(() => {
            this.currentModalMapInstance = L.map(mapWrapper, { 
                center: [-33.0, -71.2], 
                zoom: 8,
                preferCanvas: false,
                zoomControl: viewportWidth >= 768, // Solo mostrar controles de zoom en pantallas grandes
                touchZoom: true,
                doubleClickZoom: true,
                scrollWheelZoom: viewportWidth >= 768 // Solo scroll zoom en pantallas grandes
            });
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.currentModalMapInstance);
            const layer = L.geoJson(geojsonData, { style: f => this._estiloPersistencia(f, clave) }).addTo(this.currentModalMapInstance);
            
            // Agregar el control de leyenda flotante
            const leyendaControl = this._crearControlLeyenda();
            leyendaControl.addTo(this.currentModalMapInstance);
            
                         // Forzar que Leaflet recalcule el tamaño del mapa
             this.currentModalMapInstance.invalidateSize();
             
             // Ajustar bounds después de invalidar el tamaño
             setTimeout(() => {
                 this.currentModalMapInstance.fitBounds(layer.getBounds().pad(0.1));
             }, 100);
             
             // Agregar listener para redimensionamiento de ventana
             const resizeHandler = () => {
                 if (this.currentModalMapInstance) {
                     // Recalcular dimensiones
                     const newViewportHeight = window.innerHeight;
                     const newViewportWidth = window.innerWidth;
                     
                     // Reconfigurar modal si cambió el tipo de pantalla
                     const modal = document.getElementById('mapModal');
                     const modalContent = modal.querySelector('.map-modal-content');
                     
                     if (newViewportWidth < 768) {
                         // Pantalla pequeña
                         modal.style.cssText = `
                             display: block !important;
                             position: fixed !important;
                             z-index: 2000 !important;
                             left: 0 !important;
                             top: 0 !important;
                             width: 100% !important;
                             height: 100% !important;
                             overflow: hidden !important;
                             background-color: rgba(0, 0, 0, 0.8) !important;
                             padding: 0 !important;
                             margin: 0 !important;
                         `;
                         
                         modalContent.style.cssText = `
                             background-color: #fefefe !important;
                             margin: 0 !important;
                             padding: 10px !important;
                             border: none !important;
                             width: 100% !important;
                             height: 100% !important;
                             position: relative !important;
                             display: flex !important;
                             flex-direction: column !important;
                             box-sizing: border-box !important;
                             border-radius: 0 !important;
                             overflow: hidden !important;
                         `;
                         
                         // Ajustar altura del mapa
                         const mapWrapper = this.modalMapContainer.querySelector('div');
                         if (mapWrapper) {
                             mapWrapper.style.height = `${newViewportHeight - 80}px`;
                         }
                     } else {
                         // Pantalla grande
                         modal.style.cssText = `
                             display: block !important;
                             position: fixed !important;
                             z-index: 2000 !important;
                             left: 0 !important;
                             top: 0 !important;
                             width: 100% !important;
                             height: 100% !important;
                             overflow: auto !important;
                             background-color: rgba(0, 0, 0, 0.5) !important;
                         `;
                         
                         modalContent.style.cssText = `
                             background-color: #fefefe !important;
                             margin: 5% auto !important;
                             padding: 20px !important;
                             border: 1px solid #888 !important;
                             width: 85% !important;
                             max-width: 900px !important;
                             height: 80% !important;
                             position: relative !important;
                             display: flex !important;
                             flex-direction: column !important;
                             border-radius: 8px !important;
                         `;
                         
                         // Ajustar altura del mapa
                         const mapWrapper = this.modalMapContainer.querySelector('div');
                         if (mapWrapper) {
                             const newMapHeight = Math.min(450, newViewportHeight * 0.6);
                             mapWrapper.style.height = `${newMapHeight}px`;
                         }
                     }
                     
                     // Invalidar tamaño del mapa después de los cambios
                     setTimeout(() => {
                         this.currentModalMapInstance.invalidateSize();
                     }, 100);
                 }
             };
             
             // Remover listener anterior si existe
             if (this.modalResizeHandler) {
                 window.removeEventListener('resize', this.modalResizeHandler);
             }
             
             // Agregar nuevo listener
             this.modalResizeHandler = resizeHandler;
             window.addEventListener('resize', this.modalResizeHandler);
             
         }, 50);
    }

    renderizarMapa(geojsonData, onComunaMouseover, onComunaMouseout, onComunaClick) {
        if (!this.mapContainer || !L) {
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
        
        // Verificar si tenemos datos de categorías de sequía
        const tieneCategoriasSequia = ['SA', 'D0', 'D1', 'D2', 'D3', 'D4'].some(cat => 
            props[cat] !== null && props[cat] !== undefined && !isNaN(parseFloat(props[cat]))
        );
        
        if (!tieneCategoriasSequia) {
            return {
                fillColor: this.COLORES_SEQUIA.DEFAULT,
                weight: 1, opacity: 1, color: '#666', fillOpacity: 0.7
            };
        }
        
        let categoriaDominante = 'SA';
        let maxValor = -1;

        ['D4', 'D3', 'D2', 'D1', 'D0', 'SA'].forEach(cat => {
            const valor = parseFloat(props[cat]);
            if (!isNaN(valor) && valor > maxValor) {
                maxValor = valor;
                categoriaDominante = cat;
            }
        });

        // Categoría dominante calculada

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

        if (val >= 2.5) return '#005954';
        if (val >= 2.0) return '#338b85';
        if (val >= 1.5) return '#5dc1b9';
        if (val >= 1.0) return '#9ce0db';
        if (val >= 0.5) return '#d5ffff';
        if (val < -2.5) return '#801300';
        if (val < -2.0) return '#EA2B00';
        if (val < -1.5) return '#ffaa00';
        if (val < -1.0) return '#fcd370';
        if (val < -0.5) return '#ffff00';
        
        return '#d5ffff'; // Valor por defecto para el rango -0.5 a 0.5
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

    _crearControlLeyenda() {
        const leyenda = [
            { rango: '≥ 2.5', color: '#005954', descripcion: 'Ext. lluvioso' },
            { rango: '2.0-2.4', color: '#338b85', descripcion: 'Muy lluvioso' },
            { rango: '1.5-1.9', color: '#5dc1b9', descripcion: 'Lluvioso' },
            { rango: '1.0-1.4', color: '#9ce0db', descripcion: 'Lig. lluvioso' },
            { rango: '0.5-0.9', color: '#d5ffff', descripcion: 'Normal +' },
            { rango: '-0.5-0.4', color: '#d5ffff', descripcion: 'Normal' },
            { rango: '-1.0--0.5', color: '#ffff00', descripcion: 'Normal -' },
            { rango: '-1.5--1.0', color: '#fcd370', descripcion: 'Lig. seco' },
            { rango: '-2.0--1.5', color: '#ffaa00', descripcion: 'Seco' },
            { rango: '-2.5--2.0', color: '#EA2B00', descripcion: 'Muy seco' },
            { rango: '< -2.5', color: '#801300', descripcion: 'Ext. seco' }
        ];

        // Crear control personalizado de Leaflet
        const LeyendaControl = L.Control.extend({
            onAdd: function(map) {
                const div = L.DomUtil.create('div', 'leyenda-control');
                div.style.cssText = `
                    background: rgba(255, 255, 255, 0.95);
                    border: 2px solid rgba(0,0,0,0.2);
                    border-radius: 5px;
                    padding: 8px;
                    font-size: 10px;
                    line-height: 1.2;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    max-width: 160px;
                `;
                
                let html = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 11px; color: #333;">SPI</div>';
                
                leyenda.forEach(item => {
                    html += `<div style="display: flex; align-items: center; margin-bottom: 2px;">
                                <div style="width: 12px; height: 10px; background-color: ${item.color}; border: 1px solid #999; margin-right: 4px; flex-shrink: 0;"></div>
                                <span style="font-size: 9px; color: #333; white-space: nowrap;">${item.rango} ${item.descripcion}</span>
                             </div>`;
                });
                
                div.innerHTML = html;
                
                // Prevenir que los eventos del mouse en la leyenda afecten el mapa
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                
                return div;
            },
            
            options: {
                position: 'topright'
            }
        });
        
        return new LeyendaControl();
    }
    mostrarPanelDetalle(comunaProps, historialComuna) {
        const nombreComuna = comunaProps.COMUNA || 'Comuna desconocida';
        
        // Obtener el mes correspondiente a los datos usando la función utilitaria
        const { mesNombre } = window.Controller.obtenerMesDatos();
        
        // Actualizar título con comuna y mes
        document.getElementById('detalle-comuna-nombre').textContent = `${nombreComuna} - ${mesNombre}`;
        
        // Mostrando panel de detalle
        
        // Crear tabla con información de la comuna
        let tablaHtml = `
            <div class="mb-3">
                <h6>Categorías de Sequía (%)</h6>
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr><th>Cat.</th><th>Descripción</th><th>%</th></tr>
                    </thead>
                    <tbody>
        `;
        
        const categorias = [
            { code: 'SA', desc: 'Sin Afectación', color: '#d9d9d9' },
            { code: 'D0', desc: 'Anormalmente Seco', color: '#ffff00' },
            { code: 'D1', desc: 'Sequía Moderada', color: '#fcd37f' },
            { code: 'D2', desc: 'Sequía Severa', color: '#ffaa00' },
            { code: 'D3', desc: 'Sequía Extrema', color: '#E60000' },
            { code: 'D4', desc: 'Sequía Excepcional', color: '#730000' }
        ];
        
        categorias.forEach(cat => {
            const valor = comunaProps[cat.code];
            const valorFormateado = (valor !== null && valor !== undefined && !isNaN(parseFloat(valor))) 
                ? `${parseFloat(valor).toFixed(1)}%` 
                : 'N/A';
            
            tablaHtml += `
                <tr>
                    <td style="background-color:${cat.color}; text-align:center; font-weight:bold;">${cat.code}</td>
                    <td>${cat.desc}</td>
                    <td><strong>${valorFormateado}</strong></td>
                </tr>
            `;
        });
        
        tablaHtml += `</tbody></table>`;
        
        tablaHtml += `
            </div>
            <div id="detalle-comuna-grafico" style="width:100%; height:250px;"></div>
        `;
        
        document.getElementById('detalle-comuna-contenido').innerHTML = tablaHtml;
        this._crearGraficoComunal(comunaProps, historialComuna);
        this.panelDetalle.style.display = 'block';
    }

    ocultarPanelDetalle() {
        this.panelDetalle.style.display = 'none';
        // Destruir gráfico de forma segura
        if (this.detalleChartInstance && typeof this.detalleChartInstance.destroy === 'function') {
            try {
                this.detalleChartInstance.destroy();
            } catch (error) {
            }
            this.detalleChartInstance = null;
        }
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
        // Destruir gráfico anterior de forma segura
        if (this.detalleChartInstance && typeof this.detalleChartInstance.destroy === 'function') {
            try {
                this.detalleChartInstance.destroy();
            } catch (error) {
            }
            this.detalleChartInstance = null;
        }

        const graficoContainer = document.getElementById('detalle-comuna-grafico');
        if (!graficoContainer) {
            return;
        }

        if (!historialComuna || historialComuna.length === 0) {
            graficoContainer.innerHTML = '<p class="text-center small p-2">No hay datos históricos disponibles para esta comuna.</p>';
            return;
        }

        // Creando gráfico histórico

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
            accessibility: { enabled: false },
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
        // Iniciando renderizado de minimapas
        const periodos = [
            { id: 'mapaPersistencia3m', clave: 'p_3m', titulo: '3 Meses con SPI' },
            { id: 'mapaPersistencia9m', clave: 'p_9m', titulo: '9 Meses con SPI' },
            { id: 'mapaPersistencia12m', clave: 'p_12m', titulo: '12 Meses con SPI' },
            { id: 'mapaPersistencia24m', clave: 'p_24m', titulo: '24 Meses con SPI' },
            { id: 'mapaPersistencia48m', clave: 'p_48m', titulo: '48 Meses con SPI' },
        ];
        
        periodos.forEach(p => {
            const container = document.getElementById(p.id);
            if (!container) {
                return;
            }
            
            // Procesando minimapa
            
            // Limpiar contenido anterior (incluyendo spinner)
            container.innerHTML = '';
            
            // Limpiar mapa anterior si existe
            if (container._leaflet_id) {
                // Limpiando minimapa existente
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
                // Minimapa inicializado correctamente
                
            } catch (error) {
                // Mostrar mensaje de error en lugar del spinner
                container.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><small class="text-muted">Error al cargar</small></div>';
            }
        });
    }
    renderizarSidebar(datosSidebar) {
        // Actualizar tabla de promedios
        for (const cat in datosSidebar.promedios) {
            const el = document.getElementById(`avg-${cat.toLowerCase()}`);
            if (el) el.textContent = `${datosSidebar.promedios[cat]}%`;
        }
        // Crear gráfico regional - destruir anterior de forma segura
        if (this.regionalChartInstance && typeof this.regionalChartInstance.destroy === 'function') {
            try {
                this.regionalChartInstance.destroy();
            } catch (error) {
            }
            this.regionalChartInstance = null;
        }
        const seriesData = Object.keys(this.COLORES_SEQUIA).filter(k => k !== 'DEFAULT').map(cat => ({
            name: cat,
            color: this.COLORES_SEQUIA[cat],
            data: datosSidebar.historico.series[cat]
        }));
        this.regionalChartInstance = Highcharts.chart('timeSeriesChartRegionalSidebar', {
            accessibility: { enabled: false },
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
            // Limpiando mapa existente
            this.mapa.remove();
            this.mapa = null;
            this.geoJsonLayer = null;
            this.infoControl = null;
        }

        // Verificar si el contenedor ya tiene un mapa inicializado
        if (this.mapContainer?._leaflet_id) {
            // Limpiando contenedor del mapa
            this.mapContainer._leaflet_id = undefined;
            this.mapContainer.innerHTML = '';
        }

        // Verificar que el contenedor esté disponible y visible
        if (!this.mapContainer || !L) {
            return;
        }

        // Verificar que el contenedor tenga dimensiones válidas
        if (this.mapContainer.offsetWidth === 0 || this.mapContainer.offsetHeight === 0) {
            setTimeout(() => this.renderizarMapaPrincipal(geojsonData, onComunaMouseover, onComunaMouseout, onComunaClick), 100);
            return;
        }

        // Inicializando nuevo mapa
        
        try {
            this.mapa = L.map(this.mapContainer, {
                zoomControl: true,
                minZoom: 7,
                maxZoom: 12
            }).setView([-33.0, -71.2], 8);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
            }).addTo(this.mapa);
            
            this._crearControlInfo();
            this.infoControl.addTo(this.mapa);
            
            this.geoJsonLayer = L.geoJson(geojsonData, {
                style: (feature) => this._estiloPorSequia(feature),
                onEachFeature: (feature, layer) => {
                    layer.on({
                        mouseover: (e) => {
                            L.DomEvent.stopPropagation(e);
                            onComunaMouseover(e.target);
                        },
                        mouseout: (e) => {
                            L.DomEvent.stopPropagation(e);
                            onComunaMouseout(e.target);
                        },
                        click: (e) => {
                            L.DomEvent.stopPropagation(e);
                            onComunaClick(e.target);
                        }
                    });
                }
            }).addTo(this.mapa);
            
            this.mapa.fitBounds(this.geoJsonLayer.getBounds());
            this.mapa.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onComunaClick(null); // Para cerrar el panel al hacer clic fuera
            });
            
            // Mapa inicializado correctamente
            
        } catch (error) {
        }
    }
}

// Exportado como window.View