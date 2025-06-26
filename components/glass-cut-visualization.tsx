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

  // Calcular el aspect ratio dinámicamente basado en las dimensiones reales de la hoja
  const aspectRatio = glassWidth / glassHeight

  // Calcular información de cortes para mostrar fuera del canvas
  const calculateCutInfo = () => {
    if (width <= 0 || height <= 0 || quantity <= 0) return null

    const horizontalCutsPerRow = Math.floor(glassWidth / width)
    const verticalCutsPerColumn = Math.floor(glassHeight / height)
    const maxCutsPerSheet = horizontalCutsPerRow * verticalCutsPerColumn

    const horizontalCutsPerRowRotated = Math.floor(glassWidth / height)
    const verticalCutsPerColumnRotated = Math.floor(glassHeight / width)
    const maxCutsPerSheetRotated = horizontalCutsPerRowRotated * verticalCutsPerColumnRotated

    const actualMaxCuts = Math.max(maxCutsPerSheet, maxCutsPerSheetRotated)
    const cutsInThisSheet = Math.min(quantity, actualMaxCuts)
    const remainingCuts = Math.max(0, quantity - cutsInThisSheet)

    return {
      cutsInThisSheet,
      remainingCuts,
      efficiency: ((width * height * cutsInThisSheet) / (glassWidth * glassHeight)) * 100,
    }
  }

  const cutInfo = calculateCutInfo()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar el canvas con alta resolución para pantallas retina
    const devicePixelRatio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    // Calcular dimensiones del contenedor
    const containerWidth = rect.width
    const containerHeight = rect.height

    // Establecer el tamaño real del canvas
    canvas.width = containerWidth * devicePixelRatio
    canvas.height = containerHeight * devicePixelRatio

    // Escalar el contexto para pantallas de alta densidad
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // Limpiar el canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight)

    // Establecer fondo blanco
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, containerWidth, containerHeight)

    // Calcular la escala para ajustar el vidrio al canvas con margen más generoso
    const margin = Math.min(containerWidth, containerHeight) * 0.08 // 8% de margen adaptativo (aumentado)
    const availableWidth = containerWidth - margin * 2
    const availableHeight = containerHeight - margin * 2

    // Calcular escala manteniendo proporciones
    const scaleX = availableWidth / glassWidth
    const scaleY = availableHeight / glassHeight
    const scale = Math.min(scaleX, scaleY)

    // Calcular dimensiones escaladas
    const scaledGlassWidth = glassWidth * scale
    const scaledGlassHeight = glassHeight * scale
    const scaledWidth = width * scale
    const scaledHeight = height * scale

    // Calcular posiciones para centrar perfectamente
    const startX = (containerWidth - scaledGlassWidth) / 2
    const startY = (containerHeight - scaledGlassHeight) / 2

    // Dibujar el vidrio completo (fondo)
    ctx.fillStyle = "#f0f8ff" // Azul muy claro para el área sin cortar
    ctx.fillRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Borde del vidrio con grosor adaptativo
    ctx.strokeStyle = "#1f2937"
    ctx.lineWidth = Math.max(1, scale * 2)
    ctx.strokeRect(startX, startY, scaledGlassWidth, scaledGlassHeight)

    // Dibujar grid de referencia sutil
    ctx.strokeStyle = "rgba(156, 163, 175, 0.3)"
    ctx.lineWidth = 0.5
    const gridSize = Math.max(50, Math.min(scaledGlassWidth, scaledGlassHeight) / 10)

    // Líneas verticales del grid
    for (let x = startX + gridSize; x < startX + scaledGlassWidth; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, startY + scaledGlassHeight)
      ctx.stroke()
    }

    // Líneas horizontales del grid
    for (let y = startY + gridSize; y < startY + scaledGlassHeight; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(startX + scaledGlassWidth, y)
      ctx.stroke()
    }

    // Dibujar los cortes optimizados
    if (width > 0 && height > 0 && quantity > 0) {
      const cuts = []
      const cutMargin = Math.max(1, scale * 2) // Margen entre cortes escalado

      // Calcular orientación óptima
      const horizontalCutsPerRow = Math.floor(glassWidth / width)
      const verticalCutsPerColumn = Math.floor(glassHeight / height)
      const horizontalEfficiency =
        (horizontalCutsPerRow * verticalCutsPerColumn * width * height) / (glassWidth * glassHeight)

      // Probar rotación
      const horizontalCutsPerRowRotated = Math.floor(glassWidth / height)
      const verticalCutsPerColumnRotated = Math.floor(glassHeight / width)
      const rotatedEfficiency =
        (horizontalCutsPerRowRotated * verticalCutsPerColumnRotated * width * height) / (glassWidth * glassHeight)

      // Decidir orientación
      const shouldRotate = rotatedEfficiency > horizontalEfficiency
      const cutsPerRow = shouldRotate ? horizontalCutsPerRowRotated : horizontalCutsPerRow
      const actualWidth = shouldRotate ? height : width
      const actualHeight = shouldRotate ? width : height
      const scaledActualWidth = actualWidth * scale
      const scaledActualHeight = actualHeight * scale

      // Generar posiciones de cortes
      let cutCount = 0
      const maxCutsPerSheet = cutsPerRow * Math.floor(glassHeight / actualHeight)

      for (let row = 0; row < Math.ceil(Math.min(quantity, maxCutsPerSheet) / cutsPerRow); row++) {
        for (let col = 0; col < cutsPerRow && cutCount < quantity && cutCount < maxCutsPerSheet; col++) {
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

      // Dibujar todos los cortes
      cuts.forEach((cut, index) => {
        // Gradiente de colores para distinguir cortes
        const hue = (index * 137.5) % 360 // Golden angle para distribución uniforme
        ctx.fillStyle = `hsla(${hue}, 70%, 85%, 0.8)`
        ctx.fillRect(cut.x, cut.y, cut.width, cut.height)

        // Borde del corte
        ctx.strokeStyle = `hsla(${hue}, 70%, 45%, 1)`
        ctx.lineWidth = Math.max(1, scale * 1.5)
        ctx.strokeRect(cut.x, cut.y, cut.width, cut.height)

        // Patrón diagonal sutil
        ctx.strokeStyle = `hsla(${hue}, 70%, 35%, 0.4)`
        ctx.lineWidth = Math.max(0.5, scale * 0.8)
        ctx.beginPath()
        ctx.moveTo(cut.x, cut.y)
        ctx.lineTo(cut.x + cut.width, cut.y + cut.height)
        ctx.moveTo(cut.x + cut.width, cut.y)
        ctx.lineTo(cut.x, cut.y + cut.height)
        ctx.stroke()

        // Número del corte con fondo
        const fontSize = Math.max(10, Math.min(14, scaledActualWidth / 8, scaledActualHeight / 4))
        ctx.font = `bold ${fontSize}px Arial`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const text = `${cut.id}${cut.rotated ? "R" : ""}`
        const textX = cut.x + cut.width / 2
        const textY = cut.y + cut.height / 2

        // Fondo del texto
        const textMetrics = ctx.measureText(text)
        const textWidth = textMetrics.width
        const textHeight = fontSize

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.fillRect(textX - textWidth / 2 - 2, textY - textHeight / 2 - 1, textWidth + 4, textHeight + 2)

        // Texto
        ctx.fillStyle = "#1f2937"
        ctx.fillText(text, textX, textY)
      })
    }
  }, [width, height, glassType, glassWidth, glassHeight, quantity, aspectRatio])

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden border border-gray-200">
      {/* Títulos separados claramente */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{glassType}</h3>
        <p className="text-sm text-gray-600 text-center">
          Hoja completa: {glassWidth}mm × {glassHeight}mm
        </p>
        {width > 0 && height > 0 && (
          <p className="text-sm text-gray-700 text-center mt-1">
            Corte solicitado: {width}mm × {height}mm × {quantity} unidad{quantity > 1 ? "es" : ""}
          </p>
        )}
      </div>

      {/* Contenedor principal con aspect-ratio dinámico */}
      <div
        className="w-full relative bg-gray-50"
        style={{
          aspectRatio: aspectRatio.toString(),
          minHeight: "200px",
          maxHeight: "400px",
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Información de cortes adicionales - Fuera del canvas */}
      {cutInfo && cutInfo.remainingCuts > 0 && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <p className="text-center text-red-700 font-medium text-sm">
            ⚠️ + {cutInfo.remainingCuts} corte{cutInfo.remainingCuts > 1 ? "s" : ""} en hoja
            {cutInfo.remainingCuts > 1 ? "s" : ""} adicional{cutInfo.remainingCuts > 1 ? "es" : ""}
          </p>
        </div>
      )}

      {/* Información de eficiencia - Separada del canvas */}
      {cutInfo && (
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <p className="text-center text-blue-700 text-sm">
            Eficiencia: {cutInfo.efficiency.toFixed(1)}% - {cutInfo.cutsInThisSheet} corte
            {cutInfo.cutsInThisSheet > 1 ? "s" : ""} en esta hoja
          </p>
        </div>
      )}

      {/* Panel de información separado */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <span className="text-blue-600 mr-2">📊</span>
          Análisis de Aprovechamiento
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/60 p-3 rounded-md border border-blue-200">
            <div className="text-gray-600 mb-1">Área del corte</div>
            <div className="font-bold text-gray-900">{((width * height * quantity) / 1000000).toFixed(3)} m²</div>
          </div>

          <div className="bg-white/60 p-3 rounded-md border border-blue-200">
            <div className="text-gray-600 mb-1">Área de la hoja</div>
            <div className="font-bold text-gray-900">{((glassWidth * glassHeight) / 1000000).toFixed(3)} m²</div>
          </div>

          {width > 0 && height > 0 && quantity > 0 && (
            <div className="bg-white/60 p-3 rounded-md border border-green-200">
              <div className="text-gray-600 mb-1">Aprovechamiento</div>
              <div className="font-bold text-green-700">
                {Math.min(100, ((width * height * quantity) / (glassWidth * glassHeight)) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Información adicional sobre la optimización */}
        {width > 0 && height > 0 && quantity > 0 && (
          <div className="mt-3 p-3 bg-white/40 rounded-md border border-blue-100">
            <div className="text-xs text-gray-700">
              <div className="flex justify-between items-center mb-1">
                <span>Cortes que caben en esta hoja:</span>
                <span className="font-semibold">
                  {Math.min(quantity, Math.floor(glassWidth / width) * Math.floor(glassHeight / height))}
                </span>
              </div>
              {quantity > Math.floor(glassWidth / width) * Math.floor(glassHeight / height) && (
                <div className="text-orange-600 text-xs mt-1">
                  ⚠️ Se necesitarán hojas adicionales para completar el pedido
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
