SET search_path = public;
SET check_function_bodies = false;




SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';


SET default_table_access_method = "heap";



CREATE TABLE IF NOT EXISTS "public"."bitacora_importacion_pendiente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "import_batch_id" "uuid" NOT NULL,
    "fecha_hora" timestamp with time zone,
    "tecnico" "text",
    "nombre_equipo_origen" "text" NOT NULL,
    "area_origen" "text",
    "trabajo_realizado" "text" NOT NULL,
    "es_falla" boolean DEFAULT false NOT NULL,
    "tipo_falla" "text",
    "motivo_pendiente" "text" DEFAULT 'Activo no resuelto'::"text" NOT NULL,
    "estado" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "equipo_id_resuelto" "uuid",
    "created_by" "uuid" DEFAULT "public"."app_uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "bitacora_import_pend_estado_chk" CHECK (("estado" = ANY (ARRAY['Pendiente'::"text", 'Resuelto'::"text", 'Ignorado'::"text"]))),
    CONSTRAINT "bitacora_import_pend_tipo_falla_chk" CHECK ((("tipo_falla" IS NULL) OR ("tipo_falla" = ANY (ARRAY['Mecánica'::"text", 'Eléctrica / Control'::"text", 'Neumática'::"text", 'Hidráulica / Refrigeración'::"text", 'Ajuste / Otros'::"text"]))))
);



CREATE TABLE IF NOT EXISTS "public"."bitacora_mantenimiento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fecha_hora" timestamp with time zone NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "tecnico" "text" NOT NULL,
    "es_falla" boolean DEFAULT false NOT NULL,
    "tipo_intervencion" "text",
    "falla_motivo" "text",
    "trabajo_realizado" "text" NOT NULL,
    "estado_final" "text",
    "area" "text",
    "tipo_falla" "text",
    "ot_id" "uuid",
    "origen" "text" DEFAULT 'Manual'::"text",
    "import_batch_id" "uuid",
    "created_by" "uuid" DEFAULT "public"."app_uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_estado_final" CHECK ((("estado_final" IS NULL) OR ("estado_final" = ANY (ARRAY['Operativo'::"text", 'Operativo temporal'::"text", 'Pendiente'::"text", 'Fuera de servicio'::"text"])))),
    CONSTRAINT "chk_tipo_falla" CHECK ((("tipo_falla" IS NULL) OR ("tipo_falla" = ANY (ARRAY['Mecánica'::"text", 'Eléctrica / Control'::"text", 'Neumática'::"text", 'Hidráulica / Refrigeración'::"text", 'Ajuste / Otros'::"text"])))),
    CONSTRAINT "chk_tipo_intervencion" CHECK ((("tipo_intervencion" IS NULL) OR ("tipo_intervencion" = ANY (ARRAY['Correctiva'::"text", 'Preventiva'::"text", 'Inspección'::"text", 'Ajuste'::"text", 'Mejora'::"text", 'Otro'::"text"]))))
);



CREATE TABLE IF NOT EXISTS "public"."equipo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "ubicacion" "text",
    "criticidad" "text",
    "estado" "text" NOT NULL,
    "ubicacion_tecnica_id" "uuid",
    "fabricante" "text",
    "modelo" "text",
    "numero_serie" "text",
    "fecha_fabricacion" "date",
    "especificaciones_tecnicas" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "observaciones_tecnicas" "text",
    "area" "text",
    "activo" boolean DEFAULT true,
    "equipo_padre_id" "uuid"
);



COMMENT ON TABLE "public"."equipo" IS 'Maestro de equipos y activos de mantenimiento';




CREATE TABLE IF NOT EXISTS "public"."equipo_alias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alias" "text" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "observacion" "text",
    "created_by" "uuid" DEFAULT "public"."app_uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "equipo_alias_no_vacio" CHECK (("btrim"("alias") <> ''::"text"))
);



