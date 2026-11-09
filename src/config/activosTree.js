/**
 * CONFIGURACIÓN Y MODELO JERÁRQUICO PARA ÁRBOL DE ACTIVOS - BASE V1 ACTUALIZADA
 * 
 * Empresa: AGUACOL
 * 
 * Estructura aprobada:
 * 1. PLÁSTICOS:
 *    - Inyección (Inyectora 2 con Chiller y Lainera; Inyectora Borche con Chiller; Inyectoras de preformas 1 y 2 con Chiller y formatos compatibles 25g/36g/47g/90g).
 *    - Extrusión (M1 a M5 con sus subactivos asociados; equipos compartidos M4-M5: Moledora, Tester, Embolsadora, Etiquetadora; Envolvedora de pallet).
 *    - Refrigeración (Compresor AirHorse, Compresor NuAir, Chiller Extrusión 1 y 2, Chiller principal ANGES, Chiller secundario ANGES, Estanque de refrigeración de Extrusión, Bombas de refrigeración M1 a M5 e Inyectora 2).
 *    - Logística (Traspaleta 1, Traspaleta 2; modelo pendiente de confirmar).
 * 2. SOPLADO (Reemplaza oficialmente a PET; PET solo referencia histórica):
 *    - S1 (con Embolsadora PET), S2, Compresor Booster, Compresor PET, Chiller Soplado (compartido S1-S2), Moledora, Paletizadora.
 * 3. PRODUCCIÓN / JJV:
 *    - Galpón de Producción: JJV Línea 1 a 9, Horno de producción (en Línea 3), Selladora de producción, Bomba sumergible Galpón de Producción.
 *    - Compresor, Estanques acumuladores de producto líquido, Desmineralizador (con Estanques de producción).
 *    - Galpón de Cloro (Horno de cloro, Selladora de cloro, Transpaleta de cloro).
 *    - Cocina (área/ubicación técnica de Producción).
 * 4. SERVICIOS GENERALES:
 *    - Instalaciones Generales, Portón de acceso a planta, Sistema de iluminación Galpón Soplado.
 * 5. BODEGA TRADICIONAL:
 *    - Elevador Bodega Tradicional.
 */

export const PLANTA_NOMBRE = 'AGUACOL'

export const ESTADOS_ACTIVO = {
  OPERATIVO: {
    id: 'operativo',
    label: 'Operativo',
    color: '#10b981',
    badgeClass: 'badge-estado-operativo',
    dotClass: 'dot-operativo'
  },
  EN_MANTENIMIENTO: {
    id: 'en_mantenimiento',
    label: 'En mantenimiento',
    color: '#f59e0b',
    badgeClass: 'badge-estado-mantenimiento',
    dotClass: 'dot-mantenimiento'
  },
  FUERA_DE_SERVICIO: {
    id: 'fuera_de_servicio',
    label: 'Fuera de servicio',
    color: '#ef4444',
    badgeClass: 'badge-estado-fuera',
    dotClass: 'dot-fuera'
  },
  INACTIVO: {
    id: 'inactivo',
    label: 'Inactivo',
    color: '#94a3b8',
    badgeClass: 'badge-estado-inactivo',
    dotClass: 'dot-inactivo'
  }
}

/**
 * Jerarquía aprobada oficialmente por el administrador - BASE V1 OFICIAL
 */
