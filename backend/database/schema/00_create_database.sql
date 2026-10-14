-- Crear la base de datos PlantPulse (ejecutar primero, en master)
-- Subtarea PLAN-52 de Jira

IF DB_ID('PlantPulse') IS NULL
    CREATE DATABASE PlantPulse;
GO
