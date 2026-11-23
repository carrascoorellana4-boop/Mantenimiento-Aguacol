# Maestro Oficial de Activos y Equipos — AGUACOL

> **Documento Controlado:** Inventario Técnico de Mantenimiento y Estructura de Activos  
> **Plataforma:** Sistema de Gestión de Mantenimiento AGUACOL (`https://mantenimiento.aguacol.cl`)  
> **Fecha de emisión:** 17 de Noviembre de 2026  
> **Total de activos registrados:** 115 equipos y componentes técnicos  
> **Total de ubicaciones técnicas:** 22 nodos jerárquicos

---

## 📊 Resumen Ejecutivo del Inventario

El presente documento consolida la totalidad de los activos físicos, maquinaria de proceso, sistemas auxiliares y servicios industriales registrados en el **Sistema de Gestión de Mantenimiento de AGUACOL**, estructurados conforme a la norma de jerarquía técnica (Planta $\rightarrow$ Área/Galpón $\rightarrow$ Equipo Padre $\rightarrow$ Componente/Sub-equipo).

| Macro-Área Operativa | Equipos Principales | Sub-equipos / Componentes | Total Activos |
| :--- | :---: | :---: | :---: |
| **Plásticos (Extrusión, Inyección, Refrig.)** | 41 | 27 | **68** |
| **Soplado** | 9 | 2 | **11** |
| **Producción / Líneas JJV** | 17 | 2 | **19** |
| **Sector Cloro (Galpón Cloro)** | 9 | 0 | **9** |
| **Servicios Generales e Infraestructura** | 7 | 0 | **7** |
| **Bodega Tradicional** | 1 | 0 | **1** |
| **TOTAL GENERAL** | **84** | **31** | **115** |

---

## 1. Planta Plásticos — Extrusión

