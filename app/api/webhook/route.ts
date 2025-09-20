import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    console.log("[v0] Webhook received order data:", JSON.stringify(orderData, null, 2))

    const hasCoupon = orderData.order.coupon && orderData.order.coupon.code
    const discountPercentage = hasCoupon ? "10%" : "0%"
    const originalPrice = hasCoupon ? orderData.order.coupon.originalPrice : orderData.order.totalPrice

    const transformedData = {
      body: {
        orderItems: [
          {
            glassType: orderData.order.glassType,
            width: Number.parseInt(orderData.order.dimensions.width),
            height: Number.parseInt(orderData.order.dimensions.height),
            quantity: orderData.order.quantity,
            customerComments: orderData.customer.comments || "",
            customerName: orderData.customer.name,
            customerPhone: orderData.customer.phone,
            ...(hasCoupon && {
              couponCode: orderData.order.coupon.code,
              couponDiscount: orderData.order.coupon.discount,
            }),
          },
        ],
        precio_sin_optimizar: originalPrice,
        precio_optimizado: orderData.order.totalPrice, // Final price after discount
        descuento_aplicado: discountPercentage, // Use actual discount percentage
        ...(hasCoupon && {
          coupon_aplicado: {
            codigo: orderData.order.coupon.code,
            descuento_monto: orderData.order.coupon.discount,
            precio_original: orderData.order.coupon.originalPrice,
          },
        }),
      },
    }

    const externalWebhookUrl =
      process.env.EXTERNAL_WEBHOOK_URL || "https://n8n.viprou.com/webhook/103b1e30-807f-4bba-a65f-9698f0c23d2c"

    console.log("[v0] Sending to external webhook:", externalWebhookUrl)
    console.log("[v0] Transformed data being sent:", JSON.stringify(transformedData, null, 2))

    const externalResponse = await fetch(externalWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transformedData),
    })

    console.log("[v0] External webhook response status:", externalResponse.status)

    const responseText = await externalResponse.text()
    console.log("[v0] External webhook response:", responseText)

    if (!externalResponse.ok) {
      console.error("[v0] External webhook failed:", externalResponse.status)
      return NextResponse.json({ error: "External webhook failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Order data received successfully",
      orderId: `ORDER_${Date.now()}`,
    })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
