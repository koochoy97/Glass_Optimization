"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, CheckCircle, TrendingDown, Edit, RefreshCw } from "lucide-react"

interface OrderConfirmationDetailsProps {
  optimizationResult: any
  onBack: () => void
  originalPrice?: number
  optimizedPrice?: number
  onModifyOrder: () => void
}

export default function OrderConfirmationDetails({
  optimizationResult,
  onBack,
  originalPrice = 0,
  optimizedPrice = 0,
  onModifyOrder,
}: OrderConfirmationDetailsProps) {
  // Calcular el ahorro con valores precisos
  const savings = Math.max(0, originalPrice - optimizedPrice)
  const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0

  // Registrar valores para depuración
  console.log("Confirmación de pedido - Precio original:", originalPrice)
  console.log("Confirmación de pedido - Precio optimizado:", optimizedPrice)
  console.log("Confirmación de pedido - Ahorro calculado:", savings)

  if (!optimizationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se encontraron resultados de optimización.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-green-50 border-b border-green-100">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <CardTitle>Pedido Procesado Exitosamente</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Sección de ahorro destacada */}
          {originalPrice > 0 && optimizedPrice > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-3 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-green-600" />
                Ahorro con Optimización
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-md border border-gray-100">
                  <p className="text-sm text-gray-500">Sin optimización</p>
                  <p className="font-medium line-through text-red-500">
                    ${originalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-md border border-gray-100">
                  <p className="text-sm text-gray-500">Con optimización</p>
                  <p className="font-medium text-green-600">
                    ${optimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-green-100 p-3 rounded-md border border-green-200">
                  <p className="text-sm text-green-700">Ahorro total</p>
                  <p className="font-bold text-green-700">
                    ${savings.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-sm font-normal ml-1">({savingsPercentage.toFixed(1)}%)</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-medium text-blue-800 mb-2">Resumen de Optimización</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Desperdicio estimado</p>
                <p className="font-medium">{optimizationResult.desperdicio}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tiempo estimado de producción</p>
                <p className="font-medium">{optimizationResult.tiempoEstimado}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Detalle de Hojas</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hoja</TableHead>
                    <TableHead>Tipo de Vidrio</TableHead>
                    <TableHead>Dimensiones</TableHead>
                    <TableHead>Cortes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizationResult.hojas.map((hoja: any) => (
                    <TableRow key={hoja.id}>
                      <TableCell>{hoja.id}</TableCell>
                      <TableCell>{hoja.tipoVidrio}</TableCell>
                      <TableCell>
                        {hoja.ancho}mm x {hoja.alto}mm
                      </TableCell>
                      <TableCell>{hoja.cortes.length} corte(s)</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Sistema
              </Button>
              <Button
                variant="outline"
                onClick={onModifyOrder}
                className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              >
                <Edit className="mr-2 h-4 w-4" /> Modificar Pedido
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (
                    confirm(
                      "¿Está seguro de que desea reiniciar todo el sistema? Se perderán todas las hojas activas y el pedido actual.",
                    )
                  ) {
                    onBack()
                    // Aquí no podemos llamar directamente a handleResetSystem porque está en otro componente,
                    // pero el usuario podrá hacer clic en el botón Reiniciar después de volver
                  }
                }}
                className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reiniciar Sistema
              </Button>
            </div>
            <Button>Descargar Detalle</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