export const JERARQUIA_APROBADA = [
  // ==========================================
  // ÁREA 1: PLÁSTICOS
  // ==========================================
  {
    area: 'Plásticos',
    areaIcono: 'factory',
    areaDescripcion: 'Área integral de inyección, extrusión y servicios de refrigeración',
    equiposPadre: [
      // ------------------------------------------
      // 1.1 GRUPO: INYECCIÓN
      // ------------------------------------------
      {
        id: 'act-inyectora-2',
        codigo: 'Inyectora 2',
        nombre: 'Inyectora 2',
        area: 'Plásticos',
        grupo: 'Inyección',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Sector Inyección',
        hijos: [
          {
            id: 'act-inyectora-2-chiller',
            codigo: null,
            nombre: 'Chiller dedicado',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'Inyectora 2',
            padreNombre: 'Inyectora 2',
            padreId: 'act-inyectora-2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Unidad de refrigeración dedicada exclusivamente a Inyectora 2'
          },
          {
            id: 'act-inyectora-2-lainera',
            codigo: null,
            nombre: 'Lainera de tapas',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'Inyectora 2',
            padreNombre: 'Inyectora 2',
            padreId: 'act-inyectora-2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Lainera de tapas perteneciente estructuralmente a Inyectora 2'
          }
        ]
      },
      {
        id: 'act-inyectora-borche',
        codigo: 'Inyectora Borche',
        nombre: 'Inyectora Borche',
        area: 'Plásticos',
        grupo: 'Inyección',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Sector Inyección',
        hijos: [
          {
            id: 'act-inyectora-borche-chiller',
            codigo: null,
            nombre: 'Chiller dedicado',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'Inyectora Borche',
            padreNombre: 'Inyectora Borche',
            padreId: 'act-inyectora-borche',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Chiller de enfriamiento dedicado para Inyectora Borche'
          }
        ],
        relacionesFuncionales: {
          alimentacionRefrigeracion: 'Solo una de las líneas del sistema de refrigeración alimenta el Chiller de la Inyectora Borche'
        }
      },
      {
        id: 'act-inyectora-preformas-1',
        codigo: 'AGL-PLA-GPL-INY-PREF-01',
        aliasHistorico: 'Inyectora de preformas 1',
        nombre: 'Inyectora de preformas 1',
        area: 'Plásticos',
        grupo: 'Inyección',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Sector Preformas',
        formatoActual: null,
        formatosCompatibles: ['25 g', '36 g', '47 g', '90 g'],
        notasFormato: 'Solo puede existir un molde/formato instalado a la vez. Los formatos son moldes de inyección, no equipos hijo.',
        hijos: [
          {
            id: 'act-inyectora-preformas-1-chiller',
            codigo: null,
            nombre: 'Chiller dedicado',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'Inyectora de preformas 1',
            padreNombre: 'Inyectora de preformas 1',
            padreId: 'act-inyectora-preformas-1',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Unidad de refrigeración dedicada exclusivamente a Inyectora de preformas 1'
          }
        ]
      },
      {
        id: 'act-inyectora-preformas-2',
        codigo: 'AGL-PLA-GPL-INY-PREF-02',
        aliasHistorico: 'Inyectora de preformas 2',
        nombre: 'Inyectora de preformas 2',
        area: 'Plásticos',
        grupo: 'Inyección',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Sector Preformas',
        formatoActual: null,
        formatosCompatibles: ['25 g', '36 g', '47 g', '90 g'],
        notasFormato: 'Solo puede existir un molde/formato instalado a la vez. Los formatos son moldes de inyección, no equipos hijo.',
        hijos: [
          {
            id: 'act-inyectora-preformas-2-chiller',
            codigo: null,
            nombre: 'Chiller dedicado',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'Inyectora de preformas 2',
            padreNombre: 'Inyectora de preformas 2',
            padreId: 'act-inyectora-preformas-2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Unidad de refrigeración dedicada exclusivamente a Inyectora de preformas 2'
          }
        ]
      },
      {
        id: 'act-traspaleta-2',
        codigo: 'AGL-PLA-LOG-TRA-02',
        nombre: 'Traspaleta 2',
        color: 'Roja',
        modelo: 'Pendiente de confirmar',
        area: 'Plásticos',
        grupo: 'Inyección',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'AGUACOL → Plásticos → Galpón Plásticos → Inyección',
        descripcion: 'Traspaleta manual de movimiento de pallets en Inyección. Color: Roja.',
        hijos: []
      },

      // ------------------------------------------
      // 1.2 GRUPO: EXTRUSIÓN
      // ------------------------------------------
      {
        id: 'act-m1',
        codigo: 'AGL-PLA-GPL-M01',
        aliasHistorico: 'M1',
        nombre: 'M1',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Línea Extrusión',
        formatoFijo: '10 L',
        formatoActual: '10 L',
        formatosCompatibles: ['10 L'],
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Extrusión 1', 'Chiller Extrusión 2']
        },
        hijos: [
          {
            id: 'act-m1-moledora',
            codigo: null,
            nombre: 'Moledora M1',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M1',
            padreNombre: 'M1',
            padreId: 'act-m1',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Moledora asociada a M1'
          },
          {
            id: 'act-m1-tester',
            codigo: null,
            nombre: 'Tester M1',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M1',
            padreNombre: 'M1',
            padreId: 'act-m1',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Tester de estanqueidad para M1'
          },
          {
            id: 'act-m1-aspiradora',
            codigo: null,
            nombre: 'Aspiradora M1',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M1',
            padreNombre: 'M1',
            padreId: 'act-m1',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Aspiradora de material para M1'
          },
          {
            id: 'act-m1-caja-reductora',
            codigo: null,
            nombre: 'Caja reductora M1',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M1',
            padreNombre: 'M1',
            padreId: 'act-m1',
            estado: 'operativo',
            criticidad: 'Alta',
            descripcion: 'Caja reductora de transmisión de M1'
          }
        ]
      },
      {
        id: 'act-m2',
        codigo: 'AGL-PLA-GPL-M02',
        aliasHistorico: 'M2',
        nombre: 'M2',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Línea Extrusión',
        formatoActual: 'NEW 4,5 L',
        formatosCompatibles: ['NEW 4,5 L', 'PERA 5 L', 'Galón'],
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Extrusión 1', 'Chiller Extrusión 2']
        },
        hijos: [
          {
            id: 'act-m2-moledora',
            codigo: null,
            nombre: 'Moledora M2',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M2',
            padreNombre: 'M2',
            padreId: 'act-m2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Moledora asociada a M2'
          },
          {
            id: 'act-m2-tester',
            codigo: null,
            nombre: 'Tester M2',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M2',
            padreNombre: 'M2',
            padreId: 'act-m2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Tester de estanqueidad para M2'
          },
          {
            id: 'act-m2-aspiradora',
            codigo: null,
            nombre: 'Aspiradora M2',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M2',
            padreNombre: 'M2',
            padreId: 'act-m2',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Aspiradora de material para M2'
          }
        ]
      },
      {
        id: 'act-m3',
        codigo: 'AGL-PLA-GPL-M03',
        aliasHistorico: 'M3',
        nombre: 'M3',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Línea Extrusión',
        formatoActual: 'PERA 5 L',
        formatosCompatibles: ['NEW 4,5 L', 'PERA 5 L', 'Galón'],
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Extrusión 1', 'Chiller Extrusión 2']
        },
        hijos: [
          {
            id: 'act-m3-moledora',
            codigo: null,
            nombre: 'Moledora M3',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M3',
            padreNombre: 'M3',
            padreId: 'act-m3',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Moledora M3 (antigua referencia genérica Moledora)'
          },
          {
            id: 'act-m3-tester',
            codigo: null,
            nombre: 'Tester M3',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M3',
            padreNombre: 'M3',
            padreId: 'act-m3',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Tester de estanqueidad para M3'
          },
          {
            id: 'act-m3-aspiradora',
            codigo: null,
            nombre: 'Aspiradora M3',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M3',
            padreNombre: 'M3',
            padreId: 'act-m3',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Aspiradora de material para M3'
          }
        ]
      },
      {
        id: 'act-m4',
        codigo: 'AGL-PLA-GPL-M04',
        aliasHistorico: 'M4',
        nombre: 'M4',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Línea Extrusión',
        formatoFijo: '5 L apilable',
        formatoActual: '5 L apilable',
        formatosCompatibles: ['5 L apilable'],
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Extrusión 1', 'Chiller Extrusión 2'],
          equiposCompartidos: [
            { nombre: 'Moledora M4-M5', con: 'M5' },
            { nombre: 'Tester M4-M5', con: 'M5' },
            { nombre: 'Embolsadora M4-M5', con: 'M5' },
            { nombre: 'Etiquetadora M4-M5', con: 'M5' }
          ]
        },
        hijos: [
          {
            id: 'act-m4-aspiradora',
            codigo: null,
            nombre: 'Aspiradora M4',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M4',
            padreNombre: 'M4',
            padreId: 'act-m4',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Aspiradora de material para M4'
          }
        ]
      },
      {
        id: 'act-m5',
        codigo: 'AGL-PLA-GPL-M05',
        aliasHistorico: 'M5',
        nombre: 'M5',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Plásticos - Línea Extrusión',
        formatoFijo: '5 L apilable',
        formatoActual: '5 L apilable',
        formatosCompatibles: ['5 L apilable'],
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Extrusión 1', 'Chiller Extrusión 2'],
          equiposCompartidos: [
            { nombre: 'Moledora M4-M5', con: 'M4' },
            { nombre: 'Tester M4-M5', con: 'M4' },
            { nombre: 'Embolsadora M4-M5', con: 'M4' },
            { nombre: 'Etiquetadora M4-M5', con: 'M4' }
          ]
        },
        hijos: [
          {
            id: 'act-m5-aspiradora',
            codigo: null,
            nombre: 'Aspiradora M5',
            area: 'Plásticos',
            tipo: 'hijo',
            padreCodigo: 'M5',
            padreNombre: 'M5',
            padreId: 'act-m5',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Aspiradora de material para M5'
          }
        ]
      },
      // Equipos compartidos M4-M5 (Activos independientes no duplicados)
      {
        id: 'act-moledora-m4-m5',
        codigo: 'Moledora M4-M5',
        nombre: 'Moledora M4-M5',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        esCompartido: true,
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Bahía intermedia M4-M5',
        relacionesFuncionales: {
          servicioA: ['M4', 'M5'],
          tipoServicio: 'Moledora compartida físicamente entre M4 y M5 (no duplicada como hijo)'
        },
        hijos: []
      },
      {
        id: 'act-tester-m4-m5',
        codigo: 'Tester M4-M5',
        nombre: 'Tester M4-M5',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        esCompartido: true,
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Bahía intermedia M4-M5',
        relacionesFuncionales: {
          servicioA: ['M4', 'M5'],
          tipoServicio: 'Tester de estanqueidad compartido físicamente entre M4 y M5'
        },
        hijos: []
      },
      {
        id: 'act-embolsadora-m4-m5',
        codigo: 'Embolsadora M4-M5',
        nombre: 'Embolsadora M4-M5',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        esCompartido: true,
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Nave Plásticos - Sector M4-M5',
        descripcion: 'Máquina ubicada en Plásticos destinada al embolsado de productos apilables provenientes de M4 y M5.',
        relacionesFuncionales: {
          servicioA: ['M4', 'M5'],
          tipoServicio: 'Embolsadora de productos apilables compartida entre M4 y M5'
        },
        hijos: []
      },
      {
        id: 'act-etiquetadora-m4-m5',
        codigo: 'Etiquetadora M4-M5',
        nombre: 'Etiquetadora M4-M5',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        esCompartido: true,
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Nave Plásticos - Sector M4-M5',
        descripcion: 'Máquina que aplica etiquetas a los bidones apilables provenientes de M4 y M5.',
        relacionesFuncionales: {
          servicioA: ['M4', 'M5'],
          tipoServicio: 'Etiquetado automático de bidones apilables de M4 y M5'
        },
        hijos: []
      },
      {
        id: 'act-envolvedora-pallet',
        codigo: 'Envolvedora de pallet',
        nombre: 'Envolvedora de pallet',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Nave Plásticos - Final de Línea',
        hijos: []
      },
      {
        id: 'act-traspaleta-1',
        codigo: 'AGL-PLA-LOG-TRA-01',
        nombre: 'Traspaleta 1',
        color: 'Verde',
        modelo: 'Pendiente de confirmar',
        area: 'Plásticos',
        grupo: 'Extrusión',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'AGUACOL → Plásticos → Galpón Plásticos → Extrusión',
        descripcion: 'Traspaleta manual de movimiento de pallets en Extrusión. Color: Verde.',
        hijos: []
      },

      // ------------------------------------------
      // 1.3 GRUPO: REFRIGERACIÓN
      // ------------------------------------------
      {
        id: 'act-compresor-airhorse',
        codigo: 'Compresor AirHorse',
        nombre: 'Compresor AirHorse',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Refrigeración y Servicios',
        relacionesFuncionales: {
          suministraAireA: ['Extrusión', 'Inyección'],
          tipoServicio: 'Físicamente en Refrigeración; alimenta de aire comprimido a equipos de Extrusión e Inyección'
        },
        hijos: []
      },
      {
        id: 'act-compresor-nuair',
        codigo: 'Compresor NuAir',
        nombre: 'Compresor NuAir',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Refrigeración y Servicios',
        descripcion: 'Compresor ubicado físicamente en Refrigeración',
        hijos: []
      },
      {
        id: 'act-chiller-extrusion-1',
        codigo: 'Chiller Extrusión 1',
        nombre: 'Chiller Extrusión 1',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Refrigeración y Servicios',
        relacionesFuncionales: {
          refrigeraA: ['M1', 'M2', 'M3', 'M4', 'M5'],
          tipoServicio: 'Refrigera funcionalmente a M1, M2, M3, M4 y M5'
        },
        hijos: []
      },
      {
        id: 'act-chiller-extrusion-2',
        codigo: 'Chiller Extrusión 2',
        nombre: 'Chiller Extrusión 2',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Refrigeración y Servicios',
        relacionesFuncionales: {
          refrigeraA: ['M1', 'M2', 'M3', 'M4', 'M5'],
          tipoServicio: 'Refrigera funcionalmente a M1, M2, M3, M4 y M5'
        },
        hijos: []
      },
      {
        id: 'act-chiller-principal',
        codigo: 'AGL-PLA-REF-CH-02',
        nombre: 'Chiller principal',
        aliasHistorico: 'Chiller de Refrigeración 2 -- ANGES',
        marca: 'ANGES',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Chiller principal marca ANGES del sistema de refrigeración de planta (ACK-50(F), S/N A22060127)',
        hijos: []
      },
      {
        id: 'act-chiller-secundario',
        codigo: 'AGL-PLA-REF-CH-01',
        nombre: 'Chiller secundario',
        aliasHistorico: 'Chiller de Refrigeración 1 -- ANGES',
        marca: 'ANGES',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Chiller secundario marca ANGES del sistema de refrigeración de planta (ACK-25(D), S/N A21080132)',
        hijos: []
      },
      {
        id: 'act-estanque-refrigeracion-extrusion',
        codigo: 'AGL-PLA-REF-EST-01',
        nombre: 'Estanque de refrigeración de Extrusión',
        aliasHistorico: 'Estanque Acumulador de Agua',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Mantiene nivel de agua/refrigerante del circuito destinado a la refrigeración de moldes de Extrusión e hidráulica',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-m1',
        codigo: 'AGL-PLA-REF-BOM-M01',
        nombre: 'Bomba refrigeración M1',
        aliasHistorico: 'Bomba de Refrigeración M1',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para M1',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-m2',
        codigo: 'AGL-PLA-REF-BOM-M02',
        nombre: 'Bomba refrigeración M2',
        aliasHistorico: 'Bomba de Refrigeración M2',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para M2',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-m3',
        codigo: 'AGL-PLA-REF-BOM-M03',
        nombre: 'Bomba refrigeración M3',
        aliasHistorico: 'Bomba de Refrigeración M3',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para M3',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-m4',
        codigo: 'AGL-PLA-REF-BOM-M04',
        nombre: 'Bomba refrigeración M4',
        aliasHistorico: 'Bomba de Refrigeración M4',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para M4',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-m5',
        codigo: 'AGL-PLA-REF-BOM-M05',
        nombre: 'Bomba refrigeración M5',
        aliasHistorico: 'Bomba de Refrigeración M5',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para M5',
        hijos: []
      },
      {
        id: 'act-bomba-refrigeracion-inyectora-2',
        codigo: 'Bomba refrigeración Inyectora 2',
        nombre: 'Bomba refrigeración Inyectora 2',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Plásticos → Refrigeración',
        descripcion: 'Bomba de refrigeración independiente para Inyectora 2',
        hijos: []
      },
      {
        id: 'act-bombas-refrigeracion',
        codigo: 'Bombas de refrigeración existentes',
        nombre: 'Bombas de refrigeración existentes',
        area: 'Plásticos',
        grupo: 'Refrigeración',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Refrigeración y Servicios',
        descripcion: 'Sistema de bombeo y recirculación general del circuito de refrigeración',
        relacionesFuncionales: {
          alimentaA: ['Inyectora Borche (una línea de refrigeración)'],
          tipoServicio: 'Solo una de las líneas del sistema de refrigeración alimenta el Chiller de la Inyectora Borche'
        },
        hijos: []
      }
    ]
  },

  // ==========================================
  // ÁREA 2: SOPLADO (Ex PET)
  // ==========================================
  {
    area: 'Soplado',
    areaIcono: 'flask',
    areaDescripcion: 'Área de soplado de envases plásticos y servicios auxiliares (Ex PET)',
    equiposPadre: [
      {
        id: 'act-s1',
        codigo: 'S1',
        nombre: 'S1',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Soplado - Línea 1',
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Soplado (Chiller compartido S1-S2)'],
          alimentadoPor: ['Compresor Booster', 'Compresor PET']
        },
        hijos: [
          {
            id: 'act-s1-embolsadora-pet',
            codigo: null,
            nombre: 'Embolsadora PET',
            area: 'Soplado',
            tipo: 'hijo',
            padreCodigo: 'S1',
            padreNombre: 'S1',
            padreId: 'act-s1',
            estado: 'operativo',
            criticidad: 'Media',
            descripcion: 'Embolsadora PET perteneciente estructuralmente a S1'
          }
        ]
      },
      {
        id: 'act-s2',
        codigo: 'S2',
        nombre: 'S2',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Nave Soplado - Línea 2',
        relacionesFuncionales: {
          refrigeradoPor: ['Chiller Soplado (Chiller compartido S1-S2)'],
          alimentadoPor: ['Compresor Booster', 'Compresor PET']
        },
        hijos: []
      },
      {
        id: 'act-compresor-booster',
        codigo: 'Compresor Booster',
        nombre: 'Compresor Booster',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Compresores Soplado',
        relacionesFuncionales: {
          suministraAireA: ['S1', 'S2'],
          tipoServicio: 'Alimenta funcionalmente de alta presión a las sopladoras S1 y S2'
        },
        hijos: []
      },
      {
        id: 'act-compresor-pet',
        codigo: 'Compresor PET',
        nombre: 'Compresor PET',
        aliasHistorico: 'Compresor(es)',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Compresores Soplado',
        relacionesFuncionales: {
          suministraAireA: ['S1', 'S2'],
          tipoServicio: 'Alimenta funcionalmente las sopladoras S1 y S2'
        },
        hijos: []
      },
      {
        id: 'act-chiller-soplado',
        codigo: 'Chiller Soplado',
        nombre: 'Chiller Soplado',
        aliasHistorico: 'Chiller compartido S1-S2',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Servicios Soplado',
        relacionesFuncionales: {
          refrigeraA: ['S1', 'S2'],
          tipoServicio: 'Refrigera funcionalmente a las sopladoras S1 y S2'
        },
        hijos: []
      },
      {
        id: 'act-soplado-moledora',
        codigo: 'Moledora',
        nombre: 'Moledora',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Nave Soplado - Sector Molienda',
        hijos: []
      },
      {
        id: 'act-soplado-paletizadora',
        codigo: 'Paletizadora',
        nombre: 'Paletizadora',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Nave Soplado - Final de Línea',
        hijos: []
      },
      {
        id: 'act-traspaleta-3',
        codigo: 'AGL-SOP-LOG-TRA-03',
        nombre: 'Traspaleta 3',
        color: 'Roja',
        modelo: 'Pendiente de confirmar',
        area: 'Soplado',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'AGUACOL → Soplado',
        descripcion: 'Traspaleta manual de movimiento de pallets en Soplado (PET). Color: Roja.',
        hijos: []
      }
    ]
  },

  // ==========================================
  // ÁREA 3: PRODUCCIÓN / JJV
  // ==========================================
  {
    area: 'Producción / JJV',
    areaIcono: 'cog',
    areaDescripcion: 'Líneas de envasado JJV, galpón de producción, cloro y cocina',
    equiposPadre: [
      // 3.1 GALPÓN DE PRODUCCIÓN
      {
        id: 'act-jjv-1',
        codigo: 'JJV Línea 1',
        nombre: 'JJV Línea 1',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 1',
        hijos: []
      },
      {
        id: 'act-jjv-2',
        codigo: 'JJV Línea 2',
        nombre: 'JJV Línea 2',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 2',
        hijos: []
      },
      {
        id: 'act-jjv-3',
        codigo: 'JJV Línea 3',
        nombre: 'JJV Línea 3',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 3',
        hijos: [
          {
            id: 'act-horno-produccion',
            codigo: null,
            nombre: 'Horno de producción',
            area: 'Producción / JJV',
            tipo: 'hijo',
            padreCodigo: 'JJV Línea 3',
            padreNombre: 'JJV Línea 3',
            padreId: 'act-jjv-3',
            estado: 'operativo',
            criticidad: 'Alta',
            descripcion: 'Horno perteneciente estructuralmente a JJV Línea 3'
          }
        ]
      },
      {
        id: 'act-jjv-4',
        codigo: 'JJV Línea 4',
        nombre: 'JJV Línea 4',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 4',
        hijos: []
      },
      {
        id: 'act-jjv-5',
        codigo: 'JJV Línea 5',
        nombre: 'JJV Línea 5',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 5',
        hijos: []
      },
      {
        id: 'act-jjv-6',
        codigo: 'JJV Línea 6',
        nombre: 'JJV Línea 6',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 6',
        hijos: []
      },
      {
        id: 'act-jjv-7',
        codigo: 'JJV Línea 7',
        nombre: 'JJV Línea 7',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 7',
        hijos: []
      },
      {
        id: 'act-jjv-8',
        codigo: 'JJV Línea 8',
        nombre: 'JJV Línea 8',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 8',
        hijos: []
      },
      {
        id: 'act-jjv-9',
        codigo: 'JJV Línea 9',
        nombre: 'JJV Línea 9',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Galpón de Producción - Línea 9',
        hijos: []
      },
      {
        id: 'act-selladora-produccion',
        codigo: 'Selladora de producción',
        nombre: 'Selladora de producción',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Galpón de Producción',
        descripcion: 'Ubicada físicamente dentro del Galpón de Producción. No pertenece a ninguna línea JJV específica.',
        hijos: []
      },
      {
        id: 'act-bomba-sumergible-galpon-prod',
        codigo: 'AGL-JJV-PROD-BOM-SUM',
        nombre: 'Bomba sumergible Galpón de Producción',
        area: 'Producción / JJV',
        grupo: 'Galpón de Producción',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Producción / JJV → Galpón de Producción',
        descripcion: 'Bomba sumergible destinada a evacuar agua acumulada en el Galpón de Producción donde operan las líneas JJV.',
        hijos: []
      },

      // 3.2 SERVICIOS Y SUMINISTROS DE PRODUCCIÓN
      {
        id: 'act-jjv-compresor',
        codigo: 'Compresor',
        nombre: 'Compresor',
        area: 'Producción / JJV',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Sala de Compresores General',
        hijos: []
      },
      {
        id: 'act-estanques-acumuladores-liquido',
        codigo: 'AGL-JJV-DESM-TK',
        nombre: 'Estanques acumuladores de producto líquido',
        aliasHistorico: 'Estanques de producción',
        area: 'Producción / JJV',
        grupo: 'Producción / JJV',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'AGUACOL → Producción / JJV',
        descripcion: 'Estanques acumuladores de producto líquido dentro del área de Producción. Reutiliza el activo AGL-JJV-DESM-TK liberado de la relación con Desmineralizador.',
        hijos: []
      },
      {
        id: 'act-desmineralizador',
        codigo: 'Desmineralizador',
        nombre: 'Desmineralizador',
        area: 'Producción / JJV',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Alta',
        ubicacion: 'Planta de Tratamiento de Agua',
        hijos: []
      },

      // 3.3 GALPÓN DE CLORO
      {
        id: 'act-horno-cloro',
        codigo: 'Horno de cloro',
        nombre: 'Horno de cloro',
        area: 'Producción / JJV',
        grupo: 'Galpón de Cloro',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Galpón de Cloro',
        hijos: []
      },
      {
        id: 'act-selladora-cloro',
        codigo: 'Selladora de cloro',
        nombre: 'Selladora de cloro',
        area: 'Producción / JJV',
        grupo: 'Galpón de Cloro',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Galpón de Cloro',
        hijos: []
      },
      {
        id: 'act-transpaleta-cloro',
        codigo: 'Transpaleta de cloro',
        nombre: 'Transpaleta de cloro',
        area: 'Producción / JJV',
        grupo: 'Galpón de Cloro',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'Galpón de Cloro',
        hijos: []
      },
      {
        id: '264bebd7-326c-4e58-880c-ef55ad0647ff',
        codigo: 'AGL-JJV-CLORO-BOM-01',
        nombre: 'Bomba de Alimentación Estanque Cloro 1',
        area: 'Producción / JJV',
        grupo: 'Galpón de Cloro',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Galpón de Cloro',
        hijos: []
      },
      {
        id: '469c74de-3696-4f1e-aa5c-f331777845ad',
        codigo: 'AGL-JJV-CLORO-BOM-02',
        nombre: 'Bomba de Alimentación Estanque Cloro 2',
        area: 'Producción / JJV',
        grupo: 'Galpón de Cloro',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Galpón de Cloro',
        hijos: []
      },

      // 3.4 COCINA
      {
        id: 'act-cocina',
        codigo: 'Cocina',
        nombre: 'Cocina',
        area: 'Producción / JJV',
        grupo: 'Cocina',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'Área de Servicios y Cocina',
        descripcion: 'Ubicación física de Cocina en Producción / JJV (ubicación técnica, no un equipo)',
        hijos: []
      }
    ]
  },

  // ==========================================
  // ÁREA 4: SERVICIOS GENERALES
  // ==========================================
  {
    area: 'Servicios Generales',
    areaIcono: 'tools',
    areaDescripcion: 'Mantenimiento de infraestructura, instalaciones generales y servicios de planta',
    equiposPadre: [
      {
        id: 'act-instalaciones-generales',
        codigo: 'Instalaciones Generales',
        nombre: 'Instalaciones Generales',
        area: 'Servicios Generales',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'Toda la planta',
        descripcion: 'Contexto de trabajos de Servicios Generales e Infraestructura (no representa un activo aislado inventado)',
        hijos: []
      },
      {
        id: 'act-porton-acceso-planta',
        codigo: 'AGL-SSGG-INF-POR-01',
        nombre: 'Portón de acceso a planta',
        area: 'Servicios Generales',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Servicios Generales',
        descripcion: 'Portón vehicular por donde ingresan vehículos y camiones a la planta',
        hijos: []
      },
      {
        id: 'act-iluminacion-galpon-soplado',
        codigo: 'AGL-SSGG-ILU-SOP-01',
        nombre: 'Sistema de iluminación Galpón Soplado',
        area: 'Servicios Generales',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'AGUACOL → Servicios Generales (Referencia física: Galpón Soplado)',
        descripcion: 'Sistema integral de iluminación y luminarias del Galpón de Soplado',
        hijos: []
      },
      {
        id: 'act-iluminacion-cocina',
        codigo: 'AGL-SSGG-ILU-COC-01',
        nombre: 'Sistema de iluminación Cocina',
        area: 'Servicios Generales',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Baja',
        ubicacion: 'AGUACOL → Servicios Generales (Referencia física: Producción / JJV → Cocina)',
        descripcion: 'Sistema integral de iluminación de Cocina con referencia física en Producción / JJV → Cocina',
        hijos: []
      },
      {
        id: 'act-tablero-electrico-cocina',
        codigo: 'AGL-SSGG-TAB-COC-01',
        nombre: 'Tablero eléctrico Cocina',
        area: 'Servicios Generales',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Servicios Generales (Referencia física: Producción / JJV → Cocina)',
        descripcion: 'Tablero eléctrico de distribución y control de Cocina con referencia física en Producción / JJV → Cocina',
        hijos: []
      }
    ]
  },

  // ==========================================
  // ÁREA 5: BODEGA TRADICIONAL
  // ==========================================
  {
    area: 'Bodega Tradicional',
    areaIcono: 'box',
    areaDescripcion: 'Almacenamiento de pallets y materias primas en racks',
    equiposPadre: [
      {
        id: 'act-elevador-bodega-tradicional',
        codigo: 'AGL-BOD-ELEV-01',
        nombre: 'Elevador Bodega Tradicional',
        area: 'Bodega Tradicional',
        tipo: 'padre',
        estado: 'operativo',
        criticidad: 'Media',
        ubicacion: 'AGUACOL → Bodega Tradicional',
        descripcion: 'Elevador de carga destinado a elevar pallets para almacenarlos en racks',
        hijos: []
      }
    ]
  }
]

