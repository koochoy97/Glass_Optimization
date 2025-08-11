"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Info, TrendingDown, CheckCircle, RefreshCw, ArrowLeft, Edit, Trash2 } from "lucide-react"
import { glassTypes } from "@/lib/glass-data"
import { procesarPedidoNuevo, obtenerInformacionHojas, reiniciarSistemaOptimizacion } from "@/lib/integration"
import type { OrderItem } from "@/lib/calculator"
import GlassCutVisualization from "./glass-cut-visualization"
import SystemInfo from "./system-info"
import OrderHistory from "./order-history"
import { saveOrder, type SavedOrder } from "@/lib/order-history"
import { canSellHalfSheet, calculateOptimizedPrice } from "@/lib/optimizer"

export default function GlassOptimizationSystem() {
  // Estados principales
  const [selectedGlassType, setSelectedGlassType] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [error, setError] = useState("")
  const [measurementUnit, setMeasurementUnit] = useState<"mm" | "cm">("mm")

  // Estados de precios
  const [totalPrice, setTotalPrice] = useState(0)
  const [nonOptimizedPrice, setNonOptimizedPrice] = useState(0)
  const [optimizedGlassSummary, setOptimizedGlassSummary] = useState<any[]>([])

  // Estados de UI
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showSavingsCalculator, setShowSavingsCalculator] = useState(false)
  const [showSystemInfo, setShowSystemInfo] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Estados de validación
  const [widthError, setWidthError] = useState("")
  const [heightError, setHeightError] = useState("")
  const [widthFocused, setWidthFocused] = useState(false)
  const [heightFocused, setHeightFocused] = useState(false)

  // Estados de cliente
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerComments, setCustomerComments] = useState("")

  // Estados de sistema
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [sheetInfo, setSheetInfo] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderProcessedTime, setOrderProcessedTime] = useState<number | null>(null)
  const [hasTrackedAbandonment, setHasTrackedAbandonment] = useState(false)

  // Función para verificar si un vidrio es Float Incoloro 2.2mm
  const isFloat22mm = (glassTypeName: string): boolean => {
    return glassTypeName === "Float Incoloro 2.2mm"
  }

  // Función para verificar si las dimensiones corresponden a hoja completa
  const isFullSheetDimensions = (width: number, height: number, glassType: string): boolean => {
    const glass = glassTypes.find((g) => g.name === glassType)
    if (!glass) return false
    return (width === glass.width && height === glass.height) || (width === glass.height && height === glass.width)
  }

  // Función para organizar los tipos de vidrio
  const organizedGlassTypes = useMemo(() => {
    const isIncoloro = (glassName: string) => glassName.toLowerCase().includes("incoloro")

    const matchesSearch = (glassName: string) => {
      if (!searchTerm.trim()) return true
      const searchLower = searchTerm.toLowerCase().trim()
      const nameLower = glassName.toLowerCase()
      return (
        nameLower.includes(searchLower) ||
        nameLower.replace(/\s+/g, "").includes(searchLower.replace(/\s+/g, "")) ||
        (searchLower.includes("mm") && nameLower.includes(searchLower))
      )
    }

    const incoloroProducts = glassTypes.filter((glass) => isIncoloro(glass.name) && matchesSearch(glass.name))
    const nonIncoloroProducts = glassTypes.filter((glass) => !isIncoloro(glass.name) && matchesSearch(glass.name))

    const incoloroHalfSheetProducts = incoloroProducts.filter(
      (glass) => canSellHalfSheet(glass.name) && !isFloat22mm(glass.name),
    )
    const incoloroFullSheetOnlyProducts = incoloroProducts.filter(
      (glass) => !canSellHalfSheet(glass.name) || isFloat22mm(glass.name),
    )

    const allFullSheetOnlyProducts = [...nonIncoloroProducts, ...incoloroFullSheetOnlyProducts].sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    return {
      incoloroHalfSheetProducts: incoloroHalfSheetProducts.sort((a, b) => (a.thickness || 0) - (b.thickness || 0)),
      nonIncoloroProducts: allFullSheetOnlyProducts,
      hasResults: incoloroHalfSheetProducts.length > 0 || allFullSheetOnlyProducts.length > 0,
    }
  }, [searchTerm])

  // Función para validar campos numéricos
  const validateNumericField = (value: string, fieldName: string) => {
    if (!value.trim()) return "Ingresá una medida válida"

    const numValue = Number.parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) return "Ingresá una medida válida"

    if (fieldName === "ancho") {
      const maxWidth = measurementUnit === "mm" ? 3600 : 360
      if (numValue > maxWidth) return `El ancho máximo es ${maxWidth}${measurementUnit}`
    } else if (fieldName === "alto") {
      const maxHeight = measurementUnit === "mm" ? 2500 : 250
      if (numValue > maxHeight) return `El alto máximo es ${maxHeight}${measurementUnit}`
    }

    return ""
  }

  // Función para obtener clases de estilo
  const getFieldClasses = (value: string, error: string, focused: boolean) => {
    const baseClasses = "w-full transition-colors duration-200"
    if (error && value.trim()) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`
    }
    if (value.trim() && !error) {
      return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500`
    }
    return baseClasses
  }

  // Función para generar opciones de medidas (solo para cm)
  const generateMeasurementOptions = (dimension: "width" | "height") => {
    const maxWidth = 360 // máximo ancho en cm
    const maxHeight = 250 // máximo alto en cm
    const max = dimension === "width" ? maxWidth : maxHeight
    const options = []

    // Generar TODOS los números consecutivos desde 1 hasta el máximo
    // Esto incluye: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, etc.
    for (let i = 1; i <= max; i++) {
      options.push({
        value: i.toString(),
        label: `${i}cm`,
      })
    }

    return options
  }

  // Calcular precio sin optimización
  const calculateNonOptimizedPrice = () => {
    const itemsByType = orderItems.reduce(
      (acc, item) => {
        if (!acc[item.glassType]) acc[item.glassType] = []
        acc[item.glassType].push(item)
        return acc
      },
      {} as Record<string, OrderItem[]>,
    )

    let total = 0

    Object.entries(itemsByType).forEach(([glassTypeName, items]) => {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)
      if (!glassType) return

      const pricePerM2 = glassType.price
      const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)

      let totalCutArea = 0
      items.forEach((item) => {
        const cutArea = (item.width / 1000) * (item.height / 1000)
        totalCutArea += cutArea * item.quantity
      })

      let wasteMultiplier = 1.25
      const uniqueCuts = items.length
      if (uniqueCuts > 3) wasteMultiplier += 0.05 * (uniqueCuts - 3)

      const smallCutsCount = items.filter((item) => {
        const cutArea = (item.width / 1000) * (item.height / 1000)
        return cutArea < sheetArea * 0.25
      }).length

      if (smallCutsCount > 0) wasteMultiplier += 0.03 * smallCutsCount

      const oddDimensionCuts = items.filter((item) => {
        return item.width % 100 !== 0 || item.height % 100 !== 0
      }).length

      if (oddDimensionCuts > 0) wasteMultiplier += 0.02 * oddDimensionCuts
      wasteMultiplier = Math.min(wasteMultiplier, 1.5)

      const inefficientArea = totalCutArea * wasteMultiplier
      const sheetsNeeded = Math.ceil(inefficientArea / sheetArea)
      const typeTotal = sheetsNeeded * sheetArea * pricePerM2
      total += typeTotal
    })

    setNonOptimizedPrice(total)
    return total
  }

  // Calcular precio total
  const calculateTotalPrice = () => {
    if (orderItems.length === 0) {
      setTotalPrice(0)
      setOptimizedGlassSummary([])
      return
    }

    const itemsByType = orderItems.reduce(
      (acc, item) => {
        if (!acc[item.glassType]) acc[item.glassType] = []
        acc[item.glassType].push(item)
        return acc
      },
      {} as Record<string, OrderItem[]>,
    )

    let total = 0
    const summary = []

    for (const [glassTypeName, items] of Object.entries(itemsByType)) {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)
      if (!glassType) continue

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
    calculateNonOptimizedPrice()
  }

  // Función para agregar item al pedido
  const handleAddToOrder = () => {
    const widthErr = validateNumericField(width, "ancho")
    const heightErr = validateNumericField(height, "alto")

    setWidthError(widthErr)
    setHeightError(heightErr)

    if (!selectedGlassType) {
      setError("Por favor, seleccione un tipo de vidrio")
      return
    }

    if (widthErr || heightErr) {
      setError("Por favor, corrija los errores en los campos de medidas")
      return
    }

    let widthInMm = Number.parseFloat(width)
    let heightInMm = Number.parseFloat(height)

    if (measurementUnit === "cm") {
      widthInMm = widthInMm * 10
      heightInMm = heightInMm * 10
    }

    const quantityValue = Number.parseInt(quantity) || 1

    if (isFloat22mm(selectedGlassType)) {
      if (!isFullSheetDimensions(widthInMm, heightInMm, selectedGlassType)) {
        setError(
          "⚠️ Este tipo de vidrio solo se vende por hoja completa. Use las dimensiones completas de la hoja (3600mm x 2250mm).",
        )
        return
      }
    }

    const newItem: OrderItem = {
      id: Math.random().toString(36).substring(7),
      glassType: selectedGlassType,
      width: widthInMm,
      height: heightInMm,
      quantity: quantityValue,
    }

    setOrderItems([...orderItems, newItem])
    setError("")
    setShowSavingsCalculator(true)

    // Limpiar campos
    setSelectedGlassType("")
    setWidth("")
    setHeight("")
    setQuantity("1")
    setWidthError("")
    setHeightError("")
  }

  // Función para procesar pedido
  const handleProcessOrder = async () => {
    if (orderItems.length === 0) {
      setError("No hay ítems en el pedido")
      return
    }

    try {
      const currentNonOptimizedPrice = calculateNonOptimizedPrice()
      const { resultado } = procesarPedidoNuevo(orderItems)
      setOptimizationResult(resultado)

      const info = obtenerInformacionHojas()
      setSheetInfo(info)

      setTimeout(() => {
        calculateTotalPrice()
        const savedOrder = saveOrder(orderItems, currentNonOptimizedPrice, totalPrice)
        setShowOrderDetails(true)
        setNonOptimizedPrice(currentNonOptimizedPrice)
        setOrderProcessedTime(Date.now())
        setHasTrackedAbandonment(false)
      }, 500)
    } catch (err) {
      console.error("Error al procesar el pedido:", err)
      setError("Ocurrió un error al procesar el pedido")
    }
  }

  // Función para confirmar pedido
  const handleConfirmOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError(
        "⚠️ Para confirmar tu pedido necesitamos tu nombre completo y número de celular. Por favor, completá ambos campos.",
      )
      return
    }

    setError("")

    const whatsappText = encodeURIComponent(
      `Hola, soy ${customerName.trim()} y quiero confirmar mi pedido de vidrios:

📱 Mi teléfono: ${customerPhone.trim()}

📋 Detalle del pedido:
${orderItems.map((item) => `- ${item.quantity}x ${item.glassType} (${item.width}mm x ${item.height}mm)`).join("\n")}

💰 Precio Viprou optimizado: $${totalPrice.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
      })}${
        customerComments.trim()
          ? `

📝 Comentarios adicionales:
${customerComments.trim()}`
          : ""
      }

¡Gracias!`,
    )

    window.open(`https://wa.me/5491141422955?text=${whatsappText}`, "_blank")
    setShowSuccessMessage(true)
    setShowOrderDetails(false)
  }

  // Función para eliminar item
  const handleRemoveItem = (id: string) => {
    const newOrderItems = orderItems.filter((item) => item.id !== id)
    setOrderItems(newOrderItems)
    if (newOrderItems.length === 0) {
      setShowSavingsCalculator(false)
    }
  }

  // Función para editar item
  const handleEditItem = (id: string) => {
    const item = orderItems.find((item) => item.id === id)
    if (!item) return

    setSelectedGlassType(item.glassType)

    if (measurementUnit === "mm") {
      setWidth(item.width.toString())
      setHeight(item.height.toString())
    } else {
      setWidth((item.width / 10).toString())
      setHeight((item.height / 10).toString())
    }

    setQuantity(item.quantity.toString())
    handleRemoveItem(id)

    setError("")
    setTimeout(() => {
      setError("Editando item. Modifique los valores necesarios y haga clic en 'Agregar al Pedido'.")
    }, 100)

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Función para reiniciar sistema
  const handleResetSystem = () => {
    if (
      confirm(
        "¿Está seguro de que desea reiniciar todo el sistema? Se perderán todas las hojas activas y el pedido actual.",
      )
    ) {
      reiniciarSistemaOptimizacion()
      setOrderItems([])
      setTotalPrice(0)
      setShowSavingsCalculator(false)
      setSelectedGlassType("")
      setWidth("")
      setHeight("")
      setQuantity("1")
      setOptimizationResult(null)
      setShowOrderDetails(false)
      setError("")
      setOrderProcessedTime(null)
      setHasTrackedAbandonment(false)

      setTimeout(() => {
        setError("Sistema reiniciado correctamente. Puede comenzar un nuevo pedido.")
      }, 100)
    }
  }

  // Función para validar datos de contacto
  const isContactDataValid = () => {
    return customerName.trim().length > 0 && customerPhone.trim().length > 0
  }

  // Effects
  useEffect(() => {
    const info = obtenerInformacionHojas()
    setSheetInfo(info)
  }, [])

  useEffect(() => {
    calculateTotalPrice()
  }, [orderItems])

  // Encontrar el tipo de vidrio seleccionado
  const selectedGlassTypeInfo = glassTypes.find((glass) => glass.name === selectedGlassType)
  const glassWidth = selectedGlassTypeInfo?.width || 0
  const glassHeight = selectedGlassTypeInfo?.height || 0

  // Renderizado condicional para diferentes vistas
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

  if (showOrderHistory) {
    return (
      <OrderHistory
        onBack={() => setShowOrderHistory(false)}
        onEditOrder={(order: SavedOrder) => {
          setOrderItems(order.items)
          calculateTotalPrice()
          setShowSavingsCalculator(true)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      />
    )
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
                  setCustomerComments("")
                  setOrderProcessedTime(null)
                  setHasTrackedAbandonment(false)
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
            <CardTitle>🧾 Tu pedido optimizado está listo para enviar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Sección de ahorro */}
            {nonOptimizedPrice > 0 && totalPrice > 0 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-lg border-2 border-green-300 shadow-sm">
                <h3 className="font-bold text-green-800 mb-4 flex items-center text-lg">
                  <TrendingDown className="h-6 w-6 mr-3 text-green-600" />
                  Ahorro Viprou con Optimización
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-600 font-medium mb-2">Precio sin optimización</p>
                    <p className="font-semibold line-through text-red-600 text-lg">
                      ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-600 font-medium mb-2">Precio Viprou optimizado</p>
                    <p className="font-semibold text-green-700 text-lg">
                      ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-green-200 p-4 rounded-lg border-2 border-green-400 shadow-sm">
                    <p className="text-sm text-green-800 font-semibold mb-2">💰 Ahorro Viprou total</p>
                    <p className="font-bold text-green-800 text-xl">
                      ${(nonOptimizedPrice - totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      <span className="text-sm font-normal ml-2">
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
            )}

            {/* Detalle de cortes */}
            <div>
              <h3 className="font-medium mb-3">Detalle de Cortes</h3>
              <div className="overflow-x-auto">
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
            </div>

            {/* Comentarios */}
            <div>
              <h3 className="font-medium mb-3">📝 Comentarios del cliente (opcional)</h3>
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 shadow-sm">
                <textarea
                  value={customerComments}
                  onChange={(e) => setCustomerComments(e.target.value)}
                  placeholder="Escribí aquí cualquier aclaración o detalle especial que debamos saber sobre tu pedido…"
                  className="w-full min-h-[120px] p-4 border-2 border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                  rows={4}
                />
              </div>
            </div>

            {/* Datos de contacto */}
            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <span className="text-green-600 mr-2">📱</span>
                Datos de Contacto
              </h3>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
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

                {isContactDataValid() && (
                  <div className="mt-3 flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Datos de contacto completos ✓
                  </div>
                )}
              </div>
            </div>

            {/* Resumen y botones */}
            <div className="space-y-4 pt-4 border-t">
              <div className="bg-green-50 p-4 rounded-md border border-green-200 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <p className="text-base text-green-700 font-medium mb-2 sm:mb-0">Precio Viprou total a pagar:</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOrderDetails(false)
                    setOrderProcessedTime(null)
                    setHasTrackedAbandonment(false)
                  }}
                  className="h-12 text-base order-2 sm:order-1"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" /> Volver y modificar
                </Button>

                <Button
                  onClick={handleConfirmOrder}
                  disabled={!isContactDataValid()}
                  className={`h-14 text-lg font-semibold order-1 sm:order-2 ${
                    isContactDataValid()
                      ? "bg-green-600 hover:bg-green-700 shadow-lg"
                      : "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  }`}
                >
                  {isContactDataValid() ? (
                    <>
                      <span className="mr-2">📱</span>
                      Confirmar pedido por WhatsApp ✅
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Completá tus datos para continuar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Vista principal
  return (
    <div className="w-full">
      <Card className="shadow-lg mb-6">
        <CardHeader className="px-4 py-6 sm:px-6 sm:py-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
                Viprou – Cotizá y comprá vidrios a medida 100% online
              </h1>
              <p className="text-base sm:text-lg text-gray-700 font-normal">
                Primer e-commerce de vidrio plano de Argentina 🚀
              </p>
            </div>

            <div className="flex justify-center sm:justify-end flex-shrink-0">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white hover:bg-red-50 border-red-200 text-red-600"
                onClick={handleResetSystem}
              >
                <RefreshCw className="h-5 w-5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </Button>
            </div>
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
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-3 sm:space-y-4">
              {/* Pasos */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg mb-6 border border-blue-100">
                <div className="text-center mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">
                    🪟 Realizá tu pedido en solo 3 pasos
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex flex-col items-center text-center bg-white/60 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-2">🔍</div>
                    <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Paso 1</h3>
                    <p className="text-blue-700 text-xs sm:text-sm">Elegí el tipo de vidrio</p>
                  </div>

                  <div className="flex flex-col items-center text-center bg-white/60 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-2">📏</div>
                    <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Paso 2</h3>
                    <p className="text-blue-700 text-xs sm:text-sm">Indicá las medidas</p>
                  </div>

                  <div className="flex flex-col items-center text-center bg-white/60 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-2">➕</div>
                    <h3 className="font-semibold text-blue-800 text-sm sm:text-base">Paso 3</h3>
                    <p className="text-blue-700 text-xs sm:text-sm">Agregá tu corte</p>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                    1
                  </div>
                  <h3 className="font-medium">Completá los datos del corte</h3>
                </div>

                <div className="space-y-4">
                  {/* Tipo de vidrio */}
                  <div>
                    <Label htmlFor="glass-type" className="mb-1 block">
                      Tipo de Vidrio
                    </Label>
                    <Select
                      value={selectedGlassType}
                      onValueChange={(value) => {
                        setSelectedGlassType(value)
                        if (!width && !height) {
                          const selectedGlass = glassTypes.find((glass) => glass.name === value)
                          if (selectedGlass) {
                            if (measurementUnit === "mm") {
                              setWidth(selectedGlass.width.toString())
                              setHeight(selectedGlass.height.toString())
                            } else {
                              setWidth((selectedGlass.width / 10).toString())
                              setHeight((selectedGlass.height / 10).toString())
                            }
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="glass-type" className="w-full min-h-[60px] py-2 flex items-start">
                        <SelectValue placeholder="Seleccione un tipo de vidrio" className="text-left break-words" />
                      </SelectTrigger>

                      <SelectContent className="max-h-[50vh] p-0">
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 shadow-sm">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Buscar tipo de vidrio…"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-8 bg-white"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <svg
                              className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto pt-2">
                          {!organizedGlassTypes.hasResults && searchTerm.trim() && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron productos que coincidan con "{searchTerm}"
                            </div>
                          )}

                          {organizedGlassTypes.incoloroHalfSheetProducts.length > 0 && (
                            <>
                              <div className="px-4 py-3 text-xs font-semibold text-blue-700 bg-blue-50 border-b border-blue-200">
                                🔷 Vidrios que se pueden vender por media hoja
                              </div>
                              <div className="pb-2">
                                {organizedGlassTypes.incoloroHalfSheetProducts.map((glass) => (
                                  <SelectItem
                                    key={glass.name}
                                    value={glass.name}
                                    className="px-4 py-3 min-h-[80px] flex items-start cursor-pointer hover:bg-gray-50 mx-2 my-1 rounded-md"
                                  >
                                    <div className="flex items-start w-full gap-3">
                                      <div className="text-lg mt-0.5 flex-shrink-0">🪟</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-y-1">
                                          <div className="font-medium text-sm leading-tight text-gray-900 break-words">
                                            {glass.name}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Precio Viprou:{" "}
                                            <span className="font-semibold text-gray-800">
                                              ${glass.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-1">
                                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                              ½ hoja disponible
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            </>
                          )}

                          {organizedGlassTypes.nonIncoloroProducts.length > 0 && (
                            <>
                              <div className="px-4 py-3 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200 mt-2">
                                🔶 Vidrios que se venden por hoja entera
                              </div>
                              <div className="pb-2">
                                {organizedGlassTypes.nonIncoloroProducts.map((glass) => (
                                  <SelectItem
                                    key={glass.name}
                                    value={glass.name}
                                    className="px-4 py-3 min-h-[80px] flex items-start cursor-pointer hover:bg-gray-50 mx-2 my-1 rounded-md"
                                  >
                                    <div className="flex items-start w-full gap-3">
                                      <div className="text-lg mt-0.5 flex-shrink-0">📐</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-y-1">
                                          <div className="font-medium text-sm leading-tight text-gray-900 break-words">
                                            {glass.name}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            Precio Viprou:{" "}
                                            <span className="font-semibold text-gray-800">
                                              ${glass.price.toLocaleString("es-AR", { maximumFractionDigits: 0 })}/m²
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between mt-1">
                                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                              Solo hoja completa
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Medidas */}
                  <div>
                    <Label className="mb-3 block font-medium">Medidas del corte</Label>

                    <div className="mb-4">
                      <Label className="mb-2 block text-sm">Unidad de medida</Label>
                      <Select
                        value={measurementUnit}
                        onValueChange={(value: "mm" | "cm") => {
                          const oldUnit = measurementUnit
                          setMeasurementUnit(value)

                          if (width && height) {
                            if (oldUnit === "mm" && value === "cm") {
                              setWidth((Number(width) / 10).toString())
                              setHeight((Number(height) / 10).toString())
                            } else if (oldUnit === "cm" && value === "mm") {
                              setWidth((Number(width) * 10).toString())
                              setHeight((Number(height) * 10).toString())
                            }
                          }

                          setWidthError("")
                          setHeightError("")
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">Milímetros (mm)</SelectItem>
                          <SelectItem value="cm">Centímetros (cm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="width" className="block text-sm font-medium">
                          Ancho ({measurementUnit})
                        </Label>
                        {measurementUnit === "mm" ? (
                          <Input
                            id="width"
                            type="number"
                            value={width}
                            onChange={(e) => {
                              setWidth(e.target.value)
                              const error = validateNumericField(e.target.value, "ancho")
                              setWidthError(error)
                            }}
                            onFocus={() => setWidthFocused(true)}
                            onBlur={() => setWidthFocused(false)}
                            placeholder="Ej: 1182"
                            min="1"
                            max="3600"
                            className={getFieldClasses(width, widthError, widthFocused)}
                          />
                        ) : (
                          <Select
                            value={width}
                            onValueChange={(value) => {
                              setWidth(value)
                              const error = validateNumericField(value, "ancho")
                              setWidthError(error)
                            }}
                          >
                            <SelectTrigger id="width" className={getFieldClasses(width, widthError, widthFocused)}>
                              <SelectValue placeholder="Seleccionar ancho en cm" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {generateMeasurementOptions("width").map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-500">Máximo: {measurementUnit === "mm" ? "3600mm" : "360cm"}</p>
                        {widthError && width.trim() && (
                          <p className="text-xs text-red-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {widthError}
                          </p>
                        )}
                        {!widthError && width.trim() && (
                          <p className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Correcto
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="height" className="block text-sm font-medium">
                          Alto ({measurementUnit})
                        </Label>
                        {measurementUnit === "mm" ? (
                          <Input
                            id="height"
                            type="number"
                            value={height}
                            onChange={(e) => {
                              setHeight(e.target.value)
                              const error = validateNumericField(e.target.value, "alto")
                              setHeightError(error)
                            }}
                            onFocus={() => setHeightFocused(true)}
                            onBlur={() => setHeightFocused(false)}
                            placeholder="Ej: 511"
                            min="1"
                            max="2500"
                            className={getFieldClasses(height, heightError, heightFocused)}
                          />
                        ) : (
                          <Select
                            value={height}
                            onValueChange={(value) => {
                              setHeight(value)
                              const error = validateNumericField(value, "alto")
                              setHeightError(error)
                            }}
                          >
                            <SelectTrigger id="height" className={getFieldClasses(height, heightError, heightFocused)}>
                              <SelectValue placeholder="Seleccionar alto en cm" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {generateMeasurementOptions("height").map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-500">Máximo: {measurementUnit === "mm" ? "2500mm" : "250cm"}</p>
                        {heightError && height.trim() && (
                          <p className="text-xs text-red-600 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {heightError}
                          </p>
                        )}
                        {!heightError && height.trim() && (
                          <p className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Correcto
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón autocompletar */}
                  {selectedGlassType && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedGlass = glassTypes.find((glass) => glass.name === selectedGlassType)
                          if (selectedGlass) {
                            if (measurementUnit === "mm") {
                              setWidth(selectedGlass.width.toString())
                              setHeight(selectedGlass.height.toString())
                            } else {
                              setWidth((selectedGlass.width / 10).toString())
                              setHeight((selectedGlass.height / 10).toString())
                            }
                            setWidthError("")
                            setHeightError("")
                          }
                        }}
                        className="text-xs"
                      >
                        Usar dimensiones de hoja completa
                      </Button>
                    </div>
                  )}

                  {/* Cantidad */}
                  <div>
                    <Label htmlFor="quantity" className="mb-1 block">
                      Cantidad
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Cantidad de cortes"
                      min="1"
                      className="w-full"
                    />
                  </div>

                  {/* Info */}
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

                  {/* Botón agregar */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleAddToOrder}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={!selectedGlassType || widthError || heightError || !width.trim() || !height.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Cargar corte
                    </Button>
                    <p className="text-xs text-gray-500 text-center italic">
                      Podés cargar varios cortes antes de finalizar tu pedido.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visualización */}
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
                    width={measurementUnit === "mm" ? Number(width) || 0 : (Number(width) || 0) * 10}
                    height={measurementUnit === "mm" ? Number(height) || 0 : (Number(height) || 0) * 10}
                    glassType={selectedGlassType || "Laminado 3+3 Incoloro"}
                    glassWidth={glassWidth || 3600}
                    glassHeight={glassHeight || 2500}
                    quantity={Number(quantity) || 1}
                  />
                </div>
              )}

              {/* Calculadora de ahorro */}
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

                    {nonOptimizedPrice - totalPrice > 0 ? (
                      <div className="bg-white p-3 rounded-md">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">🟢</span>
                          <p className="font-medium text-green-800">
                            ¡Ahorro Viprou: $
                            {(nonOptimizedPrice - totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}!
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

            {/* COLUMNA DERECHA */}
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
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Tipo de Vidrio</TableHead>
                            <TableHead className="text-xs sm:text-sm">Dimensiones</TableHead>
                            <TableHead className="text-xs sm:text-sm">Cant.</TableHead>
                            <TableHead className="text-xs sm:text-sm">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs sm:text-sm">{item.glassType}</TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {item.width}mm x {item.height}mm
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="icon" onClick={() => handleEditItem(item.id)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {orderItems.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                      3
                    </div>
                    <h3 className="font-medium">¡Listo para optimizar!</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Viprou va a distribuir tus cortes en las hojas de vidrio disponibles para minimizar el desperdicio
                      y ahorrarte plata.
                    </p>

                    <Button onClick={handleProcessOrder} className="w-full bg-blue-600 hover:bg-blue-700">
                      Optimizar mi pedido
                    </Button>

                    <div className="text-center text-xs text-gray-500">
                      ¿Querés ver cómo funciona la optimización?{" "}
                      <Button variant="link" size="sm" onClick={() => setShowSystemInfo(true)} className="underline">
                        Ver información del sistema
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
