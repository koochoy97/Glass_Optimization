"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

interface SuccessMessageProps {
  onNewOrder: () => void
}

export default function SuccessMessage({ onNewOrder }: SuccessMessageProps) {
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
            <Button onClick={onNewOrder} className="bg-blue-600 hover:bg-blue-700">
              Realizar otro pedido
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
