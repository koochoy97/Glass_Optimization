# Sistema de Optimización de Vidrios

Sistema inteligente para optimizar cortes de vidrio y reducir desperdicios.

## 🚀 Deploy con Coolify

### Requisitos previos
- Coolify instalado y configurado
- Docker disponible en el servidor
- Node.js 18+ (para desarrollo local)

### Configuración en Coolify

1. **Crear nuevo proyecto en Coolify:**
   - Conecta tu repositorio Git
   - Selecciona "Docker Compose" como tipo de aplicación
   - Coolify detectará automáticamente el `docker-compose.yml`

2. **Variables de entorno (opcional):**
   \`\`\`bash
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   PORT=3000
   \`\`\`

3. **Configuración de red:**
   - Puerto interno: 3000
   - Coolify manejará automáticamente el proxy reverso

### Estructura del proyecto

\`\`\`
glass-optimization-system/
├── app/                    # Aplicación Next.js
├── components/            # Componentes React
├── lib/                   # Utilidades y lógica de negocio
├── Dockerfile            # Configuración Docker
├── docker-compose.yml    # Configuración para Coolify
├── coolify.yml          # Configuración específica de Coolify
└── package.json         # Dependencias del proyecto
\`\`\`

### Desarrollo local

\`\`\`bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
\`\`\`

### Deploy manual con Docker

\`\`\`bash
# Construir imagen
npm run docker:build

# Ejecutar contenedor
npm run docker:run
\`\`\`

### Health Check

La aplicación incluye un endpoint de health check en `/api/health` que Coolify puede usar para verificar el estado de la aplicación.

### Características

- ✅ **Responsive design** - Funciona en móvil y desktop
- ✅ **Sistema de optimización** - Calcula el mejor uso de materiales
- ✅ **Visualización de cortes** - Canvas interactivo
- ✅ **Calculadora de ahorros** - Muestra el ahorro en tiempo real
- ✅ **Historial de pedidos** - Guarda y permite editar pedidos
- ✅ **Integración WhatsApp** - Envía pedidos por WhatsApp
- ✅ **Base de datos de vidrios** - 45+ tipos de vidrio con precios reales

### Soporte

Para problemas relacionados con el deploy, verifica:
1. Los logs de Coolify
2. El health check endpoint: `/api/health`
3. Las variables de entorno configuradas
