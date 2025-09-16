"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, MessageCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

function ThankYouContent() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get("category") || "343" // Default to 343 if not provided

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu pedido!</h1>
            <p className="text-gray-600">Tu cotización ha sido enviada exitosamente por WhatsApp</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <MessageCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-800">
              Hemos abierto WhatsApp con todos los detalles de tu pedido. Nuestro equipo te responderá pronto con la
              confirmación final.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Próximos pasos:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Revisa el mensaje en WhatsApp y envíalo</li>
              <li>• Nuestro equipo confirmará tu pedido</li>
              <li>• Te contactaremos para coordinar la entrega</li>
            </ul>
          </div>

          <div className="mt-8 space-y-3">
            <Link href={`/cotizacion?product=${categoryId}`}>
              <Button className="w-full">Hacer otra cotización</Button>
            </Link>
            <Link href="https://viprou.com/">
              <Button variant="outline" className="w-full bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  )
}