CREATE TABLE IF NOT EXISTS "public"."movimiento_inventario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "repuesto_id" "uuid" NOT NULL,
    "tipo_movimiento" "text" NOT NULL,
    "cantidad" numeric NOT NULL,
    "fecha" timestamp with time zone DEFAULT "now"(),
    "documento_referencia" "text",
    "usuario_id" "uuid",
    "observaciones" "text",
    CONSTRAINT "movimiento_inventario_cantidad_positiva" CHECK (("cantidad" > (0)::numeric)),
    CONSTRAINT "movimiento_inventario_tipo_valido" CHECK (("tipo_movimiento" = ANY (ARRAY['Stock Inicial'::"text", 'Entrada'::"text", 'Salida'::"text", 'Devolución a Bodega'::"text", 'Ajuste Positivo'::"text", 'Ajuste Negativo'::"text"])))
);



COMMENT ON TABLE "public"."movimiento_inventario" IS 'Kardex de movimientos de inventario de repuestos';




CREATE TABLE IF NOT EXISTS "public"."perfil_usuario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "nombre_completo" "text" NOT NULL,
    "username" "text" NOT NULL
);



COMMENT ON TABLE "public"."perfil_usuario" IS 'Perfiles básicos de usuarios del sistema';




CREATE TABLE IF NOT EXISTS "public"."proveedor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rut_identificador" "text" NOT NULL,
    "razon_social" "text" NOT NULL,
    "contacto" "text",
    "telefono" "text",
    "email" "text",
    "estado" "text" NOT NULL
);



COMMENT ON TABLE "public"."proveedor" IS 'Maestro de proveedores del sistema de mantenimiento';




CREATE TABLE IF NOT EXISTS "public"."repuesto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "fabricante" "text",
    "numero_parte" "text",
    "unidad_medida" "text" NOT NULL,
    "stock_minimo" numeric NOT NULL,
    "stock_maximo" numeric,
    "ubicacion_repuesto" "text",
    "criticidad" "text" NOT NULL,
    "estado" "text" NOT NULL,
    "precio_compra" numeric,
    "moneda_compra" "text"
);



COMMENT ON TABLE "public"."repuesto" IS 'Maestro de repuestos de mantenimiento industrial';




CREATE TABLE IF NOT EXISTS "public"."repuesto_equipo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "repuesto_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "cantidad_instalada" numeric
);



CREATE TABLE IF NOT EXISTS "public"."repuesto_proveedor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "repuesto_id" "uuid" NOT NULL,
    "proveedor_id" "uuid" NOT NULL,
    "codigo_proveedor" "text",
    "precio" numeric,
    "moneda" "text",
    "lead_time_dias" integer,
    "es_preferente" boolean DEFAULT false NOT NULL
);



COMMENT ON TABLE "public"."repuesto_proveedor" IS 'Relación comercial entre repuestos y proveedores';




CREATE TABLE IF NOT EXISTS "public"."ubicacion_tecnica" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "ubicacion_padre_id" "uuid",
    "descripcion" "text",
    "estado" "text" DEFAULT 'Activo'::"text" NOT NULL,
    CONSTRAINT "ubicacion_tecnica_estado_valido" CHECK (("estado" = ANY (ARRAY['Activo'::"text", 'Inactivo'::"text"])))
);



