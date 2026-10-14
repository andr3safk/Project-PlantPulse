-- Usuario de aplicacion plantpulse_app (permisos minimos)
-- Ejecutar DESPUES de 00_create_database.sql y 01_schema.sql, con un usuario administrador.
-- Antes de ejecutar: reemplazar CAMBIAR_CLAVE por una contrasena segura
-- (minimo 8 caracteres, mayusculas, minusculas, numeros o simbolos, sin comilla simple).
-- NUNCA subir este archivo con la contrasena real.
-- Es re-ejecutable: no falla ni duplica si el login o el usuario ya existen.
-- Subtarea PLAN-51 de Jira

USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'plantpulse_app')
    CREATE LOGIN plantpulse_app
        WITH PASSWORD = 'CAMBIAR_CLAVE',
             DEFAULT_DATABASE = PlantPulse,
             CHECK_POLICY = ON;
GO

USE PlantPulse;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'plantpulse_app')
    CREATE USER plantpulse_app FOR LOGIN plantpulse_app;
GO

-- Solo leer y escribir datos (no puede crear ni borrar tablas)
ALTER ROLE db_datareader ADD MEMBER plantpulse_app;
ALTER ROLE db_datawriter ADD MEMBER plantpulse_app;
GO
