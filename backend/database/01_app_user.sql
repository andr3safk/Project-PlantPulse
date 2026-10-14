-- Crear usuario de aplicacion plantpulse_app (ejecutar en la BD PlantPulse)
-- Acceso minimo: solo lectura y escritura de datos (db_datareader + db_datawriter).
-- NO incluye la contraseña: definirla al ejecutar (nunca versionar secretos).
-- Subtarea PLAN-52 de Jira

-- 1. Login en el servidor (ejecutar en master):
--     CREATE LOGIN plantpulse_app WITH PASSWORD = '<una_contrasena_segura>';
-- 2. Usuario en la BD y permisos:
CREATE USER plantpulse_app FOR LOGIN plantpulse_app;
GO

ALTER ROLE db_datareader ADD MEMBER plantpulse_app;
ALTER ROLE db_datawriter ADD MEMBER plantpulse_app;
GO
