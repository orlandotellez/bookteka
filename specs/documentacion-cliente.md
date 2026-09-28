# Bookteka — Documentación para el Cliente

Este documento explica el sistema sin jerga técnica. Si necesita los detalles técnicos, están en el resto de la documentación del proyecto.

---

## 1. Introducción

Bookteka es una biblioteca personal de libros en PDF. El usuario sube sus libros a la plataforma, los lee en una pantalla diseñada para eso, y el sistema **recuerda dónde se quedó**: qué página estaba, cuánto había leído y cuándo fue la última vez. Puede dejar marcas en las páginas que le interesan, resaltar frases y mantener una racha de días consecutivos de lectura.

Funciona en tres formatos con el mismo producto: en el navegador, en una aplicación de escritorio y en Android. La biblioteca sigue siendo la misma en todos lados. Si agrega un libro desde la computadora, aparece en el teléfono; si avanza la lectura en el teléfono, la computadora lo registra también.

Bookteka no guarda los libros en su base de datos: los archivos se guardan en un servicio de almacenamiento aparte, y el sistema solo conserva la ficha de cada libro (título, autor, tamaño) y el progreso de cada persona. Eso permite que varias personas tengan el mismo libro sin ocupar espacio cinco veces.

### ¿Qué resuelve?

- **No volver a perder el lugar.** Al reabrir un libro, se abre en la página donde se quedó, con el tiempo de lectura acumulado.
- **Tener la biblioteca ordenada.** Los libros tienen título, autor y fecha de última lectura. Se pueden buscar por nombre y filtrar por estado.
- **Mantener el hábito de lectura.** La racha diaria muestra cuántos días seguidos lleva leyendo y convierte la lectura en algo visible y sostenible.
- **Leer sin conexión.** Los libros y el avance se guardan en el propio dispositivo, así que se pueden leer en el avión, en el metro o en el campo sin internet. Cuando vuelve la conexión, se sincroniza.
- **Leer en cualquier dispositivo.** El progreso viaja entre la computadora, el navegador y el teléfono.
- **No duplicar almacenamiento.** Si varias personas suben el mismo PDF, se guarda una sola copia.
- **Guardar lo que le interesa al usuario.** Puede marcar páginas y resaltar fragmentos con colores. *(Los resaltados se quedan en el dispositivo donde se hicieron: todavía no se comparten entre dispositivos.)*

---

## 2. Visión General del Sistema

### Etapas del ciclo de vida

1. **Registro y acceso.** La persona crea su cuenta con nombre, correo y contraseña, o vuelve a entrar si ya tiene cuenta.
2. **Confirmación del correo.** Al registrarse, el sistema genera un código de confirmación para comprobar que el correo existe. *(Hoy ese código no se envía por correo: se muestra en la consola del servidor. Es un punto pendiente de implementación.)*
3. **Carga de un libro.** La persona elige un PDF desde su dispositivo. El sistema lo recibe, lo guarda en el almacenamiento de archivos y crea la ficha del libro en la base de datos.
4. **Preparación del libro.** La primera vez que se abre, el sistema extrae el texto del PDF para poder mostrarlo en pantalla de lectura. Esta información queda guardada en el dispositivo, así que las siguientes veces se abre al instante.
5. **Lectura.** La persona avanza por el libro. El sistema va registrando la página, la posición en pantalla y el tiempo leído.
6. **Marcado y resalte.** Puede dejar una marca en una página concreta, con un nombre y un adelanto del texto, y resaltar fragmentos con colores.
7. **Racha diaria.** Con un clic, la persona marca que leyó hoy. El sistema actualiza su racha de días consecutivos.
8. **Sincronización.** El progreso se envía al servidor en segundo plano. Si algo falla, el avance queda guardado en el dispositivo y se manda más tarde, sin perder nada.
9. **Estadísticas.** En su perfil, la persona ve cuánto tiempo leído, cuántos libros tiene, cuántos empezó y su promedio por libro.
10. **Cierre de sesión.** Al salir, se borran los libros guardados en el dispositivo para que la próxima persona que use ese equipo no los herede.

