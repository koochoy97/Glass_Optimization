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
  const [customerComments, setCustomerComments] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [widthError, setWidthError] = useState("")
  const [heightError, setHeightError] = useState("")
  const [widthFocused, setWidthFocused] = useState(false)
  const [heightFocused, setHeightFocused] = useState(false)

  // Función para enviar datos al webhook
  async function sendToWebhook(orderItems: OrderItem[], origen: string) {
    try {
      const response = await fetch("https://n8n.viprou.com/webhook/103b1e30-807f-4bba-a65f-9698f0c23d2c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderItems,
          origen: origen,
          // Incluir información adicional si está disponible en los items
          customerInfo:
            orderItems.length > 0 && orderItems[0].customerName
              ? {
                  name: orderItems[0].customerName,
                  phone: orderItems[0].customerPhone,
                  comments: orderItems[0].customerComments || "",
                }
              : null,
          precio_optimizado: totalPrice,
          precio_sin_optimizar: nonOptimizedPrice,
          descuento_aplicado: nonOptimizedPrice - totalPrice,
        }),
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

  // Estados para tracking de abandono
  const [orderProcessedTime, setOrderProcessedTime] = useState<number | null>(null)
  const [hasTrackedAbandonment, setHasTrackedAbandonment] = useState(false)

  // Función para organizar los tipos de vidrio en secciones con filtrado
  const organizedGlassTypes = useMemo(() => {
    // Función para detectar si un producto es incoloro
    const isIncoloro = (glassName: string) => {
      return glassName.toLowerCase().includes("incoloro")
    }

    // Función para filtrar por término de búsqueda (más permisiva)
    const matchesSearch = (glassName: string) => {
      if (!searchTerm.trim()) return true
      const searchLower = searchTerm.toLowerCase().trim()
      const nameLower = glassName.toLowerCase()

      // Permitir búsquedas parciales más flexibles
      return (
        nameLower.includes(searchLower) ||
        nameLower.replace(/\s+/g, "").includes(searchLower.replace(/\s+/g, "")) ||
        // Búsqueda específica para espesores como "2mm", "3mm", etc.
        (searchLower.includes("mm") && nameLower.includes(searchLower))
      )
    }

    // Separar productos incoloros de no incoloros
    const incoloroProducts = glassTypes.filter((glass) => isIncoloro(glass.name) && matchesSearch(glass.name))
    const nonIncoloroProducts = glassTypes.filter((glass) => !isIncoloro(glass.name) && matchesSearch(glass.name))

    // Organizar productos incoloros por categorías (solo los que se pueden vender por media hoja)
    const incoloroHalfSheetProducts = incoloroProducts.filter((glass) => canSellHalfSheet(glass.name))

    // Cambiar esta línea:
    // const floatIncoloroProducts = incoloroHalfSheetProducts
    //   .filter((glass) => glass.name.toLowerCase().includes("float"))
    //   .sort((a, b) => a.name.localeCompare(b.name))

    // Por esta nueva lógica:
    const floatIncoloroProducts = incoloroHalfSheetProducts
      .filter((glass) => glass.name.toLowerCase().includes("float"))
      .sort((a, b) => {
        // Ordenar por espesor (thickness) en lugar de alfabéticamente
        const thicknessA = a.thickness || 0
        const thicknessB = b.thickness || 0
        return thicknessA - thicknessB
      })

    const laminadoIncoloroProducts = incoloroHalfSheetProducts
      .filter((glass) => glass.name.toLowerCase().includes("laminado"))
      .sort((a, b) => a.name.localeCompare(b.name))

    const espejoIncoloroProducts = incoloroHalfSheetProducts
      .filter((glass) => glass.name.toLowerCase().includes("espejo"))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Otros productos incoloros de media hoja (que no sean Float, Laminado o Espejo)
    const otherIncoloroHalfSheetProducts = incoloroHalfSheetProducts
      .filter(
        (glass) =>
          !glass.name.toLowerCase().includes("float") &&
          !glass.name.toLowerCase().includes("laminado") &&
          !glass.name.toLowerCase().includes("espejo"),
      )
      .sort((a, b) => a.name.localeCompare(b.name))

    // Todos los productos no incoloros (ordenados alfabéticamente)
    const sortedNonIncoloroProducts = nonIncoloroProducts.sort((a, b) => a.name.localeCompare(b.name))

    return {
      incoloroHalfSheetProducts: [
        ...floatIncoloroProducts,
        ...laminadoIncoloroProducts,
        ...espejoIncoloroProducts,
        ...otherIncoloroHalfSheetProducts,
      ],
      nonIncoloroProducts: sortedNonIncoloroProducts,
      hasResults: incoloroHalfSheetProducts.length > 0 || sortedNonIncoloroProducts.length > 0,
    }
  }, [searchTerm])

  // Add error boundary and clean up any potential Web3 references
  useEffect(() => {
    // Prevent any MetaMask detection errors
    if (typeof window !== "undefined") {
      // Clear any potential Web3 listeners
      window.removeEventListener?.("ethereum", () => {})

      // Track page load event
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: "AW-17150749356/pC4tCK2RudUaEKzVjvI_",
          event_category: "engagement",
          event_label: "calculadora_vidrios",
          page_title: "Viprou - Calculadora de Vidrios",
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, [])

  // Efecto para detectar abandono cuando el usuario está en la vista de detalles del pedido
  useEffect(() => {
    if (!showOrderDetails || !orderProcessedTime || hasTrackedAbandonment) {
      return
    }

    // Función para trackear abandono
    const trackAbandonment = () => {
      if (window.trackEvent && !hasTrackedAbandonment) {
        const timeSpent = Date.now() - orderProcessedTime
        const savings = Math.max(0, nonOptimizedPrice - totalPrice)
        const savingsPercentage = nonOptimizedPrice > 0 ? (savings / nonOptimizedPrice) * 100 : 0

        window.trackEvent("viprou_order_abandoned", {
          event_category: "abandonment",
          event_label: "pedido_abandonado",
          value: Math.round(totalPrice),
          currency: "ARS",
          time_spent_seconds: Math.round(timeSpent / 1000),
          items_count: orderItems.length,
          total_cuts: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          optimized_price: Math.round(totalPrice),
          savings_amount: Math.round(savings),
          savings_percentage: Math.round(savingsPercentage * 100) / 100,
          abandonment_stage: "order_review",
          has_contact_data: !!(customerName.trim() && customerPhone.trim()),
          timestamp: new Date().toISOString(),
        })

        setHasTrackedAbandonment(true)
      }
    }

    // Detectar cuando el usuario sale de la página o cierra la pestaña
    const handleBeforeUnload = () => {
      trackAbandonment()
    }

    // Detectar cuando el usuario cambia de pestaña (pierde el foco)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Esperar un poco antes de trackear abandono para evitar falsos positivos
        setTimeout(() => {
          if (document.hidden && showOrderDetails && !hasTrackedAbandonment) {
            trackAbandonment()
          }
        }, 5000) // 5 segundos de inactividad
      }
    }

    // Agregar event listeners
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [
    showOrderDetails,
    orderProcessedTime,
    hasTrackedAbandonment,
    totalPrice,
    nonOptimizedPrice,
    orderItems,
    customerName,
    customerPhone,
  ])

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

  // Calcular precio sin optimización (simulando distribución torpe sin IA)
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

    // Calcular precio por tipo de vidrio con distribución torpe
    Object.entries(itemsByType).forEach(([glassTypeName, items]) => {
      const glassType = glassTypes.find((glass) => glass.name === glassTypeName)
      if (!glassType) return

      const pricePerM2 = glassType.price
      const sheetArea = (glassType.width / 1000) * (glassType.height / 1000)

      // Calcular área total de cortes para este tipo de vidrio
      let totalCutArea = 0
      items.forEach((item) => {
        const cutArea = (item.width / 1000) * (item.height / 1000)
        totalCutArea += cutArea * item.quantity
      })

      // Simular distribución torpe sin IA
      // Factores que aumentan el desperdicio:

      // 1. Factor base de ineficiencia (20-25%)
      let wasteMultiplier = 1.25

      // 2. Penalización por cantidad de cortes diferentes (más variedad = más desperdicio)
      const uniqueCuts = items.length
      if (uniqueCuts > 3) {
        wasteMultiplier += 0.05 * (uniqueCuts - 3) // +5% por cada corte adicional después del 3ro
      }

      // 3. Penalización por cortes pequeños (menos del 25% del área de la hoja)
      const smallCutsCount = items.filter((item) => {
        const cutArea = (item.width / 1000) * (item.height / 1000)
        return cutArea < sheetArea * 0.25
      }).length

      if (smallCutsCount > 0) {
        wasteMultiplier += 0.03 * smallCutsCount // +3% por cada corte pequeño
      }

      // 4. Penalización por cortes con dimensiones "raras" (no múltiplos comunes)
      const oddDimensionCuts = items.filter((item) => {
        // Considerar "raro" si las dimensiones no son múltiplos de 100mm
        return item.width % 100 !== 0 || item.height % 100 !== 0
      }).length

      if (oddDimensionCuts > 0) {
        wasteMultiplier += 0.02 * oddDimensionCuts // +2% por cada corte con dimensiones raras
      }

      // 5. Limitar el desperdicio máximo al 50% para mantener credibilidad
      wasteMultiplier = Math.min(wasteMultiplier, 1.5)

      // Calcular hojas necesarias con el desperdicio simulado
      const inefficientArea = totalCutArea * wasteMultiplier
      const sheetsNeeded = Math.ceil(inefficientArea / sheetArea)

      // Precio total para este tipo de vidrio
      const typeTotal = sheetsNeeded * sheetArea * pricePerM2
      total += typeTotal

      // Log para debugging (opcional)
      console.log(`Tipo: ${glassTypeName}`)
      console.log(`- Área real de cortes: ${totalCutArea.toFixed(2)} m²`)
      console.log(`- Factor de desperdicio: ${((wasteMultiplier - 1) * 100).toFixed(1)}%`)
      console.log(`- Área con desperdicio: ${inefficientArea.toFixed(2)} m²`)
      console.log(`- Hojas necesarias: ${sheetsNeeded}`)
      console.log(`- Precio: $${typeTotal.toLocaleString("es-AR")}`)
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

        // Marcar el tiempo cuando se procesó el pedido para tracking de abandono
        setOrderProcessedTime(Date.now())
        setHasTrackedAbandonment(false)

        // Track evento de procesamiento de pedido
        if (window.gtag) {
          const savings = Math.max(0, currentNonOptimizedPrice - optimizedPrice)
          const savingsPercentage = currentNonOptimizedPrice > 0 ? (savings / currentNonOptimizedPrice) * 100 : 0

          window.gtag("event", "conversion", {
            send_to: "AW-17150749356/68KgCKvMytUaEKzVjvI_",
            value: Math.round(optimizedPrice), // O usa 1.0 si así lo definiste en la conversión
            currency: "ARS",
            items_count: orderItems.length,
            total_cuts: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            original_price: Math.round(currentNonOptimizedPrice),
            optimized_price: Math.round(optimizedPrice),
            savings_amount: Math.round(savings),
            savings_percentage: Math.round(savingsPercentage * 100) / 100,
            glass_types: [...new Set(orderItems.map((item) => item.glassType))].length,
            timestamp: new Date().toISOString(),
          })

          console.log("Google Ads Conversion sent")

          if (typeof window !== "undefined" && window.fbq) {
            window.fbq("track", "InitiateCheckout")
          }
        }

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

  // Función para validar campos numéricos
  const validateNumericField = (value: string, fieldName: string) => {
    if (!value.trim()) {
      return "Ingresá un número válido"
    }
    const numValue = Number.parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      return "Ingresá un número válido"
    }
    return ""
  }

  // Función para obtener clases de estilo según el estado del campo
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

    if (window.gtag) {
      const timeSpent = orderProcessedTime ? Date.now() - orderProcessedTime : 0
      const savings = Math.max(0, nonOptimizedPrice - totalPrice)
      const savingsPercentage = nonOptimizedPrice > 0 ? (savings / nonOptimizedPrice) * 100 : 0

      window.gtag("event", "conversion", {
        send_to: "AW-17150749356/HEKCCK7MytUaEKzVjvI_",
        value: Math.round(totalPrice),
        currency: "ARS",
        transaction_id: "", // Puedes generar un ID único si quieres hacer seguimiento por compra

        // Campos adicionales (opcional, útiles para remarketing o GTM si los capturas)
        items_count: orderItems.length,
        total_cuts: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        optimized_price: Math.round(totalPrice),
        original_price: Math.round(nonOptimizedPrice),
        savings_amount: Math.round(savings),
        savings_percentage: Math.round(savingsPercentage * 100) / 100,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        has_comments: !!customerComments.trim(),
        time_to_confirm_seconds: Math.round(timeSpent / 1000),
        glass_types: [...new Set(orderItems.map((item) => item.glassType))].length,
        timestamp: new Date().toISOString(),
      })

      console.log("Google Ads Conversion: viprou_order_confirmed enviada")
      setHasTrackedAbandonment(true)
    }

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", {
        value: totalPrice, // Monto de la compra
        currency: "ARS",
      })
    }

    // Enviar webhook al confirmar la orden con información completa del cliente
    await sendToWebhook(
      orderItems.map((item) => ({
        ...item,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerComments: customerComments.trim(), // Agregar comentarios
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
      })}${
        customerComments.trim()
          ? `

📝 Comentarios adicionales:
${customerComments.trim()}`
          : ""
      }

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

      // Reiniciar estados de tracking
      setOrderProcessedTime(null)
      setHasTrackedAbandonment(false)

      // Mostrar mensaje de confirmación
      setTimeout(() => {
        setError("Sistema reiniciado correctamente. Puede comenzar un nuevo pedido.")
      }, 100)
    }
  }

  // Función para agregar un nuevo item al pedido
  const handleAddToOrder = () => {
    // Validar campos
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

    const widthValue = Number.parseFloat(width)
    const heightValue = Number.parseFloat(height)
    const quantityValue = Number.parseInt(quantity) || 1

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
    setWidthError("")
    setHeightError("")
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
                  setCustomerComments("")
                  // Reiniciar estados de tracking
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
            {/* Sección de ahorro destacada */}
            {nonOptimizedPrice > 0 && totalPrice > 0 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-lg border-2 border-green-300 shadow-sm">
                <h3 className="font-bold text-green-800 mb-4 flex items-center text-lg">
                  <TrendingDown className="h-6 w-6 mr-3 text-green-600" />
                  Ahorro Viprou con Optimización
                </h3>

                <div className="space-y-4">
                  {/* Versión móvil - Apilada verticalmente */}
                  <div className="sm:hidden space-y-3">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                      <p className="text-sm text-gray-600 font-medium">Precio sin optimización:</p>
                      <p className="font-semibold line-through text-red-600 text-lg">
                        ${nonOptimizedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                      <p className="text-sm text-gray-600 font-medium">Precio Viprou optimizado:</p>
                      <p className="font-semibold text-green-700 text-lg">
                        ${totalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-green-200 p-4 rounded-lg border-2 border-green-400 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-green-800 font-semibold flex items-center">
                          💰 Ahorro Viprou total:
                        </p>
                        <p className="font-bold text-green-800 text-xl">
                          ${(nonOptimizedPrice - totalPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right text-sm text-green-700 font-medium">
                        (
                        {nonOptimizedPrice > 0
                          ? (((nonOptimizedPrice - totalPrice) / nonOptimizedPrice) * 100).toFixed(1)
                          : 0}
                        %)
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-green-800 font-bold text-base">
                          ¡Te ahorrás más de ${Math.floor((nonOptimizedPrice - totalPrice) / 1000) * 1000}.000 con la
                          optimización!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Versión desktop - En columnas */}
                  <div className="hidden sm:grid grid-cols-3 gap-4">
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
                      <p className="text-sm text-green-800 font-semibold mb-2 flex items-center">
                        💰 Ahorro Viprou total
                      </p>
                      <p className="font-bold text-green-800 text-xl mb-2">
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

                  <div className="text-center mt-4">
                    <p className="text-green-800 font-bold text-lg bg-white/60 inline-block px-6 py-3 rounded-full border-2 border-green-300">
                      ¡Te ahorrás más de ${Math.floor((nonOptimizedPrice - totalPrice) / 1000) * 1000}.000 con la
                      optimización!
                    </p>
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

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 bg-gray-50 inline-block px-4 py-2 rounded-full border border-gray-200">
                <strong>Total de cortes: {orderItems.reduce((sum, item) => sum + item.quantity, 0)} unidades</strong>
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center">📝 Comentarios del cliente (opcional)</h3>

              <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200 shadow-sm">
                <textarea
                  id="customer-comments"
                  value={customerComments}
                  onChange={(e) => setCustomerComments(e.target.value)}
                  placeholder="Escribí aquí cualquier aclaración o detalle especial que debamos saber sobre tu pedido…"
                  className="w-full min-h-[120px] p-4 border-2 border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-3 bg-blue-50 p-3 rounded-md border border-blue-200">
                  💡 <strong>Ejemplos:</strong> "Filo matado en los bordes", "Cuidado con el traslado", "Entregar por la
                  mañana", etc.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <span className="text-green-600 mr-2">📱</span>
                Datos de Contacto
              </h3>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <p className="text-blue-700 text-sm mb-4 flex items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="text-green-600 mr-2">📱</span>
                  Solo usaremos tu número para confirmar tu pedido. No enviamos spam.
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
                  onClick={() => {
                    setShowOrderDetails(false)
                    // Reiniciar tracking de abandono al volver
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

              {/* Texto informativo */}
              <p className="text-sm text-gray-600 text-center bg-green-50 p-3 rounded-lg border border-green-200">
                <span className="font-semibold text-green-700">Te vamos a contactar en minutos.</span>
                <br />
                Nuestro equipo confirmará todos los detalles por WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Encontrar el tipo de vidrio seleccionado para obtener sus dimensiones
  const selectedGlassTypeInfo = glassTypes.find((glass) => glass.name === selectedGlassType)
  const glassWidth = selectedGlassTypeInfo?.width || 0
  const glassHeight = selectedGlassTypeInfo?.height || 0

  // Calcular el ahorro y porcentaje de ahorro
  const savings = nonOptimizedPrice - totalPrice
  const savingsPercentage = nonOptimizedPrice > 0 ? (savings / nonOptimizedPrice) * 100 : 0

  // Actualizar el componente principal para mejor responsividad
  return (
    <div className="w-full">
      <Card className="shadow-lg mb-6">
        <CardHeader
          className="px-4 py-6 sm:px-6 sm:py-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b relative"
          style={{ backgroundColor: "#eaf4ff" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Contenido principal del título */}
            <div className="text-center sm:text-left flex-1 pr-0 sm:pr-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
                Viprou – Cotizá y comprá vidrios a medida 100% online
              </h1>
              <p className="text-base sm:text-lg text-gray-700 font-normal">
                Primer e-commerce de vidrio plano de Argentina 🚀
              </p>
            </div>

            {/* Botón de reiniciar */}
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
            {/* COLUMNA IZQUIERDA - Formulario de entrada */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg mb-6 border border-blue-100">
                {/* Título principal */}
                <div className="text-center mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2">
                    🪟 Realizá tu pedido en solo 3 pasos
                  </h2>
                </div>

                {/* Pasos visuales */}
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

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-2">
                    1
                  </div>
                  <h3 className="font-medium">Completá los datos del corte</h3>
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
                      <SelectTrigger id="glass-type" className="w-full min-h-[60px] py-2 flex items-start">
                        <SelectValue placeholder="Seleccione un tipo de vidrio" className="text-left break-words" />
                      </SelectTrigger>

                      <SelectContent className="max-h-[50vh] p-0">
                        {/* Campo de búsqueda en contenedor separado */}
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

                        {/* Contenedor de resultados con scroll independiente */}
                        <div className="max-h-80 overflow-y-auto pt-2">
                          {/* Mostrar mensaje si no hay resultados */}
                          {!organizedGlassTypes.hasResults && searchTerm.trim() && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No se encontraron productos que coincidan con "{searchTerm}"
                            </div>
                          )}

                          {/* Primera sección: Vidrios incoloros que se pueden vender por media hoja */}
                          {organizedGlassTypes.incoloroHalfSheetProducts.length > 0 && (
                            <>
                              <div className="px-4 py-3 text-xs font-semibold text-blue-700 bg-blue-50 border-b border-blue-200 sticky top-0 z-5">
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
                                            <div
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                              style={{ backgroundColor: "#e5f3ff", color: "#1e40af" }}
                                            >
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

                          {/* Segunda sección: Vidrios que se venden por hoja entera */}
                          {organizedGlassTypes.nonIncoloroProducts.length > 0 && (
                            <>
                              <div className="px-4 py-3 text-xs font-semibold text-orange-700 bg-orange-50 border-b border-orange-200 sticky top-0 z-5 mt-2">
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

                  <div>
                    <Label className="mb-3 block font-medium">Medidas del corte</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Campo Ancho */}
                      <div className="space-y-1">
                        <div className="relative">
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
                            placeholder=" "
                            className={`${getFieldClasses(width, widthError, widthFocused)} pt-6 pb-2 peer`}
                          />
                          <Label
                            htmlFor="width"
                            className={`absolute left-3 transition-all duration-200 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-600 ${
                              width ? "top-1 text-xs text-gray-600" : "top-3 text-base text-gray-400"
                            }`}
                          >
                            Ancho
                          </Label>
                          {!width && !widthFocused && (
                            <span className="absolute right-3 top-3 text-sm text-gray-400 pointer-events-none">
                              ej: 500
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">En milímetros (mm)</p>
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

                      {/* Campo Alto */}
                      <div className="space-y-1">
                        <div className="relative">
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
                            placeholder=" "
                            className={`${getFieldClasses(height, heightError, heightFocused)} pt-6 pb-2 peer`}
                          />
                          <Label
                            htmlFor="height"
                            className={`absolute left-3 transition-all duration-200 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-gray-600 ${
                              height ? "top-1 text-xs text-gray-600" : "top-3 text-base text-gray-400"
                            }`}
                          >
                            Alto
                          </Label>
                          {!height && !heightFocused && (
                            <span className="absolute right-3 top-3 text-sm text-gray-400 pointer-events-none">
                              ej: 700
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">En milímetros (mm)</p>
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
                            // Limpiar errores al autocompletar
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
                                }
                              }
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    {item.glassType}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    {item.width}mm x {item.height}mm
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    ${price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                                    <div className="flex gap-2">
                                      <Button variant="outline" size="icon" onClick={() => handleEditItem(item.id)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleRemoveItem(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
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
