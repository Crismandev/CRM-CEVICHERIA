-- =========================================================================
-- MIGRACIÓN DE SEGURIDAD, AMPLIACIÓN DE ESQUEMA Y MESAS EN TIEMPO REAL
-- =========================================================================

-- 1. Ampliar la tabla de órdenes para almacenar la mesa y el mesero
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS mesa TEXT;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS creado_por TEXT;

-- 2. Crear la tabla de gestión de mesas
CREATE TABLE IF NOT EXISTS mesas (
    id INT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    estado TEXT NOT NULL DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada')),
    atendido_por TEXT, -- Almacena el correo del mesero actual
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Asegurar que RLS esté habilitado en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas anónimas permisivas anteriores
DROP POLICY IF EXISTS "Permitir todo a anonimos en productos" ON productos;
DROP POLICY IF EXISTS "Permitir todo a anonimos en ordenes" ON ordenes;
DROP POLICY IF EXISTS "Permitir todo a anonimos en orden_detalles" ON orden_detalles;
DROP POLICY IF EXISTS "Permitir todo a anonimos en mesas" ON mesas;

-- 5. Eliminar políticas nuevas previas para permitir re-ejecución sin errores (idempotencia)
DROP POLICY IF EXISTS "Permitir lectura de productos a autenticados" ON productos;
DROP POLICY IF EXISTS "Permitir gestion de productos solo a administradores" ON productos;
DROP POLICY IF EXISTS "Permitir lectura de ordenes a autenticados" ON ordenes;
DROP POLICY IF EXISTS "Permitir creacion de ordenes a autenticados" ON ordenes;
DROP POLICY IF EXISTS "Permitir anular/modificar ordenes solo a administradores" ON ordenes;
DROP POLICY IF EXISTS "Permitir lectura de detalles a autenticados" ON orden_detalles;
DROP POLICY IF EXISTS "Permitir creacion de detalles a autenticados" ON orden_detalles;
DROP POLICY IF EXISTS "Permitir lectura de mesas a autenticados" ON mesas;
DROP POLICY IF EXISTS "Permitir actualizacion de mesas a autenticados" ON mesas;

-- 6. Establecer políticas RLS basadas en autenticación y roles

-- === TABLA: PRODUCTOS ===
-- Lectura para todos los usuarios autenticados
CREATE POLICY "Permitir lectura de productos a autenticados" 
ON productos FOR SELECT 
TO authenticated 
USING (true);

-- Escritura solo para el administrador
CREATE POLICY "Permitir gestion de productos solo a administradores" 
ON productos FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'admin@elpuerto.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@elpuerto.com');


-- === TABLA: ORDENES ===
-- Lectura y creación para todos los usuarios autenticados
CREATE POLICY "Permitir lectura de ordenes a autenticados" 
ON ordenes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir creacion de ordenes a autenticados" 
ON ordenes FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Modificación (anulación) solo para administradores
CREATE POLICY "Permitir anular/modificar ordenes solo a administradores" 
ON ordenes FOR UPDATE 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'admin@elpuerto.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@elpuerto.com');


-- === TABLA: ORDEN_DETALLES ===
-- Lectura e inserción para todos los usuarios autenticados
CREATE POLICY "Permitir lectura de detalles a autenticados" 
ON orden_detalles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir creacion de detalles a autenticados" 
ON orden_detalles FOR INSERT 
TO authenticated 
WITH CHECK (true);


-- === TABLA: MESAS ===
-- Lectura para todos los usuarios autenticados
CREATE POLICY "Permitir lectura de mesas a autenticados" 
ON mesas FOR SELECT 
TO authenticated 
USING (true);

-- Modificación (ocupar/liberar) permitida para cualquier usuario autenticado
CREATE POLICY "Permitir actualizacion de mesas a autenticados" 
ON mesas FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);


-- 7. Insertar mesas semilla (Mesa 1 a 6, Barra 1 y Barra 2)
INSERT INTO mesas (id, nombre, estado, atendido_por) VALUES
(1, 'Mesa 1', 'libre', NULL),
(2, 'Mesa 2', 'libre', NULL),
(3, 'Mesa 3', 'libre', NULL),
(4, 'Mesa 4', 'libre', NULL),
(5, 'Mesa 5', 'libre', NULL),
(6, 'Mesa 6', 'libre', NULL),
(7, 'Barra 1', 'libre', NULL),
(8, 'Barra 2', 'libre', NULL)
ON CONFLICT (id) DO NOTHING;


-- 8. Registrar la tabla mesas para la sincronización en tiempo real (Supabase Realtime)
-- Nota: Si ya está registrado en la publicación, capturamos posibles advertencias.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'mesas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
    END IF;
END $$;
