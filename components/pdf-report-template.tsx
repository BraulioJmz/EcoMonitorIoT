"use client"

import React from 'react'

interface ReportData {
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  generatedDate: string
  generatedTime: string
  logoBase64?: string
  calculationMode?: 'custom_time' | 'full_day' | 'total_consumption'
  selectedMachines?: string[]
  kpis: {
    totalEnergy: number
    exportedEnergy: number
    totalCost: number
    topMachine: string
    avgPowerFactor: number
    alertsCount: number
  }
  machines: Array<{
    name: string
    kwh: number
    importedKwh: number
    exportedKwh: number
    isDMG: boolean
    cost: number
    percentage: number
    maxPower: number
  }>
  charts?: {
    powerTime?: string
    powerTotal?: string
    dailyPowerByHour?: string
    voltage?: string
    current?: string
    dailyPower?: string
  }
  analysis: string
}

export function PDFReportTemplate({ data }: { data: ReportData }) {
  return (
    <div className="bg-gray-50">
      {/* PORTADA */}
      <div id="pdf-cover" className="relative h-[297mm] w-[210mm] bg-white flex flex-col items-center justify-center p-12">
        {/* Decoración superior */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500/10 to-emerald-500/10"></div>
        
        {/* Logo EcoMonitor */}
        <div className="mb-12 relative z-10">
          {data.logoBase64 ? (
            <img 
              src={data.logoBase64} 
              alt="Company Logo" 
              className="w-32 h-32 object-contain mx-auto"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
              <span className="text-white font-bold text-4xl">LOGO</span>
            </div>
          )}
        </div>

        {/* Título principal */}
        <div className="text-center space-y-4 relative z-10">
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
            Reporte de Consumo Energético
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 mx-auto rounded-full"></div>
          <p className="text-xl text-gray-600 font-medium mt-6">
            EcoMonitor IoT - SmartFactory Energy Hub
          </p>
        </div>

        {/* Información del periodo y filtros */}
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-xl p-8 shadow-sm max-w-3xl w-full relative z-10 space-y-6">
          {/* Periodo Analizado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Periodo Analizado</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha Inicio</p>
                <p className="font-semibold text-gray-900 text-lg">{data.startDate}</p>
                {data.startTime && <p className="text-sm text-gray-600">{data.startTime}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha Fin</p>
                <p className="font-semibold text-gray-900 text-lg">{data.endDate}</p>
                {data.endTime && <p className="text-sm text-gray-600">{data.endTime}</p>}
              </div>
            </div>
          </div>

          {/* Modo de Cálculo */}
          {data.calculationMode && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Modo de Cálculo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-semibold text-blue-900">
                    {data.calculationMode === 'custom_time' && 'Horario Personalizado'}
                    {data.calculationMode === 'full_day' && 'Día Completo'}
                    {data.calculationMode === 'total_consumption' && 'Consumo Total'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Máquinas Incluidas */}
          {data.selectedMachines && data.selectedMachines.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Máquinas Incluidas ({data.selectedMachines.length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.selectedMachines.map((machine, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700 leading-tight">{machine}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fecha de generación */}
        <div className="mt-8 text-center text-sm text-gray-500 relative z-10">
          <p>Generado el {data.generatedDate} a las {data.generatedTime}</p>
        </div>

        {/* Decoración inferior */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-emerald-500/10 to-transparent rounded-tl-full"></div>
      </div>

      {/* SECCIÓN DE KPIs */}
      <div id="pdf-kpis" className="h-[297mm] w-[210mm] bg-white p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Indicadores Clave</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* KPI: Energía Total */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Energía Consumida
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {(data.kpis.totalEnergy || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                </p>
                <p className="text-sm text-gray-500">kWh</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI: Energía Exportada */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Energía Exportada
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {(data.kpis.exportedEnergy || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                </p>
                <p className="text-sm text-gray-500">kWh</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI: Costo Total */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Costo Estimado
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  ${(data.kpis.totalCost || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">MXN</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI: Máquina con mayor consumo */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Mayor Consumidor
                </p>
                <p className="text-xl font-bold text-gray-900 mb-1 break-words leading-tight">
                  {data.kpis.topMachine}
                </p>
                <p className="text-sm text-gray-500">Máquina</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI: Factor de Potencia */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Factor de Potencia
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {((data.kpis.avgPowerFactor || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Promedio</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI: Alertas */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Alertas Detectadas
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {data.kpis.alertsCount || 0}
                </p>
                <p className="text-sm text-gray-500">En el periodo</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICAS - PÁGINA 1 */}
      <div id="pdf-charts" className="min-h-[297mm] w-[210mm] bg-white p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Análisis Visual</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
        </div>

        <div className="space-y-8">
          {/* Gráfica 1: Monitoreo General */}
          {data.charts?.powerTime && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                Monitoreo General - Potencia por Máquinas
              </h3>
              <div className="w-full">
                <img src={data.charts.powerTime} alt="Monitoreo General" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}

          {/* Gráfica 2: Potencia Total */}
          {data.charts?.powerTotal && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-emerald-600 rounded-full mr-3"></span>
                Potencia Total del Sistema
              </h3>
              <div className="w-full">
                <img src={data.charts.powerTotal} alt="Potencia Total" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}

          {/* Gráfica 3: Comparación de Días por Hora */}
          {data.charts?.dailyPowerByHour && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Comparación de Potencia por Día
              </h3>
              <div className="w-full">
                <img src={data.charts.dailyPowerByHour} alt="Comparación por Día" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICAS - PÁGINA 2 */}
      <div id="pdf-charts-2" className="min-h-[297mm] w-[210mm] bg-white p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Análisis Visual (Continuación)</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
        </div>

        <div className="space-y-8">
          {/* Gráfica 4: Voltaje */}
          {data.charts?.voltage && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-amber-600 rounded-full mr-3"></span>
                Voltaje del Sistema
              </h3>
              <div className="w-full">
                <img src={data.charts.voltage} alt="Voltaje" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}

          {/* Gráfica 5: Corriente */}
          {data.charts?.current && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
                Corriente por Línea
              </h3>
              <div className="w-full">
                <img src={data.charts.current} alt="Corriente" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}

          {/* Gráfica 6: Energía Diaria */}
          {data.charts?.dailyPower && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-cyan-600 rounded-full mr-3"></span>
                Energía Diaria (Importada/Exportada)
              </h3>
              <div className="w-full">
                <img src={data.charts.dailyPower} alt="Energía Diaria" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLA DE CONSUMO POR MÁQUINA */}
      <div id="pdf-machine-table" className="min-h-[297mm] w-[210mm] bg-white p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Detalle por Máquina</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Máquina
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  kWh
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Costo
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  % Total
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Máx. Potencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.machines.map((machine, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">{machine.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-semibold">
                    {machine.isDMG ? (
                      <span className="text-xs">
                        <span className="text-green-600">+{(machine.exportedKwh || 0).toFixed(1)}</span>
                        {' / '}
                        <span className="text-red-600">-{(machine.importedKwh || 0).toFixed(1)}</span>
                      </span>
                    ) : (
                      (machine.kwh || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {machine.isDMG && (machine.cost || 0) < 0 ? (
                      <span className="text-green-600 font-semibold">-${Math.abs(machine.cost || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                    ) : (
                      <span className="text-gray-900">${(machine.cost || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(machine.percentage || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {(machine.maxPower || 0).toFixed(1)} kW
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ANÁLISIS AUTOMÁTICO */}
      <div id="pdf-analysis" className="min-h-[297mm] w-[210mm] bg-white p-12 flex flex-col">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Análisis y Conclusiones</h2>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-8 shadow-sm">
          <div className="flex">
            <div className="shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-6 flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Resumen del Periodo
              </h3>
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-700 text-base leading-relaxed text-justify">
                  {data.analysis}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-auto pt-8 border-t-2 border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Reporte generado automáticamente por EcoMonitor IoT</p>
            <p>SmartFactory Energy Hub - Monitoreo Energético</p>
          </div>
        </div>
      </div>
    </div>
  )
}
