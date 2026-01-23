from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import JSONResponse
import pandas as pd
import io
import numpy as np
from typing import Union, List, Dict, Any, Optional
import json
from openai import OpenAI
from app.config import settings
import asyncio
import uuid
from datetime import datetime, timedelta

router = APIRouter()

# Cache en memoria para almacenar DataFrames procesados
# En producción, esto debería ser Redis o similar
_dataframe_cache: Dict[str, Dict[str, Any]] = {}


async def analyze_dataframe_with_ai(df: pd.DataFrame, file_name: str, retry_count: int = 0) -> List[Dict[str, Any]]:
    """
    Analiza un DataFrame usando OpenAI y genera sugerencias de visualización.
    Intenta hasta 2 veces si falla.
    
    Args:
        df: DataFrame de pandas
        file_name: Nombre del archivo original
        retry_count: Número de reintentos realizados (máximo 2)
    
    Returns:
        Lista de sugerencias de visualización en formato JSON estructurado
    
    Raises:
        HTTPException: Si falla después de 2 intentos o si hay un error crítico
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY no está configurada. Por favor, configúrala en las variables de entorno."
        )
    
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Extraer información del esquema
    columns_info = {
        col: {
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "null_percentage": float((df[col].isnull().sum() / len(df)) * 100)
        }
        for col in df.columns
    }
    
    # Obtener resumen estadístico
    numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
    categorical_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
    
    # Generar describe() para columnas numéricas
    describe_stats = {}
    if len(numeric_columns) > 0:
        describe_stats = df[numeric_columns].describe().to_dict()
    
    # Información adicional para columnas categóricas (limitar para no exceder tokens)
    categorical_stats = {}
    max_categorical_cols = min(10, len(categorical_columns))  # Máximo 10 columnas categóricas
    for col in categorical_columns[:max_categorical_cols]:
        value_counts = df[col].value_counts().head(5).to_dict()  # Solo top 5 valores
        categorical_stats[col] = {
            "unique_values": int(df[col].nunique()),
            "top_values": {str(k): int(v) for k, v in value_counts.items()}
        }
    
    # Limitar el número de columnas numéricas en describe si hay muchas
    if len(numeric_columns) > 20:
        numeric_columns = numeric_columns[:20]  # Limitar a 20 columnas numéricas
        describe_stats = df[numeric_columns].describe().to_dict()
    
    # Construir el prompt optimizado
    columns_info_str = json.dumps(columns_info, ensure_ascii=False)
    describe_stats_str = json.dumps(describe_stats, default=str, ensure_ascii=False) if describe_stats else "No hay columnas numéricas"
    categorical_stats_str = json.dumps(categorical_stats, ensure_ascii=False) if categorical_stats else "No hay columnas categóricas"
    
    prompt = f"""Analiza estos datos y sugiere 3-5 visualizaciones que destaquen patrones, tendencias o relaciones interesantes.

Archivo: {file_name} | Filas: {len(df)} | Columnas: {len(df.columns)}

Esquema:
{columns_info_str}

Estadísticas numéricas:
{describe_stats_str}

Estadísticas categóricas:
{categorical_stats_str}

INSTRUCCIONES:
- Identifica patrones, anomalías, correlaciones o tendencias interesantes en los datos
- Sugiere 3-5 visualizaciones que demuestren estos hallazgos
- Cada visualización debe incluir: title, chart_type, parameters, insight
- El "insight" debe describir un HALLAZGO ESPECÍFICO sobre los datos (ej: "La categoría X representa el 60% del total", "Se observa una tendencia creciente de Y%", "Existe correlación positiva entre A y B")
- NO describas el tipo de gráfico en el insight, describe el hallazgo que se visualiza
- Todos los textos EN ESPAÑOL
- Tipos permitidos: bar, line, pie, scatter, histogram, area
- Nombres de columnas deben coincidir exactamente con el esquema

FORMATO JSON (ejemplos):
- Ejes X/Y: {{"title": "...", "chart_type": "bar", "parameters": {{"x_axis": "col_x", "y_axis": "col_y"}}, "insight": "..."}}
- Pie: {{"title": "...", "chart_type": "pie", "parameters": {{"labels": "col_cat", "values": "col_val"}}, "insight": "..."}}
- Histograma: {{"title": "...", "chart_type": "histogram", "parameters": {{"column": "col_num"}}, "insight": "..."}}

