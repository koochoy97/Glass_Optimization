"use client"

import { Suspense } from "react"
import { CheckoutForm } from "@/components/checkout-form"

function CheckoutContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Completar Pedido</h1>
            <p className="text-gray-600">Ingresá tus datos para confirmar tu cotización de vidrios</p>
          </div>

          <CheckoutForm />
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando formulario...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
