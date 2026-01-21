# Documentación de la API - Análisis de Datos con IA

## Descripción General

Esta API proporciona análisis instantáneos de datos impulsados por IA. Permite cargar archivos CSV o XLSX, analizarlos automáticamente y obtener sugerencias de visualizaciones personalizadas generadas por OpenAI.

## Base URL

```
http://localhost:8000
```

## Endpoints

### 1. Cargar y Analizar Archivo

Carga un archivo CSV o XLSX, lo procesa y genera sugerencias de visualización usando IA.

**Endpoint:** `POST /upload`

**Content-Type:** `multipart/form-data`

**Parámetros:**
- `file` (File, requerido): Archivo CSV o XLSX a procesar

**Respuesta Exitosa (200):**
```json
{
  "message": "Archivo procesado y analizado correctamente",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "datos.csv",
  "file_type": "csv",
  "dataframe_info": {
    "shape": {
      "rows": 1000,
      "columns": 5
    },
    "columns": ["Categoría", "Valor", "Fecha", "Región", "Producto"],
    "columns_info": {
      "Categoría": {
        "dtype": "object",
        "null_count": 0,
        "null_percentage": 0.0
      },
      "Valor": {
        "dtype": "float64",
        "null_count": 5,
        "null_percentage": 0.5
      }
    },
    "dtypes": {
      "Categoría": "object",
      "Valor": "float64",
      "Fecha": "datetime64[ns]",
      "Región": "object",
      "Producto": "object"
    },
    "statistical_summary": {
      "Valor": {
        "count": 995.0,
        "mean": 125.5,
        "std": 45.2,
        "min": 10.0,
        "25%": 90.0,
        "50%": 120.0,
        "75%": 160.0,
        "max": 300.0
      }
    },
    "info_summary": {
      "total_rows": 1000,
      "total_columns": 5,
      "memory_usage": "125.50 KB",
      "numeric_columns": ["Valor"],
      "categorical_columns": ["Categoría", "Región", "Producto"],
      "datetime_columns": ["Fecha"]
    },
    "null_counts": {
      "Categoría": 0,
      "Valor": 5,
      "Fecha": 0,
      "Región": 0,
      "Producto": 0
    },
    "sample_data": [
      {
        "Categoría": "A",
        "Valor": 120.5,
        "Fecha": "2024-01-15",
        "Región": "Norte",
        "Producto": "X"
      }
    ]
  },
  "ai_analysis": {
    "visualization_suggestions": [
      {
        "title": "Distribución de Valores por Categoría",
        "chart_type": "bar",
        "parameters": {
          "x_axis": "Categoría",
          "y_axis": "Valor"
        },
        "insight": "Este gráfico muestra la distribución de valores agrupados por categoría. Permite identificar qué categorías tienen los valores más altos y comparar entre ellas."
      },
      {
        "title": "Proporción de Ventas por Región",
        "chart_type": "pie",
        "parameters": {
          "labels": "Región",
          "values": "Valor"
        },
        "insight": "El gráfico de pastel visualiza la proporción de ventas totales por región. Ayuda a entender la distribución geográfica de los datos."
      },
      {
        "title": "Distribución de Valores",
        "chart_type": "histogram",
        "parameters": {
          "column": "Valor"
        },
        "insight": "El histograma muestra la distribución de frecuencias de los valores. Revela si los datos siguen una distribución normal o tienen sesgos."
      }
    ]
  }
}
```

**Errores Posibles:**

- `400 Bad Request`: Formato de archivo no permitido
  ```json
  {
    "detail": "Formato de archivo no permitido. Solo se aceptan archivos .csv o .xlsx. Recibido: .pdf"
  }
  ```

- `400 Bad Request`: Archivo vacío
  ```json
  {
    "detail": "El archivo está vacío o no contiene datos válidos"
  }
  ```

- `429 Too Many Requests`: Límite de tasa excedido
  ```json
  {
    "detail": "No se ha podido analizar el archivo proporcionado. Límite de tasa o cuota de OpenAI excedida. Por favor, espera unos minutos e intenta nuevamente."
  }
  ```

