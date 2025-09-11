let stationMapInstance;
let climogramChartDinamicoInstance;
let datosClimogramaGlobales = null; 

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

async function cargarYProcesarDatosCSV() {
    if (datosClimogramaGlobales) return datosClimogramaGlobales; 

    try {
        const response = await fetch('maps/data/Climograma.csv');
        if (!response.ok) throw new Error("No se pudo cargar el archivo Climograma.csv");
        
        const csvText = await response.text();
        const lineas = csvText.trim().split('\n');
        const estaciones = new Map();

        for (let i = 1; i < lineas.length; i++) {
            const valores = lineas[i].split(';');
            if (valores.length < 20) continue; 

            const tipo = valores[0].trim();
            const nombreEstacion = valores[1].trim().replace(/�/g, 'í');
            const lat = parseFloat(valores[5]);
            const lon = parseFloat(valores[6]);

            if (!estaciones.has(nombreEstacion)) {
                estaciones.set(nombreEstacion, {
                    name: nombreEstacion,
                    lat: lat,
                    lon: lon,
                    tm: [], // Temperatura Media
                    rr: []  // Precipitación
                });
            }

            const estacion = estaciones.get(nombreEstacion);
            const datosMensuales = valores.slice(8, 20).map(v => parseFloat(v) || 0);

            if (tipo === 'TM') {
                estacion.tm = datosMensuales;
            } else if (tipo === 'RR') {
                estacion.rr = datosMensuales;
            }
        }
        
        datosClimogramaGlobales = estaciones;
        return estaciones;

    } catch (error) {
        return null;
    }
}


