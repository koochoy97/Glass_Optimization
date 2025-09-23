"use client"

import type React from "react"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Phone, User, MessageSquare, ShoppingCart, Tag, Loader2 } from "lucide-react"

interface QuotationData {
  categoryName: string
  glassType: string
  width: string
  height: string
  quantity: string
  unit: string
  thickness: string
  price: number
}

export function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const categoryId = searchParams.get("categoryId") || "343"

  const [quotationData] = useState<QuotationData | null>(() => {
    const categoryName = searchParams.get("categoryName") || ""
    const glassType = searchParams.get("glassType") || ""
    const width = searchParams.get("width") || ""
    const height = searchParams.get("height") || ""
    const quantity = searchParams.get("quantity") || "1"
    const unit = searchParams.get("unit") || "cm"
    const thickness = searchParams.get("thickness") || ""
    const priceParam = searchParams.get("price") || "0"
    const price = Number.parseFloat(priceParam)

    if (categoryName && glassType && width && height && price > 0) {
      return {
        categoryName,
        glassType,
        width,
        height,
        quantity,
        unit,
        thickness,
        price,
      }
    }
    return null
  })

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerComments, setCustomerComments] = useState("")
  const [error, setError] = useState("")

  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    originalPrice: number
  } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [couponBlurred, setCouponBlurred] = useState(false)

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^(\+54\s?)?(\d{2,4}\s?\d{4}\s?\d{4}|\d{10,11})$/
    return phoneRegex.test(phone.replace(/\s/g, ""))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove spaces and hyphens from input
    const filteredValue = e.target.value.replace(/[\s-]/g, "")
    setCustomerPhone(filteredValue)
    if (error.includes("celular") || error.includes("completá")) {
      setError("")
    }
  }

  const getCouponValidationMessage = () => {
    return null
  }

  const getCouponBlurError = () => {
    if (!couponBlurred || !couponCode.trim()) return null

    if (!customerPhone.trim()) {
      return "Debes completar tu número de teléfono en los datos de contacto para validar el código"
    }
    if (!isValidPhone(customerPhone)) {
      return "Debes ingresar un número de teléfono válido en los datos de contacto para validar el código"
    }
    return null
  }

  const validateCoupon = async () => {
    if (!couponCode.trim() || !customerPhone.trim()) {
      setCouponError("Por favor ingresa el código y tu número de teléfono en los datos de contacto")
      return
    }

    if (!isValidPhone(customerPhone)) {
      setCouponError("Por favor ingresa un número de teléfono válido en los datos de contacto")
      return
    }

    if (couponCode.toUpperCase() !== "PRIMERA10") {
      setCouponError("Código de descuento inválido")
      return
    }

    setCouponLoading(true)
    setCouponError("")

    try {
      const requestData = {
        phone: customerPhone,
        couponCode: couponCode.toUpperCase(),
      }

      console.log("[v0] Sending coupon validation request:", requestData)

      const response = await fetch("https://n8n.viprou.com/webhook/a17be231-bf89-4a64-bf22-044ef9ec95db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      console.log("[v0] Webhook response status:", response.status)
      console.log("[v0] Webhook response headers:", Object.fromEntries(response.headers.entries()))

      // Try to get response body regardless of status
      let responseData
      try {
        responseData = await response.json()
        console.log("[v0] Webhook response data:", responseData)
      } catch (jsonError) {
        const responseText = await response.text()
        console.log("[v0] Webhook response text:", responseText)
        responseData = responseText
      }

      if (response.ok && responseData?.validation === "Usuario No Existe") {
        // Fixed validation path - removed .data
        console.log("[v0] Coupon validation successful - new user")
        const discount = quotationData ? quotationData.price * 0.1 : 0
        setAppliedCoupon({
          code: couponCode.toUpperCase(),
          discount,
          originalPrice: quotationData?.price || 0,
        })
        setCouponError("")
      } else {
        console.log("[v0] Coupon validation failed - user already exists or other error")
        setCouponError("Este número ya utilizó el descuento de primera compra")
      }
    } catch (error) {
      console.error("[v0] Error validating coupon:", error)
      setCouponError("Error al validar el código. Intenta nuevamente.")
    } finally {
      setCouponLoading(false)
    }
  }

  const finalPrice = appliedCoupon ? (quotationData?.price || 0) - appliedCoupon.discount : quotationData?.price || 0

  const handleConfirmOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError(
        "⚠️ Para confirmar tu pedido necesitamos tu nombre completo y número de celular. Por favor, completá ambos campos.",
      )
      return
    }

    if (!quotationData) {
      setError("⚠️ No se encontraron datos de la cotización. Por favor, volvé a generar tu cotización.")
      return
    }

    setError("")

    try {
      const orderData = {
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          comments: customerComments.trim(),
        },
        order: {
          categoryId: categoryId,
          categoryName: quotationData.categoryName,
          glassType: quotationData.glassType,
          dimensions: {
            width: quotationData.width,
            height: quotationData.height,
            unit: quotationData.unit,
          },
          quantity: Number(quotationData.quantity),
          thickness: quotationData.thickness,
          totalPrice: finalPrice,
          ...(appliedCoupon && {
            coupon: {
              code: appliedCoupon.code,
              discount: appliedCoupon.discount,
              originalPrice: appliedCoupon.originalPrice,
            },
          }),
        },
        timestamp: new Date().toISOString(),
        source: "glass-quotation-system",
      }

      console.log("[v0] Sending order data to webhook:", orderData)

      const webhookResponse = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      if (!webhookResponse.ok) {
        console.error("[v0] Webhook failed:", webhookResponse.status, webhookResponse.statusText)
        const errorText = await webhookResponse.text()
        console.error("[v0] Webhook error response:", errorText)
      } else {
        const responseData = await webhookResponse.json()
        console.log("[v0] Webhook response:", responseData)
        console.log("[v0] Webhook sent successfully with status:", webhookResponse.status)
      }
    } catch (error) {
      console.error("[v0] Error sending webhook:", error)
    }

    const whatsappText = encodeURIComponent(
      `Hola, soy ${customerName.trim()} y quiero confirmar mi pedido de vidrios:\\n\\n📱 Mi teléfono: ${customerPhone.trim()}\\n\\n📋 Detalle del pedido:\\n- Categoría: ${quotationData.categoryName}\\n- Tipo de vidrio: ${quotationData.glassType}\\n- Dimensiones: ${quotationData.width}${quotationData.unit} x ${quotationData.height}${quotationData.unit}\\n- Cantidad: ${quotationData.quantity} pieza${Number(quotationData.quantity) > 1 ? "s" : ""}\\n- Espesor: ${quotationData.thickness}mm\\n\\n💰 Precio total: $${finalPrice.toLocaleString(
        "es-AR",
        {
          minimumFractionDigits: 2,
        },
      )}${customerComments.trim() ? `\\n\\n📝 Comentarios adicionales:\\n${customerComments.trim()}` : ""}\\n\\n¡Gracias!`,
    )

    const whatsappUrl = `https://wa.me/5491234567890?text=${whatsappText}`
    window.open(whatsappUrl, "_blank")

    setTimeout(() => {
      router.push(`/gracias?category=${categoryId}`)
    }, 1000)
  }

  const handleGoBack = () => {
    router.back()
  }

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      {quotationData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Resumen de tu Cotización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Categoría:</span>
                <span className="font-medium">{quotationData.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de vidrio:</span>
                <span className="font-medium">{quotationData.glassType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensiones:</span>
                <span className="font-medium">
                  {quotationData.width}
                  {quotationData.unit} x {quotationData.height}
                  {quotationData.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-medium">
                  {quotationData.quantity} pieza{Number(quotationData.quantity) > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Espesor:</span>
                <span className="font-medium">{quotationData.thickness}mm</span>
              </div>
              <div className="border-t pt-2 mt-2">
                {appliedCoupon ? (
                  <>
                    <div className="flex justify-between text-base text-gray-600">
                      <span>Precio sin descuento:</span>
                      <span className="line-through">
                        ${appliedCoupon.originalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-base text-green-600 mt-1">
                      <span>Descuento primera compra (10%):</span>
                      <span>−${appliedCoupon.discount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-green-600 mt-2">
                      <span>Precio Final:</span>
                      <span>${finalPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-lg font-bold">
                    <span>Precio Total:</span>
                    <span className="text-green-600">
                      ${quotationData.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Código de Descuento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>¡10% OFF en tu primera compra!</strong> Usa el código <strong>PRIMERA10</strong> y obtén un
              descuento especial.
            </p>
          </div>

          {!appliedCoupon ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="coupon-code" className="mb-1 block text-sm font-medium">
                  Código de descuento
                </Label>
                <Input
                  id="coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError("")
                    setCouponBlurred(false)
                  }}
                  onBlur={() => {
                    if (couponCode.trim()) {
                      setCouponBlurred(true)
                    }
                  }}
                  // Removed placeholder from coupon input
                  className="w-full"
                />
                {getCouponBlurError() && (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                    {getCouponBlurError()}
                  </div>
                )}
              </div>

              <Button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || !customerPhone.trim() || !isValidPhone(customerPhone) || couponLoading}
                className="w-full sm:w-auto"
              >
                {couponLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Código"
                )}
              </Button>

              {couponError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {couponError}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Código {appliedCoupon.code} aplicado correctamente. ¡Ahorraste $
                {appliedCoupon.discount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Datos de Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                onChange={handlePhoneChange}
                placeholder="Ej: 1112345678"
                className={`w-full ${!customerPhone.trim() && error ? "border-red-300 focus:border-red-500" : ""}`}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="customer-comments" className="mb-1 block text-sm font-medium">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Comentarios adicionales (opcional)
            </Label>
            <textarea
              id="customer-comments"
              value={customerComments}
              onChange={(e) => setCustomerComments(e.target.value)}
              placeholder="Escribí aquí cualquier aclaración o detalle especial que debamos saber sobre tu pedido…"
              className="w-full min-h-[120px] p-3 border-2 border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows={4}
            />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>

            <Button
              onClick={handleConfirmOrder}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              disabled={!quotationData}
            >
              <Phone className="h-4 w-4" />
              Confirmar Pedido por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
