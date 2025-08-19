# Visualizador de Mapas de Percentiles Climáticos
Este proyecto presenta un panel de visualización con mapas interactivos que muestran datos de percentiles de temperatura y precipitación para diversas comunas de la Región de Valparaíso, Chile.

El sistema cuenta con un proceso automatizado en el backend para leer datos crudos desde archivos de texto, calcular los percentiles correspondientes y generar un archivo de datos consolidado. El frontend consume estos datos para colorear las comunas en un mapa GeoJSON y mostrar información detallada.

# 🚀 Características
 - Mapas Duales: Visualización separada para percentiles de Temperatura y Precipitación.

 - Visualización por Colores: Las comunas se colorean según su valor de percentil, utilizando rangos de color (clases) definidos.

 - Tooltips Interactivos: Al pasar el cursor sobre una comuna, se muestra su nombre, el valor del percentil y el valor real de la medición (ej: 15.5 °C).

 - Procesamiento de Datos Automatizado: Un script en Python se encarga de leer múltiples archivos de datos, realizar los cálculos estadísticos y consolidar la información.

 - Ejecución Programada: El proceso de datos se ejecuta automáticamente en segundo plano a través de una tarea programada (cron job), asegurando que la información esté actualizada sin sobrecargar el servidor en cada visita.

## 🛠️ Tech Stack

### Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

![Pandas](https://img.shields.io/badge/Pandas-2C2D72?style=for-the-badge&logo=pandas&logoColor=white)

![NumPy](https://img.shields.io/badge/Numpy-013243?style=for-the-badge&logo=numpy&logoColor=white)

![SciPy](https://img.shields.io/badge/SciPy-857B24?style=for-the-badge&logo=scipy&logoColor=white)

![Cron](https://img.shields.io/badge/Cron-2E3440?style=for-the-badge&logo=linux&logoColor=white)

### API / Bridge
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)

![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

![Highcharts](https://img.shields.io/badge/Highcharts-7CB5EC?style=for-the-badge&logo=highcharts&logoColor=white)

![Turf.js](https://img.shields.io/badge/Turf.js-42A8C4?style=for-the-badge)
# 📁 Estructura del Proyecto
```
/
├── public/
│   ├── api/
│   │   └── datos_percentiles.php      # Lee y sirve el archivo JSON
│   ├── js/
│   │   └── mapasPercentil.js          # Lógica del mapa (Highcharts)
│   └── maps/
│       └── data/
│           ├── Datos_temp/            # Datos crudos de temperatura
│           │   └── E...-Tmd-Rel.txt
│           ├── Datos_precip/          # Datos crudos de precipitación
│           │   └── E...-Pcp-Rel.txt
│           ├── datos_percentiles.json   # Archivo generado por Python
│           └── valp.geojson           # Geometría de las comunas
├── venv/                              # Entorno virtual de Python
├── procesador_mapas.py                # Script principal de procesamiento
└── README.md                          # Este archivo
```
# ⚙️ Instalación y Puesta en Marcha

## 🐳 Opción 1: Usando Docker (Recomendado)

La forma más sencilla de levantar el proyecto es usando Docker. No necesitas instalar PHP, Python o dependencias localmente.

### Prerrequisitos
- Docker
- Docker Compose

### Pasos para Levantar el Proyecto

**1. Clonar el Repositorio**
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd <NOMBRE_DEL_DIRECTORIO>
```

**2. Levantar los Servicios**
```bash
# Para levantar solo la aplicación web (PHP + Nginx)
docker-compose up -d

# O para incluir también el procesador de datos Python
docker-compose --profile tools up -d
```

**3. Acceder a la Aplicación**
Abre tu navegador y ve a: `http://localhost:8080`

### Comandos Útiles
```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver los logs
docker-compose logs -f

# Parar los servicios
docker-compose down

# Reconstruir contenedores (si cambias el Dockerfile)
docker-compose up --build -d
```

### ¿Qué Hace Cada Servicio?
- **app**: Contenedor PHP-FPM que instala automáticamente las dependencias con Composer
- **webserver**: Servidor Nginx que sirve la aplicación en el puerto 8080
- **python-processor**: Procesador de datos Python (opcional, solo con `--profile tools`)

---

## 🖥️ Opción 2: Instalación Manual (Linux/Ubuntu)

Si prefieres no usar Docker, sigue estos pasos para configurar el proyecto manualmente.

**1. Clonar el Repositorio**
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd <NOMBRE_DEL_DIRECTORIO>
```

**2. Instalar PHP y Composer**
```bash
# Instalar PHP y extensiones necesarias
sudo apt update
sudo apt install php8.3-fpm php8.3-zip php8.3-intl composer

# Instalar dependencias PHP
composer install --no-dev --optimize-autoloader
```

**3. Configurar el Entorno de Python**
```bash
# Crear el entorno virtual
python3 -m venv venv

# Activar el entorno virtual
source venv/bin/activate

# Instalar las librerías necesarias
pip install numpy pandas scipy
```

**4. Configurar Permisos del Servidor Web**
```bash
# Otorgar permiso de "entrada" a las carpetas de usuario y proyecto
sudo chmod o+x /home/<TU_USUARIO>
sudo chmod o+x /home/<TU_USUARIO>/<NOMBRE_DEL_DIRECTORIO>

# Otorgar permiso de lectura a todos los archivos públicos
sudo chmod -R o+r public
```

**5. Generar los Datos por Primera Vez**
```bash
# Asegúrate de que tu entorno virtual esté activado
source venv/bin/activate
python procesador_mapas.py
```
- Verifica que se haya creado el archivo en `public/maps/data/datos_percentiles.json`.

**6. Configurar la Tarea Programada (Cron Job)**
```bash
# Abrir el editor de cron
crontab -e
```
Añade la siguiente línea al final del archivo:
```bash
# Ejecutar cada día a las 3:00 AM
0 3 * * * /home/<TU_USUARIO>/<NOMBRE_DEL_DIRECTORIO>/venv/bin/python /home/<TU_USUARIO>/<NOMBRE_DEL_DIRECTORIO>/procesador_mapas.py > /dev/null 2>&1
```

**7. Configurar el Servidor Web**
Asegúrate de que tu servidor web (Apache o Nginx) apunte al directorio `public` como la raíz de tu sitio.

# 💡 Cómo Funciona
La arquitectura del sistema se divide en dos procesos principales:

1. Proceso en Segundo Plano (Backend):
 - Una tarea ```cron``` ejecuta el script ```procesador_mapas.py``` a intervalos programados.
 - El script lee todos los archivos de texto de las carpetas ```Datos_temp/``` y ```Datos_precip/```.
 - Utilizando ```pandas``` y ```scipy```, calcula el percentil del valor más reciente de cada estación en comparación con su serie histórica.
 - Finalmente, guarda todos los resultados en un único archivo: ```public/maps/data/datos_percentiles.json```.

2. Proceso de Visualización (Frontend):

 - Cuando un usuario visita la página, el archivo ```mapasPercentil.js``` se ejecuta.
 - Realiza una petición fetch al endpoint ```api/datos_percentiles.php```.
 - El script PHP simplemente lee y devuelve el contenido del archivo estático ```datos_percentiles.json```, lo cual es muy rápido.
 - El JavaScript recibe los datos, los une con las geometrías del archivo ```valp.geojson``` y utiliza Highcharts para renderizar los mapas, coloreando cada comuna según su percentil.