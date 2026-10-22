-- =============================================================================
-- LIMPIEZA MENSUAL AUTOMÁTICA DE PUBLICACIONES fb_posts
-- Portal de Noticias Hits 20
-- =============================================================================
--
-- INSTRUCCIONES DE USO: Ejecutar en DOS PASOS en el SQL Editor de Supabase.
--
-- NOTA: Las publicidades están en Google Sheets (no en Supabase), por lo que
-- este cron NO las afecta. Solo borra publicaciones de fb_posts con más de
-- 30 días de antigüedad.
-- =============================================================================

-- ══════════════════════════════════════════════════════
-- PASO 1: Ejecutar SOLO esto primero
-- ══════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ══════════════════════════════════════════════════════
-- PASO 2: Ejecutar esto en una segunda ejecución
-- ══════════════════════════════════════════════════════

-- NOTA: pg_cron NO soporta "L" para último día del mes (genera error 22023).
-- Solución: el job corre los días 28-31, y la función verifica internamente
-- si hoy es el último día REAL del mes antes de ejecutar el DELETE.
-- Funciona correctamente para febrero (28/29), meses de 30 y de 31 días.

CREATE OR REPLACE FUNCTION limpiar_publicaciones_antiguas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    filas_eliminadas INTEGER;
    es_ultimo_dia    BOOLEAN;
BEGIN
    es_ultimo_dia := (
        EXTRACT(DAY FROM NOW()) =
        EXTRACT(DAY FROM (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'))
    );

    IF NOT es_ultimo_dia THEN
        RAISE NOTICE '[Hits20] Hoy no es el último día del mes. Limpieza omitida.';
        RETURN;
    END IF;

    DELETE FROM fb_posts
    WHERE fecha_publicacion < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS filas_eliminadas = ROW_COUNT;

    RAISE NOTICE '[Hits20] Limpieza mensual completada: % publicaciones eliminadas (> 30 días).', filas_eliminadas;
END;
$$;

-- Programar el job: días 28-31 a las 06:00 UTC (= 03:00 ART)
SELECT cron.schedule(
    'limpiar_fb_posts_ultimo_dia_mes',
    '0 6 28-31 * *',
    $$SELECT limpiar_publicaciones_antiguas();$$
);

-- Verificar que quedó registrado correctamente
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'limpiar_fb_posts_ultimo_dia_mes';


-- =============================================================================
-- COMANDOS DE ADMINISTRACIÓN ÚTILES (ejecutar solo cuando sea necesario)
-- =============================================================================

-- Ver todos los jobs activos:
-- SELECT * FROM cron.job;

-- Ver historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Desactivar temporalmente:
-- UPDATE cron.job SET active = false WHERE jobname = 'limpiar_fb_posts_ultimo_dia_mes';

-- Reactivar:
-- UPDATE cron.job SET active = true WHERE jobname = 'limpiar_fb_posts_ultimo_dia_mes';

-- Eliminar definitivamente:
-- SELECT cron.unschedule('limpiar_fb_posts_ultimo_dia_mes');

-- Prueba manual inmediata (sin esperar al último día del mes):
-- DELETE FROM fb_posts WHERE fecha_publicacion < NOW() - INTERVAL '30 days';