### Roles

| Rol | ¿Qué puede hacer? |
|---|---|
| **Lector** (persona con cuenta) | Todo: subir libros, leer, marcar, resaltar, completar la racha, ver sus estadísticas, gestionar su biblioteca y cerrar sesión. Es el único rol con actividad en el sistema. |
| **Administrador** | Hoy no puede hacer nada. El concepto existe en el sistema, pero **no hay ninguna pantalla ni función reservada para él**. Está planificado, no implementado. |
| **Visitante** (sin cuenta) | Solo puede crear su cuenta o iniciar sesión. Al intentar acceder a la biblioteca, se la redirige al acceso. |

---

## 3. Cómo está organizado el sistema

El sistema tiene tres partes que trabajan juntas.

### El servidor (donde vive la información)

El servidor tiene tres capas separadas, y cada una tiene una responsabilidad clara:

- **La capa que atiende pedidos.** Recibe las peticiones de la aplicación (subir un libro, pedir la lista, guardar el progreso) y las traduce.
- **La capa que aplica las reglas.** Ahí viven las decisiones del negocio: si este libro ya estaba subido, si esta persona es dueña del libro, si el progreso nuevo realmente avanzó o es un dato viejo que llegó tarde. **Las reglas no dependen de cómo se guardan los datos.**
- **La capa que guarda y consulta.** Es la única que habla con la base de datos y con el almacenamiento de archivos.

Esta separación permite cambiar la base de datos o la forma de guardar archivos sin tocar las reglas, y verificar las reglas de forma aislada.

**Por qué importa**: cuando se agrega un tipo de libro nuevo o una regla nueva, se toca un solo lugar en lugar de repartirse por todo el servidor.

### La base de datos

Guarda la información de nueve grupos: quién es cada persona, sus sesiones de acceso, sus credenciales, los códigos de confirmación, los libros, el progreso de lectura, las marcas, las rachas y un registro de auditoría. **Los archivos PDF no están en la base de datos**: viven en un servicio de almacenamiento y la base solo guarda la dirección del archivo.

### La aplicación

Está organizada por pantallas. La persona ve tres zonas:

- **Acceso** (iniciar sesión, crear cuenta).
- **Biblioteca** (la pantalla principal: lista de libros, búsqueda, filtros y las distintas formas de verlos).
- **Perfil** (estadísticas, racha, libros, preferencias y cierre de sesión).

Además hay el **lector**, que no es una pantalla más sino el modo donde se lee el libro: ocupa toda la pantalla y tiene sus propios controles de tipografía, navegación entre páginas, panel de marcas y cronómetro.

Los componentes de cada pantalla están separados en archivos propios, siguiendo la misma estructura. Cuando hay que modificar una pantalla, se modifican sus archivos, no los de las demás.

---

## 4. Tecnologías Utilizadas

### Servidor

| Tecnología | ¿Para qué se usa? |
|---|---|
| Node.js | El lenguaje en el que corre el servidor. |
| TypeScript | JavaScript con verificación de tipos: los errores se detectan antes de ejecutar. |
| Express | La base que atiende las peticiones web. |
| PostgreSQL | La base de datos donde se guarda la información. |
| Prisma | La capa que traduce el código a consultas de base de datos, con verificación de tipos. |
| Cloudflare R2 | Almacenamiento de los archivos PDF. |
| Zod | Verificación de que los datos que llegan tengan el formato correcto. |
| Resend | Servicio de envío de correos. **Hoy no se usa** (ver la etapa 2). |
| jsonwebtoken | Las credenciales de sesión, que caducan solas. |
| bcrypt | El cifrado de las contraseñas: nunca se guarda la contraseña real. |
| Helmet | Cabeceras de seguridad en las respuestas del servidor. |
| Express Rate Limit | Límite de peticiones para evitar abuso. |
| Pino | Registro de lo que pasa en el servidor, con las contraseñas y credenciales ocultas. |
| Multer | Recepción de los archivos PDF que sube el usuario. |
| Jest y Supertest | Las pruebas automáticas del servidor. |

### Aplicación

