# Auto-actualización de la app Android

Bookteka se actualiza fuera de la tienda de aplicaciones: consulta su versión
publicada en el bucket R2 al arrancar y, si hay una más nueva, ofrece
descargar el APK e instalarlo.

No usa `tauri-plugin-updater`. La cadena es propia:

```
config-api.json (R2)  →  app_version + apk_url
        ↓
src/lib/api-config.ts  →  fetchBootstrap()
        ↓
src/context/UpdateContext.tsx  →  compara versiones semver
        ↓
src/components/common/UpdatePrompt.tsx
        ↓
get_app_version   (Rust, src-tauri/src/updater.rs)  → versión local
download_apk      (Rust)  → cache/bookteka-update.apk
install_apk       (Kotlin, UpdaterPlugin.kt)  → instalador del sistema
```

El auto-update solo se activa dentro del APK de Android. En web y desktop los
comandos nativos no existen, así que la UI no renderiza nada.

## Publicar una versión nueva (proceso manual)

No hay CI. La publicación son cuatro pasos, en este orden.

### 1. Subir la versión en `tauri.conf.json`

```json
{ "version": "1.2.1" }
```

`tauri-build` deriva de acá el `versionName` y el `versionCode` del APK
(`1002000` para 1.2.0), y `get_app_version` lee el mismo valor. Si tocás la
versión, la app instalada reporta la nueva y el diálogo deja de aparecer.

### 2. Construir el APK firmado

```bash
cd frontend
pnpm tauri android build --apk
```

El keystore (`bookteka.keystore`) está en el directorio de `frontend/` y
está gitignored. **Nunca subas el APK firmado a otro paquete**: Android solo
permite actualizaciones firmadas con la misma clave.

### 3. Subir el APK a R2

Destino en el bucket, siguiendo la convención de versiones:

```
versions/apk/bookteka-v<VERSION>-universal.apk
```

Las credenciales (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`,
`R2_BUCKET`) están en el `.env` de la raíz del repo.

### 4. Actualizar `config-api.json`

Este archivo se sirve público y es lo único que lee la app instalada. Está
versionado en el repo (`frontend/config-api.json`) y también vive en R2;
**hay que actualizar los dos**.

```json
{
  "current_api_url": "https://bookteka-production.up.railway.app/api/v1",
  "app_version": "1.2.1",
  "apk_url": "https://pub-3371f3b8e88841168d038ff444561b3d.r2.dev/versions/apk/bookteka-v1.2.1-universal.apk"
}
```

> **Orden obligatorio:** subí el APK (paso 3) *antes* de tocar `app_version`
> (paso 4). Si publicás la versión nueva con un `apk_url` que todavía no
> existe, los usuarios con la versión anterior reciben un error de descarga.

## "Ahora no" y el período de gracia

Si el usuario elige "Ahora no", la versión queda guardada en `localStorage`
bajo `BOOKTEKA_IGNORED_UPDATE_VERSION` y no se vuelve a preguntar por esa
versión. Al salir una versión nueva se vuelve a preguntar automáticamente.

Para forzar el aviso a todos, cambiá `app_version` (aunque el APK sea el
mismo) o eliminá la clave del almacenamiento de la app.

## Permisos en Android

`UpdaterPlugin.kt` verifica `canRequestPackageInstalls()` (Android 8+). Si el
usuario no autorizó "Instalar apps desconocidas", la app lo lleva a los
ajustes del sistema y aborta la instalación. Hay que volver a intentar la
actualización después de autorizar.