- `500 Internal Server Error`: Error al analizar
  ```json
  {
    "detail": "No se ha podido analizar el archivo proporcionado. Error: [descripción del error]"
  }
  ```

**Notas Importantes:**
- El `session_id` es necesario para obtener los datos de los gráficos
- El `session_id` expira después de 1 hora
- Solo se aceptan archivos `.csv` y `.xlsx`
- El análisis con IA puede tardar varios segundos

---

### 2. Obtener Datos para Gráfico

Obtiene los datos agregados y formateados para un gráfico específico, evitando enviar todo el dataset al cliente.

**Endpoint:** `POST /chart-data`

**Content-Type:** `application/json`

**Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "chart_type": "bar",
  "parameters": {
    "x_axis": "Categoría",
    "y_axis": "Valor"
  }
}
```

**Parámetros del Body:**
- `session_id` (string, requerido): ID de sesión obtenido del endpoint `/upload`
- `chart_type` (string, requerido): Tipo de gráfico. Valores válidos: `bar`, `line`, `pie`, `scatter`, `histogram`, `box`, `heatmap`, `area`
- `parameters` (object, requerido): Parámetros específicos según el tipo de gráfico (ver ejemplos abajo)

#### Tipos de Gráficos y sus Parámetros

##### Bar, Line, Scatter, Area
```json
{
  "session_id": "...",
  "chart_type": "bar",
  "parameters": {
    "x_axis": "Categoría",
    "y_axis": "Valor"
  }
}
```

**Respuesta:**
```json
{
  "chart_type": "bar",
  "data": {
    "labels": ["A", "B", "C"],
    "values": [120.5, 200.3, 150.8],
    "x_axis": "Categoría",
    "y_axis": "Valor"
  },
  "parameters": {
    "x_axis": "Categoría",
    "y_axis": "Valor"
  }
}
```

##### Pie
```json
{
  "session_id": "...",
  "chart_type": "pie",
  "parameters": {
    "labels": "Región",
    "values": "Valor"
  }
}
```

**Respuesta:**
```json
{
  "chart_type": "pie",
  "data": {
    "labels": ["Norte", "Sur", "Este", "Oeste"],
    "values": [500.5, 300.2, 450.8, 200.1]
  },
  "parameters": {
    "labels": "Región",
    "values": "Valor"
  }
}
```

##### Histogram
```json
{
  "session_id": "...",
  "chart_type": "histogram",
  "parameters": {
    "column": "Valor"
  }
}
```

**Respuesta:**
```json
{
  "chart_type": "histogram",
  "data": {
    "bins": [10.5, 20.5, 30.5, 40.5, 50.5],
    "counts": [5, 12, 25, 18, 10],
    "column": "Valor"
  },
  "parameters": {
    "column": "Valor"
  }
}
```

##### Box Plot
```json
{
  "session_id": "...",
  "chart_type": "box",
  "parameters": {
    "x_axis": "Categoría",
    "y_axis": "Valor"
  }
}
```

**Respuesta:**
```json
{
  "chart_type": "box",
  "data": {
    "data": [
      {
        "category": "A",
        "q1": 90.0,
        "median": 120.0,
        "q3": 160.0,
        "min": 50.0,
        "max": 200.0,
        "lower_whisker": 45.0,
        "upper_whisker": 205.0,
        "outliers": [250.0, 280.0]
      },
      {
        "category": "B",
        "q1": 100.0,
        "median": 130.0,
        "q3": 170.0,
        "min": 60.0,
        "max": 220.0,
        "lower_whisker": 55.0,
        "upper_whisker": 215.0,
        "outliers": []
      }
    ],
    "x_axis": "Categoría",
    "y_axis": "Valor"
  },
  "parameters": {
    "x_axis": "Categoría",
    "y_axis": "Valor"
  }
}
```

##### Heatmap
```json
{
  "session_id": "...",
  "chart_type": "heatmap",
  "parameters": {
    "rows": "Región",
    "columns": "Producto",
    "values": "Valor"
  }
}
```

**Respuesta:**
```json
{
  "chart_type": "heatmap",
  "data": {
    "rows": ["Norte", "Sur", "Este", "Oeste"],
    "columns": ["Producto A", "Producto B", "Producto C"],
    "values": [
      [100.5, 150.2, 200.8],
      [80.3, 120.5, 180.1],
      [90.0, 140.0, 190.5],
      [70.2, 110.8, 170.3]
    ]
  },
  "parameters": {
    "rows": "Región",
    "columns": "Producto",
    "values": "Valor"
  }
}
```

**Errores Posibles:**

- `400 Bad Request`: Tipo de gráfico inválido
  ```json
  {
    "detail": "Tipo de gráfico inválido: invalid_type. Debe ser uno de: ['bar', 'line', 'pie', 'scatter', 'histogram', 'box', 'heatmap', 'area']"
  }
  ```

- `400 Bad Request`: Parámetros faltantes
  ```json
  {
    "detail": "Los gráficos de tipo 'bar' requieren 'x_axis' y 'y_axis' en parameters"
  }
  ```

- `400 Bad Request`: Columna no existe
  ```json
  {
    "detail": "Las columnas 'Categoría' o 'Valor' no existen en el dataset"
  }
  ```

- `400 Bad Request`: Tipo de dato incorrecto
  ```json
  {
    "detail": "La columna 'Valor' debe ser numérica para un histograma"
  }
  ```

- `404 Not Found`: Sesión no encontrada o expirada
  ```json
  {
    "detail": "Sesión no encontrada o expirada. Por favor, sube el archivo nuevamente."
  }
  ```

- `500 Internal Server Error`: Error al procesar
  ```json
  {
    "detail": "Error al generar datos del gráfico: [descripción del error]"
  }
  ```

---

## Flujo de Uso Recomendado

1. **Cargar archivo**: `POST /upload`
   - Obtener `session_id` y `visualization_suggestions`

2. **Mostrar sugerencias**: Presentar las sugerencias de visualización al usuario

3. **Obtener datos del gráfico**: Para cada gráfico seleccionado, llamar `POST /chart-data`
   - Usar el `session_id` del paso 1
   - Usar el `chart_type` y `parameters` de la sugerencia

4. **Visualizar**: Renderizar el gráfico con los datos recibidos

## Ejemplo de Flujo Completo

```javascript
// 1. Cargar archivo
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('http://localhost:8000/upload', {
  method: 'POST',
  body: formData
});