| Tecnología | ¿Para qué se usa? |
|---|---|
| React | La base sobre la que está construida la interfaz. |
| TypeScript | Igual que en el servidor: verificación de tipos. |
| Vite | Empaquetado y servidor de desarrollo rápido. |
| Tauri | El envoltorio que convierte la misma aplicación en programa de escritorio y en app de Android. |
| Zustand | Memoria compartida de la aplicación: qué libro está abierto, qué está cargando. |
| IndexedDB (idb) | Base de datos dentro del dispositivo, para leer sin conexión. |
| PDF.js | La biblioteca que extrae el texto de los PDF. |
| React Router | La navegación entre pantallas. |
| react-hook-form y Zod | Formularios y validación de lo que se escribe. |
| Sonner | Avisos emergentes de confirmación o error. |
| Lucide | Los íconos de la interfaz. |
| Vitest y Testing Library | Las pruebas automáticas de la aplicación. |

### Infraestructura

| Tecnología | ¿Para qué se usa? |
|---|---|
| Docker y Docker Compose | Levantar el sistema completo (base de datos, servidor y aplicación) en la propia computadora. |
| Nginx | Servir la aplicación web y conectar el servidor sin exponerlo directamente. |
| Railway | El servicio donde vive el servidor en producción. |
| Astro | La página de presentación del producto. Es estática: no tiene datos ni conexión con el servidor. |

---

## 5. Base de Datos

### Grupos de información

| Grupo | Qué incluye |
|---|---|
| **Identidad y acceso** | Quiénes son los usuarios, sus sesiones abiertas, sus credenciales y los códigos de confirmación de correo. |
| **Libros** | La ficha de cada PDF (título, autor, tamaño, ubicación del archivo) y su huella digital, que permite detectar archivos repetidos. |
| **Lectura** | El progreso de cada persona en cada libro: página, posición, tiempo y última lectura. |
| **Marcas** | Las páginas marcadas, con su nombre y adelanto del texto. |
| **Actividad** | La racha de días consecutivos de cada persona. |
| **Auditoría** | Registro de las operaciones sensibles, hoy el borrado de un libro. |

### Algunas reglas importantes

- **Cada persona tiene sus propios libros.** Un libro no "se comparte" entre cuentas: la ficha del archivo puede estar referenciada por varias personas porque alguien más lo subió antes, pero el progreso y las marcas son siempre de una sola persona.
- **Un libro solo tiene una ficha.** Si dos personas suben el mismo PDF, el sistema lo detecta y no lo guarda dos veces. Ambos pueden leerlo.
- **Progreso por combinación de persona y libro.** Si alguien lee el mismo libro en dos dispositivos, el sistema conserva el avance más avanzado, nunca el más atrasado. El progreso no retrocede.
- **Borrado cooperativo.** Si una persona borra un libro de su biblioteca, el archivo se elimina del almacenamiento **solo si nadie más lo está usando**. Si otra persona lo tiene, el archivo se conserva y solo se borra el registro de esa persona.
- **Las cuentas se pueden desactivar sin borrarse.** Existe un campo para dar de baja una cuenta conservando sus datos.
- **Todas las fechas y horas quedan registradas** en cada tabla.
- **No hay contraseñas en texto plano.** Se guardan cifradas con un algoritmo diseñado para eso, y nunca se devuelven al cliente.

---

## 6. Módulos Principales del Sistema

### Acceso y cuentas

Permite crear una cuenta e iniciar y cerrar sesión. Maneja las credenciales de forma segura: se generan dos tipos de credencial con duraciones distintas, una de uso corto para la operación daily y otra de larga duración que se renueva sola. Cuando la persona cierra sesión, su acceso queda invalidado de inmediato. También gestiona el proceso de confirmación del correo.

### Libros

Recibe los archivos PDF que sube la persona, los guarda en el almacenamiento y los cataloga. Detecta archivos repetidos para no duplicar espacio. Permite pedir la lista de libros con su progreso, descargar el archivo o leerlo directamente en pantalla, actualizar el avance y eliminar un libro de la biblioteca.

