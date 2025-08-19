import os
import pandas as pd
import numpy as np
import json
from scipy import stats

RUTA_SCRIPT = os.path.dirname(os.path.abspath(__file__))

RUTA_BASE = os.path.join(RUTA_SCRIPT, 'public', 'maps', 'data')

CARPETA_TEMP = os.path.join(RUTA_BASE, 'Datos_temp')
CARPETA_PREC = os.path.join(RUTA_BASE, 'Datos_precip')

ESTACIONES_A_BUSCAR = {
    'San Felipe': ['E000320019'],
    'Petorca': ['E000V00035'],
    'Cabildo': ['E000V00174', 'E000V00033'],
    'Papudo': ['E000V00034'],
    'La Ligua': ['E000V00175'],
    'Putaendo': ['E000V00041'],
    'Casablanca': ['E000V00176', 'E000V00029', 'E000V00177'],
    'Panquehue': ['E000V00040'],
    'Quintero': ['E000V00031'],
    'Calera': ['E000V00037'], # El GeoJSON puede tener 'La Calera' en vez de 'CALERA'
    'La Cruz': ['E000320028'],
    'Puchuncaví': ['E000V00032'], # Cuidado con los acentos
    'Quillota': ['E000V00036'],
    'Concón': ['E000V00030'],
    'Limache': ['E000V00042'],
    'Valparaíso': ['E000330002'],
    'Viña del Mar': ['E000330007'],
    'Algarrobo': ['E000V00038'],
    'Cartagena': ['E000V00039'],
    'Santo Domingo': ['E000330030']
}


def buscar_archivos_por_codigo(codigos_estacion, carpeta_datos, sufijo_archivo):
    archivos_encontrados = []
    for codigo in codigos_estacion:
        for dirpath, _, filenames in os.walk(carpeta_datos):
            for f in filenames:
                if f.startswith(codigo):
                    archivos_encontrados.append(os.path.join(dirpath, f))
    return archivos_encontrados


def calcular_percentiles_estacion(ruta_archivo):
    
    try:
        df = pd.read_csv(ruta_archivo, sep='\s+', names=['Año', 'Mes', 'Valor'], encoding='latin-1')        
        df['Fecha'] = pd.to_datetime(df['Año'].astype(str) + '-' + df['Mes'].astype(str) + '-01')

        df = df.sort_values('Fecha')
        if df.empty: return {'error': 'No hay datos válidos.'}

        ultimo_registro = df.iloc[-1]
        ultimo_mes = int(ultimo_registro['Mes'])
        valor_actual = float(ultimo_registro['Valor'])

        serie_historica = df[df['Mes'] == ultimo_mes]['Valor']

        percentil = stats.percentileofscore(serie_historica, valor_actual, kind='rank')

        return {
            "percentil": round(percentil, 2),
            "valor_actual": round(valor_actual, 2),
            "ultimo_mes": ultimo_registro['Fecha'].strftime('%Y-%m'),
            "datos_historicos_usados": len(serie_historica)
        }
    except Exception as e:
        return {'error': f'Error procesando {os.path.basename(ruta_archivo)}: {e}'}

def procesar_datos_por_tipo(carpeta_datos, sufijo_archivo):
    
    resultados_finales = {}
    
    for nombre_comuna, codigos in ESTACIONES_A_BUSCAR.items():
        
        archivos_para_estacion = buscar_archivos_por_codigo(codigos, carpeta_datos, sufijo_archivo)
        

        if not archivos_para_estacion:
            continue

        ruta_archivo = archivos_para_estacion[0]
        
        datos_calculados = calcular_percentiles_estacion(ruta_archivo)
        resultados_finales[nombre_comuna] = datos_calculados

    return resultados_finales

if __name__ == "__main__":
    resultados_temp = procesar_datos_por_tipo(CARPETA_TEMP, '')

    resultados_prec = procesar_datos_por_tipo(CARPETA_PREC, '')
    
    datos_para_mapas = {
        'temperatura': resultados_temp,
        'precipitacion': resultados_prec
    }

    ruta_salida_json = os.path.join(RUTA_BASE, 'datos_percentiles.json')

    try:
        with open(ruta_salida_json, 'w', encoding='utf-8') as f:
            json.dump(datos_para_mapas, f, ensure_ascii=False, indent=4)
        print(f"¡Éxito! Datos guardados en: {ruta_salida_json}")
    except Exception as e:
        print(f"Error al guardar el archivo JSON: {e}")