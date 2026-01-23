"use client";

import {
  Plus,
  Check,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Grid3X3,
  BoxSelect,
  Activity,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VisualizationSuggestion } from "@/lib/api";

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "histogram"
  | "box"
  | "heatmap"
  | "area";

export interface DashboardChart {
  id: string;
  title: string;
  insight: string;
  chartType: ChartType;
  parameters: Record<string, string>;
  data: Array<Record<string, string | number>> | null;
  isLoading: boolean;
}

interface ChartSuggestionCardProps {
  suggestion: VisualizationSuggestion;
  index: number;
  isAdded: boolean;
  isLoading: boolean;
  onAdd: (suggestion: VisualizationSuggestion, index: number) => void;
  onRemove: (id: string) => void;
}

const chartIcons: Record<ChartType, LucideIcon> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: TrendingUp,
  scatter: Activity,
  histogram: BarChart3,
  box: BoxSelect,
  heatmap: Grid3X3,
};

const chartLabels: Record<ChartType, string> = {
  bar: "Gráfico de Barras",
  line: "Gráfico de Líneas",
  pie: "Gráfico Circular",
  area: "Gráfico de Área",
  scatter: "Gráfico de Dispersión",
  histogram: "Histograma",
  box: "Diagrama de Caja",
  heatmap: "Mapa de Calor",
};

export function ChartSuggestionCard({
  suggestion,
  index,
  isAdded,
  isLoading,
  onAdd,
  onRemove,
}: ChartSuggestionCardProps) {
  const chartType = suggestion.chart_type as ChartType;
  const IconComponent = chartIcons[chartType] || BarChart3;
  const chartId = `chart-${index}`;

  return (
    <Card
      className={cn(
        "bg-card border-border transition-all duration-200",
        isAdded && "ring-2 ring-primary",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {suggestion.title}
              </h3>
              <span className="text-xs text-muted-foreground">
                {chartLabels[chartType] || chartType}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {suggestion.insight}
        </p>
      </CardContent>
      <CardFooter className="pt-0">
        {isAdded ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-primary/10 border-primary text-primary hover:bg-primary/20"
            onClick={() => onRemove(chartId)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando datos...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Agregado al Dashboard
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-transparent"
            onClick={() => onAdd(suggestion, index)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Agregar al Dashboard
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