Devuelve SOLO un array JSON sin texto adicional."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un analista de datos experto. Identifica hallazgos significativos en los datos: patrones, tendencias, anomalías, correlaciones. Tus insights deben describir descubrimientos específicos sobre los datos, no el tipo de gráfico. Respondes SOLO con JSON válido. Textos EN ESPAÑOL."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extraer la respuesta
        if not response.choices or not response.choices[0].message:
            raise ValueError("La respuesta de OpenAI está vacía o incompleta")
        
        content = response.choices[0].message.content.strip()
        
        if not content:
            raise ValueError("La respuesta de OpenAI está vacía")
        
        # Limpiar la respuesta en caso de que tenga markdown o texto adicional
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        # Intentar parsear el JSON
        try:
            visualizations = json.loads(content)
        except json.JSONDecodeError as json_err:
            # Si falla el parsing, intentar encontrar el JSON en la respuesta
            # Buscar el primer [ y último ] para extraer el array JSON
            start_idx = content.find('[')
            end_idx = content.rfind(']')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                content = content[start_idx:end_idx + 1]
                visualizations = json.loads(content)
            else:
                raise ValueError(f"Error al parsear JSON: {str(json_err)}. Contenido recibido: {content[:500]}")
        
        # Validar que sea una lista
        if not isinstance(visualizations, list):
            raise ValueError(f"La respuesta del LLM no es un arreglo. Tipo recibido: {type(visualizations)}")
        
        # Validar que tenga al menos una visualización
        if len(visualizations) == 0:
            raise ValueError("La respuesta del LLM no contiene visualizaciones")
        
        # Validar estructura de cada elemento
        for idx, viz in enumerate(visualizations):
            if not isinstance(viz, dict):
                raise ValueError(f"La visualización en índice {idx} no es un objeto/diccionario")
            
            required_keys = ["title", "chart_type", "parameters", "insight"]
            missing_keys = [key for key in required_keys if key not in viz]
            if missing_keys:
                raise ValueError(f"La visualización en índice {idx} no tiene las claves requeridas: {missing_keys}")
            
            # Validar que parameters sea un diccionario
            if not isinstance(viz.get("parameters"), dict):
                raise ValueError(f"Los parámetros en índice {idx} deben ser un objeto/diccionario")
            
            # Validar que chart_type sea válido
            valid_chart_types = ["bar", "line", "pie", "scatter", "histogram", "area"]
            if viz.get("chart_type") not in valid_chart_types:
                raise ValueError(f"Tipo de gráfico inválido en índice {idx}: {viz.get('chart_type')}. Debe ser uno de: {valid_chart_types}")
        
        return visualizations
    
    except ValueError as e:
        # Errores de validación - intentar reintento si está disponible
        if retry_count < 1:
            await asyncio.sleep(1)  # Esperar 1 segundo antes del reintento
            return await analyze_dataframe_with_ai(df, file_name, retry_count + 1)
        else:
            # Si ya se agotaron los reintentos, lanzar excepción con más detalles
            raise HTTPException(
                status_code=500,
                detail=f"No se ha podido analizar el archivo proporcionado. Error: {str(e)}"
            )
    except json.JSONDecodeError as e:
        # Errores de parsing JSON - intentar reintento si está disponible
        if retry_count < 1:
            await asyncio.sleep(1)  # Esperar 1 segundo antes del reintento
            return await analyze_dataframe_with_ai(df, file_name, retry_count + 1)
        else:
            raise HTTPException(
                status_code=500,
                detail=f"No se ha podido analizar el archivo proporcionado. Error al parsear JSON: {str(e)}"
            )
    except Exception as e:
        # Para otros errores (conexión, API, etc.), también intentar reintento si está disponible
        error_msg = str(e)
        error_type = type(e).__name__
        
        # Detectar errores específicos de OpenAI
        is_rate_limit = (
            "rate limit" in error_msg.lower() or 
            "quota" in error_msg.lower() or
            "rate_limit_exceeded" in error_msg.lower() or
            "429" in error_msg or
            hasattr(e, 'status_code') and e.status_code == 429
        )
        
        is_auth_error = (
            "API" in error_type or 
            "authentication" in error_msg.lower() or 
            "key" in error_msg.lower() or
            "invalid_api_key" in error_msg.lower() or
            "unauthorized" in error_msg.lower() or
            hasattr(e, 'status_code') and e.status_code == 401
        )
        
        if retry_count < 1:
            # Si es rate limit, esperar más tiempo antes del reintento
            if is_rate_limit:
                await asyncio.sleep(5)  # Esperar 5 segundos para rate limit
            else:
                await asyncio.sleep(1)  # Esperar 1 segundo para otros errores
            return await analyze_dataframe_with_ai(df, file_name, retry_count + 1)
        else:
            # Mensaje más específico según el tipo de error
            if is_auth_error:
                raise HTTPException(
                    status_code=500,
                    detail="No se ha podido analizar el archivo proporcionado. Error de autenticación con OpenAI. Verifica que tu API key sea válida."
                )
            elif is_rate_limit:
                raise HTTPException(
                    status_code=429,
                    detail="No se ha podido analizar el archivo proporcionado. Límite de tasa o cuota de OpenAI excedida. Por favor, espera unos minutos e intenta nuevamente."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"No se ha podido analizar el archivo proporcionado. Error: {error_type}: {error_msg[:200]}"
                )


