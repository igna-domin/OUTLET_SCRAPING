FROM apify/actor-node-puppeteer-chrome:20

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias de producción de forma limpia
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Comando para iniciar la aplicación
CMD ["node", "monitor.js"]
