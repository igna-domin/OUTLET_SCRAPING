const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.join(__dirname, '.env')) ? '.env' : '.env.txt';
require('dotenv').config({ path: path.join(__dirname, envPath) });
const puppeteer = require('puppeteer');

const URL = 'https://compragamer.com/productos?criterio=outlet&outlet=1';
// Selectores actuales de Compra Gamer (actualizados)
const SELECTOR_PRODUCTO = 'cgw-product-card'; 
const SELECTOR_TITULO = '.product-card__title';
const SELECTOR_PRECIO = '.product-card__cart__price';

const JSON_FILE_PATH = path.join(__dirname, 'productos.json');

// Cargamos los productos anteriores de productos.json si existe
let productosAnteriores = new Set();
let primeraEjecucion = true;

if (fs.existsSync(JSON_FILE_PATH)) {
    try {
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const list = JSON.parse(rawData);
        productosAnteriores = new Set(list);
        primeraEjecucion = false;
        console.log(`📦 Catálogo anterior cargado desde productos.json con ${productosAnteriores.size} productos.`);
    } catch (err) {
        console.error('⚠️ Error al leer productos.json, se iniciará como primera ejecución:', err.message);
    }
} else {
    console.log('📦 No se encontró productos.json. Se inicializará en esta ejecución.');
}

async function monitorearOutlet() {
    let browser;
    try {
        // Lanzamos el navegador con argumentos para pasar desapercibidos
        browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled' // Oculta que es un bot
            ]
        });
        const page = await browser.newPage();
        
        // Camuflaje extra para que parezca un Chrome real de Windows
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        
        // Esperamos a 'domcontentloaded' que es más rápido y seguro
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        
        // Aumentamos el timeout a 30 segundos por las dudas
        await page.waitForSelector(SELECTOR_PRODUCTO, { timeout: 30000 });

        // Scrapeamos los datos actuales de la página
        const productosActuales = await page.$$eval(SELECTOR_PRODUCTO, (elementos, selTxt, selPrch) => {
            return elementos.map(el => {
                const tituloEl = el.querySelector(selTxt);
                const precioEl = el.querySelector(selPrch);
                return {
                    titulo: tituloEl ? tituloEl.innerText.trim() : 'Sin título',
                    precio: precioEl ? precioEl.innerText.trim() : 'Sin precio'
                };
            });
        }, SELECTOR_TITULO, SELECTOR_PRECIO);

        console.log(`[${new Date().toLocaleTimeString()}] Controlando outlet... Productos online: ${productosActuales.length}`);

        if (primeraEjecucion) {
            // Guardamos el catálogo inicial
            productosActuales.forEach(p => productosAnteriores.add(p.titulo));
            const listToSave = Array.from(productosAnteriores);
            fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(listToSave, null, 2), 'utf-8');
            console.log(`✅ Inicialización del catálogo exitosa. Estado inicial guardado con ${productosAnteriores.size} productos.`);
            return;
        }

        // Buscamos si hay productos actuales que NO estaban en la lista anterior
        const nuevosProductos = productosActuales.filter(p => !productosAnteriores.has(p.titulo));

        if (nuevosProductos.length > 0) {
            console.log(`\n🔔 ¡ALERTA! Se agregaron ${nuevosProductos.length} productos nuevos al Outlet:`);
            
            let mensajeNotificacion = "¡Nuevos productos en el Outlet de Compra Gamer! \n\n";
            
            nuevosProductos.forEach(p => {
                const detalle = `- ${p.titulo} (${p.precio})`;
                console.log(detalle);
                mensajeNotificacion += `${detalle}\n`;
            });
            
            // Enviamos la alerta con la lista de productos
            await enviarNotificacionTelegram(mensajeNotificacion);
            // Actualizamos nuestro Set para incluir los nuevos y no volver a avisar por ellos
            nuevosProductos.forEach(p => productosAnteriores.add(p.titulo));
        }

        // Limpiar del Set los productos que ya no están online (así si vuelven a entrar, avisa)
        const titulosActuales = new Set(productosActuales.map(p => p.titulo));
        for (let titulo of productosAnteriores) {
            if (!titulosActuales.has(titulo)) {
                productosAnteriores.delete(titulo);
            }
        }

        // Guardamos el estado actualizado
        const listToSave = Array.from(productosAnteriores);
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(listToSave, null, 2), 'utf-8');
        console.log(`💾 Catálogo actualizado guardado en productos.json (${listToSave.length} productos).`);

    } catch (error) {
        console.error('⚠️ Error durante la inspección:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

const axios = require('axios');

async function enviarNotificacionTelegram(mensaje) {
    const TOKEN = process.env.TELEGRAM_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    
    try {
        await axios.post(url, {
            chat_id: CHAT_ID,
            text: mensaje
        });
        console.log('✉️ Notificación enviada a Telegram con éxito.');
    } catch (error) {
        console.error('⚠️ Error al enviar notificación a Telegram:', error.message);
        if (error.response) {
            console.error(`Detalle de la API (${error.response.status}):`, error.response.data.description);
        }
    }
}

// Ejecución única para GitHub Actions
console.log('🚀 Iniciando rastreador de Outlet Compra Gamer...');
monitorearOutlet().then(() => {
    console.log('🏁 Proceso finalizado.');
    process.exit(0);
}).catch(err => {
    console.error('💥 Error crítico en la ejecución:', err);
    process.exit(1);
});