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
    ctx.fillStyle = "#e8f4f8" // Azul muy claro para el área sin cortar
    ctx.fillRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Borde del vidrio
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 2
    ctx.strokeRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Dibujar los cortes optimizados
    if (width > 0 && height > 0 && quantity > 0) {
      // Algoritmo de optimización de cortes (guillotina)
      // Primero intentamos colocar los cortes en horizontal y luego en vertical
      const cuts = []
      const remainingQuantity = quantity

      // Margen entre cortes (para representar el espacio de corte)
      const cutMargin = 2 * scale // 2mm de margen para el corte

      // Calcular cuántos cortes caben en cada fila y columna
      const horizontalCutsPerRow = Math.floor(glassWidth / width)
      const verticalCutsPerColumn = Math.floor(glassHeight / height)

      // Verificar si es mejor rotar los cortes (optimización)
      const horizontalEfficiency = (horizontalCutsPerRow * width * height) / (glassWidth * glassHeight)

      // Intentar con rotación (intercambiar ancho y alto)
      const horizontalCutsPerRowRotated = Math.floor(glassWidth / height)
      const verticalCutsPerColumnRotated = Math.floor(glassHeight / width)
      const rotatedEfficiency = (horizontalCutsPerRowRotated * width * height) / (glassWidth * glassHeight)

      // Decidir si rotar o no basado en la eficiencia
      const shouldRotate = rotatedEfficiency > horizontalEfficiency

      // Usar los valores optimizados
      const cutsPerRow = shouldRotate ? horizontalCutsPerRowRotated : horizontalCutsPerRow
      const cutsPerColumn = shouldRotate ? verticalCutsPerColumnRotated : verticalCutsPerColumn
      const actualWidth = shouldRotate ? height : width
      const actualHeight = shouldRotate ? width : height
      const scaledActualWidth = actualWidth * scale
      const scaledActualHeight = actualHeight * scale

      // Calcular cuántas filas completas podemos llenar
      const fullRows = Math.floor(remainingQuantity / cutsPerRow)
      const remainingInLastRow = remainingQuantity % cutsPerRow

      // Generar las posiciones de los cortes
      let cutCount = 0

      // Dibujar filas completas
      for (let row = 0; row < fullRows && cutCount < quantity; row++) {
        for (let col = 0; col < cutsPerRow && cutCount < quantity; col++) {
          cuts.push({
            x: startX + col * (scaledActualWidth + cutMargin),
            y: startY + row * (scaledActualHeight + cutMargin),
            width: scaledActualWidth,
            height: scaledActualHeight,
            rotated: shouldRotate,
            id: cutCount + 1,
          })
          cutCount++
        }
      }

      // Dibujar la última fila parcial
      if (remainingInLastRow > 0) {
        for (let col = 0; col < remainingInLastRow && cutCount < quantity; col++) {
          cuts.push({
            x: startX + col * (scaledActualWidth + cutMargin),
            y: startY + fullRows * (scaledActualHeight + cutMargin),
            width: scaledActualWidth,
            height: scaledActualHeight,
            rotated: shouldRotate,
            id: cutCount + 1,
          })
          cutCount++
        }
      }

      // Si aún quedan cortes por colocar y hay espacio en otra hoja
      if (cutCount < quantity) {
        // Indicar que se necesitarían más hojas
        ctx.fillStyle = "#333333"
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(
          `+ ${quantity - cutCount} cortes en hoja(s) adicional(es)`,
          canvasWidth / 2,
          startY + scaledGlassHeight + 40,
        )
      }

      // Dibujar todos los cortes
      cuts.forEach((cut) => {
        // Dibujar fondo del corte
        ctx.fillStyle = "rgba(255, 215, 0, 0.7)" // Amarillo semi-transparente
        ctx.fillRect(cut.x, cut.y, cut.width, cut.height)

        // Dibujar borde del corte
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1
        ctx.strokeRect(cut.x, cut.y, cut.width, cut.height)

        // Añadir líneas diagonales
        ctx.strokeStyle = "rgba(0,0,0,0.3)"
        ctx.beginPath()
        ctx.moveTo(cut.x, cut.y)
        ctx.lineTo(cut.x + cut.width, cut.y + cut.height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cut.x + cut.width, cut.y)
        ctx.lineTo(cut.x, cut.y + cut.height)
        ctx.stroke()

        // Añadir número e indicador de rotación
        ctx.fillStyle = "#000000"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${cut.id}${cut.rotated ? "R" : ""}`, cut.x + cut.width / 2, cut.y + cut.height / 2)
      })

      // Mostrar información de optimización
      const totalArea = (glassWidth * glassHeight) / 1000000 // en m²
      const usedArea = (quantity * width * height) / 1000000 // en m²
      const efficiency = (usedArea / totalArea) * 100

      ctx.fillStyle = "#333333"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(
        `Eficiencia: ${efficiency.toFixed(1)}% - ${cuts.length} cortes en esta hoja`,
        canvasWidth / 2,
        startY + scaledGlassHeight + 60,
      )
    }

    // Dibujar información del vidrio
    ctx.fillStyle = "#000000"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`${glassType}`, canvasWidth / 2, startY - 25)
    ctx.font = "12px Arial"
    ctx.fillText(`Hoja completa: ${glassWidth}mm x ${glassHeight}mm`, canvasWidth / 2, startY - 8)

    // Dibujar información del corte
    if (width > 0 && height > 0) {
      ctx.fillStyle = "#000000"
      ctx.font = "14px Arial"
      ctx.fillText(`Corte: ${width}mm x ${height}mm x ${quantity}`, canvasWidth / 2, startY + scaledGlassHeight + 25)
    }
  }, [width, height, glassType, glassWidth, glassHeight, quantity])

  // Renderizar un canvas con dimensiones fijas
  return (
    <div className="w-full bg-white rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width="500"
        height="400"
        className="border rounded mx-auto"
        style={{ maxWidth: "100%" }}
      />
    </div>
  )
}
