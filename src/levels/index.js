// Registro de niveles: cada parada aporta su pista, sus datos y su paleta.
import * as monterrico from './monterrico.js';
import * as taxisco from './taxisco.js';
import * as capital from './capital.js';
import * as antigua from './antigua.js';
import * as atitlan from './atitlan.js';

export const LEVELS = {monterrico, taxisco, capital, antigua, atitlan};
export const ORDER = ['monterrico', 'taxisco', 'capital', 'antigua', 'atitlan'];