CREATE OR REPLACE VIEW "public"."vista_arbol_activos" WITH ("security_invoker"='true') AS
 WITH RECURSIVE "ubicaciones" AS (
         SELECT "u"."id",
            "u"."codigo",
            "u"."nombre",
            "u"."tipo",
            "u"."ubicacion_padre_id",
            0 AS "nivel",
            "u"."nombre" AS "ruta_nombre",
            "u"."codigo" AS "ruta_codigo"
           FROM "public"."ubicacion_tecnica" "u"
          WHERE (("u"."ubicacion_padre_id" IS NULL) AND ("u"."estado" = 'Activo'::"text"))
        UNION ALL
         SELECT "h"."id",
            "h"."codigo",
            "h"."nombre",
            "h"."tipo",
            "h"."ubicacion_padre_id",
            ("p"."nivel" + 1),
            (("p"."ruta_nombre" || ' > '::"text") || "h"."nombre") AS "text",
            (("p"."ruta_codigo" || ' > '::"text") || "h"."codigo") AS "text"
           FROM ("public"."ubicacion_tecnica" "h"
             JOIN "ubicaciones" "p" ON (("p"."id" = "h"."ubicacion_padre_id")))
          WHERE ("h"."estado" = 'Activo'::"text")
        ), "equipos_rec" AS (
         SELECT "e"."id",
            "e"."codigo",
            "e"."nombre",
            "e"."ubicacion_tecnica_id",
            "e"."equipo_padre_id",
            (COALESCE("u"."nivel", '-1'::integer) + 1) AS "nivel",
                CASE
                    WHEN ("u"."ruta_nombre" IS NULL) THEN "e"."nombre"
                    ELSE (("u"."ruta_nombre" || ' > '::"text") || "e"."nombre")
                END AS "ruta_nombre"
           FROM ("public"."equipo" "e"
             LEFT JOIN "ubicaciones" "u" ON (("u"."id" = "e"."ubicacion_tecnica_id")))
          WHERE (("e"."equipo_padre_id" IS NULL) AND (COALESCE("e"."activo", true) = true))
        UNION ALL
         SELECT "c"."id",
            "c"."codigo",
            "c"."nombre",
            "c"."ubicacion_tecnica_id",
            "c"."equipo_padre_id",
            ("p"."nivel" + 1),
            (("p"."ruta_nombre" || ' > '::"text") || "c"."nombre") AS "text"
           FROM ("public"."equipo" "c"
             JOIN "equipos_rec" "p" ON (("p"."id" = "c"."equipo_padre_id")))
          WHERE (COALESCE("c"."activo", true) = true)
        ), "fallas" AS (
         SELECT "b"."equipo_id",
            "count"(*) FILTER (WHERE ("b"."es_falla" = true)) AS "total_fallas",
            "max"("b"."fecha_hora") FILTER (WHERE ("b"."es_falla" = true)) AS "ultima_falla"
           FROM "public"."bitacora_mantenimiento" "b"
          GROUP BY "b"."equipo_id"
        )
 SELECT ('ubicacion:'::"text" || ("u"."id")::"text") AS "node_id",
    'ubicacion'::"text" AS "node_type",
    "u"."id" AS "ubicacion_id",
    NULL::"uuid" AS "equipo_id",
        CASE
            WHEN ("u"."ubicacion_padre_id" IS NULL) THEN NULL::"text"
            ELSE ('ubicacion:'::"text" || ("u"."ubicacion_padre_id")::"text")
        END AS "parent_node_id",
    "u"."codigo",
    "u"."nombre",
    "u"."tipo" AS "subtipo",
    "u"."nivel",
    "u"."ruta_nombre" AS "ruta",
    true AS "activo",
    (0)::bigint AS "total_fallas",
    NULL::timestamp with time zone AS "ultima_falla"
   FROM "ubicaciones" "u"
UNION ALL
 SELECT ('equipo:'::"text" || ("e"."id")::"text") AS "node_id",
    'equipo'::"text" AS "node_type",
    "e"."ubicacion_tecnica_id" AS "ubicacion_id",
    "e"."id" AS "equipo_id",
        CASE
            WHEN ("e"."equipo_padre_id" IS NOT NULL) THEN ('equipo:'::"text" || ("e"."equipo_padre_id")::"text")
            WHEN ("e"."ubicacion_tecnica_id" IS NOT NULL) THEN ('ubicacion:'::"text" || ("e"."ubicacion_tecnica_id")::"text")
            ELSE NULL::"text"
        END AS "parent_node_id",
    "e"."codigo",
    "e"."nombre",
    'Equipo'::"text" AS "subtipo",
    "er"."nivel",
    "er"."ruta_nombre" AS "ruta",
    COALESCE("e"."activo", true) AS "activo",
    COALESCE("f"."total_fallas", (0)::bigint) AS "total_fallas",
    "f"."ultima_falla"
   FROM (("public"."equipo" "e"
     JOIN "equipos_rec" "er" ON (("er"."id" = "e"."id")))
     LEFT JOIN "fallas" "f" ON (("f"."equipo_id" = "e"."id")));



