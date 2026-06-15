FROM apify/actor-node-puppeteer-chrome:20

# Apuntar Puppeteer al ejecutable de Chrome preinstalado en la imagen de Apify
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Evitar descargas redundantes de Chromium durante npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copiar archivos con permisos del usuario 'apify' en el directorio por defecto de la imagen (/usr/src/app)
COPY --chown=apify:apify package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código asignando los permisos correspondientes
COPY --chown=apify:apify . .

# Comando para iniciar el scraper continuo
CMD ["node", "monitor.js"]
