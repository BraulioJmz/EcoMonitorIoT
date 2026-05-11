# Manual de Usuario - EcoMonitor IoT

## Índice
1. [Introducción](#introducción)
2. [Inicio de Sesión](#inicio-de-sesión)
3. [Navegación General](#navegación-general)
4. [Dashboard Principal](#dashboard-principal)
5. [Máquinas](#máquinas)
6. [Reportes](#reportes)
7. [Configuración](#configuración)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

EcoMonitor IoT es una plataforma de monitoreo energético en tiempo real que le permite visualizar, analizar y gestionar el consumo eléctrico de todas las máquinas en su planta. Este sistema proporciona métricas detalladas, alertas automáticas y reportes personalizados para optimizar el uso de energía.

---

## Inicio de Sesión

### Acceso al Sistema

1. Abra su navegador web y acceda a la URL del dashboard
2. Ingrese sus credenciales:
   - **Email**: Su correo electrónico registrado
   - **Contraseña**: Contraseña asignada por el administrador
3. Haga clic en **"Iniciar Sesión"**

### Primer Acceso
Si es su primer acceso al sistema, deberá cambiar su contraseña temporal por una nueva que cumpla con los siguientes requisitos:
- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos un número

---

## Navegación General

### Barra Lateral (Sidebar)

La barra lateral izquierda contiene el menú principal de navegación:

- **Dashboard** 📊: Vista general de toda la planta
- **Máquinas** ⚙️: Listado y detalle de cada máquina
  - Todas las Máquinas
  - [Máquinas individuales desplegables]
- **Reportes** 📄: Histórico de reportes generados
- **Configuración** ⚙️: Ajustes del sistema
- **Cerrar Sesión** 🚪: Salir del sistema

**Modo Compacto**: Puede hacer clic en el ícono de menú (☰) para colapsar la barra lateral y ganar espacio en pantalla.

### Barra Superior (Topbar)

Contiene:
- **Notificaciones** 🔔: Alertas y avisos del sistema
- **Tema Visual**: Cambio entre modo claro/oscuro
- **Perfil de Usuario**: Información de la cuenta activa

---

## Dashboard Principal

### Vista General

El Dashboard principal es la vista más importante del sistema. Aquí puede monitorear en tiempo real el consumo energético de toda la planta o de máquinas específicas.

### Sección de Filtros

En la parte superior del dashboard encontrará los controles de filtrado que determinan qué datos se muestran en toda la página.

#### 1. **Selector de Máquinas**

- **Ubicación**: Parte superior izquierda
- **Función**: Permite seleccionar qué máquinas desea monitorear
- **Opciones**:
  - "Todas las Máquinas" (por defecto)
  - Selección múltiple: Active/desactive máquinas individuales
  - "Seleccionar todas" / "Deseleccionar todas"

**Cómo usar**:
1. Haga clic en el botón "Máquinas"
2. Se abrirá un panel con la lista de todas las máquinas
3. Marque o desmarque las casillas según desee
4. Los cambios se aplican automáticamente

**Nota**: Cada máquina muestra un indicador de estado:
- 🟢 **Verde**: Máquina activa y operando
- 🔴 **Rojo**: Máquina inactiva o sin datos

---

#### 2. **Selector de Fechas y Horas**

Este es el filtro más importante del dashboard, ya que define el período de análisis.

**Ubicación**: Centro superior, botón con ícono de calendario 📅

##### **Estructura del Selector**

Al hacer clic en el botón de calendario, se abre un panel con:

1. **Calendario de Fecha Inicio**
   - Seleccione el día de inicio del período
   
2. **Calendario de Fecha Fin** (opcional)
   - Seleccione el día final del período
   - Si no selecciona fecha fin, se usará solo la fecha de inicio

3. **Hora de Inicio** (opcional)
   - Desplegable con opciones de 00:00 a 23:00
   - "Por defecto": Usa el horario configurado en la planta (generalmente 07:30)
   
4. **Hora Fin** (opcional)
   - Desplegable con opciones de 00:00 a 23:00
   - "Por defecto": Usa el horario configurado en la planta (generalmente 19:30)

5. **Botones de Acción**
   - **Aplicar**: Ejecuta el filtro con las fechas seleccionadas
   - **Limpiar**: Elimina todos los filtros de fecha

##### **Navegación del Calendario**

- Use las flechas **←** **→** para cambiar de mes
- Haga clic en un día para seleccionarlo
- El día seleccionado se resalta en color

##### **Texto del Botón de Calendario**

El botón muestra el rango aplicado actualmente:

- **"Sin rango"**: No hay filtro de fecha activo
- **"19/11/2024"**: Un solo día seleccionado
- **"19/11/2024 - 21/11/2024"**: Rango de varios días
- **"19/11/2024 08:00 - 19/11/2024 17:00"**: Rango con horas específicas

---

#### 3. **Modo de Cálculo** (Tipo de Consumo)

**ESTE ES EL FILTRO MÁS IMPORTANTE** ya que determina de dónde se obtienen los datos de consumo eléctrico.

**Ubicación**: Desplegable en la parte superior derecha con 3 opciones

##### **Opción 1: Consumo Total** 🏭 (Por defecto)

**Qué muestra**: El consumo energético total de toda la planta, incluyendo áreas y equipos que no están siendo monitoreados directamente por el sistema.

**Fuente de datos**: Tabla `daily_energy_totals` de la base de datos

**Cuándo usar**:
- Cuando necesita el consumo real total de la planta
- Para reportes de facturación
- Para análisis de eficiencia global
- Para comparar con la factura eléctrica

**Características**:
- ✅ Incluye todo el consumo de la planta
- ✅ Datos consolidados por día completo
- ⚠️ Solo disponible para días completos (no permite filtrar por horas)
- ⚠️ Puede incluir equipos no monitoreados

**Ejemplo de uso**:
```
Seleccione: "Consumo Total"
Fecha: 19/11/2024
Resultado: Muestra el kWh total de toda la planta ese día (incluyendo 
           áreas no monitoreadas como iluminación, oficinas, etc.)
```

---

##### **Opción 2: Día Completo** 📆

**Qué muestra**: El consumo energético de las máquinas monitoreadas durante un día completo o rango de días.

**Fuente de datos**: Suma de todas las mediciones de las máquinas seleccionadas en la base de datos para el día completo (00:00 a 23:59)

**Cuándo usar**:
- Cuando necesita analizar el consumo de días completos
- Para comparar consumo entre diferentes días
- Para análisis semanal o mensual
- Cuando desea ver tendencias por día

**Características**:
- ✅ Datos precisos de las máquinas monitoreadas
- ✅ Permite seleccionar rangos de múltiples días
- ✅ Ideal para análisis históricos
- ⚠️ No permite filtrar por horas específicas
- ⚠️ Solo incluye máquinas monitoreadas (no el total de la planta)

**Ejemplo de uso**:
```
Seleccione: "Día Completo"
Fechas: 15/11/2024 - 20/11/2024
Resultado: Muestra el consumo diario de las máquinas seleccionadas
           para cada uno de esos 6 días
```

---

##### **Opción 3: Personalizado** ⏰

**Qué muestra**: El consumo energético de las máquinas monitoreadas en un período específico definido por el usuario, con hora de inicio y fin.

**Fuente de datos**: Suma de las mediciones de las máquinas seleccionadas dentro del rango de fechas Y horas especificado por el usuario

**Cuándo usar**:
- Para analizar turnos específicos (ej: turno matutino 6:00-14:00)
- Para comparar consumo en diferentes horarios del día
- Para análisis de horas pico
- Para reportes de consumo en períodos no estándar

**Características**:
- ✅ Máxima flexibilidad en selección de períodos
- ✅ Permite análisis por horas específicas
- ✅ Ideal para estudios de turnos
- ✅ Combina fecha + hora de inicio y fin
- ⚠️ Solo incluye máquinas monitoreadas
- ⚠️ Requiere configurar horas manualmente

**Ejemplo de uso**:
```
Seleccione: "Personalizado"
Fecha inicio: 19/11/2024
Hora inicio: 08:00
Fecha fin: 19/11/2024
Hora fin: 17:00
Resultado: Muestra el consumo de las máquinas seleccionadas
           únicamente entre las 8 AM y 5 PM de ese día
```

---

#### **Comparación de Modos de Cálculo**

| Característica | Consumo Total | Día Completo | Personalizado |
|----------------|---------------|--------------|---------------|
| **Fuente de datos** | `daily_energy_totals` | Mediciones BD (día completo) | Mediciones BD (rango personalizado) |
| **Incluye equipos no monitoreados** | ✅ Sí | ❌ No | ❌ No |
| **Permite seleccionar horas** | ❌ No | ❌ No | ✅ Sí |
| **Permite rangos de días** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Precisión de datos** | Global (planta completa) | Alta (solo monitoreados) | Alta (solo monitoreados) |
| **Mejor para** | Facturación, totales | Análisis diario, tendencias | Turnos, horas específicas |

---

#### **Flujo de Uso Recomendado de Filtros**

**Escenario 1: Ver consumo total de ayer**
1. Modo de Cálculo: **"Consumo Total"**
2. Calendario: Seleccionar ayer
3. Clic en **"Aplicar"**

**Escenario 2: Comparar consumo de 3 máquinas esta semana**
1. Máquinas: Seleccionar las 3 máquinas deseadas
2. Modo de Cálculo: **"Día Completo"**
3. Calendario: Seleccionar primer y último día de la semana
4. Clic en **"Aplicar"**

**Escenario 3: Analizar turno matutino de hoy**
1. Modo de Cálculo: **"Personalizado"**
2. Fecha inicio: Hoy
3. Hora inicio: 06:00
4. Hora fin: 14:00
5. Clic en **"Aplicar"**

---

### KPIs (Indicadores Clave)

Después de aplicar los filtros, el dashboard muestra 5 tarjetas con métricas principales:

#### 1. **Potencia Actual** ⚡
- **Unidad**: kW (kilowatts)
- **Descripción**: Potencia instantánea que están consumiendo las máquinas seleccionadas en este momento
- **Actualización**: En tiempo real (cada pocos segundos)
- **Color**: Verde esmeralda

**Interpretación**:
- Valor alto: Muchas máquinas operando o alta demanda
- Valor bajo: Pocas máquinas activas o en modo inactivo
- 0 kW: Ninguna máquina seleccionada está operando

---

#### 2. **Energía del Ciclo** 🔋
- **Unidad**: kWh (kilowatt-hora)
- **Descripción**: Energía total consumida en el período seleccionado
- **Muestra 2 valores**:
  - **Importados**: Energía consumida de la red eléctrica
  - **Exportados**: Energía devuelta a la red (si aplica)
- **Color**: Azul cielo

**Interpretación**:
- Importados > Exportados: La planta consume más de lo que genera
- Depende del **Modo de Cálculo** seleccionado:
  - **Consumo Total**: Total de la planta (incluye no monitoreado)
  - **Día Completo**: Suma de máquinas seleccionadas (día completo)
  - **Personalizado**: Suma de máquinas en el rango de horas especificado

---

#### 3. **Costo Estimado** 💰
- **Unidad**: $ (pesos/dólares según configuración)
- **Descripción**: Costo estimado del consumo eléctrico en el período
- **Cálculo**: Energía × Tarifa configurada
- **Color**: Ámbar

**Interpretación**:
- Basado en las tarifas configuradas en **Configuración → Tarifas**
- Si hay tarifas horarias, se calcula automáticamente según la hora
- Útil para presupuestos y control de gastos

---

#### 4. **Emisiones de CO2** 🍃
- **Unidad**: kg de CO₂e (kilogramos de CO₂ equivalente)
- **Descripción**: Emisiones de carbono estimadas por el consumo eléctrico
- **Cálculo**: Energía × Factor de emisión
- **Color**: Violeta

**Interpretación**:
- Indicador de impacto ambiental
- Útil para reportes de sustentabilidad
- Factor de emisión configurable en ajustes

---

#### 5. **Factor de Potencia** 📊
- **Unidad**: FP (decimal entre 0 y 1)
- **Descripción**: Eficiencia del uso de la energía eléctrica
- **Rango**: 0.0 a 1.0 (ideal: cercano a 1.0)
- **Color**: Índigo

**Interpretación**:
- **0.95 - 1.0**: Excelente (óptimo)
- **0.85 - 0.94**: Bueno
- **0.70 - 0.84**: Regular (considere mejoras)
- **< 0.70**: Bajo (se recomienda corrección)

Un factor de potencia bajo puede resultar en penalizaciones en la factura eléctrica.

---

### Gráficas

El dashboard incluye múltiples gráficas que se actualizan según los filtros aplicados:

#### 1. **Gráfica de Potencia en Tiempo Real**

**Ubicación**: Primera gráfica en la sección principal

**Qué muestra**:
- Evolución de la potencia (kW) a lo largo del tiempo
- Línea azul que representa la potencia instantánea

**Controles**:
- **Zoom**: Arrastre en la barra inferior de la gráfica para hacer zoom en un período específico
- **Reset Zoom**: Botón "Resetear Zoom" para volver a la vista completa

**Cuándo se actualiza**:
- Automáticamente al aplicar filtros de fecha
- Al seleccionar/deseleccionar máquinas
- En tiempo real cuando no hay filtros de fecha

**Interpretación**:
- Picos: Momentos de alta demanda
- Valles: Períodos de baja actividad o paros
- Línea plana en 0: No hay consumo

---

#### 2. **Gráfica de Voltaje**

**Qué muestra**:
- Voltaje (V) medido a lo largo del tiempo
- Permite detectar variaciones en el suministro eléctrico

**Utilidad**:
- Identificar problemas de calidad de energía
- Detectar sobrevoltajes o caídas de tensión
- Verificar estabilidad del suministro

---

#### 3. **Gráfica de Corriente**

**Qué muestra**:
- Corriente eléctrica (A) consumida
- Puede mostrar desglose por línea (L1, L2, L3) si está disponible

**Utilidad**:
- Detectar desbalances entre fases
- Identificar sobrecargas
- Monitorear distribución de carga

---

#### 4. **Gráfica de Consumo Diario** (Solo con rangos de múltiples días)

**Cuándo aparece**: Solo cuando selecciona un rango de 2 o más días

**Qué muestra**:
- Consumo total de kWh por día
- Barras apiladas mostrando:
  - **Verde**: Energía importada
  - **Naranja**: Energía exportada

**Controles**:
- Zoom con barra inferior
- Click en leyenda para ocultar/mostrar importados/exportados

**Utilidad**:
- Comparar consumo entre días
- Identificar días de mayor/menor consumo
- Detectar patrones semanales

---

#### 5. **Gráfica de Consumo por Hora** (Solo con rangos de múltiples días)

**Cuándo aparece**: Solo cuando selecciona un rango de 2 o más días

**Qué muestra**:
- Consumo de kWh desglosado por hora del día (0-23h)
- Barras apiladas con colores diferentes para cada día
- Leyenda muestra cada día del rango

**Controles**:
- Zoom con barra inferior
- Click en leyenda para ocultar/mostrar días específicos

**Utilidad**:
- Identificar horas pico de consumo
- Comparar patrones horarios entre días
- Optimizar horarios de operación
- Planificar turnos de trabajo

**Ejemplo de uso**:
```
Si selecciona del 18/11 al 20/11, verá:
- Barra para cada hora (0h, 1h, 2h ... 23h)
- Cada barra apilada con 3 colores (un color por cada día)
- Puede ver, por ejemplo, que las 10 AM siempre tienen alto consumo
```

---

### Botones de Acción

#### **Botón Actualizar** 🔄

- **Ubicación**: Parte superior derecha
- **Función**: Recarga todos los datos con los filtros actuales
- **Cuándo usar**: 
  - Cuando desea ver datos más recientes
  - Después de cambios en la configuración

#### **Botón Generar Reporte PDF** 📄

- **Ubicación**: Parte superior derecha
- **Función**: Genera un reporte en PDF con todos los datos actuales del dashboard
- **Proceso**:
  1. Haga clic en "Generar Reporte PDF"
  2. Se abre un cuadro de diálogo
  3. **Nombre del reporte**: Por defecto, se genera automáticamente según la fecha
     - Ejemplo: `Reporte_19-11-2024` para un solo día
     - Ejemplo: `Reporte_19-11-2024_a_21-11-2024` para un rango
  4. Puede marcar la opción **"Usar nombre personalizado"** y escribir su propio nombre
  5. Haga clic en **"Generar PDF"**

**Contenido del reporte**:
- Período analizado
- KPIs principales
- Todas las gráficas visibles en el dashboard
- Tabla de máquinas con su consumo individual
- Máquina de mayor consumo
- Fechas de generación

**Almacenamiento**:
- El reporte se genera y se descarga automáticamente a su computadora
- Se guarda una copia en la sección **Reportes** para acceso futuro
- Puede acceder al historial desde el menú **Reportes**

**Notas**:
- La generación puede tardar unos segundos dependiendo de la cantidad de datos
- Asegúrese de haber aplicado los filtros deseados antes de generar el reporte
- Si no ha aplicado ninguna fecha, se mostrará un error solicitando seleccionar un período

---

## Máquinas

### Vista de Todas las Máquinas

**Acceso**: Sidebar → Máquinas → Todas las Máquinas

Esta página muestra un listado completo de todas las máquinas monitoreadas en la planta.

#### **Elementos de la Interfaz**

##### **Tarjetas de Máquinas**

Cada máquina se presenta en una tarjeta que incluye:

1. **Nombre de la máquina**
   - Ejemplo: "Cortadora Láser", "Prensa Hidráulica"

2. **Código de Branch**
   - Identificador técnico (ej: "LA-001", "LA-002")

3. **Estado actual**
   - 🟢 **Operando**: Máquina en funcionamiento activo
   - 🟡 **Inactiva**: Máquina encendida pero sin carga
   - 🔴 **Fuera de horario**: Fuera del horario laboral configurado
   - ⚫ **Sin datos**: No se reciben mediciones

4. **Indicadores de rendimiento**:
   - **Potencia Actual**: kW que está consumiendo en este momento
   - **Energía de Hoy**: kWh consumidos el día actual
   - **Factor de Potencia**: Eficiencia eléctrica

5. **Botón de Favorito** ⭐
   - Marque máquinas importantes como favoritas
   - Las favoritas aparecen primero en los listados

6. **Botón Ver Detalles** 👁️
   - Abre la vista detallada de la máquina

##### **Barra de Búsqueda**

- **Ubicación**: Parte superior
- **Función**: Filtre máquinas por nombre o código
- **Uso**: Escriba cualquier parte del nombre o código

##### **Filtros**

- **Estado**: Filtre por máquinas operando, inactivas, etc.
- **Ordenar por**: 
  - Nombre (A-Z)
  - Consumo (mayor a menor)
  - Favoritas primero

---

### Vista Detallada de Máquina Individual

**Acceso**: 
- Clic en "Ver Detalles" desde la lista de máquinas
- Sidebar → Máquinas → [Nombre de máquina específica]

#### **Información General**

En la parte superior se muestra:

- **Nombre completo de la máquina**
- **Código de Branch**
- **Estado en tiempo real**
- **Potencia Máxima configurada**
- **CT Ratio** (relación de transformación de corriente)

#### **KPIs de la Máquina**

Similar al dashboard principal, pero específicos para esta máquina:

1. **Potencia Actual** (kW)
2. **Energía de Hoy** (kWh)
3. **Consumo del Mes** (kWh)
4. **Factor de Potencia**
5. **Costo Estimado**

#### **Gráficas de la Máquina**

1. **Potencia a lo largo del día**
   - Muestra la evolución de la potencia desde las 00:00

2. **Consumo por hora**
   - Barras mostrando kWh consumidos cada hora

3. **Voltaje por fase**
   - Si la máquina tiene medición trifásica (L1, L2, L3)

4. **Corriente por fase**
   - Consumo de corriente en cada línea

#### **Historial de Eventos**

- Arranques y paros
- Alertas generadas
- Mantenimientos programados (si están configurados)

#### **Configuración de la Máquina**

Botón **"Editar Configuración"** permite:
- Cambiar nombre de la máquina
- Ajustar potencia máxima
- Configurar alertas específicas
- Marcar como favorita

---

## Reportes

**Acceso**: Sidebar → Reportes

Esta sección contiene el historial de todos los reportes PDF generados.

### **Vista de Lista de Reportes**

#### **Tabla de Reportes**

Muestra una tabla con las siguientes columnas:

| Columna | Descripción |
|---------|-------------|
| **Nombre** | Nombre del reporte generado |
| **Período Analizado** | Rango de fechas del reporte |
| **Fecha de Creación** | Cuándo se generó el reporte |
| **Tamaño** | Peso del archivo PDF en MB |
| **Acciones** | Botones de descarga y vista previa |

#### **Barra de Búsqueda**

- Filtre reportes por nombre
- Busque por fecha en el nombre del reporte

#### **Acciones sobre Reportes**

1. **Descargar** 📥
   - Descarga el PDF a su computadora
   - El archivo conserva el nombre original

2. **Ver en línea** 👁️
   - Abre el PDF en una nueva pestaña del navegador
   - Permite visualizar sin descargar

#### **Ordenamiento**

- Por defecto: Más recientes primero
- Puede ordenar por:
  - Fecha de creación
  - Nombre
  - Tamaño

#### **Notas sobre Reportes**

- Los reportes se almacenan en Supabase Storage
- No tienen fecha de expiración
- Pueden descargarse en cualquier momento
- El nombre por defecto incluye la fecha del período analizado

---

## Configuración

**Acceso**: Sidebar → Configuración

Esta sección permite personalizar el comportamiento del sistema.

### **Secciones de Configuración**

#### 1. **Tarifas Eléctricas** 💰

**Para qué sirve**: Define el costo del kWh para calcular el costo estimado

**Configuración**:

1. **Tarifa Base**
   - Costo por kWh en pesos/dólares
   - Ejemplo: $1.50 por kWh

2. **Tarifas Horarias** (Opcional)
   - Configure diferentes tarifas según la hora del día
   - Útil si su proveedor de energía tiene tarifas horarias
   
   Ejemplo:
   ```
   Hora Pico (18:00-22:00): $2.50 por kWh
   Hora Base (06:00-18:00): $1.50 por kWh
   Hora Valle (22:00-06:00): $0.80 por kWh
   ```

3. **Tarifa por Temporada** (Opcional)
   - Verano / Invierno
   - Solo si su proveedor tiene temporadas

**Cómo configurar**:
1. Haga clic en **"Editar Tarifas"**
2. Ingrese el valor por kWh
3. Si desea tarifas horarias, active el switch "Usar tarifas horarias"
4. Configure cada período horario
5. Haga clic en **"Guardar"**

---

#### 2. **Horarios Laborales** ⏰

**Para qué sirve**: Define el horario de operación normal de la planta

**Uso**:
- Los filtros por defecto usan estos horarios
- Las alertas de "fuera de horario" se basan en esta configuración
- Los reportes diarios consideran este rango

**Configuración**:
- **Hora de inicio**: Inicio del turno (ej: 07:30)
- **Hora de fin**: Fin del turno (ej: 19:30)

**Cómo configurar**:
1. Haga clic en **"Editar Horarios"**
2. Seleccione hora de inicio
3. Seleccione hora de fin
4. Haga clic en **"Guardar"**

**Nota**: Puede tener diferentes horarios por día de la semana si es necesario (funcionalidad avanzada)

---

#### 3. **Alertas** 🔔

**Para qué sirve**: Configure avisos automáticos cuando se detecten condiciones específicas

**Tipos de alertas disponibles**:

1. **Consumo Excesivo**
   - Se activa cuando una máquina supera cierto porcentaje de su potencia máxima
   - Ejemplo: Alertar si supera el 95% de la potencia máxima
   
2. **Bajo Factor de Potencia**
   - Se activa cuando el FP cae por debajo de un umbral
   - Ejemplo: Alertar si FP < 0.85
   
3. **Operación Fuera de Horario**
   - Se activa cuando una máquina opera fuera del horario laboral
   - Útil para detectar consumos no autorizados
   
4. **Máquina Inactiva**
   - Se activa cuando una máquina no reporta datos
   - Puede indicar problema de comunicación o apagado

**Cómo configurar una alerta**:

1. Haga clic en **"Nueva Alerta"**
2. Complete el formulario:
   - **Nombre de la alerta**: Descripción corta
   - **Máquina**: Seleccione la máquina a monitorear (o "Todas")
   - **Condición**: Tipo de alerta
   - **Umbral**: Valor que dispara la alerta
   - **Acciones**: Qué hacer cuando se active
     - ✉️ Enviar email
     - 📱 Notificación en el dashboard
     - 🔔 Notificación sonora

3. **Emails para alertas**:
   - Puede agregar múltiples destinatarios
   - Los emails se envían inmediatamente cuando se detecta la condición
   
4. Haga clic en **"Crear Alerta"**

**Gestión de alertas**:
- **Ver historial**: Todas las alertas activadas se guardan en el historial
- **Editar**: Modifique umbrales o condiciones
- **Desactivar**: Pause alertas temporalmente sin eliminarlas
- **Eliminar**: Borre alertas que ya no necesite

---

#### 4. **Gestión de Máquinas** ⚙️

**Para qué sirve**: Administre las máquinas monitoreadas en el sistema

**Funciones disponibles**:

1. **Agregar Nueva Máquina**
   - Nombre de la máquina
   - Código de Branch (debe coincidir con el dispositivo físico)
   - CT Ratio (relación de transformación, proporcionado por el instalador)
   - Potencia Máxima (en kW)

2. **Editar Máquina Existente**
   - Cambie nombre o configuración
   - No puede cambiar el código de Branch (es la identificación única)

3. **Activar/Desactivar Máquina**
   - Máquinas desactivadas no aparecen en los filtros
   - Útil para equipos fuera de servicio temporalmente

4. **Eliminar Máquina** (Solo administradores)
   - Elimina la máquina del sistema
   - ⚠️ Esta acción no se puede deshacer
   - Los datos históricos se conservan

**Tabla de máquinas**:

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre descriptivo de la máquina |
| Código Branch | Identificador técnico (ej: LA-001) |
| CT Ratio | Relación de transformación (ej: 100:5) |
| Potencia Máxima | Capacidad nominal en kW |
| Estado | Activa / Inactiva |
| Favorita | ⭐ Si está marcada como favorita |
| Acciones | Editar / Eliminar |

---

#### 5. **Configuración de Reportes Automáticos** 📧

**Para qué sirve**: Programe la generación y envío automático de reportes

**Opciones**:

1. **Reporte Diario**
   - Se genera automáticamente todos los días
   - Horario: 00:00 UTC (6:00 PM hora Guadalajara)
   - Incluye el resumen del día anterior

2. **Reporte Semanal**
   - Se genera cada lunes
   - Resumen de la semana anterior

3. **Reporte Mensual**
   - Se genera el día 1 de cada mes
   - Resumen del mes completo

**Configuración de emails**:

- Agregue los emails que deben recibir los reportes automáticos
- Puede tener diferentes destinatarios para cada tipo de reporte
- Los reportes se envían como archivo adjunto PDF

**Nota**: Los reportes automáticos se configuran mediante Vercel Cron Jobs

---

#### 6. **Rango de Tiempo para Gráficas** 📊

**Para qué sirve**: Define cuántos datos se muestran por defecto en las gráficas

**Opciones**:
- Últimas 24 horas
- Últimos 7 días
- Últimos 30 días
- Personalizado

**Cómo configurar**:
1. Seleccione el rango deseado
2. Los cambios se aplican inmediatamente
3. Esta configuración afecta solo la vista inicial (puede cambiarla con filtros)

---

#### 7. **Preferencias de Usuario** 👤

**Temas visuales**:
- 🌞 **Modo Claro**: Fondo blanco, ideal para ambientes iluminados
- 🌙 **Modo Oscuro**: Fondo negro, reduce fatiga visual
- 🔄 **Automático**: Se ajusta según la hora del día

**Idioma**:
- Español (por defecto)
- Inglés (si está disponible)

**Formato de fecha**:
- DD/MM/YYYY (por defecto en México)
- MM/DD/YYYY
- YYYY-MM-DD

**Notificaciones**:
- Activar/desactivar notificaciones en el navegador
- Sonido de alertas

---

## Preguntas Frecuentes

### **Sobre Filtros y Datos**

**P: ¿Por qué los kWh en "Consumo Total" son diferentes a "Día Completo"?**

R: "Consumo Total" incluye toda la planta (incluso áreas no monitoreadas como iluminación, oficinas, etc.) de la tabla `daily_energy_totals`. "Día Completo" solo suma las máquinas que están monitoreadas. La diferencia representa el consumo de equipos no monitoreados.

---

**P: ¿Qué modo de cálculo debo usar para comparar con mi factura de luz?**

R: Use **"Consumo Total"**, ya que este incluye todo el consumo de la planta, igual que su factura eléctrica.

---

**P: ¿Por qué no puedo seleccionar horas en "Consumo Total"?**

R: El modo "Consumo Total" usa datos consolidados por día completo desde la tabla `daily_energy_totals`. Solo está disponible para días completos. Si necesita filtrar por horas, use el modo **"Personalizado"**.

---

**P: ¿Qué pasa si no selecciono hora de fin en el calendario?**

R: El sistema usará automáticamente la hora configurada en "Horarios Laborales" (generalmente 19:30). Si tampoco hay hora de inicio seleccionada, usará el horario laboral completo (ej: 07:30 - 19:30).

---

**P: ¿Cómo selecciono solo un día sin que se convierta en rango?**

R: Simplemente seleccione la fecha de inicio en el calendario y deje vacía la fecha de fin. El sistema interpretará que desea analizar solo ese día.

---

### **Sobre Reportes**

**P: ¿Dónde se guardan los reportes PDF que genero?**

R: Los reportes se guardan en Supabase Storage (en la nube) y también se descargan automáticamente a su computadora. Puede acceder al historial completo desde la sección **Reportes** del menú.

---

**P: ¿Puedo eliminar reportes antiguos?**

R: Actualmente, solo los administradores pueden eliminar reportes. Si necesita limpiar reportes, contacte al administrador del sistema.

---

**P: ¿Los reportes automáticos incluyen todas las máquinas?**

R: Sí, los reportes automáticos incluyen todas las máquinas activas. Usan el modo de cálculo **"Consumo Total"** para mostrar el consumo completo de la planta.

---

### **Sobre Máquinas**

**P: ¿Qué significa "Fuera de horario" en el estado de una máquina?**

R: Significa que la máquina está operando fuera del horario laboral configurado. Esto puede ser normal (turnos nocturnos) o indicar uso no autorizado. Puede configurar alertas para estos casos.

---

**P: ¿Por qué una máquina muestra "Sin datos"?**

R: Puede deberse a:
- Problema de comunicación con el medidor
- Máquina apagada
- Medidor sin energía
- Error de configuración

Verifique la conexión del medidor o contacte a soporte técnico.

---

**P: ¿Puedo cambiar el código de Branch de una máquina?**

R: No, el código de Branch es la identificación única asignada al medidor físico y no puede cambiarse. Si necesita reasignar un código, debe crear una nueva máquina y desactivar la anterior.

---

### **Sobre Alertas**

**P: ¿Por qué no recibo emails de alertas?**

R: Verifique:
1. El email está correctamente escrito en la configuración de alertas
2. La alerta está activada
3. Revise su carpeta de spam
4. Verifique que la condición de la alerta realmente se esté cumpliendo

---

**P: ¿Puedo configurar alertas solo para horario nocturno?**

R: Sí, puede crear una alerta de "Operación Fuera de Horario" que solo se activa cuando una máquina opera fuera del horario laboral configurado.

---

### **Sobre Gráficas**

**P: ¿Por qué la gráfica de "Consumo por Hora" está vacía?**

R: Esta gráfica solo aparece cuando selecciona un rango de 2 o más días. Si solo tiene un día seleccionado, use la gráfica de "Potencia en Tiempo Real" que muestra datos por hora.

---

**P: ¿Cómo reseteo el zoom en una gráfica?**

R: Haga clic en el botón **"Resetear Zoom"** que aparece debajo de cada gráfica cuando hace zoom.

---

### **Sobre Configuración**

**P: ¿Los cambios en tarifas afectan reportes anteriores?**

R: No, los reportes ya generados conservan los valores calculados al momento de su creación. Los cambios de tarifa solo afectan nuevos cálculos.

---

**P: ¿Qué es el CT Ratio y por qué es importante?**

R: El CT Ratio (Current Transformer Ratio) es la relación de transformación del sensor de corriente. Es esencial para que las mediciones sean precisas. Este valor debe ser proporcionado por el técnico que instaló el medidor. No lo modifique a menos que sepa exactamente qué está haciendo.

---

### **Sobre Seguridad**

**P: ¿Puedo compartir mi contraseña con otros usuarios?**

R: No. Cada usuario debe tener su propia cuenta. Si otra persona necesita acceso, contacte al administrador para crear una cuenta nueva.

---

**P: ¿Con qué frecuencia debo cambiar mi contraseña?**

R: Se recomienda cambiar la contraseña cada 90 días. El sistema le notificará cuando sea necesario.

---

**P: ¿Qué hago si olvidé mi contraseña?**

R: En la pantalla de login, haga clic en "¿Olvidaste tu contraseña?" y siga las instrucciones. Recibirá un email con un enlace para restablecer su contraseña.

---

### **Soporte Técnico**

Si tiene problemas técnicos, dudas o necesita asistencia adicional:

📧 **Email**: soporte@demo.com
📞 **Teléfono**: [Número de soporte]
💬 **Chat en vivo**: Disponible en horario laboral (8:00 - 18:00)

---

**Última actualización del manual**: Noviembre 2024
**Versión del sistema**: 1.0