CREATE OR REPLACE VIEW "public"."vista_inventario" AS
 SELECT "r"."id",
    "r"."codigo",
    "r"."nombre",
    "r"."categoria",
    "r"."unidad_medida",
    "r"."stock_minimo",
    "r"."stock_maximo",
    "r"."ubicacion_repuesto",
    "r"."criticidad",
    "r"."estado",
    COALESCE("sum"(
        CASE
            WHEN ("mi"."tipo_movimiento" = ANY (ARRAY['Stock Inicial'::"text", 'Entrada'::"text", 'Devolución a Bodega'::"text", 'Ajuste Positivo'::"text"])) THEN "mi"."cantidad"
            WHEN ("mi"."tipo_movimiento" = ANY (ARRAY['Salida'::"text", 'Ajuste Negativo'::"text"])) THEN (- "mi"."cantidad")
            ELSE (0)::numeric
        END), (0)::numeric) AS "stock_actual",
    "r"."precio_compra",
    "r"."moneda_compra",
    (COALESCE("sum"(
        CASE
            WHEN ("mi"."tipo_movimiento" = ANY (ARRAY['Stock Inicial'::"text", 'Entrada'::"text", 'Devolución a Bodega'::"text", 'Ajuste Positivo'::"text"])) THEN "mi"."cantidad"
            WHEN ("mi"."tipo_movimiento" = ANY (ARRAY['Salida'::"text", 'Ajuste Negativo'::"text"])) THEN (- "mi"."cantidad")
            ELSE (0)::numeric
        END), (0)::numeric) * COALESCE("r"."precio_compra", (0)::numeric)) AS "valor_stock"
   FROM ("public"."repuesto" "r"
     LEFT JOIN "public"."movimiento_inventario" "mi" ON (("mi"."repuesto_id" = "r"."id")))
  GROUP BY "r"."id", "r"."codigo", "r"."nombre", "r"."categoria", "r"."unidad_medida", "r"."stock_minimo", "r"."stock_maximo", "r"."ubicacion_repuesto", "r"."criticidad", "r"."estado", "r"."precio_compra", "r"."moneda_compra";



CREATE OR REPLACE VIEW "public"."vista_dashboard_inventario" AS
 SELECT COALESCE("sum"("valor_stock"), (0)::numeric) AS "valor_total_inventario",
    "count"(*) AS "cantidad_repuestos",
    "count"(*) FILTER (WHERE ("stock_actual" <= "stock_minimo")) AS "repuestos_bajo_minimo"
   FROM "public"."vista_inventario";



CREATE OR REPLACE VIEW "public"."vista_fallas_por_equipo" WITH ("security_invoker"='true') AS
 SELECT "e"."id" AS "equipo_id",
    "e"."codigo" AS "codigo_equipo",
    "e"."nombre" AS "nombre_equipo",
    "e"."area",
    "count"("b"."id") FILTER (WHERE ("b"."es_falla" = true)) AS "total_fallas",
    "max"("b"."fecha_hora") FILTER (WHERE ("b"."es_falla" = true)) AS "ultima_falla",
    "count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND ("b"."tipo_falla" = 'Mecánica'::"text"))) AS "fallas_mecanicas",
    "count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND ("b"."tipo_falla" = 'Eléctrica / Control'::"text"))) AS "fallas_electricas",
    "count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND ("b"."tipo_falla" = 'Neumática'::"text"))) AS "fallas_neumaticas",
    "count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND ("b"."tipo_falla" = 'Hidráulica / Refrigeración'::"text"))) AS "fallas_hidraulicas",
    "count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND (("b"."tipo_falla" = 'Ajuste / Otros'::"text") OR (("b"."tipo_falla" IS NOT NULL) AND ("b"."tipo_falla" <> ALL (ARRAY['Mecánica'::"text", 'Eléctrica / Control'::"text", 'Neumática'::"text", 'Hidráulica / Refrigeración'::"text"])))))) AS "otros_eventos"
   FROM ("public"."equipo" "e"
     LEFT JOIN "public"."bitacora_mantenimiento" "b" ON (("e"."id" = "b"."equipo_id")))
  GROUP BY "e"."id", "e"."codigo", "e"."nombre", "e"."area";



