-- 1. Insertar 3 Máquinas de prueba
INSERT INTO maquinas (nombre, codigo_branch, ct_ratio, potencia_maxima, estado, favorita)
VALUES 
  ('Extrusora Principal', 'br01', '100:5', 50.0, true, true),
  ('Compresor Norte', 'br02', '50:5', 25.0, true, false),
  ('Torno CNC', 'br03', '75:5', 35.0, true, true)
ON CONFLICT (codigo_branch) DO NOTHING;

-- 2. Insertar Configuración de Tarifas (requerida por el dashboard)
INSERT INTO tarifas (tarifa_pico, tarifa_valle, factor_co2)
SELECT 2.5, 1.2, 0.444
WHERE NOT EXISTS (SELECT 1 FROM tarifas);

-- 3. Insertar Configuración de Alertas (requerida por el dashboard)
INSERT INTO configuracion_alertas (email_notificaciones, umbral_potencia, umbral_factor_potencia, umbral_energia, hora_inicio_minutos, hora_fin_minutos)
SELECT false, 40.0, 0.85, 1000.0, 450, 1170
WHERE NOT EXISTS (SELECT 1 FROM configuracion_alertas);
