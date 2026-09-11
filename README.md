# 🛒 Compra Gamer - Outlet Scraper & Monitor

Bot de monitoreo continuo y alertas automáticas en tiempo real para la sección de **Outlet** de [Compra Gamer](https://compragamer.com/productos?criterio=outlet&outlet=1).

El script rastrea periódicamente el catálogo, detecta la aparición de nuevos productos o reingresos de stock y envía notificaciones inmediatas a un canal o chat de **Telegram**, todo optimizado para funcionar en servidores de bajos recursos (como el Free Tier de Render de 512 MB de RAM).

---

## 🚀 Características Principales

- 🔍 **Rastreo Automático y Continuo:** Inspecciona el outlet de Compra Gamer en intervalos programados (por defecto cada 2 minutos).
- 🧠 **Control Inteligente de Estado:**
  - En la primera ejecución genera la base de datos inicial sin saturar de notificaciones.
  - Compara el catálogo actual con el anterior para alertar **únicamente sobre productos nuevos o reingresados**.
  - Si un producto se agota y vuelve a entrar en stock más tarde, el sistema lo vuelve a notificar.
- ⚡ **Optimizado para Bajo Consumo de RAM (<512 MB):**
  - **Intercepción de peticiones:** Bloquea la descarga de imágenes, fuentes y contenido multimedia para ahorrar ancho de banda y memoria.
  - **Flags de Puppeteer específicos:** Utiliza `--single-process`, `--disable-dev-shm-usage`, `--disable-gpu`, entre otros, para entornos de contenedores con memoria restringida.
  - **Garbage Collector Forzado:** Invoca manualmente `global.gc()` al finalizar cada ciclo de monitoreo para evitar fugas de memoria (*memory leaks*).
- 🛡️ **Anti-Detección Básica:** Emula un navegador Chrome real sobre Windows (`User-Agent` personalizado) y oculta la propiedad `navigator.webdriver`.
- ✉️ **Alertas Instantáneas por Telegram:** Envía el título y precio formateado de cada producto nuevo vía Bot API.
- 🩺 **Servidor HTTP para Health Check Integrado:** Incluye un servidor web nativo de Node.js escuchando en el puerto configurado (`/` y `/health`), permitiendo mantener el servicio activo en plataformas como Render o Railway sin que marquen el servicio como inactivo.
- 🐳 **Docker Ready:** Incluye un `Dockerfile` basado en la imagen oficial optimizada de Puppeteer de Apify (`apify/actor-node-puppeteer-chrome:20`).

---

## 📁 Estructura del Repositorio

```text
OUTLET_SCRAPING/
├── Dockerfile          # Configuración del contenedor Docker para producción/despliegue
├── monitor.js          # Script principal: scraping con Puppeteer, servidor HTTP y alertas
├── package.json        # Definición del proyecto Node.js y dependencias
├── package-lock.json   # Bloqueo de versiones exactas de dependencias
├── productos.json      # Catálogo de productos en caché (referencia local)
└── .gitignore          # Archivos excluidos de Git (node_modules, .env, etc.)
```

---

## ⚙️ ¿Cómo Funciona por Dentro?

1. **Inicialización:**
   - Carga las variables de entorno desde `.env` o `.env.txt`.
   - Inicia un servidor HTTP ligero para responder a los *health checks* de la plataforma de hosting.
   - Intenta cargar el archivo `productos.json` del directorio temporal (`/tmp` o el sistema correspondiente).
2. **Ciclo de Monitoreo (`monitorearOutlet`):**
   - Lanza una instancia headless de Chrome optimizada.
   - Navega a la URL de outlet de Compra Gamer bloqueando recursos pesados.
   - Espera al selector de productos (`cgw-product-card`) y extrae el título (`.product-card__title`) y el precio (`.product-card__cart__price`).
   - Maneja casos en los que no hay stock o la búsqueda queda vacía sin arrojar excepciones innecesarias.
3. **Detección de Novedades y Notificación:**
   - Compara los títulos encontrados con el conjunto (`Set`) de productos previamente registrados.
   - Si detecta ítems nuevos:
     - Imprime los detalles en consola.
     - Construye el mensaje de alerta.
     - Realiza una llamada HTTP `POST` a la API de Telegram para notificar a los suscriptores.
   - Actualiza el set eliminando los productos que ya salieron de catálogo para permitir re-alertas a futuro.
   - Guarda el estado en `productos.json`.
4. **Cierre y Limpieza:**
   - Cierra el navegador Puppeteer.
   - Ejecuta el recolector de basura (`global.gc()`).
   - Programa la siguiente ejecución en 2 minutos (`setInterval`).

---

## 📋 Requisitos Previos

- **Node.js** (versión 18 o superior recomendada)
- **NPM**
- Un **Bot de Telegram** y su respectivo Chat ID:
  1. Habla con [@BotFather](https://t.me/BotFather) en Telegram para crear un bot y obtener el `TELEGRAM_TOKEN`.
  2. Obtén tu `TELEGRAM_CHAT_ID` (puedes usar bots como [@userinfobot](https://t.me/userinfobot) o reenviar un mensaje a [@JsonDumpBot](https://t.me/JsonDumpBot)).

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en el siguiente ejemplo:

```env
# Token otorgado por @BotFather
TELEGRAM_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ

# ID de tu usuario, grupo o canal de Telegram
TELEGRAM_CHAT_ID=123456789

# Puerto para el servidor HTTP de health check (por defecto 3000)
PORT=3000

# (Opcional) Ruta al binario de Chrome/Chromium si no se usa el que descarga Puppeteer
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

---

## 💻 Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/igna-domin/OUTLET_SCRAPING.git
   cd OUTLET_SCRAPING
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Crea el archivo `.env` tal como se describe arriba.

4. **Ejecutar el monitor:**
   Para aprovechar la limpieza manual de memoria:
   ```bash
   node --expose-gc monitor.js
   ```
   *O de forma estándar:*
   ```bash
   node monitor.js
   ```

---

## 🐳 Despliegue con Docker

El proyecto incluye un `Dockerfile` optimizado basado en `apify/actor-node-puppeteer-chrome:20` que ya cuenta con Google Chrome y todas las dependencias del sistema necesarias preinstaladas.

1. **Construir la imagen:**
   ```bash
   docker build -t outlet-scraper .
   ```

2. **Correr el contenedor:**
   ```bash
   docker run -d \
     --name outlet-monitor \
     -p 3000:3000 \
     --env-file .env \
     outlet-scraper
   ```

---

## ☁️ Despliegue en Render (Free Tier)

Este proyecto está especialmente diseñado para correr de forma continua en **Render** como un **Web Service**:

1. Crea un nuevo **Web Service** en Render conectado a tu repositorio de GitHub.
2. Selecciona el runtime **Docker**.
3. En la sección **Environment Variables**, añade:
   - `TELEGRAM_TOKEN`: Tu token de Telegram.
   - `TELEGRAM_CHAT_ID`: El chat ID destino.
   - `PORT`: `3000`
4. En **Health Check Path**, configura:
   ```text
   /health
   ```
5. El contenedor responderá automáticamente al health check de Render y ejecutará el monitoreo sin exceder los 512 MB de RAM permitidos.

---

## 🛠️ Tecnologías Utilizadas

- [Node.js](https://nodejs.org/) - Entorno de ejecución JavaScript.
- [Puppeteer](https://pptr.dev/) - Automatización de navegación web y extracción de datos.
- [Axios](https://axios-http.com/) - Cliente HTTP para enviar notificaciones a la API de Telegram.
- [dotenv](https://github.com/motdotla/dotenv) - Carga de variables de entorno.
- [Docker](https://www.docker.com/) - Contenerización de la aplicación.
