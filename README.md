# Vuelta a Guatemala

Un repartidor cruza Guatemala con un paquete urgente. Don Beto llama cada cinco minutos, el reloj no perdona y el paquete no se puede abrir.

Juego 3D de estilo anime hecho con JavaScript. Todo lo que se ve (ciclista, palmeras, casas, perro) se construye con código, y la música de marimba se genera en el navegador. No usa imágenes ni audio pregrabado.

## Estado

| Parada | Vehículo | Estado |
|---|---|---|
| Monterrico | Bicicleta | Se puede jugar |
| Taxisco y Guazacapán | Caballo | Pendiente |
| Ciudad de Guatemala | Camioneta | Pendiente |
| Antigua | Tuc-tuc | Pendiente |
| Atitlán | Lancha | Pendiente |
| Xela | Moto | Pendiente |

Monterrico tiene tres etapas (la playa, el manglar y el pueblo), una tienda entre etapas, puntos de guardado y un jefe: Terremoto, el chucho de Doña Tere.

## Controles

| Acción | Computadora | Teléfono |
|---|---|---|
| Moverse | Flechas, A y D, o el ratón | Arrastrar el dedo |
| Saltar | Espacio o clic izquierdo | Botón Saltar |
| Pirueta | Saltar otra vez en el aire | Saltar otra vez en el aire |
| Pedalear duro | ↑ o W | Botón Dale |
| Frenar | ↓, S o clic derecho | Botón Freno |
| Timbre | B | |
| Pausa | P o Esc | Botón de pausa |
| Silencio | M | |

## Correrlo en tu computadora

Hace falta [Node.js](https://nodejs.org) 20 o más nuevo.

```bash
npm install
npm run dev
```

Para generar la versión final en la carpeta `dist`:

```bash
npm run build
```

## Publicarlo en GitHub Pages

El proyecto ya trae el flujo en `.github/workflows/deploy.yml`:

1. Subí el proyecto a un repositorio en GitHub, en la rama `main`.
2. Entrá a **Settings → Pages** y en **Source** elegí **GitHub Actions**.
3. Cada vez que subás cambios a `main`, la página se publica sola.

## Cómo está organizado

```text
src/
  core/      utilidades, sombreadores, render, audio e interfaz
  world/     suelo, objetos del mundo y efectos
  vehicles/  bicicleta, repartidor y perro
  levels/    nivel de Monterrico: pista, obstáculos, llamadas y paleta
  game.js    estados, física, choques, jefe y controles
  main.js    punto de entrada
  styles.css estilos de la interfaz
```

Cada nivel nuevo es un archivo en `levels/` y cada vehículo uno en `vehicles/`.

## Tecnologías

[Three.js](https://threejs.org) para el 3D, [anime.js](https://animejs.com) para la interfaz, [Tailwind CSS](https://tailwindcss.com) para los estilos, [Vite](https://vite.dev) para compilar y Web Audio para el sonido. Letras: Shrikhand y Barlow Condensed.

## Licencia

[MIT](LICENSE). Three.js, anime.js y Tailwind CSS conservan sus propias licencias. Las letras Shrikhand y Barlow Condensed usan la licencia SIL Open Font.
