
const addCarButton = document.getElementById("addCar");
const carGrid = document.getElementById("carGrid");
const searchInput = document.getElementById("searchCar");

let cars = [];

try {
  const savedCars = JSON.parse(localStorage.getItem("motorfestCars") || "[]");
  cars = Array.isArray(savedCars) ? savedCars : [];
} catch (error) {
  console.error("Impossible de lire les voitures sauvegardées :", error);
}

function saveCars() {
  localStorage.setItem("motorfestCars", JSON.stringify(cars));
}


// ===== OUTILS =====

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function displayValue(value, suffix = "") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "---";
  }

  return `${value}${suffix}`;
}

function formatNumber(value, suffix = "") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "---";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("fr-FR") + suffix
    : displayValue(value, suffix);
}


// ===== STATISTIQUES DU GARAGE =====

function updateStats() {
  const ownedCars = cars.filter(car => car.status === "owned");
  const wantedCars = cars.filter(car => car.status === "wanted");

  document.getElementById("totalCars").textContent = cars.length;
  document.getElementById("ownedCars").textContent = ownedCars.length;
  document.getElementById("wantedCars").textContent = wantedCars.length;

  const garageValue = ownedCars.reduce(
    (total, car) => total + (Number(car.price) || 0), 0
  );

  document.getElementById("garageValue").textContent =
    garageValue.toLocaleString("fr-FR") + " CR";

  const brands = new Set(
    cars.map(car => String(car.brand || "").trim().toLowerCase()).filter(Boolean)
  );

  document.getElementById("brandCount").textContent = brands.size;

  const totalPower = ownedCars.reduce(
    (total, car) => total + (Number(car.power) || 0), 0
  );

  document.getElementById("totalPower").textContent =
    totalPower.toLocaleString("fr-FR") + " CH";

  const mostPowerful = ownedCars
    .filter(car => Number(car.power) > 0)
    .sort((a, b) => Number(b.power) - Number(a.power))[0];

  document.getElementById("topCar").textContent =
    mostPowerful
      ? `${mostPowerful.brand} ${mostPowerful.model}`
      : "---";

  document.getElementById("topCarPower").textContent =
    mostPowerful
      ? `${Number(mostPowerful.power).toLocaleString("fr-FR")} CH`
      : "En attente de véhicules";

  const total = cars.length || 1;
  const ownedPercentage = ownedCars.length / total * 100;
  const wantedPercentage = wantedCars.length / total * 100;

  document.getElementById("ownedBar").style.width =
    ownedPercentage + "%";

  document.getElementById("wantedBar").style.width =
    wantedPercentage + "%";

  document.getElementById("distributionText").textContent =
    `${ownedCars.length} possédée(s) · ${wantedCars.length} à acheter`;
}


// ===== AFFICHAGE DES VOITURES =====

function renderCars() {
  const search = searchInput.value.toLowerCase().trim();

  const filteredCars = cars.filter(car =>
    `${car.brand || ""} ${car.model || ""} ${car.category || ""}`
      .toLowerCase()
      .includes(search)
  );

  carGrid.innerHTML = "";

  if (filteredCars.length === 0) {
    carGrid.innerHTML = `
      <div class="empty">
        <span>🏎️</span>
        <h3>${cars.length === 0
          ? "Ton garage attend ses premières voitures"
          : "Aucune voiture trouvée"}</h3>
        <p>${cars.length === 0
          ? "Ajoute ton premier véhicule pour commencer ta collection."
          : "Essaie avec un autre nom ou une autre marque."}</p>
      </div>
    `;

    updateStats();
    applyScrollAnimations();
    return;
  }

  filteredCars.forEach(car => {
    const card = document.createElement("article");
    card.className = "car-card";
    card.dataset.id = car.id;

    card.innerHTML = `
      <div class="car-image">
        ${car.photo
          ? `<img src="${escapeHTML(car.photo)}" alt="${escapeHTML(car.brand)} ${escapeHTML(car.model)}">`
          : `<span>🏎️</span>`}
        <span class="car-status ${car.status === "owned" ? "owned" : "wanted"}">
          ${car.status === "owned" ? "POSSÉDÉE" : "À ACHETER"}
        </span>
      </div>

      <div class="car-info">
        <p class="car-category">${escapeHTML(car.category || "Autre")}</p>
        <h3>${escapeHTML(car.brand)} ${escapeHTML(car.model)}</h3>

        <div class="car-details">
          <span>${escapeHTML(car.power || "?")} CH</span>
          <span>${car.price ? Number(car.price).toLocaleString("fr-FR") + " CR" : "Prix inconnu"}</span>
        </div>

        <div class="car-actions">
          <button class="edit-car" data-id="${escapeHTML(car.id)}">MODIFIER</button>
          <button class="delete-car" data-id="${escapeHTML(car.id)}">SUPPRIMER</button>
        </div>
      </div>
    `;

    carGrid.appendChild(card);
  });

  updateStats();
  applyScrollAnimations();
}


