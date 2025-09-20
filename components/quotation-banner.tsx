"use client"

import { Gift } from "lucide-react"

export function QuotationBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <Gift className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            🎁 10% OFF en tu primera compra con el código <span className="font-bold text-blue-600">PRIMERA10</span> ·
            Ingresalo debajo del "Precio Total".
          </p>
        </div>
      </div>
    </div>
  )
}
