# Casos de Uso — Bookteka

Diagramas de flujo funcionales con Mermaid para los flujos más críticos de la plataforma.

> **Criterio**: solo se documentan use-cases donde la lógica de negocio es **compleja** o tiene **múltiples tablas en transacción**. CRUDs simples (GET / POST una sola tabla) NO necesitan diagrama.

## Listado

| # | Caso de Uso | Tablas involucradas |
|---|---|---|
| 1 | [Flujo de lectura (abrir y progresar un libro)](./01-flujo-de-lectura.md) | user_book, book, bookmark, R2 |
| 2 | [Sistema de rachas (complete day)](./02-sistema-de-rachas.md) | user_streak |