/**
 * Normaliza texto para comparaciones sin tildes ni mayúsculas
 */
const norm = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/**
 * Ayudante para resolver el equipo homólogo de public.equipo
 */
function findMatchingEquipo(def, equiposList) {
  if (!def || !Array.isArray(equiposList)) return null
  const defCod = norm(def.codigo)
  const defNom = norm(def.nombre)

  // 1. Coincidencia exacta de código
  let match = equiposList.find(
    (eq) => eq.codigo && defCod && norm(eq.codigo) === defCod
  )
  if (match) return match

  // 2. Coincidencia exacta de nombre
  match = equiposList.find(
    (eq) => eq.nombre && defNom && norm(eq.nombre) === defNom
  )
  if (match) return match

  // 3. Coincidencia por alias histórico si existe en la definición
  if (def.aliasHistorico) {
    const aliasNorm = norm(def.aliasHistorico)
    match = equiposList.find(
      (eq) =>
        (eq.nombre && norm(eq.nombre) === aliasNorm) ||
        (eq.codigo && norm(eq.codigo) === aliasNorm)
    )
    if (match) return match
  }

  // 4. Coincidencia cruzada código <-> nombre
  if (defCod) {
    match = equiposList.find((eq) => eq.nombre && norm(eq.nombre) === defCod)
    if (match) return match
  }
  if (defNom) {
    match = equiposList.find((eq) => eq.codigo && norm(eq.codigo) === defNom)
    if (match) return match
  }

  return null
}

