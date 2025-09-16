// Definición de tipos para los datos de vidrio
export interface GlassType {
  name: string
  code: string
  width: number
  height: number
  price: number
  thickness?: number
  description?: string
}

// Definición de productos con sus tipos de vidrio específicos
export interface ProductCategory {
  id: string
  name: string
  icon: string
  glassTypes: GlassType[]
}

// Lista de productos con sus tipos de vidrio específicos según especificaciones
export const productCategories: ProductCategory[] = [
  {
    id: "ventana",
    name: "Ventana",
    icon: "🪟",
    glassTypes: [
      // Vidrio normal
      {
        name: "Float Incoloro 3mm",
        code: "FL103",
        width: 3600,
        height: 2500,
        price: 11139.97,
        thickness: 3,
        description: "Float Incoloro 3mm",
      },
      {
        name: "Float Incoloro 4mm",
        code: "FL104",
        width: 3600,
        height: 2500,
        price: 13700.14,
        thickness: 4,
        description: "Float Incoloro 4mm",
      },
      {
        name: "Float Incoloro 5mm",
        code: "FL105",
        width: 3600,
        height: 2500,
        price: 18042.49,
        thickness: 5,
        description: "Float Incoloro 5mm",
      },
      // Vidrio de seguridad
      {
        name: "Laminado 3+3",
        code: "LAMI33",
        width: 3600,
        height: 2500,
        price: 39809.73,
        thickness: 6,
        description: "Laminado 3+3 (Vidrio de seguridad)",
      },
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4 (Vidrio de seguridad)",
      },
      {
        name: "Laminado 5+5",
        code: "LAMI55",
        width: 3600,
        height: 2500,
        price: 59790.86,
        thickness: 10,
        description: "Laminado 5+5 (Vidrio de seguridad)",
      },
    ],
  },
  {
    id: "espejo",
    name: "Espejo",
    icon: "🪞",
    glassTypes: [
      {
        name: "Espejo 3mm",
        code: "ESPI03",
        width: 3600,
        height: 2500,
        price: 23990.21,
        thickness: 3,
        description: "Espejo 3mm",
      },
      {
        name: "Espejo 4mm",
        code: "ESPI04",
        width: 3600,
        height: 2500,
        price: 28975.32,
        thickness: 4,
        description: "Espejo 4mm",
      },
      {
        name: "Espejo 5mm",
        code: "ESPI05",
        width: 3600,
        height: 2500,
        price: 33197.47,
        thickness: 5,
        description: "Espejo 5mm",
      },
    ],
  },
  {
    id: "mampara",
    name: "Mampara",
    icon: "🚿",
    glassTypes: [
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4",
      },
      {
        name: "Laminado 5+5",
        code: "LAMI55",
        width: 3600,
        height: 2500,
        price: 59790.86,
        thickness: 10,
        description: "Laminado 5+5",
      },
    ],
  },
  {
    id: "techo",
    name: "Techo",
    icon: "🏠",
    glassTypes: [
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4",
      },
      {
        name: "Laminado Solar 4+4",
        code: "LAMSV44",
        width: 3600,
        height: 2500,
        price: 101594.75,
        thickness: 8,
        description: "Laminado Solar 4+4 - Control Solar (No deja pasar el calor)",
      },
    ],
  },
  {
    id: "tapa-mesa",
    name: "Tapa de Mesa",
    icon: "🪑",
    glassTypes: [
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4",
      },
      {
        name: "Laminado 5+5",
        code: "LAMI55",
        width: 3600,
        height: 2500,
        price: 59790.86,
        thickness: 10,
        description: "Laminado 5+5",
      },
    ],
  },
  {
    id: "baranda",
    name: "Baranda",
    icon: "🛡️",
    glassTypes: [
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4",
      },
    ],
  },
  {
    id: "estante",
    name: "Estante",
    icon: "📚",
    glassTypes: [
      {
        name: "Float Incoloro 8mm",
        code: "FLI08",
        width: 3600,
        height: 2500,
        price: 30100.95,
        thickness: 8,
        description: "Float Incoloro 8mm",
      },
      {
        name: "Float Incoloro 10mm",
        code: "FLI10",
        width: 3600,
        height: 2500,
        price: 37654.25,
        thickness: 10,
        description: "Float Incoloro 10mm",
      },
    ],
  },
  {
    id: "puerta",
    name: "Puerta",
    icon: "🚪",
    glassTypes: [
      {
        name: "Laminado 3+3",
        code: "LAMI33",
        width: 3600,
        height: 2500,
        price: 39809.73,
        thickness: 6,
        description: "Laminado 3+3",
      },
      {
        name: "Laminado 4+4",
        code: "LAMI44",
        width: 3600,
        height: 2500,
        price: 49734.75,
        thickness: 8,
        description: "Laminado 4+4",
      },
    ],
  },
]

// Mantener compatibilidad con código existente
export const glassTypes: GlassType[] = productCategories.flatMap((category) => category.glassTypes)

// Helper functions to categorize glass types
export const isLaminatedGlass = (glassType: GlassType): boolean => {
  return glassType.code.startsWith("LAMI") || glassType.code.startsWith("MSIV")
}

export const categorizeGlassTypes = (glassTypes: GlassType[]) => {
  const safetyGlass = glassTypes.filter(isLaminatedGlass)
  const normalGlass = glassTypes.filter((glass) => !isLaminatedGlass(glass))

  return {
    safetyGlass: safetyGlass.map((glass) => ({
      ...glass,
      description: glass.description?.includes("(Vidrio de seguridad)")
        ? glass.description
        : `${glass.name} (Vidrio de seguridad)`,
    })),
    normalGlass: normalGlass.map((glass) => ({
      ...glass,
      description: glass.name,
    })),
  }
}
