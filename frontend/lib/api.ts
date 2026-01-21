// API Base URL - Change this to your FastAPI server URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Types matching the API documentation
export interface ColumnInfo {
  dtype: string
  null_count: number
  null_percentage: number
}

export interface StatisticalSummary {
  count: number
  mean: number
  std: number
  min: number
  "25%": number
  "50%": number
  "75%": number
  max: number
}

export interface DataframeInfo {
  shape: {
    rows: number
    columns: number
  }
  columns: string[]
  columns_info: Record<string, ColumnInfo>
  dtypes: Record<string, string>
  statistical_summary: Record<string, StatisticalSummary>
  info_summary: {
    total_rows: number
    total_columns: number
    memory_usage: string
    numeric_columns: string[]
    categorical_columns: string[]
    datetime_columns: string[]
  }
  null_counts: Record<string, number>
  sample_data: Array<Record<string, unknown>>
}

export interface VisualizationSuggestion {
  title: string
  chart_type: "bar" | "line" | "pie" | "scatter" | "histogram" | "box" | "heatmap" | "area"
  parameters: Record<string, string>
  insight: string
}

export interface UploadResponse {
  message: string
  session_id: string
  filename: string
  file_type: string
  dataframe_info: DataframeInfo
  ai_analysis: {
    visualization_suggestions: VisualizationSuggestion[]
  }
}

export interface ChartDataRequest {
  session_id: string
  chart_type: string
  parameters: Record<string, string>
}

export interface BarLineAreaChartData {
  labels: string[]
  values: number[]
  x_axis: string
  y_axis: string
}

export interface PieChartData {
  labels: string[]
  values: number[]
}

export interface HistogramChartData {
  bins: number[]
  counts: number[]
  column: string
}

export interface BoxPlotData {
  data: Array<{
    category: string
    q1: number
    median: number
    q3: number
    min: number
    max: number
    lower_whisker: number
    upper_whisker: number
    outliers: number[]
  }>
  x_axis: string
  y_axis: string
}

export interface HeatmapData {
  rows: string[]
  columns: string[]
  values: number[][]
}

export type ChartData = BarLineAreaChartData | PieChartData | HistogramChartData | BoxPlotData | HeatmapData

export interface ChartDataResponse {
  chart_type: string
  data: ChartData
  parameters: Record<string, string>
}

export interface ApiError {
  detail: string
}

// Upload file and get AI analysis
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.detail || "Error al procesar el archivo")
  }

  return response.json()
}

// Get chart data for a specific visualization
export async function getChartData(request: ChartDataRequest): Promise<ChartDataResponse> {
  const response = await fetch(`${API_BASE_URL}/chart-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.detail || "Error al obtener datos del gráfico")
  }

  return response.json()
}
