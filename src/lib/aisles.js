// Compra por pasillos: cada cosa a su pasillo por palabras clave, en el orden
// en que se recorre un súper. Lo que no se reconoce va a «Otros».

export const AISLES = [
  { id: "fruta", label: "Fruta y verdura" },
  { id: "pan", label: "Panadería" },
  { id: "carne", label: "Carne y pescado" },
  { id: "lacteos", label: "Lácteos y huevos" },
  { id: "despensa", label: "Despensa" },
  { id: "bebidas", label: "Bebidas" },
  { id: "congelados", label: "Congelados" },
  { id: "hogar", label: "Limpieza y hogar" },
  { id: "higiene", label: "Higiene" },
  { id: "otros", label: "Otros" },
];

// Frases que mandan sobre la primera palabra («tomate frito» no es verdura).
const PHRASES = [
  ["tomate frito", "despensa"],
  ["pan rallado", "despensa"],
  ["pan de molde", "pan"],
  ["patatas fritas", "despensa"],
  ["frutos secos", "despensa"],
  ["pasta de dientes", "higiene"],
  ["papel higienico", "hogar"],
  ["congelad", "congelados"],
];

// Comienzos de palabra (sin tildes). Las cortas («ajo», «sal») van enteras.
const STEMS = {
  fruta: ["fruta", "verdur", "tomat", "platan", "manzan", "lechug", "cebol", "patat", "zanahori", "pimient", "limon", "naranj", "mandarin", "fresa", "uvas", "peras", "aguacat", "calabac", "berenjen", "espinac", "albahac", "perejil", "cilantro", "champin", "setas", "kiwi", "melon", "sandia", "pepino", "brocoli", "puerro", "judias", "guisant", "melocoton", "pina", "mango", "ensalad", "rucula", "canonig", "jengibre"],
  pan: ["pan", "panes", "baguet", "barra", "barras", "bolleria", "croissant", "cruasan", "magdalen", "tostad", "picos", "colines", "chapata"],
  carne: ["pollo", "pechug", "muslo", "ternera", "cerdo", "carne", "filete", "hamburgues", "salchich", "chorizo", "jamon", "pavo", "lomo", "bacon", "beicon", "pescado", "merluza", "salmon", "gamba", "langostin", "bacalao", "sardina", "mejillon", "calamar", "embutid", "fiambre", "salami", "costilla", "albondig", "dorada", "lubina"],
  lacteos: ["leche", "yogur", "queso", "mantequill", "nata", "huevo", "kefir", "cuajada", "natilla", "flan", "batido"],
  despensa: ["arroz", "pasta", "macarron", "espagueti", "fideo", "lenteja", "garbanzo", "alubia", "aceite", "vinagre", "sal", "azucar", "harina", "cafe", "te", "infusion", "cacao", "colacao", "cereal", "galleta", "atun", "legumbre", "conserva", "especia", "oregano", "pimenton", "mermelad", "miel", "chocolate", "nueces", "almendr", "caldo", "sopa", "salsa", "mayonesa", "ketchup", "mostaza", "pipas", "aceituna", "levadura", "avena", "tortita", "quinoa", "cuscus", "pure", "snack"],
  bebidas: ["agua", "cerveza", "vino", "refresco", "zumo", "coca", "cola", "fanta", "tonica", "gaseosa", "bebida", "sidra", "cava", "aquarius", "nestea"],
  congelados: ["helado", "hielo", "pizza", "croqueta", "nugget", "varita"],
  hogar: ["papel", "lejia", "friegasuel", "detergent", "suavizant", "lavavajill", "fairy", "estropajo", "bolsa", "bolsas", "basura", "servillet", "film", "aluminio", "bayeta", "limpiador", "limpia", "pilas", "bombill", "vela", "insecticid", "amoniaco", "sanitas", "pastillas"],
  higiene: ["champu", "gel", "jabon", "desodorant", "cepillo", "compresa", "tampon", "cuchilla", "crema", "colonia", "panal", "toallita", "algodon", "bastonc", "dentifric", "enjuague", "suero", "tiritas", "ibuprofeno", "paracetamol"],
};

// Las palabras cortas solo valen enteras: «sal» no es «salsa» ni «salmón».
const EXACT = new Set(["pan", "panes", "barra", "barras", "sal", "te", "cola", "gel", "pilas", "picos", "uvas", "peras", "pina", "setas", "bolsa", "bolsas", "limpia"]);

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n");
}

const cache = new Map();

function matchWord(word) {
  for (const aisle in STEMS) {
    const stems = STEMS[aisle];
    for (let index = 0; index < stems.length; index += 1) {
      const stem = stems[index];
      if (EXACT.has(stem) ? word === stem : word.indexOf(stem) === 0) return aisle;
    }
  }
  return null;
}

export function aisleFor(text) {
  const key = normalize(text);
  if (cache.has(key)) return cache.get(key);
  let found = null;
  for (let index = 0; index < PHRASES.length && !found; index += 1) {
    if (key.indexOf(PHRASES[index][0]) !== -1) found = PHRASES[index][1];
  }
  // La primera palabra que se reconoce: «leche de avena» es leche.
  const words = key.split(/[^a-z0-9]+/);
  for (let index = 0; index < words.length && !found; index += 1) {
    if (words[index]) found = matchWord(words[index]);
  }
  const aisle = found || "otros";
  if (cache.size > 300) cache.clear();
  cache.set(key, aisle);
  return aisle;
}

// Los artículos en grupos por pasillo, en el orden del súper y sin vacíos.
export function groupByAisle(items) {
  const buckets = {};
  items.forEach((item) => {
    const aisle = aisleFor(item.text);
    (buckets[aisle] = buckets[aisle] || []).push(item);
  });
  return AISLES.filter((aisle) => buckets[aisle.id]).map((aisle) => ({ ...aisle, items: buckets[aisle.id] }));
}
