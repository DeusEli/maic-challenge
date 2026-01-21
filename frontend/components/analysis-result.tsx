"use client"

import { useState, useCallback } from "react"
import { CheckCircle2, RefreshCw, LayoutDashboard, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartSuggestionCard, type DashboardChart, type ChartType } from "./chart-suggestion-card"
import { Dashboard, transformDataForRecharts } from "./dashboard"
import { getChartData, type UploadResponse, type VisualizationSuggestion, type ChartData } from "@/lib/api"

interface AnalysisResultProps {
  fileName: string
  analysisData: UploadResponse
  onReset: () => void
}

export function AnalysisResult({ fileName, analysisData, onReset }: AnalysisResultProps) {
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([])
  const [showDashboard, setShowDashboard] = useState(false)
  const [loadingCharts, setLoadingCharts] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const suggestions = analysisData.ai_analysis.visualization_suggestions
  const sessionId = analysisData.session_id

  const handleAddToDashboard = useCallback(async (suggestion: VisualizationSuggestion, index: number) => {
    const chartId = `chart-${index}`
    setError(null)
    
    // Add loading state
    setLoadingCharts(prev => new Set(prev).add(chartId))
    
    // Add chart to dashboard immediately (with loading state)
    const newChart: DashboardChart = {
      id: chartId,
      title: suggestion.title,
      insight: suggestion.insight,
      chartType: suggestion.chart_type as ChartType,
      parameters: suggestion.parameters,
      data: null,
      isLoading: true,
    }
    
    setDashboardCharts(prev => [...prev, newChart])
    
    try {
      // Fetch chart data from API
      const response = await getChartData({
        session_id: sessionId,
        chart_type: suggestion.chart_type,
        parameters: suggestion.parameters,
      })
      
      // Transform API data to Recharts format
      const transformedData = transformDataForRecharts(
        suggestion.chart_type as ChartType, 
        response.data as ChartData
      )
      
      // Update chart with real data
      setDashboardCharts(prev => 
        prev.map(chart => 
          chart.id === chartId 
            ? { ...chart, data: transformedData, isLoading: false }
            : chart
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos del gráfico")
      // Remove failed chart from dashboard
      setDashboardCharts(prev => prev.filter(chart => chart.id !== chartId))
    } finally {
      setLoadingCharts(prev => {
        const next = new Set(prev)
        next.delete(chartId)
        return next
      })
    }
  }, [sessionId])

  const handleRemoveFromDashboard = useCallback((id: string) => {
    setDashboardCharts(prev => prev.filter(chart => chart.id !== id))
  }, [])

  const isChartAdded = (index: number) => {
    return dashboardCharts.some(chart => chart.id === `chart-${index}`)
  }

  const isChartLoading = (index: number) => {
    return loadingCharts.has(`chart-${index}`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Análisis Completado
          </h2>
          <p className="text-muted-foreground">{fileName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {analysisData.dataframe_info.shape.rows.toLocaleString()} filas x {analysisData.dataframe_info.shape.columns} columnas
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Toggle Dashboard View */}
      <div className="flex justify-center gap-3">
        <Button
          variant={!showDashboard ? "default" : "outline"}
          onClick={() => setShowDashboard(false)}
          className={!showDashboard ? "" : "bg-transparent"}
        >
          Sugerencias de Gráficos
        </Button>
        <Button
          variant={showDashboard ? "default" : "outline"}
          onClick={() => setShowDashboard(true)}
          className={`gap-2 ${showDashboard ? "" : "bg-transparent"}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard ({dashboardCharts.length})
        </Button>
      </div>

      {/* Content */}
      {!showDashboard ? (
        <>
          {/* Chart Suggestions Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Visualizaciones sugeridas por IA
            </h3>
            {suggestions.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">
                  No se generaron sugerencias de visualización para este archivo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((suggestion, index) => (
                  <ChartSuggestionCard
                    key={`suggestion-${index}`}
                    suggestion={suggestion}
                    index={index}
                    isAdded={isChartAdded(index)}
                    isLoading={isChartLoading(index)}
                    onAdd={handleAddToDashboard}
                    onRemove={handleRemoveFromDashboard}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Tu Dashboard Personalizado
          </h3>
          <Dashboard 
            charts={dashboardCharts} 
            onRemoveChart={handleRemoveFromDashboard} 
          />
        </div>
      )}

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onReset}
          variant="outline"
          className="gap-2 bg-transparent"
        >
          <RefreshCw className="w-4 h-4" />
          Analizar otro archivo
        </Button>
      </div>
    </div>
  )
}