def _clean_expired_cache():
    """Limpia las entradas expiradas del cache"""
    now = datetime.now()
    expired_keys = [
        key for key, value in _dataframe_cache.items()
        if value["expires_at"] < now
    ]
    for key in expired_keys:
        del _dataframe_cache[key]


def _get_dataframe_from_cache(session_id: str) -> pd.DataFrame:
    """Obtiene un DataFrame del cache y valida que no esté expirado"""
    if session_id not in _dataframe_cache:
        raise HTTPException(
            status_code=404,
            detail="Sesión no encontrada o expirada. Por favor, sube el archivo nuevamente."
        )
    
    cache_entry = _dataframe_cache[session_id]
    
    # Verificar si está expirado
    if cache_entry["expires_at"] < datetime.now():
        del _dataframe_cache[session_id]
        raise HTTPException(
            status_code=404,
            detail="Sesión expirada. Por favor, sube el archivo nuevamente."
        )
    
    return cache_entry["dataframe"]


@router.get("/")
async def root():
    return {"message": "API funcionando correctamente", "status": "ok"}


@router.post("/chart-data")
async def get_chart_data(
    session_id: str = Body(..., description="ID de sesión obtenido del endpoint /upload"),
    chart_type: str = Body(..., description="Tipo de gráfico (bar, line, pie, scatter, histogram, box, heatmap, area)"),
    parameters: Dict[str, str] = Body(..., description="Parámetros del gráfico según su tipo")
):
    """
    Endpoint para obtener datos agregados y formateados para un gráfico específico.
    
    Recibe los parámetros del gráfico y devuelve los datos listos para visualizar,
    evitando enviar todo el dataset crudo al cliente.
    """
    try:
        # Obtener el DataFrame del cache
        df = _get_dataframe_from_cache(session_id)
        
        # Validar que el tipo de gráfico sea válido
        valid_chart_types = ["bar", "line", "pie", "scatter", "histogram", "box", "heatmap", "area"]
        if chart_type not in valid_chart_types:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de gráfico inválido: {chart_type}. Debe ser uno de: {valid_chart_types}"
            )
        
        # Procesar según el tipo de gráfico
        chart_data = None
        
        if chart_type in ["bar", "line", "scatter", "area"]:
            # Gráficos con ejes X e Y
            x_axis = parameters.get("x_axis")
            y_axis = parameters.get("y_axis")
            
            if not x_axis or not y_axis:
                raise HTTPException(
                    status_code=400,
                    detail="Los gráficos de tipo 'bar', 'line', 'scatter' y 'area' requieren 'x_axis' y 'y_axis' en parameters"
                )
            
            if x_axis not in df.columns or y_axis not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Las columnas '{x_axis}' o '{y_axis}' no existen en el dataset"
                )
            
            # Agregar datos si hay valores duplicados en x_axis
            if df[x_axis].duplicated().any():
                # Agrupar por x_axis y sumar/contar según el tipo de y_axis
                if pd.api.types.is_numeric_dtype(df[y_axis]):
                    aggregated = df.groupby(x_axis)[y_axis].sum().reset_index()
                else:
                    aggregated = df.groupby(x_axis).size().reset_index(name=y_axis)
                chart_data = {
                    "labels": aggregated[x_axis].tolist(),
                    "values": aggregated[y_axis].tolist(),
                    "x_axis": x_axis,
                    "y_axis": y_axis
                }
            else:
                # Si no hay duplicados, devolver los datos tal cual
                chart_data = {
                    "labels": df[x_axis].fillna("").astype(str).tolist(),
                    "values": df[y_axis].fillna(0).tolist(),
                    "x_axis": x_axis,
                    "y_axis": y_axis
                }
        
        elif chart_type == "pie":
            # Gráficos de pastel
            labels_col = parameters.get("labels")
            values_col = parameters.get("values")
            
            if not labels_col or not values_col:
                raise HTTPException(
                    status_code=400,
                    detail="Los gráficos de tipo 'pie' requieren 'labels' y 'values' en parameters"
                )
            
            if labels_col not in df.columns or values_col not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Las columnas '{labels_col}' o '{values_col}' no existen en el dataset"
                )
            
            # Agrupar y sumar valores por categoría
            if pd.api.types.is_numeric_dtype(df[values_col]):
                aggregated = df.groupby(labels_col)[values_col].sum().reset_index()
            else:
                aggregated = df.groupby(labels_col).size().reset_index(name=values_col)
            
            chart_data = {
                "labels": aggregated[labels_col].fillna("").astype(str).tolist(),
                "values": aggregated[values_col].fillna(0).tolist()
            }
        
        elif chart_type == "histogram":
            # Histogramas
            column = parameters.get("column")
            
            if not column:
                raise HTTPException(
                    status_code=400,
                    detail="Los gráficos de tipo 'histogram' requieren 'column' en parameters"
                )
            
            if column not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{column}' no existe en el dataset"
                )
            
            if not pd.api.types.is_numeric_dtype(df[column]):
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{column}' debe ser numérica para un histograma"
                )
            
            # Calcular histograma
            hist_data = df[column].dropna()
            if len(hist_data) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{column}' no tiene valores válidos"
                )
            
            # Usar bins automáticos (Sturges' rule)
            n_bins = min(30, int(1 + 3.322 * np.log10(len(hist_data))))
            counts, bins = np.histogram(hist_data, bins=n_bins)
            
            # Convertir bins a puntos medios para el gráfico
            bin_centers = [(bins[i] + bins[i+1]) / 2 for i in range(len(bins)-1)]
            
            chart_data = {
                "bins": bin_centers,
                "counts": counts.tolist(),
                "column": column
            }
        
        elif chart_type == "box":
            # Gráficos de caja
            x_axis = parameters.get("x_axis")
            y_axis = parameters.get("y_axis")
            
            if not x_axis or not y_axis:
                raise HTTPException(
                    status_code=400,
                    detail="Los gráficos de tipo 'box' requieren 'x_axis' y 'y_axis' en parameters"
                )
            
            if x_axis not in df.columns or y_axis not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Las columnas '{x_axis}' o '{y_axis}' no existen en el dataset"
                )
            
            if not pd.api.types.is_numeric_dtype(df[y_axis]):
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{y_axis}' debe ser numérica para un gráfico de caja"
                )
            
            # Agrupar por categoría y calcular estadísticas de caja
            box_data = []
            for category in df[x_axis].dropna().unique():
                category_data = df[df[x_axis] == category][y_axis].dropna()
                if len(category_data) > 0:
                    q1 = category_data.quantile(0.25)
                    q2 = category_data.quantile(0.50)  # mediana
                    q3 = category_data.quantile(0.75)
                    iqr = q3 - q1
                    lower_whisker = max(category_data.min(), q1 - 1.5 * iqr)
                    upper_whisker = min(category_data.max(), q3 + 1.5 * iqr)
                    
                    box_data.append({
                        "category": str(category),
                        "q1": float(q1),
                        "median": float(q2),
                        "q3": float(q3),
                        "min": float(category_data.min()),
                        "max": float(category_data.max()),
                        "lower_whisker": float(lower_whisker),
                        "upper_whisker": float(upper_whisker),
                        "outliers": category_data[(category_data < lower_whisker) | (category_data > upper_whisker)].tolist()
                    })
            
            chart_data = {
                "data": box_data,
                "x_axis": x_axis,
                "y_axis": y_axis
            }
        
        elif chart_type == "heatmap":
            # Mapas de calor
            rows_col = parameters.get("rows")
            columns_col = parameters.get("columns")
            values_col = parameters.get("values")
            
            if not rows_col or not columns_col or not values_col:
                raise HTTPException(
                    status_code=400,
                    detail="Los gráficos de tipo 'heatmap' requieren 'rows', 'columns' y 'values' en parameters"
                )
            
            if rows_col not in df.columns or columns_col not in df.columns or values_col not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Una o más columnas no existen en el dataset"
                )
            
            if not pd.api.types.is_numeric_dtype(df[values_col]):
                raise HTTPException(
                    status_code=400,
                    detail=f"La columna '{values_col}' debe ser numérica para un heatmap"
                )
            
            # Crear tabla pivote
            pivot_table = df.pivot_table(
                values=values_col,
                index=rows_col,
                columns=columns_col,
                aggfunc='sum',
                fill_value=0
            )
            
            chart_data = {
                "rows": pivot_table.index.tolist(),
                "columns": pivot_table.columns.tolist(),
                "values": pivot_table.values.tolist()
            }
        
        if chart_data is None:
            raise HTTPException(
                status_code=500,
                detail="Error al procesar los datos del gráfico"
            )
        
        return JSONResponse(content={
            "chart_type": chart_type,
            "data": chart_data,
            "parameters": parameters
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar datos del gráfico: {str(e)}"
        )


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Endpoint robusto para cargar archivos CSV o XLSX.
    Procesa el archivo usando pandas y lo convierte en un DataFrame.
    
    Args:
        file: Archivo a cargar (.csv o .xlsx)
    
    Returns:
        Información sobre el DataFrame procesado
    """
    # Validar extensión del archivo
    allowed_extensions = {".csv", ".xlsx"}
    file_extension = None
    
    if file.filename:
        file_extension = "." + file.filename.rsplit(".", 1)[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de archivo no permitido. Solo se aceptan archivos .csv o .xlsx. Recibido: {file_extension or 'sin extensión'}"
        )
    
    try:
        # Leer el contenido del archivo
        contents = await file.read()
        
        # Crear un buffer en memoria para pandas
        file_buffer = io.BytesIO(contents)
        
        # Procesar el archivo según su extensión
        if file_extension == ".csv":
            # Intentar detectar el encoding automáticamente
            try:
                df = pd.read_csv(file_buffer, encoding='utf-8')
            except UnicodeDecodeError:
                # Si falla UTF-8, intentar con latin-1
                file_buffer.seek(0)
                df = pd.read_csv(file_buffer, encoding='latin-1')
        
        elif file_extension == ".xlsx":
            df = pd.read_excel(file_buffer, engine='openpyxl')
            # Para XLSX, convertir NaN inmediatamente después de cargar
            df = df.replace([np.inf, -np.inf], np.nan)
        
        # Validar que el DataFrame no esté vacío
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="El archivo está vacío o no contiene datos válidos"
            )
        
        print("DataFrame original:")
        print(df.head())
        print(f"Tipos de datos: {df.dtypes}")
        
        # Limpiar el DataFrame de filas completamente vacías
        df = df.dropna(how='all')
        
        # Limpiar columnas que contengan valores monetarios
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    # Remover signos de dólar, comas y espacios, convertir a float
                    cleaned = df[col].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False).str.strip()
                    # Intentar convertir a numérico usando 'coerce' (convierte errores a NaN)
                    numeric_values = pd.to_numeric(cleaned, errors='coerce')
                    # Si la conversión produjo valores numéricos válidos (no todos NaN), usar esos valores
                    if not numeric_values.isna().all():
                        df[col] = numeric_values
                        print(f"Columna {col} convertida a numérica")
                except Exception as e:
                    print(f"Error limpiando columna {col}: {e}")
                    pass
        
        print("\nDataFrame después de limpieza:")
        print(df.head())
        print(f"Tipos de datos: {df.dtypes}")
        
        # Reemplazar valores infinitos con NaN
        df = df.replace([np.inf, -np.inf], np.nan)
        
        print("\nDataFrame después de reemplazar inf:")
        print(df.head())
        print(f"Contiene NaN: {df.isna().sum()}")
        
        # Reemplazar NaN con None de forma robusta para JSON
        # Convertir cada columna individualmente
        for col in df.columns:
            df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)
        
        print("\nDataFrame después de conversión NaN->None:")
        print(df.head())
        print(f"Primer registro completo: {df.iloc[0].to_dict()}")
        
        # Función robusta para limpiar valores
        def clean_value(x):
            """Convierte NaN, None, inf a None. Convierte numpy types a Python natives."""
            if x is None:
                return None
            if pd.isna(x):
                return None
            if isinstance(x, (np.floating, float)):
                if np.isnan(x) or np.isinf(x):
                    return None
                return float(x)
            if isinstance(x, (np.integer, np.int64, np.int32)):
                return int(x)
            if isinstance(x, str) and x.lower() in ['nan', 'none', '']:
                return None
            return x
        
        # Aplicar limpieza exhaustiva a todas las columnas
        for col in df.columns:
            df[col] = df[col].map(clean_value)
        
        print("\nDataFrame después de limpieza exhaustiva:")
        print(df.head())
        print(f"Primer registro limpio: {df.iloc[0].to_dict()}")
        
        # Extraer información del esquema y resumen estadístico
        columns_info = {
            col: {
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isnull().sum()),
                "null_percentage": float((df[col].isnull().sum() / len(df)) * 100)
            }
            for col in df.columns
        }
        
        # Obtener describe() para columnas numéricas
        numeric_columns = df.select_dtypes(include=['number']).columns.tolist()
        describe_stats = {}
        if len(numeric_columns) > 0:
            describe_df = df[numeric_columns].describe()
            # Convertir y limpiar describe_stats para evitar NaN
            for col in describe_df.columns:
                describe_stats[col] = {}
                for stat in describe_df.index:
                    value = describe_df.loc[stat, col]
                    describe_stats[col][stat] = float(value) if pd.notna(value) else None
        
        # Obtener información general (info-like)
        info_summary = {
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024:.2f} KB",
            "numeric_columns": numeric_columns,
            "categorical_columns": df.select_dtypes(include=['object', 'category']).columns.tolist(),
            "datetime_columns": df.select_dtypes(include=['datetime64']).columns.tolist()
        }
        
        # Generar un ID de sesión único para este DataFrame
        session_id = str(uuid.uuid4())
        
        # El DataFrame ya está completamente limpio, se puede cachear directamente
        # Almacenar el DataFrame en el cache con expiración de 1 hora
        _dataframe_cache[session_id] = {
            "dataframe": df,
            "filename": file.filename,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=1)
        }
        
        # Limpiar entradas expiradas del cache
        _clean_expired_cache()
        
        # Analizar con IA para generar sugerencias de visualización
        # La función ya maneja los reintentos internamente (máximo 2 intentos)
        # Si falla después de los reintentos, lanza HTTPException con mensaje "No se ha podido analizar el archivo proporcionado"
        visualization_suggestions = await analyze_dataframe_with_ai(df, file.filename or "archivo")
        
        # Preparar sample_data limpiando todos los NaN manualmente
        sample_records = df.head(10).to_dict(orient="records")
        def clean_dict(d):
            """Limpia recursivamente un diccionario convirtiendo nan a None"""
            cleaned = {}
            for key, value in d.items():
                if value is None:
                    cleaned[key] = None
                elif isinstance(value, float):
                    if np.isnan(value) or np.isinf(value):
                        cleaned[key] = None
                    else:
                        cleaned[key] = float(value)
                elif isinstance(value, (np.integer, np.int64, np.int32)):
                    cleaned[key] = int(value)
                elif pd.isna(value):
                    cleaned[key] = None
                else:
                    cleaned[key] = value
            return cleaned
        
        sample_data_clean = [clean_dict(record) for record in sample_records]
        
        # Retornar información del DataFrame procesado junto con análisis de IA
        response_data = {
            "message": "Archivo procesado y analizado correctamente",
            "session_id": session_id,
            "filename": file.filename,
            "file_type": file_extension[1:],  # Sin el punto
            "dataframe_info": {
                "shape": {
                    "rows": int(df.shape[0]),
                    "columns": int(df.shape[1])
                },
                "columns": df.columns.tolist(),
                "columns_info": columns_info,
                "dtypes": {str(k): str(v) for k, v in df.dtypes.items()},
                "statistical_summary": describe_stats,
                "info_summary": info_summary,
                "null_counts": df.isnull().sum().to_dict(),
                "sample_data": sample_data_clean  # Datos limpios sin NaN
            },
            "ai_analysis": {
                "visualization_suggestions": visualization_suggestions
            }
        }
        
        return JSONResponse(content=response_data)
    
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="El archivo está vacío o no contiene datos válidos"
        )
    except pd.errors.ParserError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error al parsear el archivo CSV: {str(e)}"
        )
    except HTTPException:
        # Re-lanzar HTTPException sin modificar (ya tiene el mensaje correcto)
        raise
    except HTTPException:
        # Re-lanzar HTTPException sin modificar (ya tiene el mensaje correcto)
        raise
    except Exception as e:
        # Capturar otros errores inesperados
        error_msg = str(e)
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el archivo: {error_msg}"
        )