CREATE OR REPLACE VIEW "public"."vista_ficha_activo" AS
SELECT
    NULL::"uuid" AS "equipo_id",
    NULL::"text" AS "codigo",
    NULL::"text" AS "nombre",
    NULL::"text" AS "fabricante",
    NULL::"text" AS "modelo",
    NULL::"text" AS "numero_serie",
    NULL::"text" AS "criticidad",
    NULL::"text" AS "estado",
    NULL::"text" AS "area",
    NULL::"text" AS "ubicacion",
    NULL::"uuid" AS "ubicacion_tecnica_id",
    NULL::"uuid" AS "equipo_padre_id",
    NULL::"jsonb" AS "especificaciones_tecnicas",
    NULL::"text" AS "observaciones_tecnicas",
    NULL::bigint AS "total_fallas",
    NULL::timestamp with time zone AS "ultima_falla",
    NULL::bigint AS "fallas_ultimos_30_dias";



CREATE OR REPLACE VIEW "public"."vista_historial_fallas_activo" WITH ("security_invoker"='true') AS
 SELECT "b"."id" AS "bitacora_id",
    "b"."fecha_hora",
    "b"."equipo_id",
    "e"."codigo" AS "equipo_codigo",
    "e"."nombre" AS "equipo_nombre",
    "b"."tecnico",
    "b"."tipo_falla",
    "b"."falla_motivo",
    "b"."trabajo_realizado",
    "b"."estado_final",
    "b"."tipo_intervencion",
    "b"."area",
    "b"."origen"
   FROM ("public"."bitacora_mantenimiento" "b"
     JOIN "public"."equipo" "e" ON (("e"."id" = "b"."equipo_id")))
  WHERE ("b"."es_falla" = true);



CREATE OR REPLACE VIEW "public"."vista_resolucion_equipo" WITH ("security_invoker"='true') AS
 SELECT "e"."id" AS "equipo_id",
    "e"."nombre" AS "nombre_maestro",
    "lower"("btrim"("e"."nombre")) AS "nombre_busqueda",
    "e"."codigo",
    "e"."area",
    'maestro'::"text" AS "origen_nombre"
   FROM "public"."equipo" "e"
  WHERE (COALESCE("e"."activo", true) = true)
UNION ALL
 SELECT "e"."id" AS "equipo_id",
    "e"."nombre" AS "nombre_maestro",
    "lower"("btrim"("a"."alias")) AS "nombre_busqueda",
    "e"."codigo",
    "e"."area",
    'alias'::"text" AS "origen_nombre"
   FROM ("public"."equipo_alias" "a"
     JOIN "public"."equipo" "e" ON (("e"."id" = "a"."equipo_id")))
  WHERE (("a"."activo" = true) AND (COALESCE("e"."activo", true) = true));



CREATE OR REPLACE VIEW "public"."vista_retiros_mensuales" AS
 SELECT "date_trunc"('month'::"text", "mi"."fecha") AS "mes",
    "sum"(("mi"."cantidad" * COALESCE("r"."precio_compra", (0)::numeric))) AS "valor_retiros"
   FROM ("public"."movimiento_inventario" "mi"
     JOIN "public"."repuesto" "r" ON (("r"."id" = "mi"."repuesto_id")))
  WHERE ("mi"."tipo_movimiento" = 'Salida'::"text")
  GROUP BY ("date_trunc"('month'::"text", "mi"."fecha"))
  ORDER BY ("date_trunc"('month'::"text", "mi"."fecha"));



ALTER TABLE ONLY "public"."bitacora_importacion_pendiente"
    ADD CONSTRAINT "bitacora_importacion_pendiente_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."bitacora_mantenimiento"
    ADD CONSTRAINT "bitacora_mantenimiento_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."equipo_alias"
    ADD CONSTRAINT "equipo_alias_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."equipo"
    ADD CONSTRAINT "equipo_codigo_key" UNIQUE ("codigo");




