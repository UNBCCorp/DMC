let selectedComunaPoint = null;

const climaColorClasses = [
  {
    name: "Seco, Estepa, caluroso",
    code: "BSh",
    color: "#D6C29D",
    numericalValue: 0,
  },
  {
    name: "Subtropical, verano seco y fresco",
    code: "Csb",
    color: "#00A884",
    numericalValue: 1,
  },
  {
    name: "Templado, verano seco y fresco",
    code: "Dsb",
    color: "#5C8944",
    numericalValue: 2,
  },
  {
    name: "Templado, verano seco y fresco ",
    code: "H-Dsb",
    numericalValue: 3,
    color: {
      pattern: {
        backgroundColor: "#3d572e",
        path: {
          d: "M 1.5 1.5 L 1.5 1.5",
          stroke: "#000000",
          "stroke-width": 2,
          "stroke-linecap": "round",
        },
        width: 5,
        height: 5,
      },
    },
  },
  {
    name: "Templado, verano seco y fresco (continental)",
    code: "H-Dsbc",
    numericalValue: 4,
    color: {
      pattern: {
        backgroundColor: "#82a36c",
        path: {
          d: "M 1.5 1.5 L 1.5 1.5",
          stroke: "#000000",
          "stroke-width": 2,
          "stroke-linecap": "round",
        },
        width: 5,
        height: 5,
      },
    },
  },
  {
    name: "Boreal, verano seco",
    code: "H-Es",
    numericalValue: 5,
    color: {
      pattern: {
        backgroundColor: "#6074e4",
        path: {
          d: "M 1.5 1.5 L 1.5 1.5",
          stroke: "#000000",
          "stroke-width": 2,
          "stroke-linecap": "round",
        },
        width: 5,
        height: 5,
      },
    },
  },
  {
    name: "Polar, tundra, verano seco",
    code: "H-Fts",
    numericalValue: 6,
    color: {
      pattern: {
        backgroundColor: "#954bbb",
        path: {
          d: "M 1.5 1.5 L 1.5 1.5",
          stroke: "#000000",
          "stroke-width": 2,
          "stroke-linecap": "round",
        },
        width: 5,
        height: 5,
      },
    },
  },
  {
    name: "Sin Datos / Otro",
    code: "N/A",
    color: "#cccccc",
    numericalValue: 99,
  },
];

function generarTablaDetalleComunasHTML(properties) {
  const detalleBody = document.getElementById("comunas-clima-detalle-body");
  if (!detalleBody) return;
  const headerRow = detalleBody.closest("table").querySelector("thead tr");
  if (headerRow)
    headerRow.innerHTML =
      "<th>Comuna</th><th>Sigla Clima</th><th>Descripción</th>";

  if (!properties) {
    detalleBody.innerHTML =
      '<tr><td colspan="3" class="text-center p-3">Haz clic en una comuna para ver sus climas.</td></tr>';
    return;
  }

  const nombreComuna = properties.COMUNA || "N/D";
  const climasEnComuna = [...new Set(properties.climas || [])];
  if (climasEnComuna.length === 0) {
    detalleBody.innerHTML = `<tr><td>${nombreComuna}</td><td colspan="2">No se encontraron datos de clima para esta comuna.</td></tr>`;
    return;
  }

  let html = "";
  // Ordenar por el valor numérico del clima según climaColorClasses
  climasEnComuna.sort((a, b) => {
    const climaInfoA = climaColorClasses.find(c => c.code.toUpperCase() === (a || "").trim().toUpperCase()) || { numericalValue: 99 };
    const climaInfoB = climaColorClasses.find(c => c.code.toUpperCase() === (b || "").trim().toUpperCase()) || { numericalValue: 99 };
    return climaInfoA.numericalValue - climaInfoB.numericalValue;
  });
  climasEnComuna.forEach((climaCode, index) => {
    const climaInfo = climaColorClasses.find(
      (c) => c.code.toUpperCase() === (climaCode || "").trim().toUpperCase()
    ) || { name: "Descripción no encontrada", color: "#cccccc" };
    
    // Obtener el color de fondo
    let backgroundColor = "#cccccc"; // Color por defecto
    if (climaInfo.color) {
      if (typeof climaInfo.color === 'string') {
        backgroundColor = climaInfo.color;
      } else if (climaInfo.color.pattern?.backgroundColor) {
        backgroundColor = climaInfo.color.pattern.backgroundColor;
      }
    }
    
    html += `<tr><td>${
      index === 0 ? nombreComuna : ""
    }</td><td><span class="d-inline-flex align-items-center"><span class="color-circle me-2" style="width: 12px; height: 12px; border-radius: 50%; background-color: ${backgroundColor}; display: inline-block; border: 1px solid #ccc;"></span><strong>${climaCode}</strong></span></td><td>${climaInfo.name}</td></tr>`;
  });
  detalleBody.innerHTML = html;
}

