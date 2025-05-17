"use client"

interface SimpleGlassVisualizationProps {
  width: number
  height: number
  glassType: string
  glassWidth: number
  glassHeight: number
  quantity: number
}

export default function SimpleGlassVisualization({
  width,
  height,
  glassType,
  glassWidth,
  glassHeight,
  quantity,
}: SimpleGlassVisualizationProps) {
  // Calcular la proporción para mantener la relación de aspecto
  const aspectRatio = glassHeight / glassWidth
  const containerHeight = 300 // altura fija del contenedor

  // Determinar si hay un corte válido
  const hasValidCut = width > 0 && height > 0

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium mb-2">Visualización de Corte</h3>

      <div className="w-full bg-white rounded-lg overflow-hidden p-4 border">
        <div className="text-center font-bold mb-2">
          {glassType} ({glassWidth}mm x {glassHeight}mm)
        </div>

        <div
          className="mx-auto border-2 border-gray-800 bg-gray-200 relative"
          style={{
            width: "100%",
            maxWidth: "400px",
            height: `${containerHeight}px`,
          }}
        >
          {hasValidCut && (
            <div
              className="absolute bg-yellow-400 border border-black"
              style={{
                width: `${(width / glassWidth) * 100}%`,
                height: `${(height / glassHeight) * 100}%`,
                left: "10%",
                top: "10%",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-t border-black absolute w-full" style={{ transform: "rotate(45deg)" }}></div>
                <div className="border-t border-black absolute w-full" style={{ transform: "rotate(-45deg)" }}></div>
              </div>
            </div>
          )}
        </div>

        {hasValidCut && (
          <div className="text-center mt-2">
            Corte: {width}mm x {height}mm x {quantity}
          </div>
        )}
      </div>
    </div>
  )
}
