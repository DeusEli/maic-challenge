"use client"

import React from "react"

import { useState, useCallback, useRef } from "react"
import { Upload, FileText, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isProcessing: boolean
  acceptedTypes?: string[]
}

export function FileUpload({ 
  onFileSelect, 
  isProcessing, 
  acceptedTypes = [".csv", ".xlsx"] 
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 md:p-12 transition-all duration-300 cursor-pointer group",
          "hover:border-primary/60 hover:bg-primary/5",
          isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-border",
          isProcessing && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {selectedFile ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-medium">{selectedFile.name}</p>
                <p className="text-muted-foreground text-sm">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Eliminar archivo
                </Button>
              )}
            </>
          ) : (
            <>
              <div className={cn(
                "w-16 h-16 rounded-full bg-secondary flex items-center justify-center transition-all duration-300",
                "group-hover:bg-primary/20 group-hover:scale-110",
                isDragging && "bg-primary/20 scale-110"
              )}>
                <Upload className={cn(
                  "w-8 h-8 text-muted-foreground transition-colors",
                  "group-hover:text-primary",
                  isDragging && "text-primary"
                )} />
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-medium text-lg">
                  Arrastra y suelta tu archivo aquí
                </p>
                <p className="text-muted-foreground text-sm">
                  o haz clic para seleccionar un archivo
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {acceptedTypes.map((type) => (
                  <span 
                    key={type} 
                    className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Animated border effect on drag */}
        {isDragging && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  )
}
