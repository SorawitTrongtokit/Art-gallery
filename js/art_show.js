// js/art_show.js
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const catId = parseInt(params.get("cat"), 10) || 1;
  const category = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];

  // แสดงข้อมูลฝั่งซ้าย
  document.title = `${category.enTitle} (${category.thTitle}) — Inner Child`;
  document.getElementById("catCode").textContent = category.code;
  document.getElementById("enTitle").textContent = category.enTitle;
  document.getElementById("elementCircle").textContent = category.elementText;
  document.getElementById("thTitle").textContent = category.thTitle;
  document.getElementById("poemBox").textContent = category.poem;
  document.getElementById("descBox").textContent = category.description;

  // แสดงการ์ดผลงานฝั่งขวา
  const galleryGrid = document.getElementById("galleryGrid");
  galleryGrid.innerHTML = "";

  category.artworks.forEach((art) => {
    const card = document.createElement("article");
    card.className = "art-card";
    card.innerHTML = `
      <div class="art-thumb">
        <img src="${art.image}" alt="${art.title}" loading="lazy" />
      </div>
      <div class="art-card-meta">
        <h3>${art.title}</h3>
        <p>${art.artist}</p>
      </div>
    `;
    card.addEventListener("click", () => openModal(art, category));
    galleryGrid.appendChild(card);
  });

  // ระบบ Modal Popup
  const modal = document.getElementById("artModal");
  const modalClose = document.getElementById("modalClose");

  function openModal(art, cat) {
    document.getElementById("modalImg").src = art.image;
    document.getElementById("modalImg").alt = art.title;
    document.getElementById("modalCatTag").textContent = `${cat.code} ${cat.enTitle} • ${cat.thTitle}`;
    document.getElementById("modalTitle").textContent = art.title;
    document.getElementById("modalArtist").textContent = `โดย ${art.artist}`;
    document.getElementById("modalTechnique").textContent = art.technique;
    document.getElementById("modalType").textContent = art.type;
    document.getElementById("modalConcept").textContent = art.concept;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
});