Líneas principales de extrusión M1 a M5, sus componentes de proceso (embolsadoras, cabezales, bobinadoras) y logística asociada.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-PLA-GPL-EXT-M45-EMB` | **Embolsadora M4-M5** | **Principal** | 🔴 Alta | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Embolsadora M4-M5 |
| `AGL-PLA-GPL-EXT-ENV` | **Envolvedora de pallet** | **Principal** | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Envolvedora de pallet |
| `AGL-PLA-GPL-EXT-M45-ETQ` | **Etiquetadora M4-M5** | **Principal** | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Etiquetadora M4-M5 |
| `AGL-PLA-GPL-M01` | **Extrusora M1** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M1 |
| `AGL-PLA-GPL-EXT-M01-ASP` | **Aspiradora M1** | *Hijo de:* Extrusora M1 | 🟢 Baja | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M1 > Aspiradora M1 |
| `AGL-PLA-GPL-EXT-M01-RED` | **Caja reductora M1** | *Hijo de:* Extrusora M1 | 🔴 Alta | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M1 > Caja reductora M1 |
| `AGL-PLA-GPL-EXT-M01-MOL` | **Moledora M1** | *Hijo de:* Extrusora M1 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M1 > Moledora M1 |
| `AGL-PLA-GPL-EXT-M01-TST` | **Tester M1** | *Hijo de:* Extrusora M1 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M1 > Tester M1 |
| `AGL-PLA-GPL-M02` | **Extrusora M2** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M2 |
| `AGL-PLA-GPL-EXT-M02-ASP` | **Aspiradora M2** | *Hijo de:* Extrusora M2 | 🟢 Baja | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M2 > Aspiradora M2 |
| `AGL-PLA-GPL-EXT-M02-MOL` | **Moledora M2** | *Hijo de:* Extrusora M2 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M2 > Moledora M2 |
| `AGL-PLA-GPL-EXT-M02-TST` | **Tester M2** | *Hijo de:* Extrusora M2 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M2 > Tester M2 |
| `AGL-PLA-GPL-M03` | **Extrusora M3** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M3 |
| `AGL-PLA-GPL-EXT-M03-ASP` | **Aspiradora M3** | *Hijo de:* Extrusora M3 | 🟢 Baja | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M3 > Aspiradora M3 |
| `AGL-PLA-GPL-EXT-M03-MOL` | **Moledora M3** | *Hijo de:* Extrusora M3 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M3 > Moledora M3 |
| `AGL-PLA-GPL-EXT-M03-TST` | **Tester M3** | *Hijo de:* Extrusora M3 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M3 > Tester M3 |
| `AGL-PLA-GPL-M04` | **Extrusora M4** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M4 |
| `AGL-PLA-GPL-EXT-M04-ASP` | **Aspiradora M4** | *Hijo de:* Extrusora M4 | 🟢 Baja | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M4 > Aspiradora M4 |
| `AGL-PLA-GPL-M05` | **Extrusora M5** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M5 |
| `AGL-PLA-GPL-EXT-M05-ASP` | **Aspiradora M5** | *Hijo de:* Extrusora M5 | 🟢 Baja | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Extrusora M5 > Aspiradora M5 |
| `AGL-PLA-GPL-EXT-M45-MOL` | **Moledora M4-M5** | **Principal** | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Moledora M4-M5 |
| `AGL-PLA-GPL-EXT-M45-TST` | **Tester M4-M5** | **Principal** | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Extrusión > Tester M4-M5 |
| `AGL-PLA-LOG-TRA-01` | **Traspaleta 1** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Extrusión > Traspaleta 1 |

*Subtotal sección: 23 activos.*

---

## 2. Planta Plásticos — Inyección

Máquinas de inyección (Preformas, Borche, Inyectora 2 Tapas/Manillas), periféricos (robots, tolvas secadoras, moldes) y logística interna.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-PLA-GPL-INY-PREF-ACA-MOL` | **Acumulador de Aire de Molde — Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Acumulador de Aire de Molde — Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-ASP-01` | **Aspiradora Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Aspiradora Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-CINTA-01` | **Cinta de Salida — Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Cinta de Salida — Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-COMP-01` | **Compresor Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Compresor Inyectora de Preformas |
| `AGL-PLA-GPL-INY-02` | **Inyectora 2 de Tapas/Manillas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-ALIM-01` | **Alimentador Vibratorio de Tapas — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Alimentador Vibratorio de Tapas — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-CH-01` | **Chiller ANGES AWK-5 — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Chiller ANGES AWK-5 — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-CINTA-01` | **Cinta de Salida — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Cinta de Salida — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-CONT-01` | **Contador de Tapas — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Contador de Tapas — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-LAIN` | **Lainera de tapas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Lainera de tapas |
| `AGL-PLA-GPL-INY-02-SELLO-01` | **Unidad Automática de Inserción de Sello/Goma — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Unidad Automática de Inserción de Sello/Goma — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-02-TEMP-01` | **Unidad controladora de temperatura de cavidades de molde — Inyectora 2 de Tapas/Manillas** | *Hijo de:* Inyectora 2 de Tapas/Manillas | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora 2 de Tapas/Manillas > Unidad controladora de temperatura de cavidades de molde — Inyectora 2 de Tapas/Manillas |
| `AGL-PLA-GPL-INY-BOR` | **Inyectora BORCHE BS150-III** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III |
| `AGL-PLA-GPL-INY-BOR-CH-01` | **Chiller Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Chiller Inyectora BORCHE |
| `AGL-PLA-GPL-INY-BOR-CINTA-01` | **Cinta de Salida — Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Cinta de Salida — Inyectora BORCHE |
| `AGL-PLA-GPL-INY-BOR-PESA-01` | **Pesa / Sistema de Pesaje — Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Pesa / Sistema de Pesaje — Inyectora BORCHE |
| `AGL-PLA-GPL-INY-BOR-SELL-01` | **Selladora de Bolsas — Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Selladora de Bolsas — Inyectora BORCHE |
| `AGL-PLA-GPL-INY-BOR-TCF-01` | **Tablero de Control y Fuerza — Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Tablero de Control y Fuerza — Inyectora BORCHE |
| `AGL-PLA-GPL-INY-BOR-TEMP-01` | **Unidad controladora de temperatura de cavidades de molde — Inyectora BORCHE** | *Hijo de:* Inyectora BORCHE BS150-III | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora BORCHE BS150-III > Unidad controladora de temperatura de cavidades de molde — Inyectora BORCHE |
| `AGL-PLA-GPL-INY-PREF` | **Inyectora de preformas 1** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora de preformas 1 |
| `AGL-PLA-GPL-INY-PREF-CH-01` | **Chiller Inyectora de Preformas** | *Hijo de:* Inyectora de preformas 1 | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Inyectora de preformas 1 > Chiller Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-02` | **Inyectora de preformas 2** | **Principal** | 🔴 Alta | ✅ Activo | Plásticos > Galpón Plásticos > Inyección > Inyectora de preformas 2 |
| `AGL-PLA-GPL-INY-PREF-02-CH` | **Chiller Inyectora de preformas 2** | *Hijo de:* Inyectora de preformas 2 | 🟡 Media | ✅ Activo | Plásticos > Galpón Plásticos > Inyección > Inyectora de preformas 2 > Chiller Inyectora de preformas 2 |
| `AGL-PLA-GPL-INY-PREF-PESA-01` | **Pesa / Sistema de Pesaje — Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Pesa / Sistema de Pesaje — Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-SEP-01` | **Separador de Condensados — Compresor Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Separador de Condensados — Compresor Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-SILO-01` | **Silo Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Silo Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-TF-01` | **Tablero de Fuerza Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Tablero de Fuerza Inyectora de Preformas |
| `AGL-PLA-LOG-TRA-02` | **Traspaleta 2** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Traspaleta 2 |
| `AGL-PLA-GPL-INY-PREF-HRC-47` | **Unidad de distribución de calefacción de molde 47 g — Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Unidad de distribución de calefacción de molde 47 g — Inyectora de Preformas |
| `AGL-PLA-GPL-INY-PREF-HRC-90` | **Unidad de distribución de calefacción de molde 90 g — Inyectora de Preformas** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Inyección > Unidad de distribución de calefacción de molde 90 g — Inyectora de Preformas |

*Subtotal sección: 30 activos.*

---

## 3. Planta Plásticos — Refrigeración y Servicios Centrales

Compresores de aire (AirHorse, NuAir), chillers industriales (ANGES, Extrusión), bombas centrífugas de enfriamiento y estanques.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-PLA-REF-ACA-01` | **Acumulador de Aire** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Acumulador de Aire |
| `AGL-PLA-REF-BOM-HID` | **Bomba de Refrigeración Hidráulica** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración Hidráulica |
| `AGL-PLA-REF-BOM-M01` | **Bomba de Refrigeración M1** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración M1 |
| `AGL-PLA-REF-BOM-M02` | **Bomba de Refrigeración M2** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración M2 |
| `AGL-PLA-REF-BOM-M03` | **Bomba de Refrigeración M3** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración M3 |
| `AGL-PLA-REF-BOM-M04` | **Bomba de Refrigeración M4** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración M4 |
| `AGL-PLA-REF-BOM-M05` | **Bomba de Refrigeración M5** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración M5 |
| `AGL-PLA-REF-BOM-PET` | **Bomba de Refrigeración PET** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Bomba de Refrigeración PET |
| `AGL-PLA-REF-CH-01` | **Chiller de Refrigeración 1 -- ANGES** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Chiller de Refrigeración 1 -- ANGES |
| `AGL-PLA-REF-CH-02` | **Chiller de Refrigeración 2 -- ANGES** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Chiller de Refrigeración 2 -- ANGES |
| `AGL-PLA-REF-COMP-02` | **Compresor AirHorse** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Compresor AirHorse |
| `AGL-PLA-REF-COMP-01` | **Compresor NU-AIR** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Compresor NU-AIR |
| `AGL-PLA-REF-EST-01` | **Estanque Acumulador de Agua** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Estanque Acumulador de Agua |
| `AGL-PLA-GPL-MEZ-01` | **Mezclador Vertical de Plástico Wensui WSQB-100** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Mezclador Vertical de Plástico Wensui WSQB-100 |
| `AGL-PLA-GPL-MOL-01` | **Moledora de Plástico Wensui WSGP-400** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Galpón Plásticos > Moledora de Plástico Wensui WSGP-400 |
| `AGL-PLA-REF-TC-01` | **Tablero de Control Refrigeración** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Tablero de Control Refrigeración |
| `AGL-PLA-REF-TF-01` | **Tablero de Fuerza Refrigeración** | **Principal** | 🟢 Baja | ⚠️ Operativo | Plásticos > Sala de Refrigeración > Tablero de Fuerza Refrigeración |

