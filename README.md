# AI Data Analyzer

Una aplicación web que utiliza inteligencia artificial para analizar archivos de datos y generar insights automáticos con visualizaciones interactivas.

## 🎯 Descripción

Este proyecto nació de la necesidad de hacer el análisis de datos más accesible. En lugar de pasar horas explorando datasets manualmente, la aplicación usa IA para identificar patrones interesantes y sugerir las visualizaciones más relevantes automáticamente.

La aplicación acepta archivos CSV o XLSX, los procesa, y utiliza Claude Sonnet (vía OpenAI API) para generar sugerencias inteligentes de gráficos basadas en el contenido y estructura de los datos.

## ✨ Características

- **Análisis automático con IA**: Claude Sonnet analiza la estructura de tus datos y sugiere visualizaciones relevantes
- **Soporte para múltiples formatos**: CSV y XLSX
- **Limpieza inteligente de datos**: Maneja automáticamente valores monetarios ($), NaN, y datos faltantes
- **Visualizaciones interactivas**: Gráficos de barras, líneas, áreas, dispersión, circulares e histogramas
- **Dashboard personalizable**: Agrega los gráficos que más te interesen
- **Insights en español**: Todas las sugerencias y análisis están en español

## 🛠️ Stack Tecnológico

### Backend (FastAPI)

Elegí FastAPI por su velocidad y excelente soporte para operaciones asíncronas, lo cual es crucial cuando procesamos archivos grandes y hacemos llamadas a APIs externas. Además, su documentación automática con Swagger es invaluable durante el desarrollo.

- **FastAPI**: Framework web moderno y rápido
- **Pandas**: Para manipulación y análisis de datos
- **OpenAI SDK**: Integración con Claude Sonnet para análisis inteligente
- **Pydantic**: Validación de datos y configuración
- **Uvicorn**: Servidor ASGI de alto rendimiento

### Frontend (Next.js)

Next.js fue la elección obvia por su sistema de routing, optimización automática de imágenes, y excelente experiencia de desarrollo. El hecho de que soporta Server Components y tiene hot-reload hace que el desarrollo sea mucho más ágil.

- **Next.js 16**: Framework de React con SSR y optimizaciones
- **React**: Biblioteca de interfaces de usuario
- **Recharts**: Visualizaciones de datos (elegí esta sobre Chart.js por su API declarativa que encaja mejor con React)
- **Tailwind CSS**: Estilos utilitarios (mucho más rápido que escribir CSS personalizado)
- **shadcn/ui**: Componentes UI accesibles y personalizables
- **TypeScript**: Tipado estático para mayor seguridad

## 🧠 Ingeniería de Prompts

El corazón de esta aplicación está en cómo le "explicamos" a la IA lo que necesitamos. Después de varias iteraciones, encontré que el prompt más efectivo tiene estas características:

### Estructura del Prompt

1. **Contexto claro**: Le doy a la IA el rol de "analista de datos experto" para que adopte esa perspectiva
2. **Datos estructurados**: En lugar de darle todo el dataset, le paso:
   - Esquema de columnas con tipos de datos
   - Estadísticas descriptivas (mean, std, min, max)
   - Top valores de columnas categóricas
   - Conteo de valores nulos

3. **Formato estricto**: Pedí explícitamente JSON válido con ejemplos de cada tipo de gráfico. Esto redujo los errores de parsing.

4. **Restricciones específicas**:
   - Solo usar columnas que existen en el dataset
   - Limitar a 6 tipos de gráficos soportados
   - Todos los textos en español (tuve que enfatizar esto porque a veces mezclaba idiomas)

5. **Validación iterativa**: El sistema reintenta hasta 2 veces si la respuesta no es válida, lo que maneja casos edge donde la IA devuelve markdown envuelto en el JSON.

### Decisión: ¿Por qué no dar el dataset completo?

Originalmente intenté enviar filas de datos reales, pero descubrí que:

- Consume muchos más tokens (más caro)
- La IA a veces se distrae con valores específicos en lugar de ver patrones generales
- Con datasets grandes, excedía los límites de tokens