### Progreso de lectura

Registra y actualiza en qué parte va cada persona de cada libro. Tiene una protección contra datos desactualizados: si un dispositivo antiguo manda su progreso después que uno más avanzado, el sistema conserva el más avanzado y descarta el que llegó tarde.

### Marcas y resaltes

Permite guardar páginas marcadas con un nombre y un adelanto del texto, y navegar a ellas desde el lector. Los resaltes con color se manejan **solo dentro del dispositivo**: son rápidos y funcionan sin conexión, pero todavía no se comparten entre dispositivos.

### Rachas de lectura

Lleva la cuenta de los días consecutivos de lectura. Una persona marca que leyó hoy con un clic y el sistema decide si continua la racha, si ya estaba completada o si hay que reiniciarla. Todos los cálculos usan la fecha del dispositivo de la persona, para que el cambio de zona horaria no rompa la cuenta.

### Sincronización

Mantiene la información al día entre el dispositivo y el servidor. Cuando hay conexión, envía lo que cambió; cuando no la hay, guarda todo en el dispositivo y reintenta después. En la dirección contraria, trae lo que se hizo en otros dispositivos y lo combina con lo local sin perder progreso.

### Estadísticas y perfil

Calcula y muestra el tiempo total leído, la cantidad de libros, cuántos están en progreso y el promedio por libro. También muestra el estado de sincronización de cada libro y permite editar el tiempo registrado.

### Página de presentación

Sitio público e informativo del producto. No tiene conexión con el servidor ni accede a datos de personas.

---

## 7. Pantallas Principales

### Acceso

| Pantalla | Para qué sirve |
|---|---|
| **Iniciar sesión** | Entrar con correo y contraseña. Muestra el error si los datos no son correctos. |
| **Crear cuenta** | Registrarse con nombre, correo y contraseña, y confirmar que las contraseñas coinciden. |

### Biblioteca (pantalla principal)

La pantalla que ve la persona al entrar. Tiene:

- **Barra de búsqueda** para encontrar un libro por nombre.
- **Filtro por estado**: todos, los que está leyendo o los que todavía no empezó.
- **Tres formas de ver la biblioteca**: estante (con la posibilidad de reordenar los libros arrastrándolos), lista y cuadrícula.
- **Paginación** en las vistas de lista y cuadrícula, de 6 libros por página.
- **Botón de agregar libro**, siempre visible.
- **Aviso cuando no hay libros**, con una llamada a la acción para cargar el primero.
- **Preparación del libro**: al abrir uno que todavía no se descargó, un aviso muestra el avance de la preparación en porcentaje.

### Perfil

Dos secciones separadas por pestañas:

- **Datos**: la racha actual con su botón para marcar el día leído, las estadísticas de lectura, y una tabla con todos sus libros. En cada libro se puede ver si está sincronizado, subirlo a la nube si no lo está, descargarlo si lo está, y corregir el tiempo registrado.
- **Configuración**: el interruptor de sincronización con la nube, la forma de ver la biblioteca por defecto, las preferencias de tipografía para leer, y el botón para cerrar sesión.

### Lector

La pantalla donde se lee. No tiene menú ni distractions: ocupa la pantalla completa. Incluye:

- El nombre del libro y un botón para volver a la biblioteca.
- El cronómetro de tiempo leído.
- El botón de racha, para marcar el día.
- Los controles de lectura: tamaño de letra, tipo de letra, interlineado y ancho del texto.
- La navegación entre páginas.
- El panel de marcas, con la lista de páginas marcadas para saltar a ellas.
- La herramienta para resaltar texto con uno de cinco colores.
- El modo de lectura sin distracciones, que oculta los controles.

Si una operación no se puede completar, aparece un aviso con el motivo: por ejemplo, si el correo no pudo enviarse, si el archivo excede el tamaño máximo, o si el servidor no está disponible.

### Pantalla de página no encontrada

Aparece al intentar abrir una dirección que no existe, con un enlace para volver a la biblioteca.

---

## 8. Autenticación y Seguridad

### Cómo se verifica quién es la persona