*Subtotal sección: 17 activos.*

---

## 4. Área Soplado

Sopladoras S1 y S2 con equipos auxiliares (Embolsadora PET, Embandejadora S2), Compresores de alta presión (Booster, PET), Chiller dedicado y periféricos.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-SOP-CH-01` | **Chiller Soplado** | **Principal** | 🔴 Alta | ✅ Activo | Soplado > Chiller Soplado |
| `AGL-SOP-COMP-BOOST` | **Compresor Booster** | **Principal** | 🔴 Alta | ✅ Activo | Soplado > Compresor Booster |
| `AGL-SOP-COMP-PET` | **Compresor PET** | **Principal** | 🔴 Alta | ✅ Activo | Soplado > Compresor PET |
| `AGL-PLA-GPL-MEZ-PET` | **Mezcladora PET** | **Principal** | 🟢 Baja | ⚠️ Operativo | Soplado > Mezcladora PET |
| `AGL-PLA-GPL-MOL-PET` | **Moledora PET** | **Principal** | 🟢 Baja | ⚠️ Operativo | Soplado > Moledora PET |
| `AGL-SOP-PAL` | **Paletizadora** | **Principal** | 🟡 Media | ✅ Activo | Soplado > Paletizadora |
| `AGL-SOP-S01` | **S1** | **Principal** | 🔴 Alta | ✅ Activo | Soplado > S1 |
| `AGL-SOP-S01-EMB` | **Embolsadora PET** | *Hijo de:* S1 | 🔴 Alta | ✅ Activo | Soplado > S1 > Embolsadora PET |
| `AGL-SOP-S02` | **S2** | **Principal** | 🔴 Alta | ✅ Activo | Soplado > S2 |
| `AGL-SOP-S02-EMB` | **Embandejadora** | *Hijo de:* S2 | 🟡 Media | ✅ Activo | Soplado > S2 > Embandejadora |
| `AGL-SSGG-ILU-SOP-01` | **Sistema de iluminación Galpón Soplado** | **Principal** | 🟢 Baja | ⚠️ Operativo | Soplado > Sistema de iluminación Galpón Soplado |
| `AGL-SOP-LOG-TRA-03` | **Traspaleta 3** | **Principal** | 🟢 Baja | ⚠️ Operativo | Soplado > Traspaleta 3 |

*Subtotal sección: 12 activos.*

---

## 5. Área Producción / Envasado (JJV)

Líneas de llenado y envasado JJV Líneas 1 a 9, sistemas térmicos (horno de producción, selladora), planta de agua y estanques.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-JJV-PROD-BOM-SUM` | **Bomba sumergible Galpón de Producción** | **Principal** | 🟡 Media | ⚠️ Operativo | Producción / JJV > Galpón Producción > Bomba sumergible Galpón de Producción |
| `AGL-JJV-COMP-01` | **Compresor** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Compresor |
| `AGL-JJV-DESM-EQ` | **Desmineralizador** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Desmineralizador > Desmineralizador |
| `AGL-JJV-DESM-TK` | **Estanques de producción** | *Hijo de:* Desmineralizador | 🟡 Media | ✅ Activo | Producción / JJV > Desmineralizador > Desmineralizador > Estanques de producción |
| `AGL-JJV-PROD-L01` | **JJV Línea 1** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 1 |
| `AGL-JJV-PROD-L02` | **JJV Línea 2** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 2 |
| `AGL-JJV-PROD-L02-HOR` | **Horno de producción** | *Hijo de:* JJV Línea 2 | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 2 > Horno de producción |
| `AGL-JJV-PROD-L02-SELL` | **Selladora de producción** | *Hijo de:* JJV Línea 2 | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 2 > Selladora de producción |
| `AGL-JJV-PROD-L03` | **JJV Línea 3** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 3 |
| `AGL-JJV-PROD-L03-HOR` | **Horno de producción** | *Hijo de:* JJV Línea 3 | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 3 > Horno de producción |
| `AGL-JJV-PROD-L03-SELL` | **Selladora de producción** | *Hijo de:* JJV Línea 3 | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 3 > Selladora de producción |
| `AGL-JJV-PROD-L04` | **JJV Línea 4** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 4 |
| `AGL-JJV-PROD-L05` | **JJV Línea 5** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 5 |
| `AGL-JJV-PROD-L06` | **JJV Línea 6** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 6 |
| `AGL-JJV-PROD-L07` | **JJV Línea 7** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 7 |
| `AGL-JJV-PROD-L08` | **JJV Línea 8** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 8 |
| `AGL-JJV-PROD-L09` | **JJV Línea 9** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 9 |
| `AGL-JJV-PROD-L10` | **JJV Línea 10** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > JJV Línea 10 |
| `AGL-JJV-PROD-SELL` | **Selladora de producción** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Producción > Selladora de producción |
| `AGL-SSGG-ELEC-PROD-01` | **Sistema eléctrico galpón producción** | **Principal** | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Producción > Sistema eléctrico galpón producción |