function findMatchingSbNode(def, dbMatch, supabaseArbolNodes) {
  if (!def || !Array.isArray(supabaseArbolNodes)) return null
  if (dbMatch && dbMatch.id) {
    const match = supabaseArbolNodes.find(
      (sn) => sn.equipo_id && sn.equipo_id === dbMatch.id
    )
    if (match) return match
  }
  const defCod = norm(def.codigo)
  const defNom = norm(def.nombre)
  let match = supabaseArbolNodes.find(
    (sn) =>
      (sn.codigo && defCod && norm(sn.codigo) === defCod) ||
      (sn.nombre && defNom && norm(sn.nombre) === defNom)
  )
  if (match) return match

  if (def.aliasHistorico) {
    const aliasNorm = norm(def.aliasHistorico)
    match = supabaseArbolNodes.find(
      (sn) =>
        (sn.codigo && norm(sn.codigo) === aliasNorm) ||
        (sn.nombre && norm(sn.nombre) === aliasNorm)
    )
    if (match) return match
  }

  return null
}

/**
 * Función que ensambla el árbol completo combinando la jerarquía aprobada
 * con los datos reales de la base de datos (equiposList de public.equipo).
 * Si se pasa una lista de BD (public.equipo o vista_arbol_activos), vincula los equipoId reales
 * y los identificadores de nodo (node_id, parent_node_id, node_type, ruta).
 */
