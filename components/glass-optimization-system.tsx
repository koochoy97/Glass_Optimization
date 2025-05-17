"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  Plus,
  Info,
  Trash2,
  TrendingDown,
  Sparkles,
  ShoppingCart,
  CheckCircle,
  ArrowRight,
  BarChart2,
  Clock,
  Edit,
  RefreshCw,
} from "lucide-react"
import { glassTypes } from "@/lib/glass-data"
import { procesarPedidoNuevo, obtenerInformacionHojas, reiniciarSistemaOptimizacion } from "@/lib/integration"
import OrderConfirmationDetails from "./order-confirmation-details"
import type { OrderItem } from "@/lib/calculator"
import GlassCutVisualization from "./glass-cut-visualization"
import SavingsNotification from "./savings-notification"
import SystemInfo from "./system-info"
import OrderHistory from "./order-history"
import { saveOrder, type SavedOrder } from "@/lib/order-history"

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
      sheets: number
      chargeableArea: number
      pricePerM2: number
      matchedGlassType: string | null
    }[]
  >([])
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [showSavingsCalculator, setShowSavingsCalculator] = useState(false)
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const [showSavingsNotification, setShowSavingsNotification] = useState(false)
  const [lastProcessedOrder, setLastProcessedOrder] = useState<OrderItem[]>([])
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [showSystemInfo, setShowSystemInfo] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)

  // Cargar información de hojas al iniciar
  useEffect(() => {
    updateSheetInfo()
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
    // Agrupar items por tipo de vidrio
    const itemsByType = orderItems.reduce((acc, item) => {
      if (!acc[item.glassType]) {
        acc[item.glassType] = []
      }
      acc[item.glassType].push(item)
      return acc
    }, {})

    let total = 0

    // Calcular precio por tipo de vidrio
    Object.entries(itemsByType).forEach(([glassTypeName, items]) => {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)
      if (!glassType) return

      // El precio ya está en precio por m²
      const pricePerM2 = glassType.price

      // Calcular área total de todos los cortes de este tipo
      let totalCutArea = 0
      items.forEach((item: any) => {
        const cutArea = (item.width / 1000) * (item.height / 1000)
        totalCutArea += cutArea * item.quantity
      })

      // Área de una hoja completa en m²
      const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)

      // Estimar número de hojas necesarias (aproximación)
      const estimatedSheets = Math.ceil(totalCutArea / sheetArea)

      // Cobrar hojas completas
      const chargeableArea = estimatedSheets * sheetArea

      // Precio total basado en área cobrable y precio por m²
      const typePrice = chargeableArea * pricePerM2
      total += typePrice
    })

    setTotalPrice(total)

    // Calcular también el precio sin optimización
    calculateNonOptimizedPrice()
  }

  // Función para normalizar nombres de tipos de vidrio para comparación
  const normalizeGlassType = (type: string): string => {
    return type.toLowerCase().replace(/\s+/g, "").replace(/[+]/g, "mas").replace(/[()]/g, "")
  }

  // Función para encontrar el tipo de vidrio y su precio por m²
  const findGlassTypeAndPrice = (tipoVidrio) => {
    console.log(`Buscando tipo de vidrio: "${tipoVidrio}"`)

    // Normalizar el tipo de vidrio para búsqueda
    const normalizeGlassType = (type) => {
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

  const calculateOptimizedPrice = () => {
    if (!sheetInfo?.hojas || sheetInfo.hojas.length === 0) {
      console.log("No hay hojas para calcular precio")
      setTotalOptimizedPrice(0)
      setOptimizedGlassSummary([])
      return 0
    }

    console.log("Calculando precio optimizado para hojas:", sheetInfo.hojas)

    // Agrupar hojas por tipo de vidrio
    const hojasPorTipo = sheetInfo.hojas.reduce((acc, hoja) => {
      if (!acc[hoja.tipoVidrio]) {
        acc[hoja.tipoVidrio] = {
          count: 0,
          area: 0,
          sheets: [],
        }
      }

      // Área utilizada = área total - área restante
      const areaUtilizada = (hoja.superficieTotal - hoja.superficieRestante) / 1000000 // Convertir a m²
      const areaTotal = hoja.superficieTotal / 1000000 // Área total de la hoja en m²
      const porcentajeUtilizado = areaUtilizada / areaTotal // Porcentaje de la hoja utilizado

      acc[hoja.tipoVidrio].count += 1
      acc[hoja.tipoVidrio].area += areaUtilizada
      acc[hoja.tipoVidrio].sheets.push({
        id: hoja.id,
        areaTotal,
        areaUtilizada,
        porcentajeUtilizado,
      })

      return acc
    }, {})

    console.log("Hojas agrupadas por tipo:", hojasPorTipo)
    console.log(
      "Tipos de vidrio disponibles:",
      glassTypes.map((g) => g.name),
    )

    // Calcular precio por tipo aplicando las reglas de cobro mínimo
    const summary = Object.entries(hojasPorTipo).map(([tipo, datos]) => {
      // Buscar el tipo de vidrio y su precio
      const { glassType, pricePerM2, matchedGlassType } = findGlassTypeAndPrice(tipo)

      console.log(`Tipo: "${tipo}", Coincidencia: "${matchedGlassType || "No encontrado"}"`)
      console.log(`Precio por m²: ${pricePerM2.toFixed(2)}`)

      if (!glassType) {
        console.error(`No se encontró coincidencia para el tipo de vidrio: ${tipo}`)
        return {
          type: tipo,
          area: datos.area,
          price: 0,
          totalPrice: 0,
          sheets: datos.count,
          chargeableArea: 0,
          pricePerM2: 0,
          matchedGlassType: null,
        }
      }

      // Calcular área cobrable según las reglas (cada hoja se cobra completa)
      let chargeableArea = 0
      datos.sheets.forEach((sheet) => {
        // Cobrar hoja completa
        chargeableArea += sheet.areaTotal
      })

      // Calcular precio total basado en área cobrable y precio por m²
      const totalPrice = chargeableArea * pricePerM2

      console.log(`Hojas físicas: ${datos.count}, Área cobrable: ${chargeableArea.toFixed(2)} m²`)
      console.log(`Precio total: ${totalPrice.toFixed(2)}`)

      return {
        type: tipo,
        area: datos.area,
        price: pricePerM2, // Precio por m²
        totalPrice: totalPrice,
        sheets: datos.count,
        chargeableArea: chargeableArea,
        pricePerM2: pricePerM2,
        matchedGlassType: matchedGlassType,
      }
    })

    console.log("Resumen calculado:", summary)

    setOptimizedGlassSummary(summary)
    const total = summary.reduce((sum, item) => sum + item.totalPrice, 0)
    console.log("Precio total calculado:", total)
    setTotalOptimizedPrice(total)
    return total
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
        const optimizedPrice = calculateOptimizedPrice()

        // Asegurarnos de que tenemos los valores correctos para mostrar
        console.log("Precio sin optimización:", currentNonOptimizedPrice)
        console.log("Precio optimizado calculado:", optimizedPrice)

        // Guardar el pedido en el historial
        const savedOrder = saveOrder(orderItems, currentNonOptimizedPrice, optimizedPrice)
        setCurrentOrderId(savedOrder.id)

        // Mostrar notificación de ahorro con los valores correctos
        setNonOptimizedPrice(currentNonOptimizedPrice) // Asegurar que mantenemos el precio sin optimización

        // Mostrar detalles del pedido
        setShowOrderDetails(true)

        // Mostrar la notificación de ahorro después de un breve retraso
        setTimeout(() => {
          setShowSavingsNotification(true)
        }, 500)
      }, 500)

      // Limpiar pedido actual
      setOrderItems([])
      setTotalPrice(0)
      setShowSavingsCalculator(false)
    } catch (err) {
      console.error("Error al procesar el pedido:", err)
      setError("Ocurrió un error al procesar el pedido")
    }
  }

  // Función para modificar un pedido existente
  const handleModifyOrder = () => {
    // Restaurar los items del último pedido procesado
    setOrderItems([...lastProcessedOrder])

    // Mostrar la calculadora de ahorro
    setShowSavingsCalculator(true)

    // Ocultar los detalles del pedido y volver a la pantalla principal
    setShowOrderDetails(false)

    // Calcular precios
    setTimeout(() => {
      calculateTotalPrice()
    }, 100)

    // Mostrar mensaje informativo
    setError("")
    setTimeout(() => {
      setError("Pedido cargado para modificación. Realice los cambios necesarios y procese nuevamente.")
    }, 200)
  }

  // Función para editar un pedido del historial
  const handleEditHistoryOrder = (order: SavedOrder) => {
    // Cargar los items del pedido seleccionado
    setOrderItems([...order.items])
    setCurrentOrderId(order.id)

    // Mostrar la calculadora de ahorro
    setShowSavingsCalculator(true)

    // Ocultar el historial y volver a la pantalla principal
    setShowOrderHistory(false)

    // Calcular precios
    setTimeout(() => {
      calculateTotalPrice()
    }, 100)

    // Mostrar mensaje informativo
    setError("")
    setTimeout(() => {
      setError(`Editando pedido ${order.id}. Realice los cambios necesarios y procese nuevamente.`)
    }, 200)
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

  // Agregar al carrito
  const handleAddToCart = () => {
    if (orderItems.length === 0) {
      setError("No hay ítems para agregar al carrito")
      return
    }

    // Agregar items al carrito
    setCartItems([...cartItems, ...orderItems])

    // Mostrar mensaje de confirmación
    alert(`¡${orderItems.length} productos agregados al carrito!`)

    // Limpiar pedido actual
    setOrderItems([])
    setTotalPrice(0)
    setShowSavingsCalculator(false)
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

  // Si se está mostrando los detalles del pedido, renderizar el componente OrderConfirmationDetails
  if (showOrderDetails && optimizationResult) {
    return (
      <OrderConfirmationDetails
        optimizationResult={optimizationResult}
        onBack={() => {
          setShowOrderDetails(false)
          // Mostrar la información del sistema después de procesar un pedido
          setShowSystemInfo(true)
        }}
        originalPrice={nonOptimizedPrice}
        optimizedPrice={totalOptimizedPrice}
        onModifyOrder={handleModifyOrder}
      />
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
          <CardTitle className="text-lg sm:text-xl">Sistema de Optimización de Vidrios</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-red-50 border-red-200 text-red-600"
              onClick={handleResetSystem}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-blue-50"
              onClick={() => setShowOrderHistory(true)}
            >
              <Clock className="h-5 w-5" />
              <span className="hidden sm:inline">Historial</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-blue-50"
              onClick={() => setShowSystemInfo(true)}
            >
              <BarChart2 className="h-5 w-5" />
              <span className="hidden sm:inline">Información</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-blue-50"
              onClick={() => setShowCartModal(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Carrito</span>
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {cartItems.length}
                </span>
              )}
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
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 p-3 rounded-md mb-2 sm:mb-4 text-sm text-blue-700 flex items-start">
                <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>
                  Seleccione un tipo de vidrio, ingrese las medidas y la cantidad deseada. Agregue todos los cortes
                  necesarios y luego procese el pedido para optimizar.
                </p>
              </div>

              <div>
                <Label htmlFor="glass-type" className="mb-1 block">
                  Tipo de Vidrio
                </Label>
                <Select
                  value={selectedGlassType}
                  onValueChange={(value) => {
                    setSelectedGlassType(value)
                    // Buscar el tipo de vidrio seleccionado
                    const selectedGlass = glassTypes.find((glass) => glass.name === value)
                    if (selectedGlass) {
                      // Autocompletar con las dimensiones de la hoja
                      setWidth(selectedGlass.width.toString())
                      setHeight(selectedGlass.height.toString())
                    }
                  }}
                >
                  <SelectTrigger id="glass-type" className="w-full">
                    <SelectValue placeholder="Seleccione un tipo de vidrio" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    {glassTypes.map((glass) => (
                      <SelectItem key={glass.name} value={glass.name}>
                        {glass.name} (${glass.price.toLocaleString("es-AR", { maximumFractionDigits: 2 })}/m²)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="width" className="mb-1 block">
                    Ancho (mm)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Ancho"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="mb-1 block">
                    Alto (mm)
                  </Label>
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

              {currentCutPrice > 0 && (
                <div className="bg-green-50 p-3 rounded-md border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">Precio estimado:</span>
                    <span className="font-bold text-green-800">
                      $
                      {currentCutPrice.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handleAddToOrder} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Agregar al Pedido
              </Button>

              {orderItems.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Items en el Pedido</h3>
                  <div className="bg-gray-50 rounded-md p-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Tipo de Vidrio</TableHead>
                          <TableHead className="whitespace-nowrap">Dimensiones</TableHead>
                          <TableHead className="whitespace-nowrap">Cantidad</TableHead>
                          <TableHead className="whitespace-nowrap">Precio</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item) => {
                          const glassType = glassTypes.find((glass) => glass.name === item.glassType)

                          // Mostrar precio estimado por ítem (basado en el área)
                          let price = 0
                          if (glassType) {
                            // El precio ya está en precio por m²
                            const pricePerM2 = glassType.price

                            // Área de una hoja completa en m²
                            const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)

                            // Cobrar hoja completa por cada corte
                            price = sheetArea * pricePerM2 * item.quantity
                          }

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="py-2 whitespace-nowrap">{item.glassType}</TableCell>
                              <TableCell className="py-2 whitespace-nowrap">
                                {item.width}x{item.height}mm
                              </TableCell>
                              <TableCell className="py-2 whitespace-nowrap">{item.quantity}</TableCell>
                              <TableCell className="py-2 whitespace-nowrap">
                                $
                                {price.toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="py-2 flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditItem(item.id)}
                                  className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4 mr-1" /> Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="h-8 w-8 p-0 text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Calculadora de Ahorro y Desperdicio */}
                  {showSavingsCalculator && (
                    <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-green-600" />
                        Calculadora de Ahorro
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Precio sin optimización:</span>
                          <span className="line-through text-red-500">
                            ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between font-bold">
                          <span className="text-gray-800">Tu precio optimizado:</span>
                          <span className="text-green-600">
                            ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-md flex items-center">
                          <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                            <TrendingDown className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-800">
                              ¡Estás ahorrando ${savings.toLocaleString("es-AR", { minimumFractionDigits: 2 })}!
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-500">
                          Este cálculo es una estimación basada en el precio por m² del vidrio. El ahorro real puede
                          variar.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Segunda columna para la visualización */}
            <div className="flex flex-col">
              <GlassCutVisualization
                width={Number(width) || 0}
                height={Number(height) || 0}
                glassType={selectedGlassType || "Laminado 3+3 Incoloro"}
                glassWidth={glassWidth || 3600}
                glassHeight={glassHeight || 2500}
                quantity={Number(quantity) || 1}
              />

              {/* Botones de acción destacados */}
              {orderItems.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    onClick={handleAddToCart}
                    className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Agregar al Carrito
                  </Button>
                  <Button
                    onClick={handleProcessOrder}
                    className="w-full py-6 text-lg bg-green-600 hover:bg-green-700 shadow-md"
                    disabled={orderItems.length === 0}
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Procesar Pedido
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Barra de acciones fija en la parte inferior */}
        {orderItems.length > 0 && (
          <CardFooter className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div>
              <span className="text-gray-700 mr-2 block sm:inline">Precio Total Estimado:</span>
              <span className="font-bold text-lg text-green-700">
                ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button onClick={handleAddToCart} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Agregar al Carrito
              </Button>
              <Button
                onClick={handleProcessOrder}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                disabled={orderItems.length === 0}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Procesar Pedido
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {optimizedGlassSummary.length > 0 && (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>Resumen de Optimización</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Vidrio</TableHead>
                  <TableHead>Área Utilizada (m²)</TableHead>
                  <TableHead>Hojas Físicas</TableHead>
                  <TableHead>Área Cobrable (m²)</TableHead>
                  <TableHead>Precio x m²</TableHead>
                  <TableHead>Precio Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimizedGlassSummary.map((item) => (
                  <TableRow key={item.type}>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.area.toFixed(2)}</TableCell>
                    <TableCell>{item.sheets}</TableCell>
                    <TableCell>{item.chargeableArea.toFixed(2)}</TableCell>
                    <TableCell>${item.pricePerM2.toFixed(2)}</TableCell>
                    <TableCell>${item.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <span className="font-semibold">
                Precio Total Optimizado: ${totalOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
