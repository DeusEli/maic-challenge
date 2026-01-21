"use client";

import { X, GripVertical, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DashboardChart, ChartType } from "./chart-suggestion-card";
import type {
  BarLineAreaChartData,
  PieChartData,
  HistogramChartData,
  BoxPlotData,
  HeatmapData,
  ChartData,
} from "@/lib/api";

interface DashboardProps {
  charts: DashboardChart[];
  onRemoveChart: (id: string) => void;
}

const CHART_COLORS = [
  "hsl(280, 70%, 55%)",
  "hsl(200, 70%, 55%)",
  "hsl(150, 70%, 45%)",
  "hsl(40, 80%, 55%)",
  "hsl(340, 70%, 55%)",
];

// Transform API data to Recharts format
function transformDataForRecharts(
  chartType: ChartType,
  apiData: ChartData,
): Array<Record<string, string | number>> {
  if (
    chartType === "bar" ||
    chartType === "line" ||
    chartType === "area" ||
    chartType === "scatter"
  ) {
    const data = apiData as BarLineAreaChartData;
    return data.labels.map((label, index) => ({
      name: label,
      value: data.values[index],
    }));
  }

  if (chartType === "pie") {
    const data = apiData as PieChartData;
    return data.labels.map((label, index) => ({
      name: label,
      value: data.values[index],
    }));
  }

  if (chartType === "histogram") {
    const data = apiData as HistogramChartData;
    return data.bins.map((bin, index) => ({
      bin: bin.toFixed(1),
      count: data.counts[index] || 0,
    }));
  }

  if (chartType === "box") {
    const data = apiData as BoxPlotData;
    // Box plots need special handling, return the data as is
    return data.data as unknown as Array<Record<string, string | number>>;
  }

  if (chartType === "heatmap") {
    const data = apiData as HeatmapData;
    // Flatten heatmap data for simple display
    const flattened: Array<Record<string, string | number>> = [];
    data.rows.forEach((row, rowIndex) => {
      data.columns.forEach((col, colIndex) => {
        flattened.push({
          row,
          column: col,
          value: data.values[rowIndex]?.[colIndex] || 0,
        });
      });
    });
    return flattened;
  }

  return [];
}