- **Credencial de uso corto:** se genera al entrar y **caduca a los 15 minutos**. Viaja en el navegador mediante una cookie que las páginas web no pueden leer, y en la aplicación de escritorio y Android mediante una cabecera especial.
- **Credencial de larga duración:** se genera al entrar y **caduca a los 7 días**. Permite renovar la credencial corta sin volver a pedir la contraseña. Cada renovación **invalida la anterior**, de modo que una credencial no se puede usar dos veces.
- **Cuando alguien cierra sesión**, la sesión queda invalidada en el servidor de inmediato, no solo en el dispositivo.

Se admiten varias formas de presentar la credencial porque la aplicación corre en plataformas distintas: un teléfono no puede usar las cookies igual que un navegador de escritorio. Todas las formas están habilitadas y son equivalentes.

### Contraseñas

- Se **cifran** antes de guardarse, con un algoritmo específico para contraseñas. El sistema nunca guarda ni muestra la contraseña real.
- Al iniciar sesión, se compara lo que la persona escribió con el valor cifrado.
- El registro exige un mínimo de 8 caracteres.

### Protección de la información

- **Cada persona solo ve lo suyo.** Para leer, descargar o modificar un libro, el sistema verifica que ese libro esté en su biblioteca. Conocer el identificador de un libro ajeno no da acceso a nada: la respuesta es que no está autorizado.
- **La identificación de la persona nunca se toma de los datos que envía**, sino de su sesión verificada. No hay forma de pedir datos de otra cuenta.
- **Los registros del sistema ocultan las contraseñas y las credenciales** automáticamente.
- **Los archivos se sirven de forma controlada**: nunca se expone la dirección real del almacenamiento.
- **Hay límites de uso** para evitar que alguien o un programa abuse del sistema: límites más estrictos al iniciar sesión, más amplias al guardar el progreso de lectura, y un límite general para el resto de las operaciones.
- **Los orígenes permitidos están en una lista explícita.** El sistema no acepta peticiones desde sitios que no estén autorizados.
- **La confirmación del correo** sirve para comprobar que la dirección de correo existe. *(El envío del código está pendiente de implementación.)*

### Registro de operaciones

Cuando una persona elimina un libro, el sistema guarda quién lo hizo, qué libro era, y cuándo. Ese registro no se borra.

---

## 9. Servicios Externos

| Servicio | Para qué se usa |
|---|---|
| **Almacenamiento de archivos (Cloudflare R2)** | Donde viven los archivos PDF. El sistema guarda ahí cada archivo subido y lo sirve desde ahí. Es el servicio crítico: si no está disponible, la lectura de libros se detiene. |
| **Base de datos (PostgreSQL)** | Donde se guarda la información de personas, libros, progreso, marcas y rachas. |
| **Servicio de correo (Resend)** | Estaba previsto para enviar el código de confirmación del correo. **La conexión está preparada pero el envío no está implementado**: hoy el código no llega por correo. |
| **Página de presentación** | Sitio informativo público. No usa base de datos ni envía información a ningún servicio. |

### Qué pasa si un servicio falla

- **Si el almacenamiento de archivos no responde**, el sistema avisa que no está todo bien y la lectura de libros se detiene. La aplicación sigue funcionando: los libros ya descargados en el dispositivo se pueden seguir leyendo sin conexión.
- **Si el almacenamiento falla al borrar un archivo**, el sistema lo registra como error y **no** detiene el borrado del registro del libro. Es preferible dejar un archivo de más que dejar un registro que apunta a algo que no existe.
- **Si el servidor no está disponible**, la aplicación sigue funcionando con la información guardada en el dispositivo y sincroniza cuando vuelve la conexión.
- **Si la base de datos no responde**, el sistema lo avisa en su verificación de estado.

---

## 10. Flujos Principales del Sistema

### Flujo 1 — Crear una cuenta y entrar por primera vez

