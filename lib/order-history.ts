import type { OrderItem } from "./calculator"

// Tipo para un pedido guardado
export interface SavedOrder {
  id: string
  date: Date
  items: OrderItem[]
  totalPrice: number
  optimizedPrice: number
  status: "pending" | "processed" | "completed" | "cancelled"
}

// Simulación de almacenamiento local
let orderHistory: SavedOrder[] = []

// Guardar un pedido en el historial
export function saveOrder(items: OrderItem[], totalPrice: number, optimizedPrice: number): SavedOrder {
  const newOrder: SavedOrder = {
    id: `order-${Date.now()}`,
    date: new Date(),
    items: [...items],
    totalPrice,
    optimizedPrice,
    status: "processed",
  }

  orderHistory = [newOrder, ...orderHistory]
  return newOrder
}

// Obtener todos los pedidos
export function getOrderHistory(): SavedOrder[] {
  return [...orderHistory]
}

// Obtener un pedido específico
export function getOrderById(id: string): SavedOrder | undefined {
  return orderHistory.find((order) => order.id === id)
}

// Actualizar un pedido existente
export function updateOrder(id: string, updates: Partial<SavedOrder>): SavedOrder | null {
  const index = orderHistory.findIndex((order) => order.id === id)
  if (index === -1) return null

  orderHistory[index] = { ...orderHistory[index], ...updates }
  return orderHistory[index]
}

// Cambiar el estado de un pedido
export function changeOrderStatus(id: string, status: SavedOrder["status"]): boolean {
  const order = getOrderById(id)
  if (!order) return false

  updateOrder(id, { status })
  return true
}