function renderChart(chart: DashboardChart, expanded: boolean) {
  const height = expanded ? 350 : 220;

  if (chart.isLoading || !chart.data) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Cargando datos...
          </span>
        </div>
      </div>
    );
  }

  const chartData = chart.data;

  switch (chart.chartType) {
    case "bar":
    case "histogram":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 10%, 25%)" />
            <XAxis
              dataKey={chart.chartType === "histogram" ? "bin" : "name"}
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(280, 20%, 15%)",
                border: "1px solid hsl(280, 10%, 30%)",
                borderRadius: "8px",
                color: "hsl(0, 0%, 98%)",
              }}
            />
            <Bar
              dataKey={chart.chartType === "histogram" ? "count" : "value"}
              fill={CHART_COLORS[0]}
              radius={[4, 4, 0, 0]}
              name={chart.chartType === "histogram" ? "Frecuencia" : "Valor"}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 10%, 25%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(280, 20%, 15%)",
                border: "1px solid hsl(280, 10%, 30%)",
                borderRadius: "8px",
                color: "hsl(0, 0%, 98%)",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS[0], strokeWidth: 0, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={expanded ? 120 : 70}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: "hsl(0, 0%, 50%)" }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(280, 20%, 15%)",
                border: "1px solid hsl(280, 10%, 30%)",
                borderRadius: "8px",
                color: "hsl(0, 0%, 98%)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS[0]}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS[0]}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 10%, 25%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(280, 20%, 15%)",
                border: "1px solid hsl(280, 10%, 30%)",
                borderRadius: "8px",
                color: "hsl(0, 0%, 98%)",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              fill="url(#gradient-area)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 10%, 25%)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <YAxis
              dataKey="value"
              tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(280, 20%, 15%)",
                border: "1px solid hsl(280, 10%, 30%)",
                borderRadius: "8px",
                color: "hsl(0, 0%, 98%)",
              }}
            />
            <Scatter data={chartData} fill={CHART_COLORS[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "box":
      return (
        <div className="w-full" style={{ height }}>
          <div className="text-xs text-muted-foreground mb-2 px-4">
            Diagrama de Caja - Muestra la distribución de datos por categoría
          </div>
          <ResponsiveContainer width="100%" height={height - 30}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(280, 10%, 25%)"
              />
              <XAxis
                dataKey="category"
                tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
              />
              <YAxis
                tick={{ fill: "hsl(0, 0%, 65%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(280, 10%, 30%)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(280, 20%, 15%)",
                  border: "1px solid hsl(280, 10%, 30%)",
                  borderRadius: "8px",
                  color: "hsl(0, 0%, 98%)",
                }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card p-3 rounded-lg border border-border text-xs">
                      <p className="font-semibold mb-1">{data.category}</p>
                      <p>Máximo: {data.max?.toFixed(2)}</p>
                      <p>Q3: {data.q3?.toFixed(2)}</p>
                      <p>Mediana: {data.median?.toFixed(2)}</p>
                      <p>Q1: {data.q1?.toFixed(2)}</p>
                      <p>Mínimo: {data.min?.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="median"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 4, 4]}
                name="Mediana"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case "heatmap":
      return (
        <div className="w-full overflow-auto" style={{ height }}>
          <div className="text-xs text-muted-foreground mb-2 px-4">
            Mapa de Calor - Los colores más intensos representan valores más
            altos
          </div>
          <div className="p-4 min-w-max">
            {(() => {
              const rows = Array.from(
                new Set(chartData.map((d) => d.row as string)),
              );
              const cols = Array.from(
                new Set(chartData.map((d) => d.column as string)),
              );
              const values = chartData.map((d) => d.value as number);
              const maxValue = Math.max(...values);
              const minValue = Math.min(...values);

              return (
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `80px repeat(${cols.length}, 60px)`,
                  }}
                >
                  <div></div>
                  {cols.map((col) => (
                    <div
                      key={col}
                      className="text-xs text-muted-foreground text-center truncate"
                    >
                      {col}
                    </div>
                  ))}
                  {rows.map((row) => (
                    <>
                      <div
                        key={`label-${row}`}
                        className="text-xs text-muted-foreground flex items-center truncate"
                      >
                        {row}
                      </div>
                      {cols.map((col) => {
                        const cell = chartData.find(
                          (d) => d.row === row && d.column === col,
                        );
                        const value = (cell?.value as number) || 0;
                        const intensity =
                          maxValue !== minValue
                            ? (value - minValue) / (maxValue - minValue)
                            : 0.5;
                        const hue = 280; // Purple hue
                        return (
                          <div
                            key={`${row}-${col}`}
                            className="h-12 flex items-center justify-center text-xs rounded border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            style={{
                              backgroundColor: `hsl(${hue}, ${70 * intensity}%, ${35 + intensity * 30}%)`,
                            }}
                            title={`${row} - ${col}: ${value.toFixed(2)}`}
                          >
                            {value.toFixed(1)}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      );

    default:
      return (
        <div
          className="flex items-center justify-center text-muted-foreground"
          style={{ height }}
        >
          Tipo de gráfico no soportado: {chart.chartType}
        </div>
      );
  }
}

function DashboardCard({
  chart,
  onRemove,
}: {
  chart: DashboardChart;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`bg-card border-border transition-all duration-300 ${expanded ? "md:col-span-2" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <CardTitle className="text-sm font-medium text-foreground">
              {chart.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemove(chart.id)}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{renderChart(chart, expanded)}</CardContent>
    </Card>
  );
}

export function Dashboard({ charts, onRemoveChart }: DashboardProps) {
  if (charts.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">
          Selecciona gráficos de las sugerencias para agregarlos al dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {charts.map((chart) => (
        <DashboardCard key={chart.id} chart={chart} onRemove={onRemoveChart} />
      ))}
    </div>
  );
}

export { transformDataForRecharts };