*Subtotal sección: 19 activos.*

---

## 6. Sector Cloro (Galpón Cloro)

Equipos de trasvasije, bombas de alimentación e impulsión de estanques 1 y 2, hornos, selladoras e iluminación del galpón de cloro.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-JJV-CLORO-BAN-TRS` | **Banco de trasvasije de cloro** | **Principal** | 🟡 Media | ⚠️ Operativo | Producción / JJV > Galpón Cloro > Banco de trasvasije de cloro |
| `AGL-JJV-CLORO-BOM-01` | **Bomba de Alimentación Estanque Cloro 1** | **Principal** | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Cloro > Bomba de Alimentación Estanque Cloro 1 |
| `AGL-JJV-CLORO-BOM-02` | **Bomba de Alimentación Estanque Cloro 2** | **Principal** | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Cloro > Bomba de Alimentación Estanque Cloro 2 |
| `AGL-JJV-CLORO-IMP-01` | **Bomba Impulsora Estanque Cloro 1** | **Principal** | 🟡 Media | ⚠️ Operativo | Producción / JJV > Galpón Cloro > Bomba Impulsora Estanque Cloro 1 |
| `AGL-JJV-CLORO-IMP-02` | **Bomba Impulsora Estanque Cloro 2** | **Principal** | 🟡 Media | ⚠️ Operativo | Producción / JJV > Galpón Cloro > Bomba Impulsora Estanque Cloro 2 |
| `AGL-JJV-CLORO-HOR` | **Horno de cloro** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Cloro > Horno de cloro |
| `AGL-JJV-CLORO-SELL` | **Selladora de cloro** | **Principal** | 🔴 Alta | ✅ Activo | Producción / JJV > Galpón Cloro > Selladora de cloro |
| `AGL-JJV-CLORO-ILU-01` | **Sistema de iluminación Galpón Cloro** | **Principal** | 🟢 Baja | ⚠️ Operativo | Producción / JJV > Galpón Cloro > Sistema de iluminación Galpón Cloro |
| `AGL-JJV-CLORO-TRP` | **Transpaleta de cloro** | **Principal** | 🟡 Media | ✅ Activo | Producción / JJV > Galpón Cloro > Transpaleta de cloro |

*Subtotal sección: 9 activos.*

---

## 7. Servicios Generales, Infraestructura y Bodega Tradicional

Sistemas eléctricos, elevador de bodega tradicional, iluminación general, cocinas e infraestructura perimetral.

| Código | Nombre del Activo | Tipo / Dependencia | Criticidad | Estado | Ubicación / Ruta |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `AGL-BOD-ELEV-01` | **Elevador Bodega Tradicional** | **Principal** | 🟡 Media | ⚠️ Operativo | Bodega Tradicional > Elevador Bodega Tradicional |
| `AGL-SSGG-INF-POR-01` | **Portón de acceso a planta** | **Principal** | 🟡 Media | ⚠️ Operativo | Servicios Generales > Portón de acceso a planta |
| `AGL-SSGG-ILU-COC-01` | **Sistema de iluminación Cocina** | **Principal** | 🟢 Baja | ⚠️ Operativo | Producción / JJV > Cocina > Sistema de iluminación Cocina |
| `AGL-SSGG-TAB-COC-01` | **Tablero eléctrico Cocina** | **Principal** | 🟡 Media | ⚠️ Operativo | Producción / JJV > Cocina > Tablero eléctrico Cocina |

*Subtotal sección: 4 activos.*

---

## 📥 Disponibilidad para Envío y Descarga

Este listado está disponible en dos formatos listos para entrega o auditoría:
1. **Archivo Excel / CSV Tabulado:** Ubicado en la raíz del proyecto como [`Listado_Oficial_Activos_AGUACOL.csv`](file:///c:/Users/Álvaro/Documents/Sistema_Mantenimiento/Listado_Oficial_Activos_AGUACOL.csv). Formato delimitado por punto y coma (`;`) con codificación UTF-8 BOM, ideal para abrir directamente en Microsoft Excel sin problemas de tildes o caracteres especiales.
2. **Vista Interactiva en Línea:** Directamente accesible en el módulo de Árbol de Activos en producción: [https://mantenimiento.aguacol.cl](https://mantenimiento.aguacol.cl).
