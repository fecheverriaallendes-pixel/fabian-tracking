# LogiTrack ERP

Sistema profesional de gestión de transportes y despachos.

## 🚀 Configuración Inicial

### 1. Crear Proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Crea un nuevo proyecto "LogiTrack".
3. Desactiva Google Analytics (no es necesario para este MVP).

### 2. Configurar Authentication
1. En el menú lateral, ve a **Authentication**.
2. Haz clic en **Comenzar**.
3. En **Sign-in method**, habilita **Correo electrónico/contraseña**.
4. Agrega un primer usuario manualmente (ej: `admin@logitrack.com`).

### 3. Configurar Firestore Database
1. Ve a **Firestore Database**.
2. Haz clic en **Crear base de datos**.
3. Selecciona la ubicación (ej: `us-central1` o `southamerica-west1`).
4. Comienza en **modo de producción**.
5. Una vez creada, ve a la pestaña **Reglas** y copia el contenido del archivo `firestore.rules` de este proyecto.

### 4. Conectar la App Web
1. En la visión general del proyecto, haz clic en el icono de **Web (</>)**.
2. Registra la app como "LogiTrack Web".
3. Copia las credenciales (`apiKey`, `authDomain`, etc.).
4. Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`) y pega las credenciales.

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 5. Primer Inicio de Sesión
1. Inicia la aplicación con `npm run dev`.
2. Ingresa con el usuario creado en el paso 2.
3. El sistema detectará que es tu primer inicio y te asignará el rol de `operador` por defecto (ver `src/contexts/AuthContext.tsx`).
4. **Importante:** Ve a tu colección `usuarios` en Firestore, busca el documento con el ID de tu usuario y cambia el campo `rol` a `admin` manualmente para tener acceso total.

## 🛠️ Desarrollo

```bash
# Instalar dependencias
npm install

# Correr en desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📦 Despliegue en Firebase Hosting

1. Instala Firebase CLI: `npm install -g firebase-tools`
2. Inicia sesión: `firebase login`
3. Inicializa el proyecto: `firebase init`
   - Selecciona **Hosting**.
   - Selecciona tu proyecto existente.
   - Carpeta pública: `dist`.
   - Configurar como SPA: **Sí** (Yes).
   - Sobrescribir index.html: **No**.
4. Construye y despliega:
   ```bash
   npm run build
   firebase deploy
   ```

## 🏗️ Estructura del Proyecto

- `/src/components`: Componentes UI reutilizables (Sidebar, Layout, Forms).
- `/src/pages`: Vistas principales (Dashboard, Transportes, Despachos).
- `/src/contexts`: Manejo de estado global (Auth).
- `/src/lib`: Configuración de Firebase y utilidades.
- `/src/types`: Definiciones de tipos TypeScript.
