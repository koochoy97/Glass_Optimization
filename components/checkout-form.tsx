"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Phone, User, MessageSquare, ShoppingCart } from "lucide-react"

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
          totalPrice: quotationData.price,
        },
        timestamp: new Date().toISOString(),
        source: "glass-quotation-system",
      }

      console.log("[v0] Sending order data to webhook:", orderData)

      // Send to webhook
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
      // Don't block the user flow, just log the error
    }

    const whatsappText = encodeURIComponent(
      `Hola, soy ${customerName.trim()} y quiero confirmar mi pedido de vidrios:\n\n📱 Mi teléfono: ${customerPhone.trim()}\n\n📋 Detalle del pedido:\n- Categoría: ${quotationData.categoryName}\n- Tipo de vidrio: ${quotationData.glassType}\n- Dimensiones: ${quotationData.width}${quotationData.unit} x ${quotationData.height}${quotationData.unit}\n- Cantidad: ${quotationData.quantity} pieza${Number(quotationData.quantity) > 1 ? "s" : ""}\n- Espesor: ${quotationData.thickness}mm\n\n💰 Precio total: $${quotationData.price.toLocaleString(
        "es-AR",
        {
          minimumFractionDigits: 2,
        },
      )}${customerComments.trim() ? `\n\n📝 Comentarios adicionales:\n${customerComments.trim()}` : ""}\n\n¡Gracias!`,
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
                <div className="flex justify-between text-lg font-bold">
                  <span>Precio Total:</span>
                  <span className="text-green-600">
                    ${quotationData.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
