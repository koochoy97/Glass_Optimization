"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Shield, Eye, Sun, Loader2 } from "lucide-react"
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

export default function GlassProductQuotation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productParam = searchParams.get("product")

  useEffect(() => {
    if (!productParam) {
      router.replace("/")
      return
    }
  }, [productParam, router])

  const [allGlassTypes, setAllGlassTypes] = useState<TransformedGlassType[]>([])
  const [availableGlassTypes, setAvailableGlassTypes] = useState<TransformedGlassType[]>([])
  const [categoryName, setCategoryName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [selectedGlassCategory, setSelectedGlassCategory] = useState<"safety" | "normal" | "">("")
  const [selectedGlassType, setSelectedGlassType] = useState<string>("")
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState<"cm" | "mm">("cm")

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError("")

        console.log("[v0] Starting to load data...")

        // First, fetch all glass types
        console.log("[v0] Fetching all glass types...")
        const allTypes = await fetchAllGlassTypes()
        console.log("[v0] All glass types response:", allTypes)

        const transformedTypes = allTypes.map(transformGlassType)
        console.log("[v0] Transformed glass types:", transformedTypes)
        setAllGlassTypes(transformedTypes)

        const categoryId = productParam ? Number.parseInt(productParam) : 344
        console.log("[v0] Using category ID from URL parameter:", categoryId)

        const category = await fetchGlassCategory(categoryId)
        console.log("[v0] Category response:", category)
        setCategoryName(category.title.rendered)

        // Filter glass types based on category's tipo_de_vidrio array
        console.log("[v0] Category tipo_de_vidrio array:", category.acf.tipo_de_vidrio)

        const filteredTypes = transformedTypes.filter((type) =>
          category.acf.tipo_de_vidrio.some(
            (id) => allTypes.find((apiType) => apiType.id === id)?.acf.code === type.code,
          ),
        )
        console.log("[v0] Filtered glass types:", filteredTypes)
        setAvailableGlassTypes(filteredTypes)

        if (filteredTypes.length > 0) {
          const middleIndex = Math.floor(filteredTypes.length / 2)
          const defaultSelection = filteredTypes.length > 2 ? filteredTypes[middleIndex] : filteredTypes[0]
          setSelectedGlassType(defaultSelection.code)
          console.log("[v0] Auto-selected glass type:", defaultSelection.name)
        }
      } catch (err) {
        console.log("[v0] Error in loadData:", err)
        setError("Error al cargar los datos. Por favor, intenta de nuevo.")
        console.error("Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [productParam])

  const currentGlassType = availableGlassTypes.find((g) => g.code === selectedGlassType)

  useEffect(() => {
    if (currentGlassType && currentGlassType.width && currentGlassType.height) {
      console.log("[v0] Auto-populating dimensions from selected glass type:", {
        width: currentGlassType.width,
        height: currentGlassType.height,
      })
      setWidth(currentGlassType.width)
      setHeight(currentGlassType.height)
    }
  }, [currentGlassType])

  const categorizedGlassTypes = useMemo(() => {
    const safetyGlass = availableGlassTypes.filter((type) => type.isSafety)
    const normalGlass = availableGlassTypes.filter((type) => !type.isSafety)
    return { safetyGlass, normalGlass }
  }, [availableGlassTypes])

  const displayGlassTypes = useMemo(() => {
    // Check if this is a "ventana" category (windows) - we'll determine this by checking if we have both safety and normal glass
    const hasNormalGlass = categorizedGlassTypes.normalGlass.length > 0
    const hasSafetyGlass = categorizedGlassTypes.safetyGlass.length > 0
    const needsCategorization = hasNormalGlass && hasSafetyGlass

    if (needsCategorization) {
      if (selectedGlassCategory === "safety") return categorizedGlassTypes.safetyGlass
      if (selectedGlassCategory === "normal") return categorizedGlassTypes.normalGlass
      return []
    } else {
      return availableGlassTypes
    }
  }, [availableGlassTypes, selectedGlassCategory, categorizedGlassTypes])

  const needsCategorization =
    categorizedGlassTypes.normalGlass.length > 0 && categorizedGlassTypes.safetyGlass.length > 0

  const calculations = useMemo(() => {
    if (!currentGlassType || !width || !height) {
      return { area: 0, isThirdSheet: false, isHalfSheet: false, billedArea: 0, unitPrice: 0, totalPrice: 0 }
    }

    const widthInMeters = unit === "cm" ? width / 100 : width / 1000
    const heightInMeters = unit === "cm" ? height / 100 : height / 1000
    const singlePieceArea = widthInMeters * heightInMeters
    const totalArea = singlePieceArea * quantity

    console.log(
      "[v0] Price calculation - Quantity:",
      quantity,
      "Single area:",
      singlePieceArea,
      "Total area:",
      totalArea,
    )

    // Glass types that can use 1/3 sheet (1200x2500mm = 3m²)
    const canUseThirdSheet = ["LAMI33", "FL103", "FL104"].includes(currentGlassType.code)

    let billedAreaPerPiece: number
    let isThirdSheet = false
    let isHalfSheet = false

    if (canUseThirdSheet) {
      // Can use 1/3 sheet minimum (3 m²)
      if (singlePieceArea <= 3.0) {
        billedAreaPerPiece = 3.0 // 1/3 sheet
        isThirdSheet = true
      } else if (singlePieceArea <= 4.5) {
        billedAreaPerPiece = 4.5 // 1/2 sheet
        isHalfSheet = true
      } else {
        billedAreaPerPiece = 9.0 // Full sheet
      }
    } else {
      // Requires minimum 1/2 sheet (1800x2500mm = 4.5m²)
      if (singlePieceArea <= 4.5) {
        billedAreaPerPiece = 4.5 // 1/2 sheet
        isHalfSheet = true
      } else {
        billedAreaPerPiece = 9.0 // Full sheet
      }
    }

    const unitPrice = currentGlassType.price
    const totalPrice = unitPrice * billedAreaPerPiece * quantity

    console.log(
      "[v0] Final calculation - Billed area per piece:",
      billedAreaPerPiece,
      "Unit price:",
      unitPrice,
      "Quantity:",
      quantity,
      "Total price:",
      totalPrice,
    )

    return {
      area: totalArea,
      isThirdSheet,
      isHalfSheet,
      billedArea: billedAreaPerPiece * quantity, // Total billed area for display
      unitPrice,
      totalPrice,
    }
  }, [currentGlassType, width, height, quantity, unit])

  const goBack = () => {
    window.open("https://viprou.com", "_self")
  }

  const goBackToCategory = () => {
    if (needsCategorization) {
      setSelectedGlassCategory("")
      setSelectedGlassType("")
    } else {
      goBack()
    }
  }

  const handleOrderClick = () => {
    if (!currentGlassType || !calculations.totalPrice) return

    const checkoutParams = new URLSearchParams({
      categoryId: productParam || "343",
      categoryName: categoryName,
      glassType: currentGlassType.name,
      width: width.toString(),
      height: height.toString(),
      quantity: quantity.toString(),
      unit: unit,
      thickness: currentGlassType.thickness.toString(),
      price: calculations.totalPrice.toString(),
    })

    router.push(`/checkout?${checkoutParams.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando tipos de vidrio...</p>
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

  if (productParam && needsCategorization && !selectedGlassCategory) {
    const hasNormalGlass = categorizedGlassTypes.normalGlass.length > 0
    const hasSafetyGlass = categorizedGlassTypes.safetyGlass.length > 0

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
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
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                      Selecciona el tipo de vidrio que necesitas
                    </h1>
                    <p className="text-gray-600 text-xs sm:text-base">Selecciona una categoría</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-black">Viprou</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid gap-4 sm:gap-6">
            {hasNormalGlass && (
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
                onClick={() => setSelectedGlassCategory("normal")}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-blue-100 p-2 sm:p-3 rounded-lg">
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1">Vidrios Normales</h3>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {categorizedGlassTypes.normalGlass.length} opción
                        {categorizedGlassTypes.normalGlass.length > 1 ? "es" : ""} disponible
                        {categorizedGlassTypes.normalGlass.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}

            {hasSafetyGlass && (
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300"
                onClick={() => setSelectedGlassCategory("safety")}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-green-100 p-2 sm:p-3 rounded-lg">
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1">Vidrios de Seguridad</h3>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {categorizedGlassTypes.safetyGlass.length} opción
                        {categorizedGlassTypes.safetyGlass.length > 1 ? "es" : ""} disponible
                        {categorizedGlassTypes.safetyGlass.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Product quotation view
  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-8">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToCategory}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Volver
              </Button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  {categoryName}
                  {selectedGlassCategory === "safety" && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Vidrio de Seguridad
                    </Badge>
                  )}
                  {selectedGlassCategory === "normal" && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Eye className="w-3 h-3 mr-1" />
                      Vidrio Normal
                    </Badge>
                  )}
                </h1>
                <p className="text-gray-600 text-xs sm:text-base">
                  {displayGlassTypes.length} tipo{displayGlassTypes.length > 1 ? "s" : ""} de vidrio disponible
                  {displayGlassTypes.length > 1 ? "s" : ""}
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
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Seleccionar Espesor de Vidrio</h3>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                {displayGlassTypes.map((glassType) => (
                  <div
                    key={glassType.code}
                    className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedGlassType === glassType.code
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedGlassType(glassType.code)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm sm:text-lg flex items-center gap-2">
                          {glassType.name}
                          <Badge variant="outline" className="text-xs">
                            {glassType.thickness}mm
                          </Badge>
                          {glassType.hasSolarControl && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                              <Sun className="w-3 h-3 mr-1" />
                              Control Solar
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">{glassType.description}</div>
                        {glassType.hasSolarControl && (
                          <div className="text-xs text-orange-600 mt-1">No dejan pasar el calor</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 self-start sm:self-center">{glassType.code}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Medidas del Corte</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unit Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de medida</label>
                  <Select value={unit} onValueChange={(value: "cm" | "mm") => setUnit(value)}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">Centímetros (cm)</SelectItem>
                      <SelectItem value="mm">Milímetros (mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dimensions Input */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ancho ({unit})</label>
                    <Input
                      type="number"
                      placeholder={`Ancho en ${unit}`}
                      value={width || ""}
                      onChange={(e) => setWidth(Number(e.target.value) || 0)}
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
                      className="text-center h-10 sm:h-11"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQuantity = Math.max(1, quantity - 1)
                        console.log("[v0] Decreasing quantity from", quantity, "to", newQuantity)
                        setQuantity(newQuantity)
                      }}
                      disabled={quantity <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-semibold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQuantity = quantity + 1
                        console.log("[v0] Increasing quantity from", quantity, "to", newQuantity)
                        setQuantity(newQuantity)
                      }}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-center mt-2 text-sm text-gray-600">
                    {quantity > 1 && `${quantity} piezas seleccionadas`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-4 sm:space-y-6">
            {/* Technical Diagram */}
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
                            width: Math.max(100, Math.min(180, width / 10)),
                            height: Math.max(60, Math.min(120, height / 10)),
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

            {/* Price Estimation */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <h3 className="text-base sm:text-lg font-semibold !text-gray-900" style={{ color: "#111827" }}>
                  Resumen del Pedido
                </h3>
              </CardHeader>
              <CardContent>
                {calculations.totalPrice > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start sm:items-center py-2 border-b gap-2">
                        <span className="text-gray-600 text-sm">Tipo de vidrio:</span>
                        <span className="font-medium text-sm text-right">
                          {currentGlassType?.name} {currentGlassType?.thickness}mm
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600 text-sm">Medidas:</span>
                        <span className="font-medium text-sm">
                          {width} × {height} {unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600 text-sm">Cantidad:</span>
                        <span className="font-medium text-sm">
                          {quantity} pieza{quantity > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 text-lg sm:text-xl font-bold text-green-600 bg-green-50 px-4 rounded-lg mt-6 gap-1 sm:gap-0">
                      <span>Precio Total:</span>
                      <span className="text-xl sm:text-2xl">${calculations.totalPrice.toLocaleString()}</span>
                    </div>

                    <div className="mt-6">
                      <Button
                        size="lg"
                        className="w-full px-12 py-4 text-lg font-semibold rounded-xl shadow-lg"
                        disabled={!calculations.totalPrice}
                        onClick={handleOrderClick}
                      >
                        Quiero hacer el pedido
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6 sm:py-8 text-sm sm:text-base">
                    Completa las medidas para ver el precio
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-4 left-4 right-4 lg:hidden">
          <Button
            size="lg"
            className="w-full rounded-xl shadow-lg h-14 text-base font-semibold"
            disabled={!calculations.totalPrice}
            onClick={handleOrderClick}
          >
            Quiero hacer el pedido
          </Button>
        </div>
      </div>
    </div>
  )
}
