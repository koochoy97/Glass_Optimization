"use client"

import { CheckCircle, TrendingDown, X, Share2, Download, Star } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"

interface SavingsNotificationProps {
  originalPrice: number
  optimizedPrice: number
  onClose: () => void
}

export default function SavingsNotification({ originalPrice, optimizedPrice, onClose }: SavingsNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => {
      setIsVisible(true)

      // Lanzar confetti para celebrar el ahorro
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }, 300)

    // Auto-cerrar después de 30 segundos (aumentado de 15s)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 500) // Dar tiempo para la animación de salida
    }, 30000)

    return () => clearTimeout(timer)
  }, [onClose])

  // Calcular ahorro con valores precisos
  const savings = Math.max(0, originalPrice - optimizedPrice)
  const savingsPercentage = originalPrice > 0 ? (savings / originalPrice) * 100 : 0

  // Registrar valores para depuración
  console.log("Notificación de ahorro - Precio original:", originalPrice)
  console.log("Notificación de ahorro - Precio optimizado:", optimizedPrice)
  console.log("Notificación de ahorro - Ahorro calculado:", savings)
  console.log("Notificación de ahorro - Porcentaje de ahorro:", savingsPercentage)

  // Formatear números grandes con separadores de miles
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-500 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full transform transition-all duration-500 ease-in-out ${
          isVisible ? "scale-100" : "scale-90"
        }`}
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-white/20 p-2 rounded-full mr-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-white text-xl font-bold">¡OPTIMIZACIÓN EXITOSA!</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 500)
            }}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-green-100 p-4 rounded-full mb-4 animate-pulse">
              <TrendingDown className="h-12 w-12 text-green-600" />
            </div>

            <div className="text-center mb-2">
              <h3 className="text-2xl font-bold text-gray-800">¡Has ahorrado un</h3>
              <div className="text-4xl font-extrabold text-green-600 my-1">{savingsPercentage.toFixed(1)}%</div>
              <h3 className="text-2xl font-bold text-gray-800">con nuestra optimización!</h3>
            </div>

            <div className="flex items-center justify-center gap-2 mt-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-md">
                Sin optimización
              </div>
              <p className="text-sm text-red-600 mt-4">Precio original:</p>
              <p className="text-2xl font-bold text-red-700 line-through">${formatCurrency(originalPrice)}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-md">
                Con optimización
              </div>
              <p className="text-sm text-green-600 mt-4">Precio optimizado:</p>
              <p className="text-2xl font-bold text-green-700">${formatCurrency(optimizedPrice)}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-medium text-green-800">Ahorro total:</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">${formatCurrency(savings)}</div>
              </div>
            </div>
          </div>

          {showDetails && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 animate-fadeIn">
              <h4 className="font-medium text-blue-800 mb-2">¿Cómo funciona nuestra optimización?</h4>
              <p className="text-sm text-blue-700">
                Nuestro sistema analiza inteligentemente la distribución de cortes en las hojas de vidrio, maximizando
                el uso del material y reduciendo el desperdicio. Esto se traduce en un ahorro significativo para tu
                negocio y contribuye a la sostenibilidad ambiental.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              {showDetails ? "Ocultar detalles" : "Ver más detalles"}
            </Button>

            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                // Aquí podrías implementar la funcionalidad para compartir
                alert("¡Comparte este increíble ahorro con tus colegas!")
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Compartir ahorro
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                // Aquí podrías implementar la funcionalidad para descargar el informe
                alert("Descargando informe de ahorro...")
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Descargar informe
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Este ahorro se logra mediante la optimización inteligente de cortes en las hojas de vidrio.
            <br />
            ¡Gracias por confiar en nuestro sistema de optimización!
          </p>
        </div>
      </div>
    </div>
  )
}
