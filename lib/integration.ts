// lib/integration.ts
import type { OrderItem } from "./calculator"

// Función para procesar un nuevo pedido
export function procesarPedidoNuevo(items: OrderItem[]) {
  // Simulación de procesamiento de pedido
  console.log("Procesando pedido nuevo:", items)

  // Crear un resultado simulado
  const resultado = {
    hojas: items.map((item, index) => ({
      id: `hoja-${index + 1}`,
      tipoVidrio: item.glassType,
      ancho: 3600,
      alto: 2500,
      cortes: [
        {
          id: `corte-${index + 1}`,
          ancho: item.width,
          alto: item.height,
          cantidad: item.quantity,
          x: 0,
          y: 0,
        },
      ],
    })),
    optimizado: true,
    desperdicio: 15, // Porcentaje de desperdicio simulado
    tiempoEstimado: "2 horas",
  }

  return { resultado }
}

// Función para obtener información de hojas
export function obtenerInformacionHojas() {
  // Simulación de información de hojas
  return {
    hojas: [
      {
        id: "hoja-1",
        tipoVidrio: "Float Incoloro 4mm", // Actualizado para coincidir con glass-data.ts
        superficieTotal: 3600 * 2500, // en mm²
        superficieRestante: 3600 * 2500 * 0.85, // 15% utilizado
        cortes: [],
      },
      {
        id: "hoja-2",
        tipoVidrio: "Laminado 3+3 Incoloro", // Actualizado para coincidir con glass-data.ts
        superficieTotal: 3600 * 2500, // en mm²
        superficieRestante: 3600 * 2500 * 0.7, // 30% utilizado
        cortes: [],
      },
    ],
  }
}

// Función para reiniciar el sistema de optimización
export function reiniciarSistemaOptimizacion() {
  console.log("Sistema de optimización reiniciado")
  return true
}
