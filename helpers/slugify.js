// helpers/slugify.js 

// ------------------ 

// Macht aus einem Titel eine URL-freundliche "slug" (nur Kleinbuchstaben, Ziffern, Bindestriche). 

// Beispiele: 

//  "Die Zeitmaschine!" -> "die-zeitmaschine" 

//  "Komödie: Café au lait" -> "komodie-cafe-au-lait" 

export default function slugify(input) { 

  if (!input) return ""; 

  return String(input) 

    .normalize("NFKD")                  // trennt Akzente (ä -> a + ¨) 

    .replace(/[\u0300-\u036f]/g, "")    // entfernt kombinierende Zeichen (¨) 

    .toLowerCase() 

    .replace(/&/g, " und ")             // kaufmännisches Und ausschreiben 

    .replace(/[^a-z0-9]+/g, "-")        // alles außer [a-z0-9] zu "-" 

    .replace(/^-+|-+$/g, "")            // leading/trailing "-" entfernen 

    .replace(/-{2,}/g, "-");            // doppelte "-" glätten 

} 

 