// ===== FICHE DÉTAILLÉE DU VÉHICULE =====

const carDetailsOverlay = document.getElementById("carDetailsOverlay");
const closeCarDetailsButton = document.getElementById("closeCarDetails");
const carFlipCard = document.getElementById("carFlipCard");

let pointerStartX = 0;
let pointerStartY = 0;
let pointerMoved = false;
let suppressNextClick = false;

function setDetailText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function openCarDetails(car) {
  if (!carDetailsOverlay || !carFlipCard) {
    console.error("La fiche détaillée du véhicule est introuvable dans le HTML.");
    return;
  }

  // Face avant
  const image = document.getElementById("detailCarImage");

  if (image) {
    if (car.photo) {
      image.src = car.photo;
      image.alt = `${car.brand || ""} ${car.model || ""}`;
      image.style.display = "block";
    } else {
      image.removeAttribute("src");
      image.alt = "Photo non disponible";
      image.style.display = "none";
    }
  }

  setDetailText("detailCarBrand", car.brand || "Marque inconnue");
  setDetailText("detailCarName", car.model || "Modèle inconnu");
  setDetailText("detailCarYear", displayValue(car.year));
  setDetailText(
    "detailCarStatus",
    car.status === "owned" ? "VÉHICULE POSSÉDÉ" : "VÉHICULE À ACHETER"
  );

  // Face arrière
  setDetailText(
    "detailCarBackName",
    `${car.brand || ""} ${car.model || ""}`.trim()
  );

  setDetailText("detailTopSpeed", displayValue(car.topSpeed, " km/h"));
  setDetailText("detailAcceleration", displayValue(car.acceleration, " s"));
  setDetailText("detailPower", formatNumber(car.power, " CH"));
  setDetailText("detailTorque", formatNumber(car.torque, " Nm"));
  setDetailText("detailEngine", displayValue(car.engine));
  setDetailText("detailDisplacement", displayValue(car.displacement));
  setDetailText("detailTransmission", displayValue(car.transmission));
  setDetailText("detailGearbox", displayValue(car.gearbox));
  setDetailText("detailWeight", formatNumber(car.weight, " kg"));
  setDetailText("detailCategory", displayValue(car.category));
  setDetailText("detailPrice", formatNumber(car.price, " CR"));
  setDetailText("detailYear", displayValue(car.year));

  // Toujours ouvrir sur la face avant
  carFlipCard.classList.remove("is-flipped");

  carDetailsOverlay.hidden = false;
  document.body.classList.add("details-open");
}

function closeCarDetails() {
  if (!carDetailsOverlay) return;

  carDetailsOverlay.hidden = true;
  document.body.classList.remove("details-open");

  if (carFlipCard) {
    carFlipCard.classList.remove("is-flipped");
  }
}

function flipCarCard() {
  if (!carFlipCard) return;

  carFlipCard.classList.toggle("is-flipped");
}

// Clic sur la fiche pour changer de côté
if (carFlipCard) {
  carFlipCard.addEventListener("click", event => {
    if (event.target.closest("button, a, input")) return;

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    flipCarCard();
  });

  // Début du mouvement souris ou doigt
  carFlipCard.addEventListener("pointerdown", event => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerMoved = false;
  });

  // Fin du mouvement
  carFlipCard.addEventListener("pointerup", event => {
    const differenceX = event.clientX - pointerStartX;
    const differenceY = event.clientY - pointerStartY;

    if (
      Math.abs(differenceX) > 55 &&
      Math.abs(differenceX) > Math.abs(differenceY)
    ) {
      pointerMoved = true;
      suppressNextClick = true;
      flipCarCard();

      setTimeout(() => {
        suppressNextClick = false;
      }, 350);
    }
  });

  carFlipCard.addEventListener("pointercancel", () => {
    pointerMoved = false;
  });
}

// Fermer avec la croix
if (closeCarDetailsButton) {
  closeCarDetailsButton.addEventListener("click", closeCarDetails);
}

// Fermer en cliquant sur le fond sombre
if (carDetailsOverlay) {
  carDetailsOverlay.addEventListener("click", event => {
    if (event.target === carDetailsOverlay) {
      closeCarDetails();
    }
  });
}

// Fermer avec la touche Échap
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && carDetailsOverlay && !carDetailsOverlay.hidden) {
    closeCarDetails();
  }
});


// ===== FORMULAIRE AJOUT / MODIFICATION =====

