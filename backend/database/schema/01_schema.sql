-- Esquema inicial de la base de datos de PlantPulse
-- Creado para el proyecto académico PGC 2026-1 de la Universidad de Cundinamarca
-- Subtask PLAN-52 de Jira

-- Eliminar tablas si existen para que el script sea reejecutable (orden inverso al de creacion)
-- Nota: GO es un separador de lotes de sqlcmd/SSMS; el driver de Node (mssql) no lo interpreta
IF OBJECT_ID('dbo.Alerts', 'U') IS NOT NULL DROP TABLE dbo.Alerts;
IF OBJECT_ID('dbo.SensorReadings', 'U') IS NOT NULL DROP TABLE dbo.SensorReadings;
IF OBJECT_ID('dbo.Plants', 'U') IS NOT NULL DROP TABLE dbo.Plants;
IF OBJECT_ID('dbo.Devices', 'U') IS NOT NULL DROP TABLE dbo.Devices;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- =============================================
-- Tabla: Users
-- =============================================
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL, -- Almacena el hash bcrypt, nunca texto plano
    FullName NVARCHAR(150),
    Role NVARCHAR(20) DEFAULT 'user', -- 'user' o 'admin'
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    LastLoginAt DATETIME2 NULL
);

-- Nota: Email ya tiene UNIQUE, que crea su propio indice unico (no hace falta otro)
GO

-- =============================================
-- Tabla: Devices
-- =============================================
CREATE TABLE Devices (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DeviceKey NVARCHAR(50) UNIQUE NOT NULL, -- Ejemplo: plantpulse_001
    Name NVARCHAR(100) NULL,
    FirmwareVersion NVARCHAR(20) NULL,
    LastSeenAt DATETIME2 NULL,
    Status NVARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'error'
    BatteryLevel INT NULL,
    SignalStrength INT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- Nota: DeviceKey ya tiene UNIQUE, que crea su propio indice unico (no hace falta otro)
GO

-- =============================================
-- Tabla: Plants
-- =============================================
CREATE TABLE Plants (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Species NVARCHAR(150) NOT NULL,
    ImageUrl NVARCHAR(500) NULL,
    Status NVARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
    Location NVARCHAR(50) NULL,
    LastWateredAt DATETIME2 NULL,
    DeviceId UNIQUEIDENTIFIER NULL, -- Relación opcional con un ESP32
    UserId UNIQUEIDENTIFIER NOT NULL, -- Relación con el propietario
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    
    -- Restricciones de clave foránea
    CONSTRAINT FK_Plant_Device FOREIGN KEY (DeviceId) REFERENCES Devices(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Plant_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Índice para búsquedas rápidas por UserId
CREATE INDEX IX_Plants_UserId ON Plants(UserId);
GO

-- =============================================
-- Tabla: SensorReadings
-- =============================================
CREATE TABLE SensorReadings (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    DeviceId UNIQUEIDENTIFIER NOT NULL, -- Dispositivo que envió la lectura
    PlantId UNIQUEIDENTIFIER NULL, -- Planta asociada (opcional si es una lectura genérica)
    Moisture DECIMAL(5,2) NULL,
    Light DECIMAL(5,2) NULL,
    Temperature DECIMAL(5,2) NULL,
    Humidity DECIMAL(5,2) NULL,
    RecordedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    
    -- Restricciones de clave foránea
    CONSTRAINT FK_SensorReading_Device FOREIGN KEY (DeviceId) REFERENCES Devices(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SensorReading_Plant FOREIGN KEY (PlantId) REFERENCES Plants(Id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX IX_SensorReadings_DeviceId_RecordedAt ON SensorReadings(DeviceId, RecordedAt DESC);
CREATE INDEX IX_SensorReadings_PlantId_RecordedAt ON SensorReadings(PlantId, RecordedAt DESC);
GO

-- =============================================
-- Tabla: Alerts
-- =============================================
CREATE TABLE Alerts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PlantId UNIQUEIDENTIFIER NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- 'low_moisture', 'high_temp', 'low_light', 'device_offline'
    Severity NVARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    Message NVARCHAR(500) NOT NULL,
    ThresholdValue DECIMAL(10,2) NULL,
    ActualValue DECIMAL(10,2) NULL,
    IsResolved BIT DEFAULT 0,
    ResolvedAt DATETIME2 NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    
    -- Restricción de clave foránea
    CONSTRAINT FK_Alert_Plant FOREIGN KEY (PlantId) REFERENCES Plants(Id) ON DELETE CASCADE
);

-- Índice para búsqueda eficiente de alertas por planta y fecha
CREATE INDEX IX_Alerts_PlantId_CreatedAt ON Alerts(PlantId, CreatedAt DESC);
GO

-- =============================================
-- Resumen del esquema
-- =============================================
-- Usuarios del sistema
-- Dispositivos ESP32 (sensores externos)
-- Plantas controladas por los usuarios
-- Lecturas de sensores (métricas ambientales)
-- Alertas generadas cuando se superan los umbrales

-- El orden de creación es: Users → Devices → Plants → SensorReadings → Alerts
-- para respetar las dependencias de claves foráneas.
GO