// Entrada del proyecto con Vite: fuentes locales, estilos y arranque.
import '@fontsource/shrikhand/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800-italic.css';
import './styles.css';
import {boot} from './game.js';

boot();
// Instalable como app (y base para el APK): solo en la página publicada.
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
