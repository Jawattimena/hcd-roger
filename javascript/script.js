// ═══════════════════════════════════════════════════════════════════════════
// SNELTOETSEN VOOR NAVIGATIE
// Zorgt ervoor dat Roger snel tussen secties kunnen navigeren met toetsen
// ═══════════════════════════════════════════════════════════════════════════

// Luister naar toetsaanslagen op het hele document
// Dit maakt het mogelijk om overal op de pagina sneltoetsen te gebruiken
document.addEventListener("keydown", (e) => {
  
  // ─────────────────────────────────────────────────────────────────────────
  // CMD + I: Spring naar de navigatie-gids in de header
  // Dit helpt Roger snel naar het menu bovenaan te gaan
  // ─────────────────────────────────────────────────────────────────────────
  if ((e.metaKey || e.ctrlKey) && e.key === "i") {
    e.preventDefault(); // Voorkom standaardgedrag van CMD+I (bijv. cursief in browsers)
    
    // Zoek de navigatie-gids element met tabindex (focusbaar)
    const navigationGuide = document.querySelector("header div[tabindex='0']");
    
    if (navigationGuide) {
      navigationGuide.focus(); // Zet focus op de navigatie-gids
      announce("Navigatie-gids geopend."); // Zeg dit tegen screen readers
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CMD + U: Wissel tussen tekst en notities
  // Roger kunnen snel heen en weer navigeren tussen lezen en notities maken
  // ─────────────────────────────────────────────────────────────────────────
  if ((e.metaKey || e.ctrlKey) && e.key === "u") {
    e.preventDefault(); // Voorkom standaardgedrag

    // Controleer of we momenteel in de notities-sectie zijn
    if (isInNotities()) {
      // Als we al in notities zijn: terug naar de laatst gelezen tekst
      focusLeestekst();
    } else {
      // Als we in tekst zijn: spring naar notities
      focusNotities();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLG DE LAATST GEFOCUSTE ZINS
// Herinnert welke zin de gebruiker het laatst las, zodat we hier kunnen
// terugkeren als zij van notities naar tekst gaan
// ═══════════════════════════════════════════════════════════════════════════

let lastFocusedSentence = null;

// ═══════════════════════════════════════════════════════════════════════════
// VERTAALFUNCTIE (dit is nog niet afgewerkt)
// In de toekomst kan dit echte vertaalsoftware gebruiken, bijv. DeepL API
// Nu geeft het alleen de oorspronkelijke tekst terug
// ═══════════════════════════════════════════════════════════════════════════
async function translateToEnglish(text) {
  // TODO: Implementeer echte vertaal-API (bijv. DeepL, Google Translate)
  return text; // Voor nu: geef de tekst onveranderd terug
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKBOXES EN NOTITIES LOGICA
// Maak elke zin klikbaar met een checkbox en notitieveld
// ═══════════════════════════════════════════════════════════════════════════

// Loop door alle zinnen in het document
document.querySelectorAll(".sentence").forEach((sentence) => {
  const input = sentence.querySelector('input[type="checkbox"]'); // Checkbox
  const label = sentence.querySelector("label"); // Tekst van de zin

  // Haal schone tekst uit het label (zonder extra spaties)
  const cleanText = label?.textContent?.trim() || "";

  // ─────────────────────────────────────────────────────────────────────────
  // ONTHOUD WELKE ZINS WE FOCUSSEN
  // Dit slaat op zodat we later terug kunnen navigeren
  // ─────────────────────────────────────────────────────────────────────────
  sentence.addEventListener("focusin", () => {
    lastFocusedSentence = input; // Sla checkbox op als "laatst gefocust"
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPATIEBALK SCHAKELT CHECKBOX UIT/AAN
  // Gebruiker hoeft niet te klikken, kan spatie gebruiken
  // ─────────────────────────────────────────────────────────────────────────
  sentence.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" && // Spatiebalk ingedrukt?
      document.activeElement === sentence.querySelector("label, input") // Focus op label of input?
    ) {
      e.preventDefault(); // Voorkom dat spatie pagina scrollt
      input.checked = !input.checked; // Toggle checkbox (aan/uit)
      input.dispatchEvent(new Event("change")); // Zeg dat checkbox is veranderd
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // WANNEER CHECKBOX VERANDERT: VOEG NOTITIEVELD TOE
  // ─────────────────────────────────────────────────────────────────────────
  input.addEventListener("change", () => {
    if (input.checked) {
      // Checkbox aangevinkt: maak een notitieveld voor deze zin
      addNote(input.id, label.textContent.trim());
    } else {
      // Checkbox uitgevinkt: verwijder het notitieveld
      removeNote(input.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HULPFUNCTIES
// Kleine functies die grotere functies helpen
// ═══════════════════════════════════════════════════════════════════════════

// Parse verwijzings-ID naar onderdelen
// Bijv. "Genesis-1:1" wordt { book: "Genesis", chapter: "1", verse: "1" }
function parseVerseId(id) {
  const match = id.match(/^(.+)-(\d+):(\d+)$/); // Regexp pattern: "boek-X:Y"
  if (!match) return { book: "", chapter: "", verse: "" }; // Fout? Geef leeg terug
  return { book: match[1], chapter: match[2], verse: match[3] }; // Geef onderdelen terug
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTITIES LOGICA
// Voeg notitievelden toe, verwijder ze, en sla op
// ═══════════════════════════════════════════════════════════════════════════

// Voeg een nieuw notitieveld toe voor een zin
function addNote(id, verseText) {
  const notities = document.querySelector(".notities"); // Vind het notities-paneel
  
  // Check of dit notitieveld al bestaat (voorkom duplicaten)
  if (document.getElementById("note-" + id)) return;

  // Parse de verwijzings-ID (bijv. "Genesis-1:1")
  const { book, chapter, verse } = parseVerseId(id);

  // ─────────────────────────────────────────────────────────────────────────
  // MAAK DE HTML STRUCTUUR VOOR EEN NOTITIEBLOK
  // ─────────────────────────────────────────────────────────────────────────
  
  const block = document.createElement("div");
  block.className = "note-block"; // CSS-klasse voor styling
  block.id = "note-" + id; // Unieke ID zodat we dit blok later kunnen vinden

  // Verwijzingsregel (bijv. "Genesis 1:1") - VISUEEL maar niet voor screen readers
  const verseRef = document.createElement("p");
  verseRef.className = "note-verse-ref";
  verseRef.textContent = `${book} ${chapter}:${verse}`;
  verseRef.setAttribute("aria-hidden", "true"); // Verberg dit voor screen readers (redundant)

  // Het labeltext (de zin zelf)
  const verseLabel = document.createElement("p");
  verseLabel.className = "note-verse-label";

  // Verwijder nummers aan het begin van de tekst (bijv. "1 Lorem ipsum" → "Lorem ipsum")
  const cleanText = verseText.replace(/^\d+/, "").trim();
  verseLabel.textContent = cleanText;

  // Textarea waar gebruiker notities kan typen
  const textarea = document.createElement("textarea");
  textarea.placeholder = ""; // Geen placeholder-tekst
  textarea.setAttribute(
    "aria-label",
    `You can now write down your note ${book} ${chapter}:${verse} — ${cleanText}`
  );

  // Opslaan-knop
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "note-save-btn";

  // Als gebruiker op "Save" klikt
  saveButton.addEventListener("click", () => {
    saveNote(id, textarea.value); // Sla de notitie op
    saveButton.classList.add("hidden"); // Verberg de knop daarna
  });

  // ─────────────────────────────────────────────────────────────────────────
  // VOEG ALLES TOE AAN HET NOTITIEBLOK
  // ─────────────────────────────────────────────────────────────────────────
  block.appendChild(verseRef);
  block.appendChild(verseLabel);
  block.appendChild(textarea);
  block.appendChild(saveButton);

  // Voeg het blok toe aan de notities-sectie
  notities.appendChild(block);

  // Zet focus op de textarea zodat gebruiker direct kan typen
  textarea.focus();


}


function saveNote(id, content) {
  // Sla de inhoud op in localStorage (blijft zelfs na verversen)
  localStorage.setItem(id, content);

  // Parse de verwijzing (bijv. "Genesis 1:1")
  const { book, chapter, verse } = parseVerseId(id);

  // Zeg tegen screen readers dat notitie is opgeslagen
  announce(`Note saved`);

  // Vind de checkbox van deze zin
  const input = document.getElementById(id);
  if (input) {
    // Zet focus terug op de checkbox
    input.focus();
    // Scroll naar deze plek zodat gebruiker ziet waar hij/zij was
    input.closest(".sentence")?.scrollIntoView({
      block: "center", // Zet in het midden van het scherm
      behavior: "smooth", // Glad scrollen, niet springen
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARIA-LIVE REGION (voor schermlezer-meldingen)
// Dit is een verborgen gebied waar we meldingen plaatsen
// Screen readers zeggen deze automatisch tegen de gebruiker op
// ═══════════════════════════════════════════════════════════════════════════

const liveRegion = document.createElement("div");
liveRegion.setAttribute("aria-live", "polite"); // "Zeg dit wanneer je kunt"
liveRegion.setAttribute("aria-atomic", "true"); // "Zeg de hele inhoud"
liveRegion.style.cssText =
  "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
  // CSS: maak het onzichtbaar maar laat schermlezer het zien
document.body.appendChild(liveRegion); // Voeg toe aan pagina

// Functie om iets tegen de gebruiker te zeggen
function announce(msg) {
  liveRegion.textContent = ""; // Wis oude bericht
  // Wacht op volgende frame zodat schermlezer verandering ziet
  requestAnimationFrame(() => (liveRegion.textContent = msg));
}

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS HULPFUNCTIES
// Zet focus op bepaalde plekken in de pagina
// ═══════════════════════════════════════════════════════════════════════════

// Focus op de leestekst
function focusLeestekst() {
  // Gebruik laatst gefocuste zin, of eerste zin als die leeg is
  const target =
    lastFocusedSentence ||
    document.querySelector(".sentence input, .book-chapter");

  if (target) {
    target.focus(); // Zet focus op dit element
    // Scroll naar deze plek
    target.closest(".sentence")?.scrollIntoView({
      block: "center", // Midden van scherm
      behavior: "smooth", // Glad scrollen
    });
    announce("Leestekst gefocust."); // Zeg dit tegen screen reader
  }
}

// Focus op de notities
function focusNotities() {
  // Zoek alle textareas in het notities-paneel
  const textareas = document.querySelectorAll(".notities textarea");
  
  // Zoek eerste LEGE textarea, anders de laatst gemaakte
  const empty = [...textareas].find((t) => t.value === "");
  (empty || textareas[textareas.length - 1]).focus();
  announce("Notities gefocust."); // Zeg dit tegen screen reader
}

// Check of focus momenteel in het notities-paneel is
function isInNotities() {
  // Zit activeElement (wat heeft focus) in het notities-paneel?
  return document.querySelector(".notities")?.contains(document.activeElement);
}