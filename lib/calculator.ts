// lib/calculator.ts

// Definición del tipo OrderItem
export interface OrderItem {
  id: string
  glassType: string
  width: number
  height: number
  quantity: number
}

// Función para calcular el precio de un ítem
export function calculateItemPrice(item: OrderItem, pricePerM2: number): number {
  const areaM2 = (item.width / 1000) * (item.height / 1000)
  return areaM2 * pricePerM2 * item.quantity
}

// Función para calcular el precio total de una lista de ítems
export function calculateTotalPrice(items: OrderItem[], priceMap: Record<string, number>): number {
  return items.reduce((total, item) => {
    const pricePerM2 = priceMap[item.glassType] || 0
    return total + calculateItemPrice(item, pricePerM2)
  }, 0)
}
