"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Info, Trash2, TrendingDown, CheckCircle, Edit, RefreshCw, ArrowLeft } from "lucide-react"
import { glassTypes } from "@/lib/glass-data"
import { procesarPedidoNuevo, obtenerInformacionHojas, reiniciarSistemaOptimizacion } from "@/lib/integration"
import type { OrderItem } from "@/lib/calculator"
import GlassCutVisualization from "./glass-cut-visualization"
import SavingsNotification from "./savings-notification"
import SystemInfo from "./system-info"
import OrderHistory from "./order-history"
import { saveOrder, type SavedOrder } from "@/lib/order-history"
import { canSellHalfSheet, calculateOptimizedPrice } from "@/lib/optimizer"

// Función para enviar datos al webhook
async function sendToWebhook(orderItems: OrderItem[], origen: string) {
  try {
    const response = await fetch("https://n8n.viprou.com/webhook/103b1e30-807f-4bba-a65f-9698f0c23d2c", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderItems, origen: origen }),
    })

    if (!response.ok) {
      console.warn(`Webhook response not OK: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.warn("Webhook error (non-critical):", error)
    return null // Don't throw, just return null
  }
}

export default function GlassOptimizationSystem() {
  const [selectedGlassType, setSelectedGlassType] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [error, setError] = useState("")
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [sheetInfo, setSheetInfo] = useState<any>(null)
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [selectedGlassTypeFilter, setSelectedGlassTypeFilter] = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [totalOptimizedPrice, setTotalOptimizedPrice] = useState(0)
  const [nonOptimizedPrice, setNonOptimizedPrice] = useState(0)
  const [optimizedGlassSummary, setOptimizedGlassSummary] = useState<
    {
      type: string
      area: number
      price: number
      totalPrice: number
      fullSheets: number
      halfSheets: number
      chargeableArea: number
      pricePerM2: number
      matchedGlassType: string | null
      wastePercentage: number
    }[]
  >([])
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showSavingsCalculator, setShowSavingsCalculator] = useState(false)
  const [lastProcessedOrder, setLastProcessedOrder] = useState<OrderItem[]>([])
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [showSystemInfo, setShowSystemInfo] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showSavingsNotification, setShowSavingsNotification] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")

  // Add error boundary and clean up any potential Web3 references
  useEffect(() => {
    // Prevent any MetaMask detection errors
    if (typeof window !== "undefined") {
      // Clear any potential Web3 listeners
      window.removeEventListener?.("ethereum", () => {})
    }
  }, [])

  // Cargar información de hojas al iniciar
  useEffect(() => {
    updateSheetInfo()
    // Send webhook but don't block if it fails
    sendToWebhook([], "Cargar_pagina_inicio").catch(() => {
      // Silently handle webhook failures
    })
  }, [])

  // Calcular precio total cuando cambian los items del pedido
  useEffect(() => {
    calculateTotalPrice()
  }, [orderItems])

  // Actualizar información de hojas
  const updateSheetInfo = () => {
    const info = obtenerInformacionHojas()
    setSheetInfo(info)

    // Seleccionar el primer tipo de vidrio si hay hojas
    if (info?.hojas?.length > 0 && !selectedGlassTypeFilter) {
      const types = [...new Set(info.hojas.map((h: any) => h.tipoVidrio))]
      if (types.length > 0) {
        setSelectedGlassTypeFilter(types[0])
      }
    }

    // Calcular precio optimizado
    setTimeout(() => calculateOptimizedPrice(), 100)
  }

  // Calcular precio sin optimización (compra directa de vidrio)
  const calculateNonOptimizedPrice = () => {
    // Agrupar items por tipo de vidrio
    const itemsByType = orderItems.reduce((acc, item) => {
      if (!acc[item.glassType]) {
        acc[item.glassType] = []
      }
      acc[item.glassType].push(item)
      return acc
    }, {})

    let total = 0

    // Calcular precio por tipo de vidrio sin optimización
    Object.entries(itemsByType).forEach(([glassTypeName, items]) => {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)
      if (!glassType) return

      // El precio ya está en precio por m²
      const pricePerM2 = glassType.price

      // Calcular área total de todos los cortes de este tipo
      items.forEach((item: any) => {
        // Cada corte requiere una hoja completa (sin optimización)
        const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)
        const itemTotal = sheetArea * pricePerM2 * item.quantity
        total += itemTotal
      })
    })

    setNonOptimizedPrice(total)
    return total
  }

  // Modificar la función calculateTotalPrice para agrupar por tipo de vidrio
  // y calcular un precio optimizado basado en precio por m²
  const calculateTotalPrice = () => {
    if (orderItems.length === 0) {
      setTotalPrice(0)
      setOptimizedGlassSummary([])
      return
    }

    // Agrupar items por tipo de vidrio
    const itemsByType = orderItems.reduce((acc, item) => {
      if (!acc[item.glassType]) {
        acc[item.glassType] = []
      }
      acc[item.glassType].push(item)
      return acc
    }, {})

    let total = 0
    const summary = []

    // Calcular precio por tipo de vidrio
    for (const [glassTypeName, items] of Object.entries(itemsByType)) {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)

      // Si no se encuentra el tipo de vidrio, continuar con el siguiente
      if (!glassType) {
        console.warn(`No se encontró el tipo de vidrio: ${glassTypeName}`)
        continue
      }

      // Asegurarnos de que estamos pasando el array completo de orderItems
      // y el tipo de vidrio correcto
      const optimizationResult = calculateOptimizedPrice(orderItems, glassType)

      total += optimizationResult.price

      summary.push({
        type: glassTypeName,
        area: optimizationResult.usedArea,
        price: glassType.price,
        totalPrice: optimizationResult.price,
        fullSheets: optimizationResult.fullSheets,
        halfSheets: optimizationResult.halfSheets,
        chargeableArea: optimizationResult.totalArea,
        pricePerM2: glassType.price,
        matchedGlassType: glassTypeName,
        wastePercentage: optimizationResult.wastePercentage,
      })
    }

    setTotalPrice(total)
    setOptimizedGlassSummary(summary)

    // Calcular también el precio sin optimización
    calculateNonOptimizedPrice()
  }

  // Función para normalizar nombres de tipos de vidrio para comparación
  const normalizeGlassType = (type: string): string => {
    if (!type) return ""
    return type.toLowerCase().replace(/\s+/g, "").replace(/[+]/g, "mas").replace(/[()]/g, "")
  }

  // Función para encontrar el tipo de vidrio y su precio por m²
  const findGlassTypeAndPrice = (tipoVidrio) => {
    if (!tipoVidrio) {
      console.warn("Tipo de vidrio no especificado")
      return { glassType: null, pricePerM2: 0, matchedGlassType: null }
    }

    console.log(`Buscando tipo de vidrio: "${tipoVidrio}"`)

    // Normalizar el tipo de vidrio para búsqueda
    const normalizeGlassType = (type) => {
      if (!type) return ""
      return type.toLowerCase().replace(/\s+/g, "").replace(/[+]/g, "mas").replace(/[()]/g, "").replace(/mm/g, "")
    }

    const normalizedSearchType = normalizeGlassType(tipoVidrio)
    console.log(`Tipo normalizado para búsqueda: "${normalizedSearchType}"`)

    // Buscar coincidencia exacta primero
    let glassType = glassTypes.find((glass) => glass.name === tipoVidrio)

    // Si no hay coincidencia exacta, buscar por normalización
    if (!glassType) {
      glassType = glassTypes.find((glass) => normalizeGlassType(glass.name) === normalizedSearchType)
    }

    // Si aún no hay coincidencia, buscar por coincidencia parcial
    if (!glassType) {
      // Imprimir todos los tipos normalizados para depuración
      console.log("Tipos de vidrio disponibles (normalizados):")
      glassTypes.forEach((glass) => {
        console.log(`- "${glass.name}" -> "${normalizeGlassType(glass.name)}"`)
      })

      // Buscar por coincidencia parcial más flexible
      glassType = glassTypes.find((glass) => {
        const normalizedGlassName = normalizeGlassType(glass.name)
        return (
          normalizedGlassName.includes(normalizedSearchType) ||
          normalizedSearchType.includes(normalizedGlassName) ||
          // Comprobar si contiene las mismas palabras clave
          (normalizedGlassName.includes("float") &&
            normalizedSearchType.includes("float") &&
            normalizedGlassName.includes("incoloro") &&
            normalizedSearchType.includes("incoloro"))
        )
      })
    }

    if (!glassType) {
      console.warn(`No se encontró tipo de vidrio para: "${tipoVidrio}"`)

      // Buscar un tipo de vidrio por defecto como fallback
      const defaultGlassType = glassTypes.find(
        (glass) => glass.name.includes("Float") && glass.name.includes("4mm") && glass.name.includes("Incoloro"),
      )

      if (defaultGlassType) {
        console.log(`Usando tipo de vidrio por defecto: "${defaultGlassType.name}"`)
        return {
          glassType: defaultGlassType,
          pricePerM2: defaultGlassType.price,
          matchedGlassType: defaultGlassType.name + " (por defecto)",
        }
      }

      return { glassType: null, pricePerM2: 0, matchedGlassType: null }
    }

    // El precio ya está en precio por m²
    const pricePerM2 = glassType.price

    console.log(`Tipo encontrado: "${glassType.name}"`)
    console.log(`Precio por m²: ${pricePerM2.toFixed(2)}`)

    return {
      glassType,
      pricePerM2,
      matchedGlassType: glassType.name,
    }
  }

  const handleProcessOrder = async () => {
    if (orderItems.length === 0) {
      setError("No hay ítems en el pedido")
      return
    }

    try {
      // Guardar el pedido actual para posible modificación posterior
      setLastProcessedOrder([...orderItems])

      // Guardar el precio sin optimización actual antes de procesar
      const currentNonOptimizedPrice = calculateNonOptimizedPrice()

      const { resultado } = procesarPedidoNuevo(orderItems)
      setOptimizationResult(resultado)

      // Actualizar información de hojas y esperar a que esté lista
      const info = obtenerInformacionHojas()
      setSheetInfo(info)

      // Esperar un poco antes de calcular precio optimizado
      setTimeout(() => {
        // Calcular el precio optimizado
        calculateTotalPrice()
        const optimizedPrice = totalPrice

        // Asegurarnos de que tenemos los valores correctos para mostrar
        console.log("Precio sin optimización:", currentNonOptimizedPrice)
        console.log("Precio optimizado calculado:", optimizedPrice)

        // Guardar el pedido en el historial
        const savedOrder = saveOrder(orderItems, currentNonOptimizedPrice, optimizedPrice)
        setCurrentOrderId(savedOrder.id)

        // Mostrar detalles del pedido
        setShowOrderDetails(true)
        setNonOptimizedPrice(currentNonOptimizedPrice)

        // Enviar webhook al mostrar el resumen
        sendToWebhook(orderItems, "Cargar_pagina_resumen")
      }, 500)
    } catch (err) {
      console.error("Error al procesar el pedido:", err)
      setError("Ocurrió un error al procesar el pedido")
    }
  }

  // Función para validar datos de contacto
  const isContactDataValid = () => {
    return customerName.trim().length > 0 && customerPhone.trim().length > 0
  }

  const handleConfirmOrder = async () => {
    // Validar que el cliente haya ingresado su información
    if (!customerName.trim() || !customerPhone.trim()) {
      setError(
        "⚠️ Para confirmar tu pedido necesitamos tu nombre completo y número de celular. Por favor, completá ambos campos.",
      )
      // Hacer scroll hacia los campos de contacto
      document.getElementById("customer-name")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    // Limpiar cualquier error previo
    setError("")

    // Enviar webhook al confirmar la orden con información del cliente
    await sendToWebhook(
      orderItems.map((item) => ({
        ...item,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      })),
      "Orden_confirmada",
    )

    // Generar el texto para WhatsApp con los detalles del pedido y datos del cliente
    const whatsappText = encodeURIComponent(
      `Hola, soy ${customerName.trim()} y quiero confirmar mi pedido de vidrios:

📱 Mi teléfono: ${customerPhone.trim()}

📋 Detalle del pedido:
${orderItems.map((item) => `- ${item.quantity}x ${item.glassType} (${item.width}mm x ${item.height}mm)`).join("\n")}

💰 Precio Viprou optimizado: $${totalPrice.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
      })}

