# FitChrono - Cronómetro de Entrenamiento

## Concepto y Visión
FitChrono es un cronómetro de entrenamiento para CrossFit y fitness funcional. Diseñado para uso en el box o en casa, con una interfaz que se ve bajo cualquier luz y es legible desde lejos durante el workout. La experiencia debe transmitir urgencia, precisión y control — como tener un coach en el bolsillo.

## Tipos de Entrenamiento Soportados

### 1. EMOM (Every Minute On the Minute)
- Config: duración total (min), número de rounds
- Cada minuto completo: beep + vibración + flash en pantalla
- Contador de rounds completados
- Countdown antes de empezar (3-2-1-GO)

### 2. TABATA
- Config: rounds, tiempo trabajo (default 20s), tiempo descanso (default 10s)
- Ciclos de 30s alternando trabajo/descanso
- Indicador visual muy claro (color cambia: rojo=trabajo, verde=descanso)
- Beep diferente para transición trabajo/descanso
- Contador de round actual y total

### 3. AMRAP (As Many Rounds As Possible)
- Config: duración total en minutos
- Cronómetro cuenta arriba, sin pausas
- Botón de round completado (incrementa contador)
- Muestra tiempo y rounds al terminar

### 4. FOR TIME (Time Cap)
- Config: time cap máximo (ej: 12 minutos)
- Cronómetro cuenta arriba
- Botón de "Done" para marcar finalización
- Muestra tiempo final y diferencia vs time cap

### 5. COUNTDOWN (Cuenta atrás fija)
- Config: duración en segundos
- Uso: pre-workout, preparación de重量, etc.
- Beep al llegar a 0

### 6. INTERVAL (Intervalos custom)
- Config: número de intervalos, tiempo trabajo, tiempo descanso
- Similar a Tabata pero configurable libremente
- Ej: 8x 40s trabajo / 20s descanso

## Diseño UX

### Interfaz Principal
- **Pantalla grande**: el tiempo enorme y centrado
- **Modo oscuro**: fondo negro #000000, texto blanco #FFFFFF
- **Modo claro**: fondo blanco #FFFFFF, texto negro #000000
- Cambiar con botón en esquina superior derecha

### Estados del Timer
- **IDLE**: pantalla principal con selector de workout y botón START
- **COUNTDOWN**: 3-2-1 con cuenta regresiva grande y beep
- **RUNNING**: tiempo contando, cambio de color según modo (rojo/verde para intervalos)
- **PAUSED**: tiempo congelado, botón RESUME y STOP visibles
- **FINISHED**: tiempo.final + beep largo + vibración

### Elementos Visuales
- Tiempo principal: 120px+, monospace, centro de pantalla
- Round actual / total: 40px, debajo del tiempo
- Workout name: 24px, pequeño, parte superior
- Botones: grandes (min 80px height), fáciles de pulsar sudando

### Sonido y Vibración
- Beep corto (200ms): cada minuto en EMOM, transición de intervalo
- Beep largo (1s): fin de workout
- Vibración en transiciones críticas
- Botón mute en esquina

### Presets Guardados
- Guardar workouts favoritos con nombre
- Botón de acceso rápido en home
- SWIPE para borrar preset

## Stack Técnico

### Frontend
- **Ionic + Angular** (o vanilla + Capacitor)
- **Capacitor** para APK Android
- Almacenamiento local (localStorage/IndexedDB) para presets

### Funcionalidad
- Audio API para beeps (sintetizados, no archivos externos)
- Vibration API para haptic feedback
- Page Visibility API para pausar cuando app está en background
- Background timer usando setInterval + persistencia de estado

## Archivo Structure
```
workout-timer/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── timer.js
│   ├── sounds.js
│   ├── storage.js
│   └── workouts.js
├── icons/
│   └── icon.png
└── SPEC.md
```

## Pantallas

### Home (IDLE)
- Nombre de la app
- Selector de tipo de workout (cards)
- Configuración del workout seleccionado
- Botón START grande
- Lista de presets guardados (abajo)

### Timer Running
- Tiempo grande centro
- Tipo de workout (arriba)
- Rounds (si aplica)
- Botón PAUSE / STOP

### Settings (overlay)
- Toggle modo oscuro/claro
- Toggle sonido
- Toggle vibración
- Ver/editar presets
- Botón关闭

## Métricas de Éxito
- Timer preciso al segundo
- Beeps claros y diferentes según evento
- Interfaz legible a 2 metros de distancia
- Presets accesibles en 2 taps
- APK instalable en Android 8+