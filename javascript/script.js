// ─── Track last focused sentence ─────────────────────────────────────────────

let lastFocusedSentence = null;

// ─── Simple translation helper (replace with API like DeepL if needed) ────────
async function translateToEnglish(text) {
  // TODO: integrate real translation API
  return text;
}

// ─── Checkboxes + notes ─────────────────────────────────────────────────────

document.querySelectorAll(".sentence").forEach((sentence) => {
  const input = sentence.querySelector('input[type="checkbox"]');
  const label = sentence.querySelector("label");

  const cleanText = label?.textContent?.trim() || "";

  // Remember last focused sentence
  sentence.addEventListener("focusin", () => {
    lastFocusedSentence = input;
  });

  // Space toggles checkbox
  sentence.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      document.activeElement === sentence.querySelector("label, input")
    ) {
      e.preventDefault();
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change"));
    }
  });

  input.addEventListener("change", () => {
    if (input.checked) {
      addNote(input.id, label.textContent.trim());
    } else {
      removeNote(input.id);
    }
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseVerseId(id) {
  const match = id.match(/^(.+)-(\d+):(\d+)$/);
  if (!match) return { book: "", chapter: "", verse: "" };
  return { book: match[1], chapter: match[2], verse: match[3] };
}

// ─── Notes logic ────────────────────────────────────────────────────────────

function addNote(id, verseText) {
  const notities = document.querySelector(".notities");
  if (document.getElementById("note-" + id)) return;

  const { book, chapter, verse } = parseVerseId(id);

  const block = document.createElement("div");
  block.className = "note-block";
  block.id = "note-" + id;

  const verseRef = document.createElement("p");
  verseRef.className = "note-verse-ref";

  // NOTE: reference exists visually, but SHOULD NOT be spoken by screen reader
  verseRef.textContent = `${book} ${chapter}:${verse}`;
  verseRef.setAttribute("aria-hidden", "true");

  const verseLabel = document.createElement("p");
  verseLabel.className = "note-verse-label";

  const cleanText = verseText.replace(/^\d+/, "").trim();
  verseLabel.textContent = cleanText;

  translateToEnglish(cleanText).then((translated) => {
    // In notes we DO include reference in screen reader
    verseLabel.setAttribute(
      "aria-label",
      `${book} ${chapter}:${verse} ${translated}`
    );
  });

  const textarea = document.createElement("textarea");
  textarea.placeholder = "";
  textarea.setAttribute(
    "aria-label",
    `You can now write your note for ${book} ${chapter}:${verse}`
  );

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.className = "note-save-btn";

  saveButton.addEventListener("click", () => {
    saveNote(id, textarea.value);
    saveButton.classList.add("hidden");
  });

  block.appendChild(verseRef);
  block.appendChild(verseLabel);
  block.appendChild(textarea);
  block.appendChild(saveButton);

  notities.appendChild(block);

  textarea.focus();

  announce(` ${cleanText}`);
}

function removeNote(id) {
  const block = document.getElementById("note-" + id);
  if (block) {
    block.remove();
    announce("Note removed.");
  }
}

function saveNote(id, content) {
  localStorage.setItem(id, content);

  const { book, chapter, verse } = parseVerseId(id);

  // Only here we announce reference (NOT in reading mode)
  announce(`Note saved for ${book} ${chapter}:${verse}`);

  const input = document.getElementById(id);
  if (input) {
    input.focus();
    input.closest(".sentence")?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
}

// ─── Aria-live region ───────────────────────────────────────────────────────

const liveRegion = document.createElement("div");
liveRegion.setAttribute("aria-live", "polite");
liveRegion.setAttribute("aria-atomic", "true");
liveRegion.style.cssText =
  "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
document.body.appendChild(liveRegion);

function announce(msg) {
  liveRegion.textContent = "";
  requestAnimationFrame(() => (liveRegion.textContent = msg));
}

// ─── Focus helpers ──────────────────────────────────────────────────────────

function focusLeestekst() {
  const target =
    lastFocusedSentence ||
    document.querySelector(".sentence input, .book-chapter");

  if (target) {
    target.focus();
    target.closest(".sentence")?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    announce("Reading text focused.");
  }
}

function focusNotities() {
  const textareas = document.querySelectorAll(".notities textarea");
  if (textareas.length === 0) {
    announce("No notes present.");
    return;
  }
  const empty = [...textareas].find((t) => t.value === "");
  (empty || textareas[textareas.length - 1]).focus();
  announce("Notes focused.");
}

function isInNotities() {
  return document.querySelector(".notities")?.contains(document.activeElement);
}

// ─── Panel + keyboard ───────────────────────────────────────────────────────
