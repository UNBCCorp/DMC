const VALPARAISO_STATIONS = {
    'E000320019': 'San Felipe', 
    'E000V00035': 'Petorca', 
    'E000V00174': 'Alicahue',
    'E000V00033': 'Cabildo', 
    'E000V00034': 'Papudo', 
    'E000V00175': 'La Ligua',
    'E000V00041': 'Putaendo', 
    'E000V00176': 'Lagunillas', 
    'E000V00040': 'Panquehue',
    'E000V00031': 'Quintero', 
    'E000V00037': 'Calera', 
    'E000320028': 'La Cruz Inia',
    'E000V00032': 'Puchuncaví', 
    'E000V00036': 'Quillota', 
    'E000V00030': 'Concón',
    'E000V00042': 'Limache', 
    'E000330002': 'Valparaíso', 
    'E000330007': 'Rodelillo',
    'E000V00029': 'Casablanca', 
    'E000V00177': 'Pitama', 
    'E000V00038': 'Algarrobo',
    'E000V00039': 'Cartagena', 
    'E000330030': 'Santo Domingo'
};
const MONTH_SCALE_TO_COLUMN_INDEX = { '3': 4, '9': 6, '12': 7, '24': 8, '48': 10 };

function calculateAverage(arr) {
    if (!arr || arr.length === 0) return null;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return sum / arr.length;
}

function getRegionalValuesFromFile(textContent, stationFilter) {
    const lines = textContent.split('\n').filter(line => line.trim() && !line.startsWith('Estacion'));
    if (lines.length === 0) return null;
    const regionalValues = { '3': [], '9': [], '12': [], '24': [], '48': [] };
    for (const line of lines) {
        const values = line.split(',');
        const stationCode = values[0].trim();
        if (stationFilter.hasOwnProperty(stationCode)) {
            for (const scale in MONTH_SCALE_TO_COLUMN_INDEX) {
                const colIndex = MONTH_SCALE_TO_COLUMN_INDEX[scale];
                if (values[colIndex] !== undefined) {
                    const value = parseFloat(values[colIndex]);
                    if (!isNaN(value)) regionalValues[scale].push(value);
                }
            }
        }
    }
    return regionalValues;
}

