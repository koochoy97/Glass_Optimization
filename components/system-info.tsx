"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart2, RefreshCw } from "lucide-react"

interface SystemInfoProps {
  sheetInfo: any
  onBack: () => void
  onViewOrderHistory: () => void
}

export default function SystemInfo({ sheetInfo, onBack, onViewOrderHistory }: SystemInfoProps) {
  // Calcular estadísticas
  const totalSheets = sheetInfo?.hojas?.length || 0
  const totalArea = sheetInfo?.hojas?.reduce((sum, hoja) => sum + hoja.superficieTotal / 1000000, 0) || 0
  const usedArea =
    sheetInfo?.hojas?.reduce((sum, hoja) => sum + (hoja.superficieTotal - hoja.superficieRestante) / 1000000, 0) || 0
  const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0

  // Agrupar hojas por tipo de vidrio
  const sheetsByType =
    sheetInfo?.hojas?.reduce((acc, hoja) => {
      if (!acc[hoja.tipoVidrio]) {
        acc[hoja.tipoVidrio] = 0
      }
      acc[hoja.tipoVidrio] += 1
      return acc
    }, {}) || {}

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-50 border-b border-blue-100 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center">
          <BarChart2 className="h-5 w-5 mr-2" />
          Información del Sistema
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onViewOrderHistory}>
            Ver Historial de Pedidos
          </Button>
          <Button
            variant="outline"
            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
            onClick={() => {
              if (
                confirm("¿Está seguro de que desea reiniciar todo el sistema? Se perderán todas las hojas activas.")
              ) {
                onBack()
                // El usuario podrá hacer clic en el botón Reiniciar después de volver
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reiniciar
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Estadísticas Generales</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total de hojas activas:</p>
                <p className="font-bold text-lg">{totalSheets}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Eficiencia promedio:</p>
                <p className="font-bold text-lg">{efficiency.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Superficie total:</p>
                <p className="font-bold text-lg">{totalArea.toFixed(2)} m²</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Superficie utilizada:</p>
                <p className="font-bold text-lg">{usedArea.toFixed(2)} m²</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Distribución por Tipo de Vidrio</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {Object.keys(sheetsByType).length === 0 ? (
                <p className="text-gray-500">No hay hojas activas</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(sheetsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span>{type}:</span>
                      <span className="font-medium">{count} hojas</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