ALTER TABLE ONLY "public"."equipo"
    ADD CONSTRAINT "equipo_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."movimiento_inventario"
    ADD CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."perfil_usuario"
    ADD CONSTRAINT "perfil_usuario_auth_user_id_key" UNIQUE ("auth_user_id");




ALTER TABLE ONLY "public"."perfil_usuario"
    ADD CONSTRAINT "perfil_usuario_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."perfil_usuario"
    ADD CONSTRAINT "perfil_usuario_username_key" UNIQUE ("username");




ALTER TABLE ONLY "public"."proveedor"
    ADD CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."proveedor"
    ADD CONSTRAINT "proveedor_rut_identificador_key" UNIQUE ("rut_identificador");




ALTER TABLE ONLY "public"."repuesto"
    ADD CONSTRAINT "repuesto_codigo_key" UNIQUE ("codigo");




ALTER TABLE ONLY "public"."repuesto_equipo"
    ADD CONSTRAINT "repuesto_equipo_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."repuesto_equipo"
    ADD CONSTRAINT "repuesto_equipo_repuesto_equipo_unique" UNIQUE ("repuesto_id", "equipo_id");




ALTER TABLE ONLY "public"."repuesto"
    ADD CONSTRAINT "repuesto_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."repuesto_proveedor"
    ADD CONSTRAINT "repuesto_proveedor_pkey" PRIMARY KEY ("id");




ALTER TABLE ONLY "public"."repuesto_proveedor"
    ADD CONSTRAINT "repuesto_proveedor_repuesto_proveedor_unique" UNIQUE ("repuesto_id", "proveedor_id");




ALTER TABLE ONLY "public"."ubicacion_tecnica"
    ADD CONSTRAINT "ubicacion_tecnica_codigo_key" UNIQUE ("codigo");




ALTER TABLE ONLY "public"."ubicacion_tecnica"
    ADD CONSTRAINT "ubicacion_tecnica_pkey" PRIMARY KEY ("id");




CREATE INDEX "idx_bitacora_equipo_fecha_desc" ON "public"."bitacora_mantenimiento" USING "btree" ("equipo_id", "fecha_hora" DESC);




CREATE INDEX "idx_bitacora_equipo_id" ON "public"."bitacora_mantenimiento" USING "btree" ("equipo_id");




CREATE INDEX "idx_bitacora_es_falla" ON "public"."bitacora_mantenimiento" USING "btree" ("es_falla");




CREATE INDEX "idx_bitacora_fecha_hora" ON "public"."bitacora_mantenimiento" USING "btree" ("fecha_hora" DESC);




CREATE INDEX "idx_bitacora_import_pendiente_batch" ON "public"."bitacora_importacion_pendiente" USING "btree" ("import_batch_id");




CREATE INDEX "idx_bitacora_import_pendiente_created_by" ON "public"."bitacora_importacion_pendiente" USING "btree" ("created_by");




CREATE INDEX "idx_bitacora_import_pendiente_equipo_resuelto" ON "public"."bitacora_importacion_pendiente" USING "btree" ("equipo_id_resuelto");




CREATE INDEX "idx_bitacora_import_pendiente_estado" ON "public"."bitacora_importacion_pendiente" USING "btree" ("estado", "created_at" DESC);




CREATE INDEX "idx_bitacora_tipo_falla" ON "public"."bitacora_mantenimiento" USING "btree" ("tipo_falla");




CREATE INDEX "idx_bitacora_tipo_intervencion" ON "public"."bitacora_mantenimiento" USING "btree" ("tipo_intervencion");




CREATE INDEX "idx_equipo_alias_created_by" ON "public"."equipo_alias" USING "btree" ("created_by");




CREATE INDEX "idx_equipo_alias_equipo_id" ON "public"."equipo_alias" USING "btree" ("equipo_id");




CREATE INDEX "idx_equipo_padre_id" ON "public"."equipo" USING "btree" ("equipo_padre_id");




