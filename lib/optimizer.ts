// lib/optimizer.ts

import type { GlassType } from "./glass-data"
import type { OrderItem } from "./calculator"

// Tipos de vidrio que se pueden vender por media hoja
export const HALF_SHEET_GLASS_TYPES = [
  "Float Incoloro 3mm", // F3
  "Float Incoloro 4mm", // F4
  "Laminado 3+3 Incoloro", // Laminado 3+3
  "Espejo Incoloro 3mm", // Espejo 3mm
  "Espejo Incoloro 4mm", // Espejo 4mm
  "Float Incoloro 5mm", // F5
  "Float Incoloro 6mm", // F6
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

  if (
    normalizedName.includes("float") &&
    (normalizedName.includes("3mm") ||
      normalizedName.includes("4mm") ||
      normalizedName.includes("5mm") ||
      normalizedName.includes("6mm") ||
      normalizedName.includes("f3") ||
      normalizedName.includes("f4") ||
      normalizedName.includes("f5") ||
      normalizedName.includes("f6"))
  ) {
    return true
  }

  if (
    normalizedName.includes("espejo") &&
    (normalizedName.includes("3mm") ||
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

// Modificar la función calculateOptimalSheets para manejar el caso cuando items es undefined
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

  // Área de una hoja completa en m²
  const fullSheetArea = (glassType.width / 1000) * (glassType.height / 1000)

  // Área de media hoja en m²
  const halfSheetArea = fullSheetArea / 2

  // Verificar si este tipo de vidrio se puede vender por media hoja
  const canUseHalfSheet = allowHalfSheet && canSellHalfSheet(glassType.name)

  // Calcular el número óptimo de hojas
  if (canUseHalfSheet) {
    // Si se puede vender por media hoja, calcular la combinación óptima
    const fullSheetsNeeded = Math.floor(totalCutArea / fullSheetArea)
    const remainingArea = totalCutArea - fullSheetsNeeded * fullSheetArea

    // Determinar si necesitamos media hoja adicional
    let halfSheetsNeeded = 0
    if (remainingArea > 0) {
      if (remainingArea <= halfSheetArea) {
        halfSheetsNeeded = 1
      } else {
        // Si el área restante es mayor que media hoja, necesitamos una hoja completa
        halfSheetsNeeded = 0
        const fullSheetsTotal = fullSheetsNeeded + 1

        // Calcular el área total y el desperdicio
        const totalArea = fullSheetsTotal * fullSheetArea
        const usedArea = totalCutArea
        const wastePercentage = ((totalArea - usedArea) / totalArea) * 100

        return {
          fullSheets: fullSheetsTotal,
          halfSheets: 0,
          totalArea,
          usedArea,
          wastePercentage,
        }
      }
    }

    // Calcular el área total y el desperdicio
    const totalArea = fullSheetsNeeded * fullSheetArea + halfSheetsNeeded * halfSheetArea
    const usedArea = totalCutArea
    const wastePercentage = ((totalArea - usedArea) / totalArea) * 100

    return {
      fullSheets: fullSheetsNeeded,
      halfSheets: halfSheetsNeeded,
      totalArea,
      usedArea,
      wastePercentage,
    }
  } else {
    // Si no se puede vender por media hoja, calcular hojas completas
    const fullSheetsNeeded = Math.ceil(totalCutArea / fullSheetArea)

    // Calcular el área total y el desperdicio
    const totalArea = fullSheetsNeeded * fullSheetArea
    const usedArea = totalCutArea
    const wastePercentage = ((totalArea - usedArea) / totalArea) * 100

    return {
      fullSheets: fullSheetsNeeded,
      halfSheets: 0,
      totalArea,
      usedArea,
      wastePercentage,
    }
  }
}

// También actualizar la firma de la función calculateOptimizedPrice
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
