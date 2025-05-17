"use client"

import { useEffect, useRef } from "react"

interface GlassCutVisualizationProps {
  width: number
  height: number
  glassType: string
  glassWidth: number
  glassHeight: number
  quantity: number
}

export default function GlassCutVisualization({
  width,
  height,
  glassType,
  glassWidth,
  glassHeight,
  quantity,
}: GlassCutVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Establecer dimensiones fijas del canvas
    canvas.width = 500
    canvas.height = 400

    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Establecer fondo blanco
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calcular la escala para ajustar el vidrio al canvas
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    const scaleX = (canvasWidth - 40) / glassWidth
    const scaleY = (canvasHeight - 80) / glassHeight
    const scale = Math.min(scaleX, scaleY)

    // Calcular dimensiones escaladas
    const scaledGlassWidth = glassWidth * scale
    const scaledGlassHeight = glassHeight * scale
    const scaledWidth = width * scale
    const scaledHeight = height * scale

    // Calcular posiciones para centrar
    const startX = (canvasWidth - scaledGlassWidth) / 2
    const startY = (canvasHeight - scaledGlassHeight) / 2

    // Dibujar el vidrio completo (borde definido)
    ctx.fillStyle = "#e8e8e8" // Gris claro para el área sin cortar
    ctx.fillRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Borde del vidrio
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 2
    ctx.strokeRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Dibujar el corte (área amarilla)
    if (width > 0 && height > 0) {
      ctx.fillStyle = "#FFD700" // Amarillo para el área de corte

      // Calcular cuántos cortes caben en el vidrio (simplificado)
      const maxCutsX = Math.floor(glassWidth / width)
      const maxCutsY = Math.floor(glassHeight / height)
      const maxCuts = maxCutsX * maxCutsY

      // Limitar la cantidad de cortes a mostrar
      const cutsToShow = Math.min(quantity, maxCuts)

      // Distribuir los cortes en filas y columnas
      let cutsPlaced = 0
      for (let row = 0; row < maxCutsY && cutsPlaced < cutsToShow; row++) {
        for (let col = 0; col < maxCutsX && cutsPlaced < cutsToShow; col++) {
          const cutX = startX + col * scaledWidth
          const cutY = startY + row * scaledHeight

          // Dibujar fondo del corte
          ctx.fillRect(cutX, cutY, scaledWidth, scaledHeight)

          // Dibujar borde del corte
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 1
          ctx.strokeRect(cutX, cutY, scaledWidth, scaledHeight)

          // Añadir líneas diagonales
          ctx.strokeStyle = "rgba(0,0,0,0.3)"
          ctx.beginPath()
          ctx.moveTo(cutX, cutY)
          ctx.lineTo(cutX + scaledWidth, cutY + scaledHeight)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(cutX + scaledWidth, cutY)
          ctx.lineTo(cutX, cutY + scaledHeight)
          ctx.stroke()

          cutsPlaced++
        }
      }
    }

    // Dibujar información del vidrio
    ctx.fillStyle = "#000000"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`${glassType} (${glassWidth}mm x ${glassHeight}mm)`, canvasWidth / 2, startY - 15)

    // Dibujar información del corte
    if (width > 0 && height > 0) {
      ctx.fillStyle = "#000000"
      ctx.font = "14px Arial"
      ctx.fillText(`Corte: ${width}mm x ${height}mm x ${quantity}`, canvasWidth / 2, startY + scaledGlassHeight + 25)
    }
  }, [width, height, glassType, glassWidth, glassHeight, quantity])

  // Renderizar un canvas con dimensiones fijas
  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-2">Visualización de Corte</h3>
      <div className="w-full bg-white rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width="500"
          height="400"
          className="border rounded mx-auto"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </div>
  )
}