export function buildActivosTree(equiposList = [], supabaseArbolNodes = []) {
  return JERARQUIA_APROBADA.map((areaDef) => {
    const areaId = `area-${norm(areaDef.area).replace(/[^a-z0-9]/g, '-')}`

    const equipos = areaDef.equiposPadre.map((padreDef) => {
      // Buscar si el equipo coincide con algún registro en public.equipo para trazabilidad
      const dbMatch = findMatchingEquipo(padreDef, equiposList)

      // Buscar si existe nodo homólogo en public.vista_arbol_activos
      const sbNodeMatch = findMatchingSbNode(padreDef, dbMatch, supabaseArbolNodes)

      const color = dbMatch?.especificaciones_tecnicas?.color || padreDef.color || null

      const padreConDb = {
        ...padreDef,
        codigo: dbMatch?.codigo || padreDef.codigo,
        id: dbMatch ? dbMatch.id : (padreDef.equipoId || padreDef.id),
        localId: padreDef.id,
        equipoId: (sbNodeMatch && sbNodeMatch.equipo_id) || (dbMatch ? dbMatch.id : (padreDef.equipoId || null)),
        color,
        nodeId: sbNodeMatch ? sbNodeMatch.node_id : null,
        parentNodeId: sbNodeMatch ? sbNodeMatch.parent_node_id : null,
        nodeType: sbNodeMatch ? sbNodeMatch.node_type : 'padre',
        ruta: sbNodeMatch ? sbNodeMatch.ruta : `AGUACOL / ${areaDef.area} / ${padreDef.nombre}`,
        activoBd: dbMatch ? dbMatch.activo : true,
        dbData: dbMatch || null,
        hijos: (padreDef.hijos || []).map((hijoDef) => {
          const hijoDbMatch = findMatchingEquipo(hijoDef, equiposList)
          const sbHijoMatch = findMatchingSbNode(hijoDef, hijoDbMatch, supabaseArbolNodes)

          const hijoColor = hijoDbMatch?.especificaciones_tecnicas?.color || hijoDef.color || null

          return {
            ...hijoDef,
            codigo: hijoDbMatch?.codigo || hijoDef.codigo,
            id: hijoDbMatch ? hijoDbMatch.id : (hijoDef.equipoId || hijoDef.id),
            localId: hijoDef.id,
            equipoId: (sbHijoMatch && sbHijoMatch.equipo_id) || (hijoDbMatch ? hijoDbMatch.id : (hijoDef.equipoId || null)),
            color: hijoColor,
            nodeId: sbHijoMatch ? sbHijoMatch.node_id : null,
            parentNodeId: sbHijoMatch ? sbHijoMatch.parent_node_id : (sbNodeMatch ? sbNodeMatch.node_id : null),
            nodeType: sbHijoMatch ? sbHijoMatch.node_type : 'hijo',
            ruta: sbHijoMatch ? sbHijoMatch.ruta : `AGUACOL / ${areaDef.area} / ${padreDef.nombre} / ${hijoDef.nombre}`,
            padreEquipoId: (sbNodeMatch && sbNodeMatch.equipo_id) || (dbMatch ? dbMatch.id : (padreDef.equipoId || null))
          }
        })
      }

      return padreConDb
    })

    return {
      id: areaId,
      nombre: areaDef.area,
      icono: areaDef.areaIcono || 'factory',
      descripcion: areaDef.areaDescripcion || '',
      equipos
    }
  })
}

/**
 * Busca un activo por ID en todo el árbol jerárquico (padres e hijos)
 */
export function findActivoInTree(tree, targetId) {
  if (!Array.isArray(tree) || !targetId) return null
  for (const area of tree) {
    if (!area.equipos) continue
    for (const equipo of area.equipos) {
      if (
        equipo.id === targetId ||
        equipo.localId === targetId ||
        equipo.equipoId === targetId ||
        (equipo.codigo && norm(equipo.codigo) === norm(targetId))
      ) return equipo
      if (equipo.hijos && equipo.hijos.length > 0) {
        for (const hijo of equipo.hijos) {
          if (
            hijo.id === targetId ||
            hijo.localId === targetId ||
            hijo.equipoId === targetId ||
            (hijo.codigo && norm(hijo.codigo) === norm(targetId))
          ) return hijo
        }
      }
    }
  }
  return null
}