const uploadData = await uploadResponse.json();
const sessionId = uploadData.session_id;
const suggestions = uploadData.ai_analysis.visualization_suggestions;

// 2. Obtener datos para el primer gráfico sugerido
const firstSuggestion = suggestions[0];

const chartDataResponse = await fetch('http://localhost:8000/chart-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session_id: sessionId,
    chart_type: firstSuggestion.chart_type,
    parameters: firstSuggestion.parameters
  })
});

const chartData = await chartDataResponse.json();
// Usar chartData.data para renderizar el gráfico
```

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `400 Bad Request`: Error en los parámetros de la solicitud
- `404 Not Found`: Recurso no encontrado (sesión expirada)
- `429 Too Many Requests`: Límite de tasa excedido
- `500 Internal Server Error`: Error interno del servidor

## Notas Técnicas

- **Sesiones**: Los `session_id` expiran después de 1 hora de inactividad
- **Formato de archivos**: Solo se aceptan `.csv` y `.xlsx`
- **Encoding**: Los archivos CSV se intentan leer primero con UTF-8, luego con Latin-1
- **Agregación**: Los datos se agregan automáticamente cuando hay valores duplicados en el eje X
- **Validación**: Todas las columnas referenciadas deben existir en el dataset
- **Tipos de datos**: Los histogramas y box plots requieren columnas numéricas

## Limitaciones

- El cache de sesiones está en memoria (no persistente)
- Los archivos muy grandes pueden tardar más en procesarse
- El análisis con IA depende de la disponibilidad y límites de OpenAI
- Máximo 1 hora de validez para cada sesión
