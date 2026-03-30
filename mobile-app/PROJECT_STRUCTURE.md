mobile-app/
    ├── app/                    # Carpeta del Router (Rutas de la App)
    │   ├── (auth)/             # Grupo de rutas de autenticación
    │   │   ├── login.tsx
    │   │   ├── register.tsx
    │   │   └── _layout.tsx
    │   ├── (tabs)/             # Navegación principal (Tab Bar)
    │   │   ├── index.tsx       # Tu Library.tsx actual
    │   │   ├── profile.tsx     # UserProfile.tsx
    │   │   └── _layout.tsx
    │   ├── reader/             # Pantallas del lector
    │   │   ├── [id].tsx        # Ruta dinámica para leer un libro
    │   │   └── settings.tsx    # Ajustes del lector
    │   ├── _layout.tsx         # Root layout (Providers: Theme, Auth, Database)
    │   └── +not-found.tsx
    ├── assets/                 # Imágenes, fuentes e iconos
    ├── src/                    # El motor de la app (Lógica de negocio)
    │   ├── api/                # Llamadas a servicios externos
    │   ├── components/         # Componentes reutilizables
    │   │   ├── common/         # Input, Button, Loading (UI atómica)
    │   │   ├── library/        # CardBook, FilterBook, Listas
    │   │   ├── reader/         # TextReader, HighlightToolbar, PageNavigator
    │   │   └── layout/         # Header, Modales, Wrappers
    │   ├── database/           # CRÍTICO: SQLite / WatermelonDB / Expo SQLite
    │   │   ├── schema.ts       # Definición de tablas (Libros, Highlights)
    │   │   ├── sync.ts         # Lógica de sincronización con tu backend Rust
    │   │   └── queries/        # Funciones CRUD locales
    │   ├── hooks/              # useBooks, useReader, useTheme
    │   ├── lib/                # Config de librerías (PDF extractor, auth-client)
    │   ├── store/              # Estado global (Zustand)
    │   ├── types/              # Definiciones de TypeScript
    │   └── utils/              # Formateadores de tiempo, texto e IDs
    ├── app.json                # Configuración de Expo
    ├── package.json
    └── tsconfig.json
