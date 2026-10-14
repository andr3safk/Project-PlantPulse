-- Datos de prueba de PlantPulse (solo para desarrollo local)
-- Usuario demo: demo@plantpulse.local / PlantPulse2026!  (contraseña SOLO de desarrollo)
-- Re-ejecutable: borra solo las filas del seed (por sus Id fijos) y las vuelve a insertar.
-- Subtarea PLAN-51 de Jira

USE PlantPulse;
GO

-- Id fijos del seed (GUID escritos a mano para que frontend y pruebas siempre los encuentren)
-- Usuario:      11111111-1111-1111-1111-111111111111
-- Dispositivo:  22222222-2222-2222-2222-222222222222
-- Plantas:      33333333-3333-3333-3333-333333333333 (con dispositivo, healthy)
--               44444444-4444-4444-4444-444444444444 (sin dispositivo, warning)
--               55555555-5555-5555-5555-555555555555 (sin dispositivo, critical)

-- 1. Borrar solo las filas del seed, en orden inverso a las FK
DELETE FROM Alerts
WHERE PlantId = '44444444-4444-4444-4444-444444444444';

DELETE FROM SensorReadings
WHERE DeviceId = '22222222-2222-2222-2222-222222222222'
   OR PlantId IN (
       '33333333-3333-3333-3333-333333333333',
       '44444444-4444-4444-4444-444444444444',
       '55555555-5555-5555-5555-555555555555'
   );

DELETE FROM Plants
WHERE Id IN (
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

DELETE FROM Devices
WHERE Id = '22222222-2222-2222-2222-222222222222';

DELETE FROM Users
WHERE Id = '11111111-1111-1111-1111-111111111111';
GO

-- 2. Usuario demo (PasswordHash = bcrypt cost 10 de "PlantPulse2026!", solo desarrollo)
INSERT INTO Users (Id, Email, PasswordHash, FullName, Role)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'demo@plantpulse.local',
    '$2b$10$GOWfWtglY3H6.ZhSYxhCduQ4W394AptwcHrAlUjR34CeEy0V10mGG',
    'Usuario Demo',
    'user'
);
GO

-- 3. Dispositivo ESP32 demo
INSERT INTO Devices (Id, DeviceKey, Name, Status)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'plantpulse_001',
    'ESP32 Demo',
    'offline'
);
GO

-- 4. Tres plantas del usuario demo (estados variados; dos sin dispositivo)
INSERT INTO Plants (Id, Name, Species, Status, Location, DeviceId, UserId)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'Monstera', 'Monstera deliciosa', 'healthy', 'Sala',
        '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
    ('44444444-4444-4444-4444-444444444444', 'Potos', 'Epipremnum aureum', 'warning', 'Dormitorio',
        NULL, '11111111-1111-1111-1111-111111111111'),
    ('55555555-5555-5555-5555-555555555555', 'Suculenta', 'Echeveria elegans', 'critical', 'Balcon',
        NULL, '11111111-1111-1111-1111-111111111111');
GO

-- 5. Diez lecturas del dispositivo y la planta asociada, cada 10 minutos hacia atras
--    (Moisture y Light: 0-100; Temperature: 18-30 °C)
DECLARE @i INT = 0;
WHILE @i < 10
BEGIN
    INSERT INTO SensorReadings (DeviceId, PlantId, Moisture, Light, Temperature, RecordedAt)
    VALUES (
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        40 + (@i * 2) % 30,          -- humedad del suelo, porcentaje
        50 + (@i * 5) % 40,          -- luz, porcentaje
        22 + (@i % 5),               -- temperatura, grados Celsius
        DATEADD(MINUTE, -(@i * 10), SYSUTCDATETIME())
    );
    SET @i = @i + 1;
END
GO

-- 6. Una alerta de humedad baja sobre la planta en estado warning
INSERT INTO Alerts (PlantId, Type, Severity, Message, ThresholdValue, ActualValue)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'low_moisture',
    'warning',
    'La humedad del suelo de Potos esta por debajo del 30%.',
    30,
    22
);
GO

-- 7. Verificacion: conteo de filas del seed por tabla
SELECT
    (SELECT COUNT(*) FROM Users      WHERE Id = '11111111-1111-1111-1111-111111111111') AS usuarios,
    (SELECT COUNT(*) FROM Devices    WHERE Id = '22222222-2222-2222-2222-222222222222') AS dispositivos,
    (SELECT COUNT(*) FROM Plants     WHERE UserId = '11111111-1111-1111-1111-111111111111') AS plantas,
    (SELECT COUNT(*) FROM SensorReadings WHERE DeviceId = '22222222-2222-2222-2222-222222222222') AS lecturas,
    (SELECT COUNT(*) FROM Alerts     WHERE PlantId = '44444444-4444-4444-4444-444444444444') AS alertas;
GO