function openCarForm(car = null) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="car-modal">
      <button class="close-modal" type="button">✕</button>
      <p class="eyebrow">MOTORFEST GARAGE</p>
      <h2>${car ? "Modifier le véhicule" : "Ajouter un véhicule"}</h2>

      <form id="carForm">

        <h3 class="form-section-title">IDENTITÉ DU VÉHICULE</h3>

        <label>Marque</label>
        <input name="brand" required placeholder="Ex : Lamborghini"
          value="${escapeHTML(car?.brand || "")}">

        <label>Modèle</label>
        <input name="model" required placeholder="Ex : Aventador SVJ"
          value="${escapeHTML(car?.model || "")}">

        <label>Année</label>
        <input name="year" type="number" min="1900" max="2100"
          placeholder="Ex : 2022"
          value="${escapeHTML(car?.year || "")}">

        <label>Catégorie</label>
        <select name="category">
          ${["Hypercar", "Supercar", "Sportive", "Rallye", "Drift",
            "Off-road", "Muscle car", "Classique", "Moto", "Autre"]
            .map(category => `
              <option value="${category}"
                ${car?.category === category ? "selected" : ""}>
                ${category}
              </option>
            `).join("")}
        </select>

        <h3 class="form-section-title">PERFORMANCES</h3>

        <label>Puissance (CH)</label>
        <input name="power" type="number" min="0" placeholder="Ex : 770"
          value="${escapeHTML(car?.power || "")}">

        <label>Vitesse maximale (km/h)</label>
        <input name="topSpeed" type="number" min="0" placeholder="Ex : 350"
          value="${escapeHTML(car?.topSpeed || "")}">

        <label>0 à 100 km/h (secondes)</label>
        <input name="acceleration" type="number" min="0" step="0.01"
          placeholder="Ex : 2.8"
          value="${escapeHTML(car?.acceleration || "")}">

        <label>Couple (Nm)</label>
        <input name="torque" type="number" min="0" placeholder="Ex : 720"
          value="${escapeHTML(car?.torque || "")}">

        <h3 class="form-section-title">MÉCANIQUE</h3>

        <label>Moteur</label>
        <input name="engine" placeholder="Ex : V12 atmosphérique"
          value="${escapeHTML(car?.engine || "")}">

        <label>Cylindrée</label>
        <input name="displacement" placeholder="Ex : 6.5 L"
          value="${escapeHTML(car?.displacement || "")}">

        <label>Transmission</label>
        <input name="transmission" placeholder="Ex : 4 roues motrices"
          value="${escapeHTML(car?.transmission || "")}">

        <label>Boîte de vitesses</label>
        <input name="gearbox" placeholder="Ex : Automatique 7 rapports"
          value="${escapeHTML(car?.gearbox || "")}">

        <label>Poids (kg)</label>
        <input name="weight" type="number" min="0" placeholder="Ex : 1525"
          value="${escapeHTML(car?.weight || "")}">

        <h3 class="form-section-title">COLLECTION</h3>

        <label>Prix (Crew Credits)</label>
        <input name="price" type="number" min="0" placeholder="Ex : 850000"
          value="${escapeHTML(car?.price || "")}">

        <label>Statut</label>
        <select name="status">
          <option value="owned" ${car?.status === "owned" ? "selected" : ""}>
            Je possède cette voiture
          </option>
          <option value="wanted" ${car?.status === "wanted" ? "selected" : ""}>
            Je souhaite l'acheter
          </option>
        </select>

        <label>Photo du véhicule</label>
        <input name="photo" type="file" accept="image/*">

        <button type="submit" class="save-car">
          ${car ? "ENREGISTRER LES MODIFICATIONS" : "AJOUTER AU GARAGE"}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".close-modal").addEventListener("click", () => {
    modal.remove();
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) modal.remove();
  });

  modal.querySelector("#carForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const photoFile = data.get("photo");

    let photo = car?.photo || "";

    if (photoFile && photoFile.size > 0) {
      try {
        photo = await compressImage(photoFile);
      } catch (error) {
        alert("Impossible de traiter cette image. Essaie avec une autre photo.");
        console.error(error);
        return;
      }
    }

    const updatedCar = {
      id: car?.id || Date.now().toString(),

      brand: data.get("brand").trim(),
      model: data.get("model").trim(),
      year: data.get("year"),

      category: data.get("category"),

      power: data.get("power"),
      topSpeed: data.get("topSpeed"),
      acceleration: data.get("acceleration"),
      torque: data.get("torque"),

      engine: data.get("engine"),
      displacement: data.get("displacement"),
      transmission: data.get("transmission"),
      gearbox: data.get("gearbox"),
      weight: data.get("weight"),

      price: data.get("price"),
      status: data.get("status"),

      photo
    };

    if (car) {
      cars = cars.map(item => item.id === car.id ? updatedCar : item);
    } else {
      cars.push(updatedCar);
    }

    saveCars();
    renderCars();
    modal.remove();
  });
}