function renderTimeSeriesChart(containerId, title, fechas, series) {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);

    // Extraer solo las fechas que tienen datos, manteniendo la correspondencia
    const fechasConDatos = [];
    const seriesFiltradas = series.map(serie => {
        const datosValidos = [];
        serie.data.forEach((point, index) => {
            if (point !== null && point.y !== null && !isNaN(point.y)) {
                datosValidos.push(point);
                fechasConDatos.push(fechas[index]);
            }
        });
        return {
            ...serie,
            data: datosValidos
        };
    });

    // Usar un solo eje Y principal
    const yAxis = {
        title: { text: 'Índice SPI', style: { color: '#333' } },
        min: -3,
        max: 3,
        tickInterval: 0.5,
        labels: { align: 'right', x: -5 },
        plotLines: [
            { color: '#888', width: 1.5, value: 0, zIndex: 3, dashStyle: 'dash' },
            { color: '#DEB887', width: 1, value: -1, zIndex: 2, dashStyle: 'dot' },
            { color: '#8B4513', width: 1, value: -2, zIndex: 2, dashStyle: 'dot' },
            { color: '#87CEEB', width: 1, value: 1, zIndex: 2, dashStyle: 'dot' },
            { color: '#4682B4', width: 1, value: 2, zIndex: 2, dashStyle: 'dot' }
        ],
        gridLineColor: '#e6e6e6',
        gridLineWidth: 1
    };

    // Configurar la serie con zonas de colores para el área
    seriesFiltradas.forEach((serie, index) => {
        serie.color = '#333333'; // Color de la línea
        serie.lineWidth = 1.5;
        
        // Configurar zonas de colores para el área rellena
        serie.zones = [
            {
                value: -2,
                color: '#8B4513', // Marrón para sequía extrema
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#8B4513'],
                        [1, 'rgba(139, 69, 19, 0.3)']
                    ]
                }
            },
            {
                value: -1,
                color: '#DEB887', // Beige para sequía moderada
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#DEB887'],
                        [1, 'rgba(222, 184, 135, 0.3)']
                    ]
                }
            },
            {
                value: 0,
                color: '#F5DEB3', // Beige claro para valores negativos cercanos a 0
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#F5DEB3'],
                        [1, 'rgba(245, 222, 179, 0.3)']
                    ]
                }
            },
            {
                value: 1,
                color: '#87CEEB', // Azul claro para húmedo
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#87CEEB'],
                        [1, 'rgba(135, 206, 235, 0.3)']
                    ]
                }
            },
            {
                color: '#4682B4', // Azul para muy húmedo
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, '#4682B4'],
                        [1, 'rgba(70, 130, 180, 0.3)']
                    ]
                }
            }
        ];
        
        // Configurar puntos individuales
        serie.data.forEach(point => {
            if (point && point.isIncomplete) {
                point.color = '#cccccc';
                point.borderColor = '#999999';
            }
        });
    });

    // Crear categorías del eje X con formato más legible
    const categoriasEjeX = fechasConDatos.map(fecha => {
        const [ano, mes] = fecha.split('-');
        const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMesCorto = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][parseInt(mes) - 1];
        const nombreMesCompleto = nombresMeses[parseInt(mes) - 1];
        
        // Para el tooltip usaremos el nombre completo, para el eje X el corto
        return {
            corto: `${nombreMesCorto} ${ano}`,
            completo: `${nombreMesCompleto} ${ano}`,
            fecha: fecha
        };
    });

    Highcharts.chart(containerId, {
        chart: { 
            type: 'area', 
            zoomType: 'x', 
            marginLeft: 80, 
            alignTicks: false,
            scrollablePlotArea: {
                minWidth: Math.max(800, categoriasEjeX.length * 25), // Menos espacio entre puntos para gráfico más compacto
                scrollPositionX: 1 // Empezar al final (datos más recientes)
            }
        },
        title: { text: title },
        xAxis: { 
            categories: categoriasEjeX.map(cat => cat.corto), 
            crosshair: true, 
            offset: 10,
            labels: {
                rotation: -45,
                step: Math.max(1, Math.floor(categoriasEjeX.length / 20)) // Mostrar cada N etiquetas para evitar sobreposición
            },
            tickInterval: 1
        },
        yAxis: yAxis,
        tooltip: {
            shared: true,
            split: false,
            formatter: function () {
                // Obtener la fecha desde el punto de datos
                let fechaCompleta = this.x;
                if (this.point && this.point.fecha) {
                    const [ano, mes] = this.point.fecha.split('-');
                    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    fechaCompleta = `${nombresMeses[parseInt(mes) - 1]} ${ano}`;
                } else if (categoriasEjeX[this.point.index]) {
                    fechaCompleta = categoriasEjeX[this.point.index].completo;
                }
                
                let s = `<b>${fechaCompleta}</b><br/>`;
                
                this.points.forEach(point => {
                    const incompleteLabel = point.point.isIncomplete ? ' (Datos Incompletos)' : '';
                    s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y.toFixed(2)}</b>${incompleteLabel}<br/>`;
                });
                return s;
            }
        },
        legend: { 
            enabled: false // Deshabilitamos la leyenda ya que solo hay una serie
        },
        plotOptions: {
            area: {
                marker: {
                    enabled: true,
                    symbol: 'circle',
                    radius: 3,
                    lineWidth: 1,
                    lineColor: '#333333',
                    states: {
                        hover: {
                            enabled: true,
                            radius: 5,
                            lineWidth: 2
                        }
                    }
                },
                lineWidth: 1.5,
                connectNulls: false,
                fillOpacity: 0.6,
                threshold: 0 // Línea base en 0 para el relleno
            }
        },

        series: seriesFiltradas,
        credits: { enabled: true, text: 'DMC' }
    });

    if (placeholder) placeholder.style.display = 'none';
}

async function processAndRender(indexType, containerId, title) {
    const placeholder = document.querySelector(`#${containerId} .loading-placeholder`);
    try {
        const anoInicio = 2019;
        const anoActual = new Date().getFullYear();
        const mesActual = new Date().getMonth() + 1;
        
        const promesasFetch = [];
        const fechasParaEjeX = [];

        for (let ano = anoInicio; ano <= anoActual; ano++) {
            for (let mes = 1; mes <= 12; mes++) {
                if (ano === anoActual && mes > mesActual) {
                    continue;
                }
                const mesFormateado = mes.toString().padStart(2, '0');
                const fechaLabel = `${ano}-${mesFormateado}`;
                fechasParaEjeX.push(fechaLabel);
                
                const url = `maps/data/salida/${indexType}/txt/${ano}_${mesFormateado}_indices.txt`;
                promesasFetch.push(
                    fetch(url)
                        .then(response => response.ok ? response.text() : null)
                        .then(text => ({ ano, mes, fechaLabel, text }))
                        .catch(() => ({ ano, mes, fechaLabel, text: null }))
                );
            }
        }

        const resultadosMensuales = await Promise.all(promesasFetch);

        // Procesar datos mensualmente
        const datosMensuales = {};
        resultadosMensuales.forEach(resultado => {
            if (resultado.text) {
                const valoresRegionales = getRegionalValuesFromFile(resultado.text, VALPARAISO_STATIONS);
                if (valoresRegionales) {
                    datosMensuales[resultado.fechaLabel] = valoresRegionales;
                }
            }
        });

        // Usar solo SPI-12 para un gráfico más limpio
        const escalaSeleccionada = '12';
        
        const datosParaSerie = [];
        fechasParaEjeX.forEach(fechaLabel => {
            const datosMes = datosMensuales[fechaLabel];
            if (datosMes && datosMes[escalaSeleccionada]) {
                const promedioMes = calculateAverage(datosMes[escalaSeleccionada]);
                if (promedioMes !== null && !isNaN(promedioMes)) {
                    datosParaSerie.push({
                        y: promedioMes,
                        name: fechaLabel,
                        fecha: fechaLabel // Mantener la fecha original para referencia
                    });
                } else {
                    datosParaSerie.push(null);
                }
            } else {
                datosParaSerie.push(null);
            }
        });
        

        
        const seriesFinales = [{
            name: `${indexType.toUpperCase()}-${escalaSeleccionada}`,
            data: datosParaSerie
        }];

        const nuevoTitulo = `${title.split('-')[0].trim()} - Datos Mensuales (${anoInicio} - ${anoActual})`;
        renderTimeSeriesChart(containerId, nuevoTitulo, fechasParaEjeX, seriesFinales);

    } catch (error) {
        console.error(`Error procesando ${indexType}:`, error);
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al procesar datos para ${title}.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    processAndRender('spi', 'container-spi', 'SPI Promedio - Región de Valparaíso');
    processAndRender('spei', 'container-spei', 'SPEI Promedio - Región de Valparaíso');
});