# Bookteka Frontend

Frontend de **Bookteka**, una aplicación web para gestionar y leer libros en formato PDF con seguimiento de progreso de lectura.

## Estructura del Proyecto

Este monorepo contiene dos aplicaciones independientes:

```
bookteka-frontend/
├── landing-page/      # Página de aterrizaje (marketing)
└── web-app/          # Aplicación principal
```

| Proyecto | Tecnología | Propósito |
|----------|------------|-----------|
| `landing-page/` | Astro + TypeScript | Página de marketing estática |
| `web-app/` | React + Vite + TypeScript | Aplicación principal de lectura |

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior)
- **pnpm** (gestor de paquetes recomendado)
  ```bash
  npm install -g pnpm
  ```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/orlandotellez/bookteka.git
cd BOOKTEKA-REPO/bookteka-frontend
```

### 2. Instalar dependencias

Tienes dos opciones:

#### Opción A: Instalar todo junto
```bash
# Landing Page
cd landing-page && pnpm install && cd ..
# Web App
cd web-app && pnpm install && cd ..
```

#### Opción B: Instalar solo el proyecto que necesitas
```bash
# Solo landing page
cd landing-page && pnpm install

# Solo aplicación web
cd web-app && pnpm install
```

---

## Configuración del Entorno

### Landing Page

No requiere variables de entorno. Solo ejecuta:

```bash
cd landing-page
pnpm dev
```

La aplicación estará disponible en `http://localhost:4321`

---

### Web App

1. Copia el archivo de ejemplo de variables de entorno:

```bash
cd web-app
cp .env.example .env
```

2. Edita el archivo `.env` y configura:

```env
# URL de la API backend (por defecto: /api)
VITE_API_URL=/api
```

#### Notas sobre la API

- La aplicación espera que exista un backend en la URL configurada
- Los endpoints esperados incluyen:
  - `POST /api/books/upload` - Subir libros PDF
  - `GET /api/books/:bookId/download` - Descargar libro
  - `DELETE /api/books/:bookId` - Eliminar libro
  - `PATCH /api/books/:bookId/progress` - Actualizar progreso
- La autenticación usa cookies para gestión de sesiones

---

## Scripts Disponibles

### Landing Page

```bash
cd landing-page

# Iniciar servidor de desarrollo
pnpm dev

# Construir para producción
pnpm build

# Vista previa de producción
pnpm preview
```

### Web App

```bash
cd web-app

# Iniciar servidor de desarrollo
pnpm dev

# Construir para producción
pnpm build

# Verificar código con ESLint
pnpm lint

# Vista previa de producción
pnpm preview
```

---

## Tecnologías Utilizadas

### Landing Page
- **Astro** v5 - Framework SSG
- **TypeScript** - Tipado estático
- **Prettier** - Formateo de código

### Web App
- **React** v19 - Biblioteca de UI
- **Vite** v7 - Build tool
- **TypeScript** - Tipado estático
- **React Router** v7 - Enrutamiento
- **Zustand** - Estado global
- **Better Auth** - Autenticación
- **React Hook Form + Zod** - Formularios
- **PDF.js** - Renderizado de PDFs
- **IndexedDB (idb)** - Almacenamiento offline
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos
- **Sonner** - Notificaciones toast
- **ESLint** - Linting

---

## Rutas de la Aplicación

### Landing Page
- `/` - Página principal de marketing

### Web App
- `/auth/login` - Inicio de sesión
- `/auth/register` - Registro de usuario
- `/` - Dashboard principal (protegido)
- `/profile` - Perfil de usuario (protegido)

---

## Despliegue

### Landing Page

La landing page es un sitio estático que puede desplegarse en cualquier hosting estático:

```bash
cd landing-page
pnpm build
# Archivos generados en dist/
```

### Web App

#### Opción 1: Docker

El proyecto incluye un `Dockerfile` optimizado con build multi-stage:

```bash
cd web-app
docker build -t bookteka-web .
docker run -p 8080:8080 bookteka-web
```

#### Opción 2: Hosting estático (Vercel, Netlify, etc.)

```bash
cd web-app
pnpm build
# Subir contenido de dist/
```

#### Variables de producción

Cuando despliegues, asegúrate de configurar:
- `VITE_API_URL` - URL del backend

---

## Contribuir

¡Todas las contribuciones son bienvenidas! Para contribuir:

1. **Fork** el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

### Convenciones de código

- Usamos **ESLint** para mantener consistencia
- Usamos **Prettier** para formato (en landing-page)
- Seguimos las convenciones de **Conventional Commits**
- TypeScript strict mode habilitado

---

## Estructura de Archivos

### Landing Page
```
landing-page/
├── src/
│   ├── components/    # Componentes reutilizables
│   ├── layouts/       # Layouts de página
│   ├── pages/        # Páginas (Astro)
│   └── styles/       # Estilos globales
├── public/           # Assets estáticos
├── astro.config.mjs  # Configuración de Astro
└── tsconfig.json     # Configuración TypeScript
```

### Web App
```
web-app/
├── src/
│   ├── components/   # Componentes React
│   ├── pages/        # Páginas/Rutas
│   ├── stores/       # Zustand stores
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilidades
│   ├── types/        # Tipos TypeScript
│   └── styles/       # Estilos globales
├── public/           # Assets estáticos
├── vite.config.ts    # Configuración de Vite
└── tsconfig.json     # Configuración TypeScript
```

---

## Solución de Problemas

### Error de dependencias

Si tienes problemas con las dependencias, intenta:

```bash
# Limpiar cache y reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error de TypeScript

Si TypeScript marca errores que no deberían estar:

```bash
# Regenerar tipos
cd web-app
pnpm build
```

### El servidor no inicia

Asegúrate de que el puerto no esté en uso:

```bash
# Ver qué proceso usa el puerto 5173
lsof -i :5173
```

---

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## Contacto

- ¿Encontraste un bug? [Abre un issue](https://github.com/tu-repo/issues)
- ¿Quieres contribuir? Mira la sección de contribuciones arriba

---

¿Necesitas ayuda? No dudes en abrir un issue o preguntar en el proyecto.
