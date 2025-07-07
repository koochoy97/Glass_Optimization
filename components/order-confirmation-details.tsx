"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, CheckCircle, TrendingDown } from "lucide-react"

interface OrderConfirmationDetailsProps {
  optimizationResult: any
  onBack: () => void
  originalPrice?: number
  optimizedPrice?: number
  onModifyOrder: () => void
  onCompletePurchase?: () => void
}

export default function OrderConfirmationDetails({
  optimizationResult,
  onBack,
  originalPrice = 0,
  optimizedPrice = 0,
  onModifyOrder,
  onCompletePurchase,
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
      <CardHeader className="bg-blue-50 border-b border-blue-100">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle>Revisión del Pedido</CardTitle>
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

          <div>
            <h3 className="font-medium mb-3">Detalle de Cortes</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Vidrio</TableHead>
                    <TableHead>Dimensiones</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Optimizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimizationResult.hojas.flatMap((hoja) =>
                    hoja.cortes.map((corte, index) => {
                      // Calcular el precio optimizado para este corte
                      const corteArea = (corte.ancho / 1000) * (corte.alto / 1000) * corte.cantidad
                      const hojaArea = (hoja.ancho / 1000) * (hoja.alto / 1000)
                      const precioProporcional = optimizedPrice * (corteArea / hojaArea)

                      return (
                        <TableRow key={`${hoja.id}-${index}`}>
                          <TableCell>{hoja.tipoVidrio}</TableCell>
                          <TableCell>
                            {corte.ancho}mm x {corte.alto}mm
                          </TableCell>
                          <TableCell>{corte.cantidad}</TableCell>
                          <TableCell>
                            $
                            {precioProporcional.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    }),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={onModifyOrder}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver y modificar
              </Button>
            </div>
            <div className="flex gap-3">
              <Button onClick={onCompletePurchase} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" /> Aceptar y confirmar pedido
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
