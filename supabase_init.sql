-- Creación de la tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    stock_disponible INT NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
    categoria TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Creación de la tabla de órdenes (comprobantes)
CREATE TABLE IF NOT EXISTS ordenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    estado TEXT NOT NULL DEFAULT 'pagado' CHECK (estado IN ('pagado', 'anulado')),
    tipo_comprobante TEXT NOT NULL DEFAULT 'ticket' CHECK (tipo_comprobante IN ('ticket', 'boleta', 'factura')),
    documento_cliente TEXT CHECK (documento_cliente ~ '^[0-9]{8}$|^[0-9]{11}$' OR documento_cliente IS NULL), -- DNI (8 dígitos) o RUC (11 dígitos)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Creación de la tabla de detalles de orden
CREATE TABLE IF NOT EXISTS orden_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: permite operar a usuarios anónimos (sin login)
CREATE POLICY "Permitir todo a anonimos en productos" 
ON productos FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir todo a anonimos en ordenes" 
ON ordenes FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir todo a anonimos en orden_detalles" 
ON orden_detalles FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- =========================================================================
-- TRIGGERS Y FUNCIONES DE INVENTARIO (Consistencia del Stock)
-- =========================================================================

-- 1. Descontar stock al vender un plato
CREATE OR REPLACE FUNCTION descontar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar si hay stock suficiente antes de descontar (opcional en base a reglas de negocio)
    IF (SELECT stock_disponible FROM productos WHERE id = NEW.producto_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto seleccionado';
    END IF;

    UPDATE productos
    SET stock_disponible = stock_disponible - NEW.cantidad
    WHERE id = NEW.producto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_descontar_stock_producto
AFTER INSERT ON orden_detalles
FOR EACH ROW
EXECUTE FUNCTION descontar_stock_producto();

-- 2. Devolver stock al anular una orden
CREATE OR REPLACE FUNCTION revertir_stock_anulacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'anulado' AND OLD.estado != 'anulado' THEN
        UPDATE productos p
        SET stock_disponible = p.stock_disponible + od.cantidad
        FROM orden_detalles od
        WHERE od.orden_id = NEW.id AND p.id = od.producto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_revertir_stock_anulacion
AFTER UPDATE OF estado ON ordenes
FOR EACH ROW
EXECUTE FUNCTION revertir_stock_anulacion();

-- =========================================================================
-- DATOS SEMILLA PARA LA CEVICHERÍA
-- =========================================================================
INSERT INTO productos (nombre, precio, stock_disponible, categoria, activo) VALUES
('Ceviche Clásico', 28.00, 50, 'Ceviches', true),
('Ceviche Mixto', 32.00, 40, 'Ceviches', true),
('Leche de Tigre', 15.00, 60, 'Entradas', true),
('Chicharrón de Calamar', 25.00, 30, 'Entradas', true),
('Arroz con Mariscos', 30.00, 35, 'Platos de Fondo', true),
('Jalea Personal', 28.00, 25, 'Platos de Fondo', true),
('Chicha Morada 1L', 12.00, 80, 'Bebidas', true),
('Cerveza Pilsen Callao 620ml', 10.00, 100, 'Bebidas', true),
('Inca Kola 500ml', 5.00, 120, 'Bebidas', true);
