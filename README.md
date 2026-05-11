# EcoMonitor IoT — SmartFactory Energy Hub 🌿⚡

Dashboard web para el monitoreo en tiempo real de máquinas industriales con IoT. Visualización de métricas de potencia, voltaje, corriente y energía. Incluye cálculo de costos estimados, huella de carbono, alertas configurables y reportes PDF automáticos.

> 📚 Proyecto escolar — Sistema de Monitoreo Energético Industrial con IoT

## 🚀 Características

- **Monitoreo en Tiempo Real**: Visualización de potencia, voltaje, corriente y energía de múltiples máquinas
- **Gráficas Interactivas**: Datos históricos con filtros por rango de fechas y horas
- **KPIs Dinámicos**: Métricas de potencia actual, energía del ciclo, costo estimado y huella de carbono
- **Gestión de Máquinas**: Vista detallada de cada máquina con métricas por fase (L1, L2, L3)
- **Configuración Flexible**: Ajuste de umbrales de alerta, tarifas eléctricas y horarios
- **Sistema de Alertas**: Notificaciones configurables para eventos y umbrales
- **Reportes PDF**: Generación automática de reportes con gráficas y análisis
- **Reportes por Email**: Envío diario programado de resumen de consumo
- **Autenticación**: Sistema de login seguro con JWT
- **Modo Oscuro/Claro**: Soporte completo de temas

## 🛠️ Tecnologías Utilizadas

- **Next.js 15** — Framework React con App Router
- **React 18** — Biblioteca para la interfaz de usuario
- **TypeScript** — Tipado estático
- **Prisma ORM** — ORM para PostgreSQL
- **PostgreSQL** — Base de datos relacional
- **Tailwind CSS 4** — Estilos y diseño
- **shadcn/ui** — Componentes de UI
- **Recharts** — Gráficas y visualización de datos
- **Supabase Storage** — Almacenamiento de reportes PDF
- **Nodemailer** — Envío de emails (reportes diarios)
- **jsPDF + html2canvas** — Generación de reportes PDF
- **JWT** — Autenticación con tokens

## 📋 Requisitos Previos

- **Node.js** 18+ y npm (o yarn/pnpm)
- **PostgreSQL** 12+ (base de datos en ejecución)
- Git

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd ecomonitor-iot
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y rellena con tus valores:

```bash
cp .env.example .env.local
```

Edita `.env.local` con:
- `DATABASE_URL` — URL de tu base de datos PostgreSQL
- `JWT_SECRET` — Clave secreta para tokens JWT
- Variables SMTP si deseas reportes por email
- Variables de Supabase si deseas almacenamiento de reportes en la nube

### 4. Configurar la base de datos

```bash
npx prisma generate
npx prisma db push
```

O si prefieres usar migraciones:

```bash
npx prisma migrate dev
```

### 5. Ejecutar el proyecto

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`

## 📜 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Construir para producción |
| `npm run start` | Servidor en modo producción |
| `npm run lint` | Verificar código con linter |

## 🏗️ Estructura del Proyecto

```
ecomonitor-iot/
├── app/                      # App Router de Next.js
│   ├── api/                  # API Routes
│   │   ├── auth/            # Endpoints de autenticación
│   │   ├── dashboard/       # Endpoints del dashboard
│   │   ├── machines/        # Endpoints de máquinas
│   │   ├── notifications/   # Endpoints de notificaciones
│   │   ├── reports/         # Endpoints de reportes
│   │   └── settings/        # Endpoints de configuración
│   ├── dashboard/           # Página principal del dashboard
│   ├── machines/            # Páginas de gestión de máquinas
│   ├── reports/             # Historial de reportes
│   └── settings/            # Página de configuración
├── components/              # Componentes React reutilizables
│   ├── ui/                 # Componentes de UI (shadcn/ui)
│   └── layout/             # Componentes de layout
├── hooks/                   # Custom hooks
├── lib/                     # Utilidades y helpers
│   ├── email/              # Templates de email
│   ├── db.ts               # Cliente de Prisma
│   └── utils.ts            # Utilidades generales
├── prisma/                  # Configuración de Prisma
│   └── schema.prisma       # Esquema de la base de datos
└── public/                  # Archivos estáticos
```

## 🔌 API Endpoints Principales

### Dashboard
- `GET /api/dashboard/power-data` — Datos de potencia total
- `GET /api/dashboard/realtime-power-data` — Datos en tiempo real por máquina
- `GET /api/dashboard/voltage-data` — Datos de voltaje
- `GET /api/dashboard/current-data` — Datos de corriente
- `GET /api/dashboard/branch-power-data` — Datos de potencia por máquina
- `GET /api/dashboard/co2-emissions` — Emisiones de CO₂
- `GET /api/dashboard/branch-energy` — Energía acumulada por máquina
- `GET /api/dashboard/cycle-energy` — Energía del ciclo seleccionado
- `GET /api/dashboard/estimated-cost` — Costo estimado
- `GET /api/dashboard/power-factor` — Factor de potencia

### Máquinas
- `GET /api/machines` — Lista de todas las máquinas
- `GET /api/machines/stats` — Estadísticas en tiempo real
- `GET /api/machines/[id]` — Detalles de una máquina
- `GET /api/machines/[id]/history` — Historial de mediciones
- `GET /api/machines/[id]/phases` — Métricas por fase

### Configuración
- `GET /api/settings/alerts` — Configuración de alertas
- `PUT /api/settings/alerts` — Actualizar configuración
- `GET /api/settings/tariffs` — Tarifas eléctricas

## 🗄️ Base de Datos

PostgreSQL con Prisma ORM. Tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `maquinas` | Información de las máquinas monitoreadas |
| `branch_br[N]_avg5m` | Mediciones promedio cada 5 min por máquina |
| `branch_kwh_accumulated` | Energía acumulada por máquina |
| `daily_energy_totals` | Totales de energía por día |
| `alertas` | Sistema de alertas y notificaciones |
| `configuracion_alertas` | Umbrales y horarios de alertas |
| `tarifas` | Tarifas eléctricas y factor CO₂ |
| `User` | Usuarios del sistema |
| `reporte_emails` | Destinatarios de reportes diarios |

## 🎨 Características de la UI

- Diseño responsivo (mobile, tablet, desktop)
- Modo oscuro/claro con paleta Esmeralda/Teal
- Gráficas interactivas con filtros de fecha y zoom
- Calendario personalizado para selección de rangos
- Skeleton loaders durante la carga de datos
- Actualización automática de métricas

## 📊 Datos de Ejemplo

Las máquinas en el sistema usan nombres genéricos como:
- Máquina CNC A
- Compresor Industrial B
- Torno CNC C
- Soldadora D
- Panel Solar (Medidor General)

## 🔐 Autenticación

Sistema de autenticación basado en JWT con cookies httpOnly. Las rutas protegidas requieren inicio de sesión.

## 📝 Notas

- Prisma Client se genera automáticamente en `postinstall`
- Las mediciones se actualizan cada 5 minutos
- Los datos históricos se pueden filtrar por rango de fechas
- Factor de emisión CO₂ por defecto: 0.444 kg CO₂/kWh (México)
- Reportes diarios se envían automáticamente vía Vercel Cron

## 📄 Licencia

MIT License
