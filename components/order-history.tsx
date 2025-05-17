"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, ArrowLeft, Clock, RefreshCw } from "lucide-react"
import { getOrderHistory, type SavedOrder } from "@/lib/order-history"

interface OrderHistoryProps {
  onBack: () => void
  onEditOrder: (order: SavedOrder) => void
}

export default function OrderHistory({ onBack, onEditOrder }: OrderHistoryProps) {
  const [orders, setOrders] = useState<SavedOrder[]>(getOrderHistory())

  // Función para obtener el color del badge según el estado
  const getStatusBadge = (status: SavedOrder["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "processed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Procesado
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelado
          </Badge>
        )
    }
  }

  // Función para formatear la fecha
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-50 border-b border-blue-100 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Historial de Pedidos
        </CardTitle>
        <div className="flex gap-2">
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
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No hay pedidos en el historial</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Precio Original</TableHead>
                  <TableHead>Precio Optimizado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{formatDate(order.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>${order.totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>${order.optimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => onEditOrder(order)}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
