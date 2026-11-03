-- la bitácora real ya trae ot_id; se enlaza con la tabla de OT recién creada
ALTER TABLE public.bitacora_mantenimiento ADD CONSTRAINT fk_bitacora_ot FOREIGN KEY (ot_id) REFERENCES public.orden_trabajo(id) ON DELETE SET NULL;
