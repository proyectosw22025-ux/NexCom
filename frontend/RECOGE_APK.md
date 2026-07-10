# Recoge NexCom — de PWA a `.apk`

La app **Recoge NexCom** ya es una PWA instalable y funcional con y sin red
(ruta `/recoge`). Con eso se puede **instalar en Android sin generar un `.apk`**
(desde Chrome → menú → "Instalar app" / "Añadir a pantalla de inicio").

Este documento explica cómo, además, generar un **archivo `.apk`/`.aab` firmado**
para instalarlo directamente o subirlo a Google Play.

---

## Requisito previo: la PWA debe estar publicada

PWABuilder y la Trusted Web Activity necesitan una **URL pública HTTPS**. El
frontend ya se despliega en Vercel, así que la app queda en:

```
https://<tu-dominio-vercel>/recoge
```

Verifica antes de empaquetar:

- `https://<dominio>/manifest.webmanifest` responde 200.
- `https://<dominio>/sw.js` responde 200.
- Abrir `/recoge` en Chrome de escritorio → DevTools → **Application → Manifest**
  no muestra errores, y **Service Workers** aparece "activated".

---

## Opción A — PWABuilder (recomendada, sin Android Studio)

Es la vía más simple: un servicio web que empaqueta la PWA en una **Trusted Web
Activity** y devuelve el `.aab` (Play) y un `.apk` firmado de prueba.

1. Entra a <https://www.pwabuilder.com>.
2. Pega la URL: `https://<tu-dominio-vercel>/recoge` → **Start**.
3. Revisa el reporte (manifest / service worker / seguridad). Debe salir verde.
4. **Package for stores → Android → Generate**.
5. Descarga el `.zip`. Contiene:
   - `app-release-signed.apk` → instalable directamente en un teléfono (modo
     "orígenes desconocidos") para pruebas.
   - `app-release-bundle.aab` → para subir a Google Play Console.
   - `signing.keystore` + `assetlinks.json` + credenciales de firma
     (**guárdalas**: se necesitan para publicar futuras actualizaciones).
6. Sube el `assetlinks.json` a `https://<dominio>/.well-known/assetlinks.json`
   (esto verifica el dominio y quita la barra de URL del navegador dentro de la
   app). En Vercel: coloca el archivo en `frontend/public/.well-known/assetlinks.json`.

Instalar el `.apk` de prueba en el teléfono: transfiérelo y ábrelo, o vía USB:

```bash
adb install app-release-signed.apk
```

---

## Opción B — Capacitor (control total, requiere Android Studio)

Úsala si necesitas plugins nativos (cámara nativa, notificaciones push nativas,
etc.). Requiere en tu máquina: **JDK 17**, **Android Studio** + SDK.

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Recoge NexCom" com.nexcom.recoge --web-dir=out
# Exportar el sitio (o apuntar el webDir a la build). Para TWA sobre la web ya
# desplegada, en capacitor.config.ts define server.url = "https://<dominio>/recoge".
npx cap add android
npx cap open android   # abre Android Studio → Build > Generate Signed Bundle/APK
```

En Android Studio: **Build → Generate Signed Bundle / APK → APK**, crea/usa un
keystore, y obtén el `.apk` en `android/app/build/outputs/apk/`.

---

## Notas

- La moneda de toda la app es **Boliviano (Bs.)**; el empaquetado no la altera.
- El `.apk` es una envoltura de la PWA desplegada: cada vez que se despliega el
  frontend, la app instalada se actualiza sola (no hay que regenerar el `.apk`
  salvo que cambien nombre/ícono/permisos).
- El service worker (`public/sw.js`) es lo que da el funcionamiento **sin red**;
  ya está incluido y registrado por la app.