El enfoque actual de enviar solo estadísticas agregadas resultó ser más efectivo y económico.

## 🚀 Configuración Local

### Prerrequisitos

- Python 3.10 o superior
- Node.js 18 o superior
- Una API key de OpenAI (o Anthropic si usas Claude directamente)

### 1. Clonar el repositorio

```bash
git clone https://github.com/DeusEli/maic-challenge.git
cd maic-challenge
```

### 2. Configurar el Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Edita .env y agrega tu OPENAI_API_KEY
```

### 3. Configurar el Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# El archivo ya tiene NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Ejecutar la aplicación

**Terminal 1 - Backend:**

```bash
cd backend
uvicorn app.main:app --reload
```

El backend estará disponible en `http://localhost:8000`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

### 5. Probar la aplicación

1. Abre `http://localhost:3000` en tu navegador
2. Sube un archivo CSV o XLSX
3. Espera a que la IA analice los datos (unos segundos)
4. Revisa las sugerencias de visualización
5. Haz clic en "Agregar al Dashboard" en los gráficos que te interesen

## 🌐 Despliegue en Railway

Railway hace que el despliegue sea extremadamente simple. Aquí está el proceso paso a paso:

### 1. Preparar el proyecto

Ya está todo listo en el repo:

- ✅ `railway.toml` con la configuración
- ✅ `requirements.txt` con las dependencias
- ✅ Health check endpoint (`/health`)
- ✅ Variables de entorno configuradas

### 2. Desplegar el Backend

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Click en "New Project" → "Deploy from GitHub repo"
3. Selecciona este repositorio
4. En Settings:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. En Variables, agrega:
   - `OPENAI_API_KEY`: tu API key de OpenAI
6. Railway generará una URL como: `https://tu-backend.up.railway.app`

### 3. Desplegar el Frontend

1. En Railway, click en "New" → "GitHub Repo" (mismo repositorio)
2. En Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. En Variables, agrega:
   - `NEXT_PUBLIC_API_URL`: la URL del backend de Railway (del paso anterior)
4. Railway generará la URL del frontend

### 4. Configurar Variables de Entorno (importante)

Una vez que tengas ambas URLs, configura las variables de entorno:

**Backend Variables:**
1. Ve a tu servicio de backend en Railway
2. En la sección **Variables**, agrega:
   - `OPENAI_API_KEY`: Tu API key de OpenAI
   - `ALLOWED_ORIGINS`: La URL de tu frontend (ej: `https://tu-frontend.up.railway.app,http://localhost:3000`)

**Frontend Variables:**
Ya deberías tener configurado:
   - `NEXT_PUBLIC_API_URL`: La URL del backend

Railway redesplegará automáticamente cuando agregues las variables.

### 5. ¡Listo! 🎉

Tu aplicación ya está en producción. Railway se encarga de:

- SSL/HTTPS automático
- Escalado automático
- Logs en tiempo real
- Reinicios automáticos si hay errores

## 📁 Estructura del Proyecto

```
maic-challenge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Configuración y variables de entorno
│   │   ├── main.py            # Punto de entrada de FastAPI
│   │   └── routes.py          # Endpoints y lógica de análisis
│   ├── .env.example           # Ejemplo de variables de entorno
│   ├── .gitignore
│   ├── railway.toml           # Configuración de Railway
│   └── requirements.txt       # Dependencias de Python
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Página principal
│   │   └── layout.tsx         # Layout de la app
│   ├── components/
│   │   ├── analysis-result.tsx
│   │   ├── chart-suggestion-card.tsx
│   │   ├── dashboard.tsx      # Dashboard con gráficos
│   │   ├── file-upload.tsx
│   │   └── processing-state.tsx
│   ├── lib/
│   │   └── api.ts             # Cliente de API
│   ├── .env.local.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

## 🔒 Seguridad

- Las API keys nunca se incluyen en el código (solo en `.env`)
- Los archivos `.env` están en `.gitignore`
- Se proporcionan archivos `.env.example` para documentación
- CORS configurado para permitir solo orígenes específicos en producción
- Los datos subidos se almacenan en memoria temporalmente (1 hora) y luego se eliminan