function generarTablaLeyendaFija(climaFeatures) {
  const leyendaBody = document.getElementById("clima-leyenda-fija-body");
  if (!leyendaBody) return;
  const climasUnicos = new Map();
  climaFeatures.forEach((feature) => {
    const climaCode = feature.properties.descript4;
    if (climaCode && !climasUnicos.has(climaCode)) {
      const climaInfo = climaColorClasses.find(
        (c) => c.code.toUpperCase() === climaCode.trim().toUpperCase()
      );
      if (climaInfo) climasUnicos.set(climaCode, climaInfo);
    }
  });

  if (climasUnicos.size === 0) {
    leyendaBody.innerHTML =
      '<td colspan="2" class="text-center p-3">No hay climas para mostrar.</td>';
    return;
  }

  let html = "";
  const climasOrdenados = Array.from(climasUnicos.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  climasOrdenados.forEach((climaInfo) => {
    // Obtener el color de fondo
    let backgroundColor = "#cccccc"; // Color por defecto
    if (climaInfo.color) {
      if (typeof climaInfo.color === 'string') {
        backgroundColor = climaInfo.color;
      } else if (climaInfo.color.pattern?.backgroundColor) {
        backgroundColor = climaInfo.color.pattern.backgroundColor;
      }
    }
    
    html += `<tr><td><span class="d-inline-flex align-items-center"><span class="color-circle me-2" style="width: 12px; height: 12px; border-radius: 50%; background-color: ${backgroundColor}; display: inline-block; border: 1px solid #ccc;"></span><strong>${climaInfo.code}</strong></span></td><td>${climaInfo.name}</td></tr>`;
  });
  leyendaBody.innerHTML = html;
}

// Función unificarGeometriasPorComuna movida a utils-geo.js para evitar duplicación

let mapaClimaLeaflet = null;

async function inicializarMapaClima() {
  const containerId = "map-clima-region-highcharts";
  const placeholder = document.querySelector(
    `#${containerId} .map-loading-placeholder`
  );

  try {
    if (typeof turf === "undefined")
      throw new Error("La librería Turf.js no se cargó correctamente.");

    const [responseComunas, responseClima] = await Promise.all([
      fetch("/maps/data/valp.geojson"),
      fetch("/maps/data/ClimaPorComuna.geojson"),
    ]);

    if (!responseComunas.ok)
      throw new Error("No se pudo cargar 'valp.geojson'.");
    if (!responseClima.ok)
      throw new Error("No se pudo cargar el GeoJSON de climas.");

    const geoJsonComunas = await responseComunas.json();
    const geoJsonClima = await responseClima.json();

    const geoJsonComunasCorregido = unificarGeometriasPorComuna(geoJsonComunas);

geoJsonComunasCorregido.features.forEach((comunaFeature) => {
  comunaFeature.properties.climas = [];

  for (const climaFeature of geoJsonClima.features) {
    try {
      const climaCode = climaFeature.properties.descript4;
      const intersection = turf.intersect(comunaFeature, climaFeature);
      if (climaCode && intersection) {
        comunaFeature.properties.climas.push(climaCode.trim());
      }
    } catch (e) {
    }
  }
  comunaFeature.properties.climas = [
    ...new Set(comunaFeature.properties.climas),
  ];
});

    const datosClimaParaSerie = geoJsonClima.features.map((feature) => {
      const climaCode = feature.properties.descript4 || "N/A";
      const climaClass =
        climaColorClasses.find(
          (c) => c.code.toUpperCase() === climaCode.trim().toUpperCase()
        ) || climaColorClasses.find((c) => c.code === "N/A");
      return {
        OBJECTID: feature.properties.OBJECTID,
        value: climaClass.numericalValue,
      };
    });

    const datosComunaParaSerie = geoJsonComunasCorregido.features.map(
      (feature) => ({
        CUT_COM: feature.properties.CUT_COM,
        name: feature.properties.COMUNA,
        climas: feature.properties.climas, 
      })
    );

    Highcharts.mapChart(containerId, {
        chart: {
        map: geoJsonComunasCorregido,
        height: "100%",
        events: {
            click: function () {
            if (selectedComunaPoint) {
                selectedComunaPoint.select(false);
                selectedComunaPoint = null;
                generarTablaDetalleComunasHTML(null);
            }
            },
        },
        },
      title: { text: null },
      mapNavigation: { enabled: true },
      colorAxis: {
        dataClasses: climaColorClasses.map((clase) => ({
          from: clase.numericalValue,
          to: clase.numericalValue,
          color: clase.color,
          name: `${clase.code} (${clase.name})`,
        })),
      },
      legend: {
        enabled: true,
        title: {
          text: "Tipos de Clima",
        },
        layout: "horizontal",
        align: "center",
        verticalAlign: "bottom",
      },
      exporting: {
        enabled: true,
        fallbackToExportServer: false,
        buttons: {
          contextButton: {
            menuItems: ['downloadJPEG']
          }
        },
        filename: function() {
          const fecha = new Date().toISOString().split('T')[0];
          return `mapa_clima_regional_${fecha}`;
        }(),
        sourceWidth: 1200,
        sourceHeight: 800,
        scale: 2
      },
      series: [
        {
          name: "Tipo de Clima",
          mapData: geoJsonClima,
          data: datosClimaParaSerie,
          joinBy: "OBJECTID",
          states: { hover: { enabled: false } },
          enableMouseTracking: false,
          zIndex: 0,
        },
        {
          name: "Comunas",
          mapData: geoJsonComunasCorregido,
          data: datosComunaParaSerie,
          joinBy: "CUT_COM",
          color: "rgba(255, 255, 255, 0.0)",
          borderColor: "#000000",
          borderWidth: 1.5,
          allowPointSelect: false,
          zIndex: 1,
          states: {
            hover: {
              color: "transparent",
            },
            select: {
              color: "transparent",
              borderColor: "#141414ff",
              borderWidth: 4,
            },
          },
          tooltip: { pointFormat: "<b>{point.name}</b>" },
          point: {
            events: {
                click: function (e) {
                e.stopPropagation();
                const isCurrentlySelected = this.selected;
                if (selectedComunaPoint && selectedComunaPoint !== this) {
                    selectedComunaPoint.select(false);
                }
                this.select(!isCurrentlySelected);
                if (!isCurrentlySelected) {
                    selectedComunaPoint = this;
                    generarTablaDetalleComunasHTML(this.properties);
                } else {
                    selectedComunaPoint = null;
                    generarTablaDetalleComunasHTML(null);
                }
                }
            },
          },
        },
      ],
      credits: { enabled: false },
    });

    generarTablaDetalleComunasHTML(null);
    generarTablaLeyendaFija(geoJsonClima.features);
    if (placeholder) placeholder.style.display = "none";
  } catch (error) {
    if (placeholder)
      placeholder.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", function () {
  inicializarMapaClima();
  const navLinks = document.querySelectorAll("#sidebarNav a");
  const currentPath = window.location.pathname.split("/").pop() || "Clima.php";
  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href").split("/").pop();
    link.classList.toggle("active", linkPath === currentPath);
  });
});
