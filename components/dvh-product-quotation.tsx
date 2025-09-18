"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Shield, ChevronDown, AlertCircle, Info, Loader2 } from "lucide-react"
import { fetchAllGlassTypes, fetchGlassCategory, transformGlassType } from "@/lib/api"

interface TransformedGlassType {
  code: string
  name: string
  thickness: number
  price: number
  width: number
  height: number
  description: string
  isSafety: boolean
  hasSolarControl: boolean
}

interface DVHGlassType {
  sku: string
  name: string
  pricePerM2: number
  isLaminated: boolean
}

const CHAMBER_PRICES = {
  6: 5500,
  9: 6100,
  12: 7500,
  16: 9500,
  20: 11820,
}

export default function DVHProductQuotation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productParam = searchParams.get("product")

  const [allGlassTypes, setAllGlassTypes] = useState<TransformedGlassType[]>([])
  const [availableGlassTypes, setAvailableGlassTypes] = useState<DVHGlassType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  // Form state
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState<"cm" | "mm">("mm")
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const [chamber, setChamber] = useState<string>("")
  const [glassA, setGlassA] = useState<string>("")
  const [glassB, setGlassB] = useState<string>("")

  // Validation state
  const [widthTouched, setWidthTouched] = useState<boolean>(false)
  const [heightTouched, setHeightTouched] = useState<boolean>(false)
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false)
  const [showCalculationDetails, setShowCalculationDetails] = useState<boolean>(false)

  // Configuration (set to 0% by default)
  const [discountPercent] = useState<number>(0)
  const [taxPercent] = useState<number>(0)
  const [marginPercent] = useState<number>(0)

  useEffect(() => {
    async function loadGlassTypes() {
      try {
        setLoading(true)
        setError("")

        console.log("[v0] DVH: Starting to load glass types...")

        // Fetch all glass types from API
        const allTypes = await fetchAllGlassTypes()
        console.log("[v0] DVH: All glass types response:", allTypes)

        const transformedTypes = allTypes.map(transformGlassType)
        console.log("[v0] DVH: Transformed glass types:", transformedTypes)
        setAllGlassTypes(transformedTypes)

        // Get category ID from URL parameter (575 for DVH)
        const categoryId = productParam ? Number.parseInt(productParam) : 575
        console.log("[v0] DVH: Using category ID:", categoryId)

        const category = await fetchGlassCategory(categoryId)
        console.log("[v0] DVH: Category response:", category)
        console.log("[v0] DVH: Category tipo_de_vidrio array:", category.acf.tipo_de_vidrio)

        // Filter glass types based on category's tipo_de_vidrio field
        const filteredTypes = transformedTypes.filter((type) =>
          category.acf.tipo_de_vidrio.some(
            (id) => allTypes.find((apiType) => apiType.id === id)?.acf.code === type.code,
          ),
        )
        console.log("[v0] DVH: Filtered glass types:", filteredTypes)

        // Convert to DVH format
        const dvhGlassTypes: DVHGlassType[] = filteredTypes.map((type) => ({
          sku: type.code,
          name: type.name,
          pricePerM2: type.price,
          isLaminated: type.isSafety, // Use isSafety as laminated indicator
        }))

        console.log("[v0] DVH: Converted to DVH format:", dvhGlassTypes)
        setAvailableGlassTypes(dvhGlassTypes)
      } catch (err) {
        console.log("[v0] DVH: Error loading glass types:", err)
        setError("Error al cargar los tipos de vidrio. Por favor, intenta de nuevo.")
        console.error("Error loading glass types:", err)
      } finally {
        setLoading(false)
      }
    }

    loadGlassTypes()
  }, [productParam])

  // Validation functions
  const parseDimensions = (widthValue: number, heightValue: number, unitValue: "cm" | "mm") => {
    let widthMm: number
    let heightMm: number

    if (unitValue === "cm") {
      widthMm = Math.round(widthValue * 10)
      heightMm = Math.round(heightValue * 10)
    } else {
      widthMm = Math.round(widthValue)
      heightMm = Math.round(heightValue)
    }

    return { widthMm, heightMm }
  }

  const validateDimensions = () => {
    if (!width || !height) return ""

    const { widthMm, heightMm } = parseDimensions(width, height, unit)
    const MAX_WIDTH_MM = 3600
    const MAX_HEIGHT_MM = 2500

    const exceedsDimensions = widthMm > MAX_WIDTH_MM || heightMm > MAX_HEIGHT_MM
    const hasInteracted = widthTouched || heightTouched || formSubmitted

    if (exceedsDimensions && hasInteracted) {
      return `Dimensiones exceden el máximo permitido (${MAX_WIDTH_MM}×${MAX_HEIGHT_MM} mm)`
    }

    return ""
  }

  const validateInputs = () => {
    const errors: string[] = []

    if (!width || width <= 0) errors.push("Ingresá un valor mayor a 0 para el ancho.")
    if (!height || height <= 0) errors.push("Ingresá un valor mayor a 0 para el alto.")
    if (!chamber) errors.push("Completá este campo para continuar.")
    if (!glassA) errors.push("Seleccioná el vidrio del lado A.")
    if (!glassB) errors.push("Seleccioná el vidrio del lado B.")

    const dimensionError = validateDimensions()
    if (dimensionError) errors.push(dimensionError)

    return errors
  }

  const validateLaminatedRequirement = () => {
    if (!glassA || !glassB) return ""

    const glassTypeA = availableGlassTypes.find((g) => g.sku === glassA)
    const glassTypeB = availableGlassTypes.find((g) => g.sku === glassB)

    if (glassTypeA && glassTypeB && !glassTypeA.isLaminated && !glassTypeB.isLaminated) {
      return "El DVH debe incluir al menos un vidrio laminado (de seguridad) en uno de sus lados."
    }

    return ""
  }

  // Calculations
  const calculations = useMemo(() => {
    const validationErrors = validateInputs()
    const laminatedError = validateLaminatedRequirement()

    if (validationErrors.length > 0 || laminatedError) {
      return {
        areaUnitM2: 0,
        perimeterM: 0,
        costGlassAUnit: 0,
        costGlassBUnit: 0,
        costChamberUnit: 0,
        priceUnit: 0,
        priceTotal: 0,
        errors: [...validationErrors, laminatedError].filter(Boolean),
      }
    }

    const { widthMm, heightMm } = parseDimensions(width, height, unit)

    // Calculate actual area and perimeter
    const actualAreaM2 = (widthMm * heightMm) / 1000000
    const actualPerimeterM = 2 * ((widthMm + heightMm) / 1000)

    const areaUnitM2 = Math.max(actualAreaM2, 0.5) // Minimum 0.50 m²
    const perimeterM = Math.max(actualPerimeterM, 2.8) // Minimum 2.80 ml

    const glassTypeA = availableGlassTypes.find((g) => g.sku === glassA)
    const glassTypeB = availableGlassTypes.find((g) => g.sku === glassB)
    const chamberPrice = CHAMBER_PRICES[chamber as keyof typeof CHAMBER_PRICES] || 0

    if (!glassTypeA || !glassTypeB || !chamberPrice) {
      return {
        areaUnitM2: 0,
        perimeterM: 0,
        costGlassAUnit: 0,
        costGlassBUnit: 0,
        costChamberUnit: 0,
        priceUnit: 0,
        priceTotal: 0,
        errors: ["Error en la configuración de precios"],
      }
    }

    // Calculate costs using billing minimums
    const costGlassAUnit = areaUnitM2 * glassTypeA.pricePerM2
    const costGlassBUnit = areaUnitM2 * glassTypeB.pricePerM2
    const costChamberUnit = perimeterM * chamberPrice

    // Calculate unit price
    let priceUnit = costGlassAUnit + costGlassBUnit + costChamberUnit

    // Apply configurable adjustments (if not 0)
    if (discountPercent > 0) {
      priceUnit = priceUnit * (1 - discountPercent / 100)
    }
    if (taxPercent > 0) {
      priceUnit = priceUnit * (1 + taxPercent / 100)
    }
    if (marginPercent > 0) {
      priceUnit = priceUnit * (1 + marginPercent / 100)
    }

    const priceTotal = priceUnit * quantity

    return {
      areaUnitM2,
      perimeterM,
      costGlassAUnit,
      costGlassBUnit,
      costChamberUnit,
      priceUnit,
      priceTotal,
      errors: [],
    }
  }, [
    width,
    height,
    unit,
    chamber,
    glassA,
    glassB,
    quantity,
    discountPercent,
    taxPercent,
    marginPercent,
    availableGlassTypes,
  ])

  const goBack = () => {
    window.location.href = "https://viprou.com"
  }

  const handleOrderClick = () => {
    setFormSubmitted(true)

    if (calculations.errors.length > 0) return

    const glassTypeA = availableGlassTypes.find((g) => g.sku === glassA)
    const glassTypeB = availableGlassTypes.find((g) => g.sku === glassB)

    const { widthMm, heightMm } = parseDimensions(width, height, unit)

    const checkoutParams = new URLSearchParams({
      categoryId: "dvh",
      categoryName: "DVH - Doble Vidriado Hermético",
      glassType: `DVH ${glassTypeA?.name} + ${glassTypeB?.name} - Cámara ${chamber}mm`,
      width: widthMm.toString(),
      height: heightMm.toString(),
      quantity: quantity.toString(),
      unit: "mm",
      thickness: chamber,
      price: Math.round(calculations.priceTotal).toString(),
    })

    router.push(`/checkout?${checkoutParams.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando tipos de vidrio DVH...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Volver
              </Button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  DVH - Doble Vidriado Hermético
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Alta Eficiencia
                  </Badge>
                </h1>
                <p className="text-gray-600 text-xs sm:text-base">
                  Configurá tu DVH personalizado - {availableGlassTypes.length} tipos de vidrio disponibles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xl sm:text-2xl font-bold text-black">Viprou</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          {/* Left Column - Configuration */}
          <div className="space-y-4 sm:space-y-6">
            {/* Dimensions Card */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Medidas del DVH</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de medida</label>
                  <Select value={unit} onValueChange={(value: "cm" | "mm") => setUnit(value)}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">Milímetros (mm)</SelectItem>
                      <SelectItem value="cm">Centímetros (cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ancho ({unit})</label>
                    <Input
                      type="number"
                      placeholder={`Ancho en ${unit}`}
                      value={width || ""}
                      onChange={(e) => setWidth(Number(e.target.value) || 0)}
                      onBlur={() => setWidthTouched(true)}
                      className="text-center h-10 sm:h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alto ({unit})</label>
                    <Input
                      type="number"
                      placeholder={`Alto en ${unit}`}
                      value={height || ""}
                      onChange={(e) => setHeight(Number(e.target.value) || 0)}
                      onBlur={() => setHeightTouched(true)}
                      className="text-center h-10 sm:h-11"
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>Tamaño máximo: 360 × 250 cm (3600 × 2500 mm)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-semibold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-center mt-2 text-sm text-gray-600">
                    {quantity > 1 && `${quantity} unidades seleccionadas`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chamber Selection */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Cámara de Aire
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      La cámara es el separador que sella el DVH; se cobra por el perímetro de la pieza.
                    </div>
                  </div>
                </h3>
              </CardHeader>
              <CardContent>
                <Select value={chamber} onValueChange={setChamber}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Selecciona el espesor de la cámara" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHAMBER_PRICES).map(([thickness, price]) => (
                      <SelectItem key={thickness} value={thickness}>
                        {thickness} mm - ${price.toLocaleString()} / ml
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Glass Selection */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Selección de Vidrios</h3>
                <p className="text-sm text-gray-600">Al menos uno debe ser laminado (seguridad)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vidrio Lado A</label>
                  <Select value={glassA} onValueChange={setGlassA}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Selecciona el vidrio del lado A" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGlassTypes.map((glass) => (
                        <SelectItem key={glass.sku} value={glass.sku}>
                          <div className="flex items-center justify-between w-full">
                            <span>{glass.name}</span>
                            {glass.isLaminated && (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                <Shield className="w-3 h-3 mr-1" />
                                Seguridad
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vidrio Lado B</label>
                  <Select value={glassB} onValueChange={setGlassB}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Selecciona el vidrio del lado B" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGlassTypes.map((glass) => (
                        <SelectItem key={glass.sku} value={glass.sku}>
                          <div className="flex items-center justify-between w-full">
                            <span>{glass.name}</span>
                            {glass.isLaminated && (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                <Shield className="w-3 h-3 mr-1" />
                                Seguridad
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary and Diagram */}
          <div className="space-y-4 sm:space-y-6">
            {/* Diagram */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Diagrama Técnico</h3>
              </CardHeader>
              <CardContent>
                {width && height ? (
                  <div className="bg-gray-100 p-4 sm:p-6 rounded-lg">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div
                          className="border-2 border-dashed border-gray-400 bg-blue-50"
                          style={{
                            width: Math.max(100, Math.min(180, (unit === "cm" ? width * 10 : width) / 10)),
                            height: Math.max(60, Math.min(120, (unit === "cm" ? height * 10 : height) / 10)),
                          }}
                        />
                        <div className="absolute -top-6 left-0 right-0 text-center text-xs sm:text-sm font-medium">
                          {width} {unit}
                        </div>
                        <div className="absolute top-0 bottom-0 -left-8 sm:-left-12 flex items-center">
                          <div className="transform -rotate-90 text-xs sm:text-sm font-medium">
                            {height} {unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-6 sm:p-8 rounded-lg text-center text-gray-500 text-sm sm:text-base">
                    Ingresa las medidas para ver el diagrama
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Resumen del Pedido</h3>
              </CardHeader>
              <CardContent>
                {calculations.errors.length > 0 ? (
                  <div className="space-y-3">
                    {calculations.errors.map((error, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    ))}
                  </div>
                ) : calculations.priceTotal > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start sm:items-center py-2 border-b gap-2">
                        <span className="text-gray-600 text-sm">Dimensiones:</span>
                        <span className="font-medium text-sm text-right">
                          {width} × {height} {unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600 text-sm">Cámara:</span>
                        <span className="font-medium text-sm">{chamber} mm</span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b gap-2">
                        <span className="text-gray-600 text-sm">Lado A:</span>
                        <span className="font-medium text-sm text-right">
                          {availableGlassTypes.find((g) => g.sku === glassA)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b gap-2">
                        <span className="text-gray-600 text-sm">Lado B:</span>
                        <span className="font-medium text-sm text-right">
                          {availableGlassTypes.find((g) => g.sku === glassB)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600 text-sm">Cantidad:</span>
                        <span className="font-medium text-sm">
                          {quantity} unidad{quantity > 1 ? "es" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Calculation Details */}
                    <div>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-transparent"
                        onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                      >
                        Detalle de cálculo
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${showCalculationDetails ? "rotate-180" : ""}`}
                        />
                      </Button>
                      {showCalculationDetails && (
                        <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>Área por unidad:</span>
                            <span>{calculations.areaUnitM2.toFixed(2)} m²</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Perímetro por unidad:</span>
                            <span>{calculations.perimeterM.toFixed(2)} m</span>
                          </div>
                          <div className="text-xs text-gray-500 italic mt-2 pt-2 border-t">
                            * Tamaños mínimos a facturar: 0,50 m² | Cámara mínima: 2,80 ml
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Costo vidrio A:</span>
                            <span>${Math.round(calculations.costGlassAUnit).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Costo vidrio B:</span>
                            <span>${Math.round(calculations.costGlassBUnit).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Costo cámara:</span>
                            <span>${Math.round(calculations.costChamberUnit).toLocaleString()}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between text-sm font-medium">
                            <span>Precio unitario:</span>
                            <span>${Math.round(calculations.priceUnit).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 text-lg sm:text-xl font-bold text-green-600 bg-green-50 px-4 rounded-lg mt-6 gap-1 sm:gap-0">
                      <span>Precio Total:</span>
                      <span className="text-xl sm:text-2xl">
                        ${Math.round(calculations.priceTotal).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-6">
                      <Button
                        size="lg"
                        className="w-full px-12 py-4 text-lg font-semibold rounded-xl shadow-lg"
                        onClick={handleOrderClick}
                      >
                        Agregar al carrito
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6 sm:py-8 text-sm sm:text-base">
                    Completa la configuración para ver el precio
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fixed bottom button for mobile */}
        <div className="fixed bottom-4 left-4 right-4 lg:hidden">
          <Button
            size="lg"
            className="w-full rounded-xl shadow-lg h-14 text-base font-semibold"
            disabled={calculations.errors.length > 0 || !calculations.priceTotal}
            onClick={handleOrderClick}
          >
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  )
}
