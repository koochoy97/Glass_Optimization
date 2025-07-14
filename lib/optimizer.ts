// lib/optimizer.ts

import type { GlassType } from "./glass-data"
import type { OrderItem } from "./calculator"

// Tipos de vidrio que se pueden vender por media hoja
export const HALF_SHEET_GLASS_TYPES = [
  "Float Incoloro 2mm",
  "Float Incoloro 3mm", // F3
  "Float Incoloro 4mm", // F4
  "Float Incoloro 5mm", // F5
  "Float Incoloro 6mm", // F6 - ESTE SÍ se vende por media hoja
  "Laminado 3+3 Incoloro", // Laminado 3+3
  "Espejo Incoloro 2mm", // Espejo 2mm - AGREGADO
  "Espejo Incoloro 3mm", // Espejo 3mm
  "Espejo Incoloro 4mm", // Espejo 4mm
  "Espejo Incoloro 5mm", // Espejo 5mm
  "Espejo Incoloro 6mm", // Espejo 6mm
  "Laminado 4+4 Incoloro", // 4+4
  "Laminado 5+5 Incoloro", // 5+5
]

// Función para verificar si un tipo de vidrio se puede vender por media hoja
export function canSellHalfSheet(glassTypeName: string): boolean {
  if (!glassTypeName) return false

  // Verificar coincidencia exacta
  if (HALF_SHEET_GLASS_TYPES.includes(glassTypeName)) {
    return true
  }

  // Verificar coincidencia parcial para tipos como "Float 3mm" o "F3"
  const normalizedName = glassTypeName.toLowerCase()

  // EXCLUIR específicamente el 2.2mm que se vende por hoja entera
  if (normalizedName.includes("2.2mm") || normalizedName.includes("2,2mm")) {
    return false
  }

  // EXCLUIR específicamente el Float 12mm que NO se vende por media hoja
  if (normalizedName.includes("12mm") && normalizedName.includes("float")) {
    return false
  }

  // EXCLUIR específicamente el Float 8mm y 10mm que NO se venden por media hoja
  if (normalizedName.includes("float") && (normalizedName.includes("8mm") || normalizedName.includes("10mm"))) {
    return false
  }

  if (
    normalizedName.includes("float") &&
    (normalizedName.includes("3mm") ||
      normalizedName.includes("4mm") ||
      normalizedName.includes("5mm") ||
      normalizedName.includes("6mm") ||
      normalizedName.includes("f3") ||
      normalizedName.includes("f4") ||
      normalizedName.includes("f5") ||
      normalizedName.includes("f6") ||
      normalizedName.includes("2mm"))
  ) {
    return true
  }

  if (
    normalizedName.includes("espejo") &&
    (normalizedName.includes("2mm") ||
      normalizedName.includes("3mm") ||
      normalizedName.includes("4mm") ||
      normalizedName.includes("5mm") ||
      normalizedName.includes("6mm"))
  ) {
    return true
  }

  if (
    normalizedName.includes("laminado") &&
    (normalizedName.includes("3+3") || normalizedName.includes("4+4") || normalizedName.includes("5+5"))
  ) {
    return true
  }

  return false
}

// NUEVA FUNCIÓN: Calcular hojas necesarias basado en la nueva lógica de cobro
export function calculateSheetsNeeded(
  totalCutArea: number,
  glassType: GlassType,
  allowHalfSheet = true,
): {
  fullSheets: number
  halfSheets: number
  totalArea: number
} {
  const fullSheetArea = (glassType.width / 1000) * (glassType.height / 1000)
  const halfSheetArea = fullSheetArea / 2
  const canUseHalfSheet = allowHalfSheet && canSellHalfSheet(glassType.name)

  if (!canUseHalfSheet) {
    // Si no se puede vender por media hoja, siempre cobrar hojas completas
    const fullSheetsNeeded = Math.ceil(totalCutArea / fullSheetArea)
    return {
      fullSheets: fullSheetsNeeded,
      halfSheets: 0,
      totalArea: fullSheetsNeeded * fullSheetArea,
    }
  }

  // NUEVA LÓGICA: Para productos que permiten media hoja
  // Si el área solicitada es <= 50% de la hoja, cobrar media hoja
  // Si el área solicitada es > 50% de la hoja, cobrar hoja completa

  let fullSheets = 0
  let halfSheets = 0
  let remainingArea = totalCutArea

  // Procesar de a hojas completas primero
  while (remainingArea > fullSheetArea) {
    fullSheets++
    remainingArea -= fullSheetArea
  }

  // Para el área restante, aplicar la nueva lógica
  if (remainingArea > 0) {
    if (remainingArea <= halfSheetArea) {
      // Si es <= 50% de la hoja, cobrar media hoja
      halfSheets = 1
    } else {
      // Si es > 50% de la hoja, cobrar hoja completa
      fullSheets++
    }
  }

  const totalArea = fullSheets * fullSheetArea + halfSheets * halfSheetArea

  return {
    fullSheets,
    halfSheets,
    totalArea,
  }
}