CREATE UNIQUE INDEX "uq_equipo_alias_normalizado" ON "public"."equipo_alias" USING "btree" ("lower"("btrim"("alias")));




CREATE OR REPLACE VIEW "public"."vista_ficha_activo" WITH ("security_invoker"='true') AS
 SELECT "e"."id" AS "equipo_id",
    "e"."codigo",
    "e"."nombre",
    "e"."fabricante",
    "e"."modelo",
    "e"."numero_serie",
    "e"."criticidad",
    "e"."estado",
    "e"."area",
    "e"."ubicacion",
    "e"."ubicacion_tecnica_id",
    "e"."equipo_padre_id",
    "e"."especificaciones_tecnicas",
    "e"."observaciones_tecnicas",
    COALESCE("count"("b"."id") FILTER (WHERE ("b"."es_falla" = true)), (0)::bigint) AS "total_fallas",
    "max"("b"."fecha_hora") FILTER (WHERE ("b"."es_falla" = true)) AS "ultima_falla",
    COALESCE("count"("b"."id") FILTER (WHERE (("b"."es_falla" = true) AND ("b"."fecha_hora" >= ("now"() - '30 days'::interval)))), (0)::bigint) AS "fallas_ultimos_30_dias"
   FROM ("public"."equipo" "e"
     LEFT JOIN "public"."bitacora_mantenimiento" "b" ON (("b"."equipo_id" = "e"."id")))
  GROUP BY "e"."id";




CREATE OR REPLACE TRIGGER "trg_bitacora_updated_at" BEFORE UPDATE ON "public"."bitacora_mantenimiento" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();




ALTER TABLE ONLY "public"."bitacora_importacion_pendiente"
    ADD CONSTRAINT "bitacora_importacion_pendiente_equipo_id_resuelto_fkey" FOREIGN KEY ("equipo_id_resuelto") REFERENCES "public"."equipo"("id") ON DELETE RESTRICT;




ALTER TABLE ONLY "public"."bitacora_mantenimiento"
    ADD CONSTRAINT "bitacora_mantenimiento_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipo"("id");




ALTER TABLE ONLY "public"."equipo_alias"
    ADD CONSTRAINT "equipo_alias_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipo"("id") ON DELETE CASCADE;




ALTER TABLE ONLY "public"."equipo"
    ADD CONSTRAINT "equipo_padre_fk" FOREIGN KEY ("equipo_padre_id") REFERENCES "public"."equipo"("id") ON DELETE RESTRICT;




ALTER TABLE ONLY "public"."equipo"
    ADD CONSTRAINT "equipo_ubicacion_tecnica_fk" FOREIGN KEY ("ubicacion_tecnica_id") REFERENCES "public"."ubicacion_tecnica"("id");




ALTER TABLE ONLY "public"."movimiento_inventario"
    ADD CONSTRAINT "movimiento_inventario_repuesto_id_fkey" FOREIGN KEY ("repuesto_id") REFERENCES "public"."repuesto"("id");




ALTER TABLE ONLY "public"."repuesto_equipo"
    ADD CONSTRAINT "repuesto_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipo"("id");




ALTER TABLE ONLY "public"."repuesto_equipo"
    ADD CONSTRAINT "repuesto_equipo_repuesto_id_fkey" FOREIGN KEY ("repuesto_id") REFERENCES "public"."repuesto"("id");




ALTER TABLE ONLY "public"."repuesto_proveedor"
    ADD CONSTRAINT "repuesto_proveedor_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id");




ALTER TABLE ONLY "public"."repuesto_proveedor"
    ADD CONSTRAINT "repuesto_proveedor_repuesto_id_fkey" FOREIGN KEY ("repuesto_id") REFERENCES "public"."repuesto"("id");




ALTER TABLE ONLY "public"."ubicacion_tecnica"
    ADD CONSTRAINT "ubicacion_tecnica_padre_fk" FOREIGN KEY ("ubicacion_padre_id") REFERENCES "public"."ubicacion_tecnica"("id");