// ===== COMPRESSION DES PHOTOS =====

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1000;
        const scale = Math.min(1, maxWidth / image.width);

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// ===== ACTIONS DES BOUTONS =====

addCarButton.addEventListener("click", () => openCarForm());

searchInput.addEventListener("input", renderCars);

carGrid.addEventListener("click", event => {
  const editButton = event.target.closest(".edit-car");
  const deleteButton = event.target.closest(".delete-car");

  if (editButton) {
    const car = cars.find(item => item.id === editButton.dataset.id);
    if (car) openCarForm(car);
    return;
  }

  if (deleteButton) {
    const confirmed = confirm("Supprimer cette voiture de ton garage ?");

    if (confirmed) {
      cars = cars.filter(item => item.id !== deleteButton.dataset.id);
      saveCars();
      renderCars();
    }

    return;
  }

  const card = event.target.closest(".car-card");

  if (card) {
    const car = cars.find(item => item.id === card.dataset.id);

    if (car) {
      openCarDetails(car);
    }
  }
});


// ===== ACCUEIL ET OPTIONS =====

const welcomeScreen = document.getElementById("welcomeScreen");
const garageApp = document.getElementById("garageApp");
const enterGarageButton = document.getElementById("enterGarage");
const openOptionsButton = document.getElementById("openOptions");
const closeOptionsButton = document.getElementById("closeOptions");
const optionsPanel = document.getElementById("optionsPanel");
const animationsOption = document.getElementById("animationsOption");
const returnHomeButton = document.getElementById("returnHome");
const garageOptionsButton = document.getElementById("garageOptions");

// Entrer dans le garage
if (enterGarageButton && welcomeScreen && garageApp) {
  enterGarageButton.addEventListener("click", () => {
    welcomeScreen.hidden = true;
    garageApp.hidden = false;
    applyScrollAnimations();
  });
}

// Retourner à l'accueil
if (returnHomeButton && welcomeScreen && garageApp) {
  returnHomeButton.addEventListener("click", () => {
    if (optionsPanel) optionsPanel.hidden = true;
    garageApp.hidden = true;
    welcomeScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Ouvrir les options
function openOptions() {
  if (optionsPanel) optionsPanel.hidden = false;
}

if (openOptionsButton) {
  openOptionsButton.addEventListener("click", openOptions);
}

if (garageOptionsButton) {
  garageOptionsButton.addEventListener("click", openOptions);
}

// Fermer les options
if (closeOptionsButton && optionsPanel) {
  closeOptionsButton.addEventListener("click", () => {
    optionsPanel.hidden = true;
  });
}


// ===== PRÉFÉRENCE DES ANIMATIONS =====

const savedAnimations = localStorage.getItem("motorfestAnimations");

if (animationsOption) {
  if (savedAnimations !== null) {
    animationsOption.checked = savedAnimations === "true";
  }

  document.body.classList.toggle(
    "reduced-motion",
    !animationsOption.checked
  );

  animationsOption.addEventListener("change", () => {
    localStorage.setItem(
      "motorfestAnimations",
      String(animationsOption.checked)
    );

    document.body.classList.toggle(
      "reduced-motion",
      !animationsOption.checked
    );

    applyScrollAnimations();
  });
} else {
  document.body.classList.remove("reduced-motion");
}


// ===== ANIMATIONS CINÉMATIQUES AU DÉFILEMENT =====

let revealObserver = null;

function applyScrollAnimations() {
  const animationsEnabled =
    !document.body.classList.contains("reduced-motion");

  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  const revealElements = document.querySelectorAll(
    ".hero, .stats, .dashboard, .collection, .stat, .dashboard-card, .car-card"
  );

  if (!animationsEnabled || !("IntersectionObserver" in window)) {
    revealElements.forEach(element => {
      element.classList.remove(
        "reveal",
        "is-visible",
        "reveal-delay-1",
        "reveal-delay-2",
        "reveal-delay-3"
      );
    });

    return;
  }

  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -45px 0px"
  });

  revealElements.forEach((element, index) => {
    element.classList.add("reveal");

    if (
      element.classList.contains("stat") ||
      element.classList.contains("dashboard-card") ||
      element.classList.contains("car-card")
    ) {
      element.classList.remove(
        "reveal-delay-1",
        "reveal-delay-2",
        "reveal-delay-3"
      );

      const delayClass = `reveal-delay-${(index % 3) + 1}`;
      element.classList.add(delayClass);
    }

    revealObserver.observe(element);
  });
}


// ===== DÉMARRAGE =====

applyScrollAnimations();
renderCars();
