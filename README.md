# 🎨 MFA Frontend - Sistema de Autenticación Multifactor

Frontend del sistema de autenticación multifactor (MFA) de 3 capas.

## 🚀 Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Estilos personalizados con variables CSS
- **JavaScript ES6+** - Lógica de aplicación
- **Bootstrap 5.3.2** - Framework CSS
- **Bootstrap Icons** - Iconografía
- **Google Fonts (Inter)** - Tipografía profesional

## 🎨 Paleta de Colores

- **Primary**: `#1864ff`
- **Primary Dark**: `#083595`
- **Dark Background**: `#01113e`
- **Light Background**: `#f4f6ff`

## 📁 Estructura del Proyecto

```
frontend/
├── index.html          # Página de presentación/landing
├── system.html         # Sistema de autenticación MFA
├── dashboard.html      # Dashboard post-autenticación
├── style.css          # Estilos globales (index.html)
└── static/
    ├── app.js         # Lógica de la aplicación MFA
    └── style.css      # Estilos del sistema (system.html)
```

## 🔐 Capas de Seguridad

1. **Capa 1: PBKDF2** - Hash de contraseña con PBKDF2-HMAC-SHA256
2. **Capa 2: TOTP** - Código temporal basado en tiempo (Google Authenticator)
3. **Capa 3: Email OTP** - Código de un solo uso enviado por email

## 🌐 Uso

### Desarrollo Local

Sirve los archivos con cualquier servidor HTTP. Por ejemplo:

```bash
# Python 3
python -m http.server 8080

# Node.js (http-server)
npx http-server -p 8080
```

Luego abre: `http://localhost:8080`

### Integración con Backend

El frontend espera que el backend esté disponible en la misma URL base y responda a los siguientes endpoints:

- `POST /api/register` - Registro de usuario
- `POST /api/login` - Login inicial
- `POST /api/verify_totp` - Verificación TOTP
- `POST /api/send_email_otp` - Enviar OTP por email
- `POST /api/verify_email` - Verificar OTP de email

### Configuración de API

Por defecto, el frontend hace peticiones a rutas relativas (`/api/*`). Si necesitas apuntar a un backend diferente, modifica la función `api()` en `static/app.js`:

```javascript
async function api(path, body){
  const baseUrl = 'http://tu-backend.com'; // Cambiar aquí
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return res.json();
}
```

## 📱 Páginas

### 🏠 index.html - Landing Page
Página de presentación con:
- Hero section con gradiente
- Características del sistema
- Explicación del proceso
- Call-to-action

### 🔐 system.html - Sistema MFA
Interfaz de autenticación con:
- Stepper circular visual
- Formularios de registro/login
- Escaneo QR para TOTP
- Verificación de códigos

### 📊 dashboard.html - Dashboard
Panel post-autenticación con:
- Información del usuario
- Estadísticas de seguridad
- Timeline de autenticación
- Funcionalidad de logout

## 🎯 Características

✅ Diseño responsive con Bootstrap 5  
✅ Animaciones suaves y transiciones  
✅ Feedback visual con toasts y alerts  
✅ Validación de formularios  
✅ Stepper visual de progreso  
✅ Modo debug con logs detallados  
✅ localStorage para persistencia de sesión  
✅ Botones de respaldo manual  

## 🛠️ Desarrollo

### Debug Mode

El archivo `app.js` incluye logs de debug extensivos. Abre la consola del navegador (F12) para ver:

```
[MFA] app.js cargado correctamente
[MFA] Versión: 1.1.0 - Debug Mode
[MFA DEBUG] Respuesta completa del backend: {...}
[MFA] Autenticación completada exitosamente
```

### Personalización de Estilos

Los colores principales están definidos como variables CSS en `:root`:

```css
:root {
  --primary: #1864ff;
  --primary-dark: #083595;
  --dark-bg: #01113e;
  --light-bg: #f4f6ff;
  --primary-gradient: linear-gradient(135deg, #1864ff 0%, #083595 100%);
}
```

## 📝 Notas

- **Seguridad**: Este frontend NO maneja secretos. Toda la lógica de seguridad está en el backend.
- **CORS**: Asegúrate de que el backend tenga CORS habilitado si está en un dominio diferente.
- **localStorage**: Se usa para guardar información de sesión temporal (username, email, login_time).

## 🔗 Repositorios Relacionados

- **Backend**: [app-senati](https://github.com/MVCSystems/app-senati) - Servidor Python con las 3 capas MFA

## 📄 Licencia

MIT License - Ver repositorio principal para más detalles.

---

**Desarrollado por MVCSystems** 🚀
