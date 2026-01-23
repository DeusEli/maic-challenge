"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/file-upload";
import { ProcessingState } from "@/components/processing-state";
import { AnalysisResult } from "@/components/analysis-result";
import { Sparkles, Shield, Zap, AlertCircle } from "lucide-react";
import { uploadFile, type UploadResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";

type AppState = "idle" | "processing" | "complete" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setAppState("processing");
    setErrorMessage(null);

    try {
      const response = await uploadFile(file);
      setAnalysisData(response);
      setAppState("complete");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al procesar el archivo";
      setErrorMessage(message);
      setAppState("error");
    }
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setAnalysisData(null);
    setErrorMessage(null);
    setAppState("idle");
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">
              AI Data Analyzer
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        {appState === "idle" && (
          <div className="max-w-3xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm mb-4">
                <Sparkles className="w-4 h-4" />
                Powered by AI
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                Analiza tus datos con
                <span className="text-primary"> inteligencia artificial</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
                Sube tu archivo CSV o XLSX y obtén insights instantáneos.
                Nuestra IA analiza estructuras de datos, detecta patrones y
                genera visualizaciones en segundos.
              </p>
            </div>

            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              isProcessing={appState === "processing"}
            />

            {/* Best Practices Section */}
            <div className="mt-8 p-6 rounded-lg border border-border bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">
                    💡 Consejos para mejores resultados
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong className="text-foreground">
                          Formato limpio:
                        </strong>{" "}
                        Usa archivos CSV o XLSX con columnas bien definidas y
                        encabezados claros
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong className="text-foreground">
                          Datos suficientes:
                        </strong>{" "}
                        Al menos 50-100 filas para análisis significativos
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong className="text-foreground">
                          Sin celdas vacías excesivas:
                        </strong>{" "}
                        Completa o elimina columnas con muchos valores faltantes
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong className="text-foreground">
                          Tipos de datos consistentes:
                        </strong>{" "}
                        Evita mezclar números con texto en la misma columna
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>
                        <strong className="text-foreground">
                          Nombres descriptivos:
                        </strong>{" "}
                        Usa nombres de columnas que describan claramente su
                        contenido
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Análisis Rápido
                </h3>
                <p className="text-sm text-muted-foreground">
                  Resultados en segundos gracias a nuestra IA optimizada
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  100% Seguro
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tus datos nunca se almacenan ni comparten
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  Insights Inteligentes
                </h3>
                <p className="text-sm text-muted-foreground">
                  Recomendaciones basadas en patrones detectados
                </p>
              </div>
            </div>
          </div>
        )}

        {appState === "processing" && selectedFile && (
          <ProcessingState fileName={selectedFile.name} />
        )}

        {appState === "error" && (
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Error al procesar el archivo
              </h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage || "Ha ocurrido un error inesperado"}
              </p>
              <Button onClick={handleReset} className="gap-2">
                Intentar de nuevo
              </Button>
            </div>
          </div>
        )}

        {appState === "complete" && selectedFile && analysisData && (
          <AnalysisResult
            fileName={selectedFile.name}
            analysisData={analysisData}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
