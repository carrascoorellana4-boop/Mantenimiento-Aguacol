/**
 * REGISTRO PROGRESIVO DE CLASIFICACIONES DE EQUIPOS
 * 
 * Reglas de negocio:
 * 1. El maestro de equipos se construye progresivamente a partir de los registros reales de Bitácora.
 * 2. Relación jerárquica:
 *    EQUIPO PADRE
 *    └── EQUIPO HIJO
 * 3. NO crear en Supabase todavía.
 * 4. NO modificar registros históricos todavía.
 * 5. NO cambiar el texto original de la Bitácora.
 * 6. Mantener trazabilidad: Nombre original Excel → Padre > Hijo
 * 7. Esperar nuevas clasificaciones antes de ejecutar cambios en base de datos.
 */

export const CLASIFICACIONES_APROBADAS_REGISTRO = [
  {
    id: 'clasif-moledora-m3',
    nombreOriginal: 'Moledora M3',
    equipoPadre: 'M3',
    equipoHijo: 'Moledora',
    estado: 'Aprobado como hijo',
    accion: 'nuevo_hijo',
    trazabilidad: 'Moledora M3 → M3 > Moledora',
    arbolVisual: {
      padre: 'M3',
      hijo: 'Moledora'
    },
    fechaAprobacion: '2026-10-19',
    notas: 'Sub-equipo/componente asignado al equipo principal M3'
  },
  {
    id: 'clasif-elevador-bodega',
    nombreOriginal: 'Elevador Bodega',
    equipoPadre: 'Elevador Bodega Tradicional',
    equipoHijo: '-',
    estado: 'Aprobado como padre',
    accion: 'nuevo_padre',
    trazabilidad: 'Elevador Bodega → Elevador Bodega Tradicional',
    arbolVisual: {
      padre: 'Elevador Bodega Tradicional',
      hijo: null
    },
    fechaAprobacion: '2026-10-25',
    notas: 'Alias histórico directo del Elevador de carga en Bodega Tradicional'
  },
  {
    id: 'clasif-porton-planta',
    nombreOriginal: 'Portón planta',
    equipoPadre: 'Portón de acceso a planta',
    equipoHijo: '-',
    estado: 'Aprobado como padre',
    accion: 'nuevo_padre',
    trazabilidad: 'Portón planta → Portón de acceso a planta',
    arbolVisual: {
      padre: 'Portón de acceso a planta',
      hijo: null
    },
    fechaAprobacion: '2026-10-25',
    notas: 'Alias histórico directo del portón de acceso vehicular de planta'
  },
  {
    id: 'clasif-chiller-principal',
    nombreOriginal: 'Chiller principal',
    equipoPadre: 'Chiller principal',
    equipoHijo: '-',
    estado: 'Aprobado como padre',
    accion: 'nuevo_padre',
    trazabilidad: 'Chiller principal → Chiller principal (Marca ANGES)',
    arbolVisual: {
      padre: 'Chiller principal',
      hijo: null
    },
    fechaAprobacion: '2026-10-25',
    notas: 'Activo maestro validado marca ANGES en Refrigeración'
  },
  {
    id: 'clasif-chiller-secundario',
    nombreOriginal: 'Chiller secundario',
    equipoPadre: 'Chiller secundario',
    equipoHijo: '-',
    estado: 'Aprobado como padre',
    accion: 'nuevo_padre',
    trazabilidad: 'Chiller secundario → Chiller secundario (Marca ANGES)',
    arbolVisual: {
      padre: 'Chiller secundario',
      hijo: null
    },
    fechaAprobacion: '2026-10-25',
    notas: 'Activo maestro validado marca ANGES en Refrigeración'
  },
  {
    id: 'clasif-inyectora-tapas',
    nombreOriginal: 'Inyectora de tapas',
    equipoPadre: 'Inyectora 2',
    equipoHijo: '-',
    estado: 'Asociado a equipo existente',
    accion: 'existente',
    trazabilidad: 'Inyectora de tapas → Inyectora 2 de Tapas/Manillas',
    arbolVisual: {
      padre: 'Inyectora 2',
      hijo: null
    },
    fechaAprobacion: '2026-10-25',
    notas: 'Alias oficial validado para Inyectora 2 de Tapas/Manillas'
  }
]