¡Gracias!`,
    )

    // Abrir WhatsApp con el mensaje predefinido - número actualizado
    window.open(`https://wa.me/5491141422955?text=${whatsappText}`, "_blank")

    // Mostrar mensaje de éxito
    setShowSuccessMessage(true)

    // Ocultar detalles del pedido
    setShowOrderDetails(false)
  }

  // Eliminar un item del pedido
  const handleRemoveItem = (id: string) => {
    const newOrderItems = orderItems.filter((item) => item.id !== id)
    setOrderItems(newOrderItems)

    // Ocultar calculadora si no hay items
    if (newOrderItems.length === 0) {
      setShowSavingsCalculator(false)
    }
  }

  // Reiniciar el sistema de optimización
  const handleResetSystem = () => {
    if (
      confirm(
        "¿Está seguro de que desea reiniciar todo el sistema? Se perderán todas las hojas activas y el pedido actual.",
      )
    ) {
      // Reiniciar el sistema de optimización
      reiniciarSistemaOptimizacion()

      // Limpiar el pedido actual
      setOrderItems([])
      setTotalPrice(0)
      setShowSavingsCalculator(false)

      // Limpiar los campos del formulario
      setSelectedGlassType("")
      setWidth("")
      setHeight("")
      setQuantity("1")

      // Actualizar información de hojas
      updateSheetInfo()

      // Reiniciar otros estados
      setOptimizationResult(null)
      setSelectedSheetIndex(0)
      setSelectedGlassTypeFilter(null)
      setShowOrderDetails(false)
      setError("")

      // Mostrar mensaje de confirmación
      setTimeout(() => {
        setError("Sistema reiniciado correctamente. Puede comenzar un nuevo pedido.")
      }, 100)
    }
  }

  // Función para agregar un nuevo item al pedido
  const handleAddToOrder = () => {
    if (!selectedGlassType || !width || !height || !quantity) {
      setError("Por favor, complete todos los campos")
      return
    }

    const widthValue = Number.parseFloat(width)
    const heightValue = Number.parseFloat(height)
    const quantityValue = Number.parseInt(quantity) || 1

    if (isNaN(widthValue) || isNaN(heightValue)) {
      setError("Por favor, ingrese valores numéricos válidos para el ancho y el alto")
      return
    }

    const newItem: OrderItem = {
      id: Math.random().toString(36).substring(7),
      glassType: selectedGlassType,
      width: widthValue,
      height: heightValue,
      quantity: quantityValue,
    }

    setOrderItems([...orderItems, newItem])
    setError("")
    setShowSavingsCalculator(true)

    // Limpiar los campos después de agregar
    setSelectedGlassType("")
    setWidth("")
    setHeight("")
    setQuantity("1")
  }

  // Función para editar un item existente
  const handleEditItem = (id: string) => {
    const item = orderItems.find((item) => item.id === id)
    if (!item) return

    // Cargar los datos del item en el formulario
    setSelectedGlassType(item.glassType)
    setWidth(item.width.toString())
    setHeight(item.height.toString())
    setQuantity(item.quantity.toString())

    // Eliminar el item actual (será reemplazado al agregar)
    handleRemoveItem(id)

    // Mostrar mensaje informativo
    setError("")
    setTimeout(() => {
      setError("Editando item. Modifique los valores necesarios y haga clic en 'Agregar al Pedido'.")
    }, 100)

    // Hacer scroll hacia arriba para mostrar el formulario
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Función para cambiar el tipo de vidrio de un ítem existente
  const handleChangeGlassType = (id: string, newGlassType: string) => {
    const updatedItems = orderItems.map((item) => {
      if (item.id === id) {
        return { ...item, glassType: newGlassType }
      }
      return item
    })

    setOrderItems(updatedItems)

    // Recalcular precios
    setTimeout(() => {
      calculateTotalPrice()
    }, 100)
  }

  const handleEditHistoryOrder = (order: SavedOrder) => {
    // Implementar la lógica para editar un pedido del historial
    console.log("Editar pedido del historial:", order)

    // Cargar los items del pedido en el estado actual
    setOrderItems(order.items)

    // Calcular el precio total
    calculateTotalPrice()

    // Mostrar la calculadora de ahorros
    setShowSavingsCalculator(true)

    // Hacer scroll hacia arriba para mostrar el formulario
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Si se está mostrando la información del sistema
  if (showSystemInfo) {
    return (
      <SystemInfo
        sheetInfo={sheetInfo}
        onBack={() => setShowSystemInfo(false)}
        onViewOrderHistory={() => {
          setShowSystemInfo(false)
          setShowOrderHistory(true)
        }}
      />
    )
  }

  // Si se está mostrando el historial de pedidos
  if (showOrderHistory) {
    return <OrderHistory onBack={() => setShowOrderHistory(false)} onEditOrder={handleEditHistoryOrder} />
  }

  if (showSuccessMessage) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="bg-green-50 border-b border-green-100">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <CardTitle>¡Listo! Vamos a contactarte para cerrar los detalles.</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-green-800">
                Hemos recibido tu pedido correctamente. En breve nos pondremos en contacto contigo por WhatsApp para
                confirmar los detalles.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={() => {
                  // Reiniciar el sistema para un nuevo pedido
                  setShowSuccessMessage(false)
                  setOrderItems([])
                  setTotalPrice(0)
                  setShowSavingsCalculator(false)
                  setSelectedGlassType("")
                  setWidth("")
                  setHeight("")
                  setQuantity("1")
                  setCustomerName("")
                  setCustomerPhone("")
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Realizar otro pedido
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showOrderDetails && optimizationResult) {
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
            {nonOptimizedPrice > 0 && totalPrice > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-4 flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-green-600" />
                  Ahorro Viprou con Optimización
                </h3>

                <div className="space-y-3">
                  {/* Versión móvil - Apilada verticalmente */}
                  <div className="sm:hidden space-y-3">
                    <div className="bg-white p-3 rounded-md border border-gray-100 flex justify-between items-center">
                      <p className="text-sm text-gray-500">Precio sin optimización:</p>
                      <p className="font-medium line-through text-red-500">
                        ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-md border border-gray-100 flex justify-between items-center">
                      <p className="text-sm text-gray-500">Precio Viprou optimizado:</p>
                      <p className="font-medium text-green-600">
                        ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-green-100 p-3 rounded-md border border-green-200">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-green-700">Ahorro Viprou total:</p>
                        <p className="font-bold text-green-700">
                          ${(nonOptimizedPrice - totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right text-sm text-green-700 mt-1">
                        (
                        {nonOptimizedPrice > 0
                          ? (((nonOptimizedPrice - totalPrice) / nonOptimizedPrice) * 100).toFixed(1)
                          : 0}
                        %)
                      </div>
                    </div>
                  </div>

                  {/* Versión desktop - En columnas */}
                  <div className="hidden sm:grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-md border border-gray-100">
                      <p className="text-sm text-gray-500">Precio sin optimización</p>
                      <p className="font-medium line-through text-red-500">
                        ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-white p-3 rounded-md border border-gray-100">
                      <p className="text-sm text-gray-500">Precio Viprou optimizado</p>
                      <p className="font-medium text-green-600">
                        ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-green-100 p-3 rounded-md border border-green-200">
                      <p className="text-sm text-green-700">Ahorro Viprou total</p>
                      <p className="font-bold text-green-700">
                        ${(nonOptimizedPrice - totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        <span className="text-sm font-normal ml-1">
                          (
                          {nonOptimizedPrice > 0
                            ? (((nonOptimizedPrice - totalPrice) / nonOptimizedPrice) * 100).toFixed(1)
                            : 0}
                          %)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-3">Detalle de Cortes</h3>

              {/* Tabla para pantallas medianas y grandes */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Vidrio</TableHead>
                      <TableHead>Dimensiones</TableHead>
                      <TableHead>Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.glassType}</TableCell>
                        <TableCell>
                          {item.width}mm x {item.height}mm
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Tarjetas para móviles */}
              <div className="space-y-3 sm:hidden">
                {orderItems.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-md border border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm text-gray-500">Tipo:</div>
                      <div className="text-sm font-medium">{item.glassType}</div>

                      <div className="text-sm text-gray-500">Dimensiones:</div>
                      <div className="text-sm font-medium">
                        {item.width}mm x {item.height}mm
                      </div>

                      <div className="text-sm text-gray-500">Cantidad:</div>
                      <div className="text-sm font-medium">{item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Datos de Contacto</h3>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <p className="text-blue-700 text-sm mb-3 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Para procesar tu pedido necesitamos tus datos de contacto
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name" className="mb-1 block text-sm font-medium">
                      Nombre completo *
                    </Label>
                    <Input
                      id="customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value)
                        // Limpiar error cuando el usuario empiece a escribir
                        if (error.includes("nombre") || error.includes("completá")) {
                          setError("")
                        }
                      }}
                      placeholder="Ej: Juan Pérez"
                      className={`w-full ${!customerName.trim() && error ? "border-red-300 focus:border-red-500" : ""}`}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="customer-phone" className="mb-1 block text-sm font-medium">
                      Número de celular *
                    </Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                        // Limpiar error cuando el usuario empiece a escribir
                        if (error.includes("celular") || error.includes("completá")) {
                          setError("")
                        }
                      }}
                      placeholder="Ej: 11 1234-5678"
                      className={`w-full ${!customerPhone.trim() && error ? "border-red-300 focus:border-red-500" : ""}`}
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  * Campos obligatorios. Te contactaremos por WhatsApp a este número.
                </p>

                {/* Indicador de validación */}
                {isContactDataValid() && (
                  <div className="mt-3 flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Datos de contacto completos ✓
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              {/* Resumen económico destacado - Ahora a ancho completo en móvil */}
              <div className="bg-green-50 p-4 rounded-md border border-green-200 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <p className="text-base text-green-700 font-medium mb-2 sm:mb-0">Precio Viprou total a pagar:</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Botones de acción - Apilados en móvil, lado a lado en desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                  className="h-12 text-base order-2 sm:order-1"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" /> Volver y modificar
                </Button>

                <Button
                  onClick={handleConfirmOrder}
                  disabled={!isContactDataValid()}
                  className={`h-12 text-base order-1 sm:order-2 ${
                    isContactDataValid()
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  }`}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {isContactDataValid() ? "Confirmar pedido" : "Completá tus datos para continuar"}
                </Button>
              </div>

              {/* Texto informativo */}
              <p className="text-sm text-gray-500 text-center">
                Te vamos a contactar por WhatsApp para finalizar el pedido.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filtrar hojas por tipo de vidrio
  const filteredSheets =
    sheetInfo?.hojas?.filter(
      (hoja: any) => selectedGlassTypeFilter === null || hoja.tipoVidrio === selectedGlassTypeFilter,
    ) || []

  // Obtener tipos de vidrio únicos de las hojas
  const uniqueGlassTypes = sheetInfo?.hojas ? [...new Set(sheetInfo.hojas.map((h: any) => h.tipoVidrio))] : []

  // Encontrar el tipo de vidrio seleccionado para obtener sus dimensiones
  const selectedGlassTypeInfo = glassTypes.find((glass) => glass.name === selectedGlassType)
  const glassWidth = selectedGlassTypeInfo?.width || 0
  const glassHeight = selectedGlassTypeInfo?.height || 0

  // Calcular el precio del corte actual
  const calculateCurrentCutPrice = () => {
    if (!selectedGlassTypeInfo || !width || !height) return 0

    const widthValue = Number.parseFloat(width)
    const heightValue = Number.parseFloat(height)
    const quantityValue = Number.parseInt(quantity) || 1

    if (isNaN(widthValue) || isNaN(heightValue)) return 0

    // El precio ya está en precio por m²
    const pricePerM2 = selectedGlassTypeInfo.price

    // Área de una hoja completa en m²
    const sheetArea = (selectedGlassTypeInfo.width / 1000) * (selectedGlassTypeInfo.height / 1000)

    // Cobrar hoja completa por cada corte
    const totalPrice = sheetArea * pricePerM2 * quantityValue

    return totalPrice
  }

  const currentCutPrice = calculateCurrentCutPrice()

  // Calcular el ahorro y porcentaje de ahorro
  const savings = nonOptimizedPrice - totalPrice
  const savingsPercentage = nonOptimizedPrice > 0 ? (savings / nonOptimizedPrice) * 100 : 0

  // Actualizar el componente principal para mejor responsividad
  return (
    <div className="w-full">
      <Card className="shadow-lg mb-6">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4 flex flex-row justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100 border-b">
          <CardTitle className="text-lg sm:text-xl">Viprou – Cotización rápida de vidrios</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-red-50 border-red-200 text-red-600"
              onClick={handleResetSystem}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pt-6">
          {error && (
            <Alert
              variant={error.includes("modificación") || error.includes("Editando") ? "default" : "destructive"}
              className={
                error.includes("modificación") || error.includes("Editando")
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : ""
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* COLUMNA IZQUIERDA - Formulario de entrada */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 p-4 rounded-md mb-4 text-blue-700">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <Info className="h-5 w-5 mr-2" /> ¿Qué necesitás cortar?
                </h3>
                <p className="text-sm">
                  Elegí el tipo de vidrio, poné las medidas y la cantidad. Podés cargar varios cortes y después procesar
                  el pedido para optimizar al máximo los materiales.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                    1
                  </div>
                  <h3 className="font-medium">Cargá tus cortes</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="glass-type" className="mb-1 block">
                      Tipo de Vidrio
                    </Label>
                    <Select
                      value={selectedGlassType}
                      onValueChange={(value) => {
                        setSelectedGlassType(value)

                        // Solo autocompletar dimensiones si están vacías
                        if (!width && !height) {
                          // Buscar el tipo de vidrio seleccionado
                          const selectedGlass = glassTypes.find((glass) => glass.name === value)
                          if (selectedGlass) {
                            // Autocompletar con las dimensiones de la hoja solo si no hay valores
                            setWidth(selectedGlass.width.toString())
                            setHeight(selectedGlass.height.toString())
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="glass-type" className="w-full">
                        <SelectValue placeholder="Seleccione un tipo de vidrio" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[40vh]">
                        {glassTypes.map((glass) => (
                          <SelectItem key={glass.name} value={glass.name} className="py-3">
                            <div className="flex flex-col w-full">
                              <div className="font-medium text-sm leading-tight">{glass.name}</div>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-1">
                                <div className="text-xs text-gray-600">
                                  Precio Viprou: ${glass.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²
                                </div>
                                {canSellHalfSheet(glass.name) && (
                                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
                                    ½ hoja disponible
                                  </div>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1 block">Medidas (mm)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-2">Ancho</span>
                          <Input
                            id="width"
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            placeholder="Ancho"
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-2">Alto</span>
                          <Input
                            id="height"
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="Alto"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedGlassType && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedGlass = glassTypes.find((glass) => glass.name === selectedGlassType)
                          if (selectedGlass) {
                            setWidth(selectedGlass.width.toString())
                            setHeight(selectedGlass.height.toString())
                          }
                        }}
                        className="text-xs"
                      >
                        Usar dimensiones de hoja completa
                      </Button>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="quantity" className="mb-1 block">
                      Cantidad
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Cantidad"
                      min="1"
                      className="w-full"
                    />
                  </div>

                  {selectedGlassTypeInfo && width && height && (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-700">
                          Viprou optimizará mejor tu pedido si agregas más cortes al mismo tipo de vidrio.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button onClick={handleAddToOrder} className="w-full bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" /> Cargar corte
                  </Button>
                </div>
              </div>

              {/* Visualización del corte - Ahora en la columna izquierda */}
              {selectedGlassType && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium mb-2 flex items-center justify-between">
                    <span>Visualización de Corte</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Vista previa</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Viprou utilizará esta información para calcular la distribución óptima de tus cortes.
                  </p>
                  <GlassCutVisualization
                    width={Number(width) || 0}
                    height={Number(height) || 0}
                    glassType={selectedGlassType || "Laminado 3+3 Incoloro"}
                    glassWidth={glassWidth || 3600}
                    glassHeight={glassHeight || 2500}
                    quantity={Number(quantity) || 1}
                  />
                </div>
              )}

              {/* Calculadora de Ahorro y Desperdicio */}
              {showSavingsCalculator && (
                <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                    <span className="text-lg mr-2">💸</span>
                    Calculadora de Ahorro Viprou
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Precio estándar sin optimización:</span>
                      <span className="line-through text-red-500">
                        ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-bold">
                      <span className="text-gray-800">Lo que pagás usando la IA de Viprou:</span>
                      <span className="text-green-600">
                        ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {savings > 0 ? (
                      <div className="bg-white p-3 rounded-md">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">🟢</span>
                          <p className="font-medium text-green-800">
                            ¡Ahorro Viprou: ${savings.toLocaleString("es-AR", { minimumFractionDigits: 2 })}!
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          🟢 Nuestra inteligencia artificial analiza tus cortes y encuentra la forma más eficiente de
                          usar el vidrio para que gastes menos.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-md">
                        <p className="text-sm text-gray-700 mb-2">
                          🟢 Nuestra inteligencia artificial analiza tus cortes y encuentra la forma más eficiente de
                          usar el vidrio para que gastes menos.
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                          💡 Agregá más cortes y dejá que la IA trabaje por vos: cuanto más completo sea tu pedido, más
                          plata podés ahorrar.
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-sm text-blue-800">
                        🧠 La IA de Viprou está diseñada para que vos no pagues de más.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA - Revisión y procesamiento */}
            <div className="space-y-4">
              {orderItems.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                      2
                    </div>
                    <h3 className="font-medium">Revisá tus cortes</h3>
                  </div>

                  <div className="bg-gray-50 rounded-md p-3">
                    {/* Tabla unificada para todas las pantallas */}
                    <div className="relative">
                      {/* Indicador de scroll horizontal solo en pantallas pequeñas */}
                      <div
                        id={`scroll-indicator-${Math.random().toString(36).substr(2, 9)}`}
                        className="absolute top-2 right-2 z-10 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 animate-pulse transition-opacity duration-300 sm:hidden"
                        style={{ display: "flex" }}
                      >
                        <span>Desliza para ver más</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      <div
                        className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 transition-all duration-200"
                        onScroll={(e) => {
                          const indicator = e.currentTarget.parentElement?.querySelector('[id^="scroll-indicator-"]')
                          if (indicator) {
                            indicator.style.opacity = "0"
                            setTimeout(() => {
                              indicator.style.display = "none"
                            }, 300)
                          }
                        }}
                        onTouchStart={(e) => {
                          const indicator = e.currentTarget.parentElement?.querySelector('[id^="scroll-indicator-"]')
                          if (indicator) {
                            indicator.style.opacity = "0"
                            setTimeout(() => {
                              indicator.style.display = "none"
                            }, 300)
                          }
                        }}
                        style={{
                          scrollBehavior: "smooth",
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap min-w-[180px] text-xs sm:text-sm">
                                Tipo de Vidrio
                              </TableHead>
                              <TableHead className="whitespace-nowrap min-w-[100px] text-xs sm:text-sm">
                                Dimensiones
                              </TableHead>
                              <TableHead className="whitespace-nowrap min-w-[70px] text-xs sm:text-sm">Cant.</TableHead>
                              <TableHead className="whitespace-nowrap min-w-[100px] text-xs sm:text-sm">
                                Precio Viprou
                              </TableHead>
                              <TableHead className="whitespace-nowrap min-w-[120px] text-xs sm:text-sm">
                                Acciones
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderItems.map((item) => {
                              const glassType = glassTypes.find((glass) => glass.name === item.glassType)
                              const optimizedItem = optimizedGlassSummary.find(
                                (summary) => summary.type === item.glassType,
                              )

                              let price = 0
                              if (glassType && optimizedItem) {
                                const itemArea = (item.width / 1000) * (item.height / 1000) * item.quantity
                                const typeArea = optimizedGlassSummary
                                  .filter((summary) => summary.type === item.glassType)
                                  .reduce((total, summary) => total + summary.area, 0)

                                if (typeArea > 0) {
                                  price = (itemArea / typeArea) * optimizedItem.totalPrice
                                } else {
                                  const pricePerM2 = glassType.price
                                  const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)
                                  price = sheetArea * pricePerM2 * item.quantity
                                }
                              } else if (glassType) {
                                const pricePerM2 = glassType.price
                                const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)
                                price = sheetArea * pricePerM2 * item.quantity
                              }

                              return (
                                <TableRow key={item.id} className="hover:bg-white/50 transition-colors">
                                  <TableCell className="py-2 sm:py-3">
                                    <Select
                                      value={item.glassType}
                                      onValueChange={(value) => handleChangeGlassType(item.id, value)}
                                    >
                                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm min-w-[160px] sm:min-w-[180px]">
                                        <SelectValue>
                                          <span className="truncate">{item.glassType}</span>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {glassTypes.map((glass) => (
                                          <SelectItem key={glass.name} value={glass.name} className="py-2">
                                            <div className="flex flex-col w-full">
                                              <div className="font-medium text-sm leading-tight">{glass.name}</div>
                                              <div className="flex justify-between items-center mt-0.5">
                                                <div className="text-xs text-gray-600">
                                                  Viprou: $
                                                  {glass.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                                  /m²
                                                </div>
                                                {canSellHalfSheet(glass.name) && (
                                                  <div className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-center">
                                                    ½
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="py-2 sm:py-3 whitespace-nowrap font-medium text-xs sm:text-sm">
                                    <div className="flex flex-col">
                                      <span>
                                        {item.width}×{item.height}
                                      </span>
                                      <span className="text-xs text-gray-500">mm</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 sm:py-3 whitespace-nowrap text-center font-medium text-xs sm:text-sm">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="py-2 sm:py-3 whitespace-nowrap font-bold text-green-600 text-xs sm:text-sm">
                                    <div className="flex flex-col">
                                      <span>
                                        $
                                        {price.toLocaleString("es-AR", {
                                          minimumFractionDigits: 0,
                                          maximumFractionDigits: 0,
                                        })}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 sm:py-3">
                                    <div className="flex gap-1 sm:gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditItem(item.id)}
                                        className="h-7 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm text-blue-600 border-blue-300 hover:bg-blue-50 font-medium transition-all duration-200 hover:scale-105"
                                      >
                                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                        <span className="sm:hidden text-xs ml-1">Editar</span>
                                        <span className="hidden sm:inline">Editar</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-105"
                                        title="Eliminar corte"
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <p className="text-blue-700 text-sm flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Viprou ha registrado {orderItems.length} corte{orderItems.length !== 1 ? "s" : ""} en tu pedido.
                      ¿Deseas procesar la optimización ahora?
                    </p>
                  </div>
                </div>
              )}

              {orderItems.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                      3
                    </div>
                    <h3 className="font-medium">Procesá tu pedido</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Viprou procesará tu pedido para ofrecerte el mejor precio con la distribución óptima de cortes.
                  </p>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleProcessOrder}
                      className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 shadow-md"
                      disabled={orderItems.length === 0}
                    >
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Procesar cortes y calcular precio Viprou
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Barra de acciones fija en la parte inferior */}
        {orderItems.length > 0 && (
          <CardFooter className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div>
              <span className="text-gray-700 mr-2 block sm:inline">Precio Total Viprou Estimado:</span>
              <span className="font-bold text-lg text-green-700">
                ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                onClick={handleProcessOrder}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                disabled={orderItems.length === 0}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Procesar cortes y calcular precio Viprou
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Notificación de ahorro */}
      {showSavingsNotification && (
        <SavingsNotification
          originalPrice={nonOptimizedPrice}
          optimizedPrice={totalOptimizedPrice}
          onClose={() => setShowSavingsNotification(false)}
        />
      )}
    </div>
  )
}
