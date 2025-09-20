"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, AlertCircle } from "lucide-react"

interface CouponFieldProps {
  totalPrice: number
  onCouponApplied: (discount: number, finalPrice: number) => void
  onCouponRemoved: () => void
}

const COUPON_CODE = "PRIMERA10"
const COUPON_DISCOUNT = 0.1

export function CouponField({ totalPrice, onCouponApplied, onCouponRemoved }: CouponFieldProps) {
  const [couponCode, setCouponCode] = useState("")
  const [couponStatus, setCouponStatus] = useState<"idle" | "applied" | "invalid" | "not-eligible">("idle")
  const [isLoading, setIsLoading] = useState(false)

  // Reset coupon when total price changes to 0
  useEffect(() => {
    if (totalPrice === 0 && couponStatus === "applied") {
      handleRemoveCoupon()
    }
  }, [totalPrice, couponStatus])

  const validateFirstTimePurchase = async (email?: string): Promise<boolean> => {
    // For now, simulate validation - in real implementation this would check against order history
    // If no email provided (not logged in), allow application but will be revalidated at checkout
    if (!email) {
      return true // Allow session-based application
    }

    // Simulate API call to check purchase history
    // In real implementation: check if email exists in order history
    return Math.random() > 0.3 // 70% chance of being first-time customer for demo
  }

  const applyCoupon = async () => {
    if (!couponCode.trim() || totalPrice === 0) return

    setIsLoading(true)

    try {
      if (couponCode.toUpperCase() !== COUPON_CODE) {
        setCouponStatus("invalid")
        setIsLoading(false)
        return
      }

      // Validate first-time purchase (without email for now)
      const isFirstTime = await validateFirstTimePurchase()

      if (!isFirstTime) {
        setCouponStatus("not-eligible")
        setIsLoading(false)
        return
      }

      // Apply discount
      const discountAmount = totalPrice * COUPON_DISCOUNT
      const finalPrice = totalPrice * (1 - COUPON_DISCOUNT)

      setCouponStatus("applied")
      onCouponApplied(discountAmount, finalPrice)
    } catch (error) {
      console.error("Error applying coupon:", error)
      setCouponStatus("invalid")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode("")
    setCouponStatus("idle")
    onCouponRemoved()
  }

  const handleInputChange = (value: string) => {
    setCouponCode(value)
    if (couponStatus !== "idle") {
      setCouponStatus("idle")
      onCouponRemoved()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="coupon-input" className="block text-sm font-medium text-gray-700 mb-2">
            ¿Tenés un código de descuento?
          </label>
          <div className="flex gap-2">
            <Input
              id="coupon-input"
              type="text"
              placeholder="Ingresá tu código"
              value={couponCode}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={couponStatus === "applied" || isLoading}
              className="flex-1"
            />
            {couponStatus === "applied" ? (
              <Button variant="outline" onClick={handleRemoveCoupon} className="px-4 bg-transparent">
                Quitar
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={applyCoupon}
                disabled={!couponCode.trim() || totalPrice === 0 || isLoading}
                className="px-4"
              >
                {isLoading ? "..." : "Aplicar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {couponStatus === "applied" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-green-700 text-sm font-medium">¡Listo! Aplicamos 10% OFF de primera compra.</span>
        </div>
      )}

      {couponStatus === "invalid" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-red-700 text-sm font-medium">El código no es válido.</span>
        </div>
      )}

      {couponStatus === "not-eligible" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span className="text-orange-700 text-sm font-medium">Este beneficio es solo para tu primera compra.</span>
        </div>
      )}
    </div>
  )
}