// Función actualizada para calcular hojas óptimas
export function calculateOptimalSheets(
  items: OrderItem[] | undefined,
  glassType: GlassType | undefined,
  allowHalfSheet = true,
): {
  fullSheets: number
  halfSheets: number
  totalArea: number
  usedArea: number
  wastePercentage: number
} {
  // Si glassType es undefined, devolver valores por defecto
  if (!glassType) {
    return {
      fullSheets: 0,
      halfSheets: 0,
      totalArea: 0,
      usedArea: 0,
      wastePercentage: 0,
    }
  }

  // Asegurarnos de que items sea un array, incluso si es undefined
  const safeItems = items || []

  // Filtrar solo los items del tipo de vidrio actual
  const relevantItems = safeItems.filter((item) => item.glassType === glassType.name)

  if (relevantItems.length === 0) {
    return {
      fullSheets: 0,
      halfSheets: 0,
      totalArea: 0,
      usedArea: 0,
      wastePercentage: 0,
    }
  }

  // Calcular el área total de los cortes
  let totalCutArea = 0
  relevantItems.forEach((item) => {
    const cutArea = (item.width / 1000) * (item.height / 1000)
    totalCutArea += cutArea * item.quantity
  })

  // Usar la nueva función de cálculo
  const { fullSheets, halfSheets, totalArea } = calculateSheetsNeeded(totalCutArea, glassType, allowHalfSheet)

  // Calcular el desperdicio
  const usedArea = totalCutArea
  const wastePercentage = totalArea > 0 ? ((totalArea - usedArea) / totalArea) * 100 : 0

  return {
    fullSheets,
    halfSheets,
    totalArea,
    usedArea,
    wastePercentage,
  }
}

// Función actualizada para calcular precio optimizado
export function calculateOptimizedPrice(
  items: OrderItem[] | undefined,
  glassType: GlassType | undefined,
  allowHalfSheet = true,
): {
  price: number
  fullSheets: number
  halfSheets: number
  totalArea: number
  usedArea: number
  wastePercentage: number
} {
  // Si glassType es undefined, devolver valores por defecto
  if (!glassType) {
    return {
      price: 0,
      fullSheets: 0,
      halfSheets: 0,
      totalArea: 0,
      usedArea: 0,
      wastePercentage: 0,
    }
  }

  const { fullSheets, halfSheets, totalArea, usedArea, wastePercentage } = calculateOptimalSheets(
    items,
    glassType,
    allowHalfSheet,
  )

  // Calcular el precio basado en hojas completas y medias hojas
  const fullSheetPrice = glassType.price * ((glassType.width / 1000) * (glassType.height / 1000))
  const halfSheetPrice = fullSheetPrice / 2

  const totalPrice = fullSheets * fullSheetPrice + halfSheets * halfSheetPrice

  return {
    price: totalPrice,
    fullSheets,
    halfSheets,
    totalArea,
    usedArea,
    wastePercentage,
  }
}

// NUEVA FUNCIÓN: Calcular precio para un pedido individual (útil para mostrar precios por item)
export function calculateItemOptimizedPrice(
  item: OrderItem,
  glassType: GlassType,
): {
  price: number
  fullSheets: number
  halfSheets: number
  description: string
} {
  const itemArea = (item.width / 1000) * (item.height / 1000) * item.quantity
  const { fullSheets, halfSheets, totalArea } = calculateSheetsNeeded(itemArea, glassType)

  const fullSheetPrice = glassType.price * ((glassType.width / 1000) * (glassType.height / 1000))
  const halfSheetPrice = fullSheetPrice / 2
  const totalPrice = fullSheets * fullSheetPrice + halfSheets * halfSheetPrice

  // Generar descripción del cobro
  let description = ""
  if (fullSheets > 0 && halfSheets > 0) {
    description = `${fullSheets} hoja${fullSheets > 1 ? "s" : ""} completa${fullSheets > 1 ? "s" : ""} + ${halfSheets} media hoja`
  } else if (fullSheets > 0) {
    description = `${fullSheets} hoja${fullSheets > 1 ? "s" : ""} completa${fullSheets > 1 ? "s" : ""}`
  } else if (halfSheets > 0) {
    description = `${halfSheets} media hoja`
  }

  return {
    price: totalPrice,
    fullSheets,
    halfSheets,
    description,
  }
}
