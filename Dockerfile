FROM apify/actor-node-puppeteer-chrome:20

# Evitar que Puppeteer intente descargar Chromium de nuevo (ya está preinstalado en la imagen base)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Trabajar en el directorio del usuario no-root 'apify' para evitar problemas de permisos
WORKDIR /home/apify
USER apify

# Copiar archivos de dependencias con los permisos correctos
COPY --chown=apify:apify package*.json ./

# Instalar dependencias de producción de forma limpia
RUN npm ci --only=production

# Copiar el resto del código con los permisos del usuario 'apify' (indispensable para escribir productos.json)
COPY --chown=apify:apify . .

# Comando para iniciar la aplicación
CMD ["node", "monitor.js"]