async function initStationMap(datosEstaciones) {
    const mapContainerId = 'station-map-highcharts-container';
    const placeholder = document.querySelector(`#${mapContainerId} .map-loading-placeholder`);

    try {
        const responseComunas = await fetch('maps/data/valp.geojson');
        if (!responseComunas.ok) throw new Error("Error al cargar GeoJSON de Comunas");
        const geoJsonComunas = await responseComunas.json();
        const geoJsonComunasCorregido = unificarGeometriasPorComuna(geoJsonComunas);

        const estacionesParaMapa = Array.from(datosEstaciones.values());
        
        stationMapInstance = Highcharts.mapChart(mapContainerId, {
            chart: { map: geoJsonComunasCorregido }, 
            title: { text: "Climogramas por Estación" },
            mapNavigation: { enabled: true },
            series: [{
                name: 'Comunas',
                mapData: geoJsonComunasCorregido, 
                data: geoJsonComunasCorregido.features.map(f => ({ 'CUT_COM': f.properties.CUT_COM })),
                joinBy: 'CUT_COM',
                color: '#cccccc',
                borderWidth: 0.5,
                enableMouseTracking: false
            }, {
                type: 'mappoint',
                name: 'Estaciones',
                data: estacionesParaMapa,
                marker: { radius: 5, symbol: 'circle', fillColor: 'blue' },
                tooltip: { pointFormat: '<b>{point.name}</b>' },
                point: {
                    events: {
                        click: function () {
                            const datosEstacion = datosEstaciones.get(this.name);
                            crearOActualizarClimogramaDinamico(datosEstacion);
                        }
                    }
                }
            }],
            credits: { enabled: false },
            legend: { enabled: false }
        });

        if (placeholder) placeholder.style.display = 'none';

    } catch (error) {
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al cargar mapa.</p>`;
    }
}

function crearOActualizarClimogramaDinamico(datosEstacion) {
    const containerId = 'climogram-chart-container-dinamico';
    const wrapper = document.getElementById('climogram-dinamico-wrapper');
    const prompt = document.getElementById('select-station-prompt');
    const subtitle = document.getElementById('climogram-dinamico-subtitle');
    
    if (!wrapper || !prompt || !subtitle) return;

    if (!datosEstacion) {
        subtitle.innerHTML = `<small style="color:red;">No se encontraron datos para esta estación.</small>`;
        return;
    }

    subtitle.innerHTML = `<small>Mostrando datos para ${datosEstacion.name}</small>`;
    
    const series = [
        { name: 'Precipitación total', type: 'column', data: datosEstacion.rr, tooltip: { valueSuffix: ' mm' } },
        { name: 'Temperatura media mensual', type: 'spline', yAxis: 1, data: datosEstacion.tm, tooltip: { valueSuffix: ' °C' }, color: "#EB2B00" }
    ];

    const chartOptions = {
        accessibility: {
            enabled: false // Deshabilitar accesibilidad para evitar warnings
        },
        chart: { zoomType: 'xy' },
        title: {
            text: `Climograma - ${datosEstacion.name}`,
            align: 'center' 
        },
        subtitle: {
            text: 'Precipitación Mensual y Temperatura media mensual',
            align: 'center' 
        },
        xAxis: [{ categories: meses, crosshair: true }],
        yAxis: [
            { title: { text: 'Precipitación' }, labels: { format: '{value} mm' } },
            { title: { text: 'Temperatura' }, labels: { format: '{value} °C' }, opposite: true }
        ],
        tooltip: { shared: true },
        series: series,
        credits: { enabled: false }
    };

    if (climogramChartDinamicoInstance) {
        climogramChartDinamicoInstance.update({
            title: chartOptions.title,
            subtitle: chartOptions.subtitle,
            series: series
        });
    } else {
        document.getElementById(containerId).innerHTML = '';
        climogramChartDinamicoInstance = Highcharts.chart(containerId, chartOptions);
    }

    wrapper.style.display = 'block';
    prompt.style.display = 'none';
}

async function inicializarClimogramaRegional(datosEstaciones) {
    const containerId = 'climogram-chart-container-fijo';
    const placeholder = document.querySelector(`#${containerId} .chart-loading-placeholder`);
    const subtitle = document.getElementById('climogram-fijo-subtitle');

    try {
        const estacionesArray = Array.from(datosEstaciones.values());
        if (estacionesArray.length === 0) throw new Error("No hay datos de estaciones para promediar.");

        const avgPrecipData = Array(12).fill(0);
        const avgTempData = Array(12).fill(0);

        estacionesArray.forEach(estacion => {
            for (let i = 0; i < 12; i++) {
                avgTempData[i] += estacion.tm[i] || 0;
                avgPrecipData[i] += estacion.rr[i] || 0;
            }
        });

        for (let i = 0; i < 12; i++) {
            avgTempData[i] = parseFloat((avgTempData[i] / estacionesArray.length).toFixed(1));
            avgPrecipData[i] = parseFloat((avgPrecipData[i] / estacionesArray.length).toFixed(1));
        }

        if (placeholder) placeholder.style.display = 'none';
        if (subtitle) subtitle.innerHTML = `<small>Promedio de ${estacionesArray.length} estaciones</small>`;

        Highcharts.chart(containerId, {
            accessibility: {
                enabled: false // Deshabilitar accesibilidad para evitar warnings
            },
            chart: { zoomType: 'xy' },
            title: {
                text: 'Climograma Regional',
                align: 'center' 
            },
            subtitle: {
                text: 'Precipitación Mensual y Temperatura media mensual',
                align: 'center'
            },
            xAxis: [{ categories: meses, crosshair: true }],
            yAxis: [
                { title: { text: 'Precipitación' }, labels: { format: '{value} mm' } },
                { title: { text: 'Temperatura' }, labels: { format: '{value} °C' }, opposite: true }
            ],
            tooltip: { shared: true },
            series: [
                { name: 'Precipitación total', type: 'column', data: avgPrecipData, tooltip: { valueSuffix: ' mm' } },
                { name: 'Temperatura media mensual', type: 'spline', yAxis: 1, data: avgTempData, tooltip: { valueSuffix: ' °C' }, color: "#EB2B00" }
            ],
            credits: { enabled: false }
        });

    } catch (error) {
        if (placeholder) placeholder.innerHTML = `<p style="color:red;">Error al cargar gráfico.</p>`;
    }
}

function unificarGeometriasPorComuna(geojson) {
    if (typeof turf === 'undefined') {
        return geojson;
    }
    const comunasAgrupadas = new Map();
    geojson.features.forEach(feature => {
        const nombreComuna = feature.properties.COMUNA;
        if (!nombreComuna) return;
        if (!comunasAgrupadas.has(nombreComuna)) {
            comunasAgrupadas.set(nombreComuna, []);
        }
        comunasAgrupadas.get(nombreComuna).push(feature);
    });
    const featuresUnificados = [];
    for (const [nombre, features] of comunasAgrupadas.entries()) {
        if (features.length === 1) {
            featuresUnificados.push(features[0]);
        } else {
            try {
                if(nombre === "Zapallar");
                
                let geometriaUnificada = features[0];
                for (let i = 1; i < features.length; i++) {
                    geometriaUnificada = turf.union(geometriaUnificada, features[i]);
                }
                const featureMasGrande = features.sort((a, b) => b.properties.Shape_Area - a.properties.Shape_Area)[0];
                geometriaUnificada.properties = featureMasGrande.properties;
                featuresUnificados.push(geometriaUnificada);
            } catch (e) {
                const featureMasGrande = features.sort((a, b) => b.properties.Shape_Area - a.properties.Shape_Area)[0];
                featuresUnificados.push(featureMasGrande);
            }
        }
    }
    return { type: 'FeatureCollection', name: geojson.name, features: featuresUnificados };
}
document.addEventListener('DOMContentLoaded', async function () {
    const climogramWrapper = document.getElementById('climogram-dinamico-wrapper');
    const selectStationPrompt = document.getElementById('select-station-prompt');
    
    if (selectStationPrompt) selectStationPrompt.style.display = 'block';
    if (climogramWrapper) climogramWrapper.style.display = 'none';

    const datosEstaciones = await cargarYProcesarDatosCSV();

    if (datosEstaciones) {
        initStationMap(datosEstaciones);
        inicializarClimogramaRegional(datosEstaciones);
    }

    const navLinks = document.querySelectorAll('#sidebarNav a');
    const currentPath = window.location.pathname.split("/").pop() || "Climograma.php";
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop();
        if (linkPath === currentPath) link.classList.add('active');
        else link.classList.remove('active');
    });
});