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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'mesas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
    END IF;
END $$;


-- =========================================================================
-- SISTEMA DE PERFILES DE USUARIO Y GESTIÓN DE ROLES (ADMINISTRATIVO)
-- =========================================================================

-- 9. Crear la tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL DEFAULT 'mesero' CHECK (rol IN ('admin', 'mesero')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para perfiles
DROP POLICY IF EXISTS "Permitir select a autenticados en perfiles" ON perfiles;
CREATE POLICY "Permitir select a autenticados en perfiles" ON perfiles
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir todo a administradores en perfiles" ON perfiles;
CREATE POLICY "Permitir todo a administradores en perfiles" ON perfiles
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'email' = 'admin@elpuerto.com') OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
)
WITH CHECK (
    (auth.jwt() ->> 'email' = 'admin@elpuerto.com') OR
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Función de trigger para registrar perfiles automáticamente cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, rol)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'admin@elpuerto.com' THEN 'admin'
      ELSE COALESCE(new.raw_user_meta_data->>'rol', 'mesero')
    END
  )
  ON CONFLICT (id) DO UPDATE SET email = new.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vincular Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes en auth.users con la tabla perfiles
INSERT INTO public.perfiles (id, email, rol)
SELECT id, email, CASE WHEN email = 'admin@elpuerto.com' THEN 'admin' ELSE 'mesero' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 10. Función para que el administrador cree usuarios en auth.users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_crear_usuario(
    email_val TEXT,
    password_val TEXT,
    rol_val TEXT
) RETURNS VOID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Validar que el ejecutor sea admin
    IF NOT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'admin'
    ) AND (auth.jwt() ->> 'email') != 'admin@elpuerto.com' THEN
        RAISE EXCEPTION 'No autorizado. Se requieren privilegios de administrador.';
    END IF;

    -- Generar UUID y crear en auth.users
    INSERT INTO auth.users (
        instance_id, id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        role, aud, confirmation_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        email_val,
        crypt(password_val, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('rol', rol_val),
        now(),
        now(),
        'authenticated',
        'authenticated',
        ''
    )
    RETURNING id INTO new_user_id;

    -- Insertar en perfiles (para mayor fiabilidad)
    INSERT INTO public.perfiles (id, email, rol)
    VALUES (new_user_id, email_val, rol_val)
    ON CONFLICT (id) DO UPDATE SET rol = rol_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. Función para que el administrador elimine usuarios en auth.users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_eliminar_usuario(
    user_email_val TEXT
) RETURNS VOID AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Validar que el ejecutor sea admin
    IF NOT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'admin'
    ) AND (auth.jwt() ->> 'email') != 'admin@elpuerto.com' THEN
        RAISE EXCEPTION 'No autorizado. Se requieren privilegios de administrador.';
    END IF;

    -- No permitir borrar al administrador principal
    IF user_email_val = 'admin@elpuerto.com' THEN
        RAISE EXCEPTION 'No se puede eliminar al administrador principal del sistema.';
    END IF;

    -- No permitir borrarse a sí mismo
    IF user_email_val = (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'No se permite eliminarse a sí mismo.';
    END IF;

    -- Obtener ID del usuario a eliminar
    SELECT id INTO target_user_id FROM auth.users WHERE email = user_email_val;

    IF target_user_id IS NOT NULL THEN
        -- Eliminar de auth.users (la cascada en perfiles se ejecuta por foreign key)
        DELETE FROM auth.users WHERE id = target_user_id;
        DELETE FROM public.perfiles WHERE id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 12. Función para que el administrador cambie el rol de un usuario (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(
    user_email_val TEXT,
    nuevo_rol_val TEXT
) RETURNS VOID AS $$
BEGIN
    -- Validar que el ejecutor sea admin
    IF NOT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'admin'
    ) AND (auth.jwt() ->> 'email') != 'admin@elpuerto.com' THEN
        RAISE EXCEPTION 'No autorizado. Se requieren privilegios de administrador.';
    END IF;

    -- No permitir degradar al administrador principal
    IF user_email_val = 'admin@elpuerto.com' THEN
        RAISE EXCEPTION 'No se puede modificar el rol del administrador principal.';
    END IF;

    -- No permitir cambiarse el rol a sí mismo
    IF user_email_val = (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'No se permite cambiar su propio rol.';
    END IF;

    -- Actualizar perfiles
    UPDATE public.perfiles 
    SET rol = nuevo_rol_val 
    WHERE email = user_email_val;

    -- Actualizar meta_data en auth.users para consistencia
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('rol', nuevo_rol_val)
    WHERE email = user_email_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