1. La persona abre la aplicación y elige crear una cuenta.
2. Escribe su nombre, correo y contraseña, y confirma la contraseña.
3. El sistema verifica que los datos estén completos y que la contraseña tenga la longitud mínima.
4. Crea el registro de la persona y guarda la contraseña cifrada.
5. Genera un código de confirmación del correo. *(Hoy este paso no envía nada: el paso queda pendiente.)*
6. El sistema abre la sesión y la persona entra a su biblioteca, que empieza vacía.
7. La aplicación muestra un aviso para cargar el primer libro.

### Flujo 2 — Agregar un libro a la biblioteca

1. La persona pulsa el botón de agregar libro y elige un archivo PDF de su dispositivo.
2. El sistema verifica que sea un PDF válido y que no exceda el tamaño máximo permitido.
3. Si la sincronización está activada, el archivo se envía al servidor.
4. El sistema calcula una huella digital del contenido y revisa si ese archivo ya está guardado.
   - Si ya existe, no lo vuelve a subir: reutiliza el archivo.
   - Si no existe, lo guarda y crea su ficha con título, autor y tamaño.
5. El libro aparece en la biblioteca.
6. Si la sincronización no está activada, el libro se queda solo en el dispositivo y se puede subir más tarde desde el perfil.

### Flujo 3 — Leer un libro

1. La persona abre un libro de la biblioteca.
2. Si es la primera vez que lo abre, el sistema descarga el archivo y extrae su texto, mostrando el avance en porcentaje.
3. El libro se abre en la pantalla de lectura, en la página donde se quedó la última vez.
4. Mientras lee, el sistema va registrando la posición y el tiempo.
5. La información se guarda primero en el dispositivo, para que no se pierda nada si se cierra la aplicación.
6. Cada pocos segundos, el progreso se envía al servidor, agrupado para no generar peticiones innecesarias.
7. Si la persona cierra la aplicación de golpe, el sistema envía el progreso pendiente antes de cerrar.
8. La próxima vez que abra el libro, continúa desde donde estaba.

### Flujo 4 — Marcar una página

1. La persona llega a una página que le interesa y la marca.
2. Escribe un nombre para la marca y, si quiere, un adelanto del texto.
3. La marca se guarda en el dispositivo y, si el libro está sincronizado, también en el servidor.
4. Puede ver todas las marcas del libro en un panel lateral y saltar a cualquiera con un clic.
5. Puede cambiar el nombre de una marca o eliminarla.

### Flujo 5 — Completar la racha diaria

1. La persona pulsa el botón de racha, en el lector o en su perfil.
2. El sistema revisa si hoy ya completó la lectura.
   - Si ya lo hizo, le avisa que ya estaba al día, sin contar de nuevo.
   - Si la última lectura fue ayer, la racha continúa y sube en un día.
   - Si la última lectura fue antes de ayer, la racha se reinicia en uno.
3. El resultado se muestra de inmediato en el perfil y en el lector.
4. La cuenta usa la fecha del dispositivo, para que el cambio de zona horaria no afecte el resultado.

### Flujo 6 — Leer sin conexión y volver a sincronizar

1. La persona abre la aplicación sin conexión a internet.
2. La aplicación sigue funcionando: los libros ya descargados se leen con normalidad y el progreso se guarda en el dispositivo.
3. Al recuperar la conexión, el sistema envía lo pendiente.
4. Trae lo que se leyó en otros dispositivos.
5. Combina ambas versiones **conservando siempre el avance más avanzado** de cada dato: el tiempo, la página y la posición nunca retroceden.
6. Si algo falla, la información queda guardada en el dispositivo y se reintenta más adelante.

### Flujo 7 — Cerrar sesión

1. La persona pulsa el botón de cerrar sesión.
2. El sistema cierra la sesión en el servidor, con lo que la credencial deja de servir de inmediato.
3. Borra los libros guardados en el dispositivo, para que no queden disponibles para la próxima persona que use ese equipo.
4. La aplicación vuelve a la pantalla de acceso.

---

## 11. Casos de Uso por Tipo de Usuario

### Visitante (sin cuenta)

- Ver la página de presentación del producto.
- Crear una cuenta.
- Iniciar sesión.
- Ser derivado a la pantalla de acceso si intenta entrar a la biblioteca sin sesión.

