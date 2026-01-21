"use client"

import { useEffect, useState } from "react"
import { Brain, Sparkles, FileSearch, BarChartBig as ChartBar, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const processingSteps = [
  { icon: FileSearch, message: "Leyendo archivo...", duration: 2000 },
  { icon: Brain, message: "Analizando estructura de datos...", duration: 3000 },
  { icon: Sparkles, message: "Procesando con IA...", duration: 4000 },
  { icon: ChartBar, message: "Generando insights...", duration: 2000 },
]

interface ProcessingStateProps {
  fileName: string
}

export function ProcessingState({ fileName }: ProcessingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepDuration = processingSteps[currentStep]?.duration || 2000
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const stepProgress = ((currentStep * 100) / processingSteps.length) 
        const stepIncrement = (100 / processingSteps.length) / (stepDuration / 100)
        const newProgress = Math.min(prev + stepIncrement, ((currentStep + 1) * 100) / processingSteps.length)
        return newProgress
      })
    }, 100)

    const stepTimer = setTimeout(() => {
      if (currentStep < processingSteps.length - 1) {
        setCurrentStep((prev) => prev + 1)
      }
    }, stepDuration)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(stepTimer)
    }
  }, [currentStep])

  const CurrentIcon = processingSteps[currentStep]?.icon || Brain

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
        {/* Animated Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping" />
            
            {/* Rotating ring */}
            <div className="absolute inset-0 w-24 h-24">
              <svg className="w-full h-full animate-spin" style={{ animationDuration: '3s' }}>
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="80 200"
                  className="text-primary/40"
                />
              </svg>
            </div>
            
            {/* Center icon */}
            <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Analizando tus datos
          </h3>
          <p className="text-muted-foreground text-sm mb-1">
            {fileName}
          </p>
          <p className="text-primary font-medium animate-pulse">
            {processingSteps[currentStep]?.message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% completado
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {processingSteps.map((step, index) => {
            const StepIcon = step.icon
            return (
              <div
                key={index}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  index < currentStep 
                    ? "bg-primary text-primary-foreground" 
                    : index === currentStep 
                      ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-card" 
                      : "bg-secondary text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="relative mt-4">
        <div className="absolute left-1/4 -top-8 w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute left-1/2 -top-12 w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }} />
        <div className="absolute left-3/4 -top-6 w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '1.8s' }} />
      </div>
    </div>
  )
}
