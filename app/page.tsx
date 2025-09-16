"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"

interface WordPressCategory {
  id: number
  title: {
    rendered: string
  }
  // Add other fields as needed
}

const getCategoryIcon = (categoryName: string): string => {
  const name = categoryName.toLowerCase()

  if (name.includes("techo")) return "🏠"
  if (name.includes("puerta") && name.includes("ducha")) return "🚿"
  if (name.includes("puerta")) return "🚪"
  if (name.includes("ventana")) return "🪟"
  if (name.includes("baranda")) return "🏗️"
  if (name.includes("estante")) return "📚"
  if (name.includes("tapa") && name.includes("mesa")) return "🪑"
  if (name.includes("espejo")) return "🪞"
  if (name.includes("mampara")) return "🛁"

  // Default icon
  return "🪟"
}

export default function HomePage() {
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log("[v0] Fetching categories from WordPress API...")
        const response = await fetch("https://viprou.com/wp-json/wp/v2/categoria-de-vidrio/")

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Categories fetched successfully:", data)
        setCategories(data)
      } catch (err) {
        console.error("[v0] Error fetching categories:", err)
        setError(err instanceof Error ? err.message : "Error fetching categories")
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Viprou</h1>
              <p className="text-sm text-gray-600">Vidrios a medida 100% online</p>
            </div>
            <Link href={categories.length > 0 ? `/cotizacion?product=${categories[0].id}` : "/cotizacion"}>
              <Button className="bg-blue-600 hover:bg-blue-700">Cotizar Ahora</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Product Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">¿Qué tipo de vidrio necesitás?</h3>

          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-600">Cargando categorías...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link key={category.id} href={`/cotizacion?product=${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader className="text-center pb-4">
                      <div className="text-4xl mb-2">{getCategoryIcon(category.title.rendered)}</div>
                      <CardTitle className="text-lg">{category.title.rendered}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-sm text-gray-600 mb-4">Ver opciones disponibles</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Ver Opciones
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