### Lector (persona con cuenta)

**Con su biblioteca:**
- Agregar un libro desde su dispositivo.
- Ver todos sus libros con su progreso.
- Buscar un libro por nombre.
- Filtrar por los que está leyendo o los que no ha empezado.
- Cambiar la forma de ver la biblioteca: estante, lista o cuadrícula.
- Reordenar los libros en la vista de estante.
- Descargar un libro.
- Mover un libro de su dispositivo a la nube, o de la nube a su dispositivo.
- Eliminar un libro de su biblioteca.

**Leyendo:**
- Abrir un libro y continuar desde donde se quedó.
- Configurar el tamaño, el tipo de letra, el interlineado y el ancho del texto.
- Navegar entre páginas.
- Ver el tiempo que lleva leyendo.
- Activar el modo de lectura sin distracciones.
- Marcar una página y darle un nombre.
- Resaltar un fragmento con uno de cinco colores.
- Ver y saltar a sus páginas marcadas.

**Con su actividad:**
- Marcar que leyó hoy y ver su racha de días consecutivos.
- Ver cuánto tiempo lleva leyendo en total.
- Ver cuántos libros tiene y cuántos tiene en progreso.
- Ver su tiempo promedio por libro.
- Corregir el tiempo registrado en un libro.

**Configurando:**
- Activar o desactivar la sincronización con la nube.
- Elegir la forma de ver la biblioteca por defecto.
- Definir sus preferencias de lectura.
- Cerrar sesión.

### Administrador

- Ninguna función disponible en la versión actual. El rol está reservado en el sistema pero no tiene funcionalidades asignadas.

---

## 12. Resumen General del Sistema

| Aspecto | Detalle |
|---|---|
| **Módulos documentados** | 4 (servidor, base de datos, aplicación, contrato de la interfaz) |
| **Áreas funcionales** | 7 (acceso, libros, progreso, marcas, rachas, sincronización, estadísticas) |
| **Funciones de servicio (pantallas)** | 5 (acceso, biblioteca, perfil, lector, página no encontrada) |
| **Operaciones disponibles en la interfaz del servidor** | 20 |
| **Tablas de base de datos** | 9 |
| **Roles definidos** | 2 (lector y administrador), de los cuales 1 tiene funciones activas |
| **Tipos de persona** | 3 (visitante, lector, administrador) |
| **Tipos de marca de lectura** | 2 (marcas por página y resaltes con 5 colores) |
| **Plataformas** | 3 (navegador web, escritorio, Android) |
| **Temas visuales** | 6 definidos |
| **Servicios externos** | 3 en uso (almacenamiento de archivos, base de datos, alojamiento del servidor) y 1 preparado pero sin usar (correo) |
| **Método de pago** | No hay pagos ni suscripciones en el sistema |
| **Integraciones con terceros** | No hay integración con redes sociales ni servicios de pago |
| **Correo electrónico** | Implementación pendiente: el sistema exige configurarlo, pero todavía no envía correo |
| **Verificación automática de calidad** | Existe un conjunto de pruebas del servidor y de la aplicación. **No hay integración continua**, hoy las pruebas se ejecutan de forma manual |
| **App móvil** | Se genera desde la misma aplicación de escritorio, no es una aplicación independiente |

### Puntos pendientes conocidos

Estos puntos están identificados y tienen plan de trabajo registrado:

1. El código de confirmación del correo no se envía por correo.
2. La aplicación y el servidor no coinciden en una función de edición de marcas: la aplicación la usa y el servidor no la tiene.
3. Al leer por primera vez un libro descargado de la nube, la preparación puede fallar por un problema en la biblioteca de lectura de PDF.
4. La pantalla de lectura y varias partes de la aplicación no tienen pruebas automáticas.
5. No hay integración continua que ejecute las pruebas automáticamente.
6. Cuatro de los seis temas visuales están preparados pero no se pueden seleccionar.
7. Los resaltes de texto no se comparten entre dispositivos.

El detalle técnico de cada punto, con los archivos Involucrados, está en la carpeta de tareas del proyecto.
