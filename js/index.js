// js/index.js
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("carouselTrack");
  const dotsContainer = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stage = document.getElementById("carouselStage");

  let activeIndex = 0;
  const total = CAROUSEL_ITEMS.length;
  let autoSlideTimer = null;

  // สร้างการ์ด 10 ชิ้น และจุดบอกตำแหน่ง
  CAROUSEL_ITEMS.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "carousel-card";
    card.innerHTML = `
      <img src="${item.img}" alt="${item.title}" loading="lazy" />
      <div class="carousel-card-body">
        <span class="carousel-tag">${item.tag}</span>
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      if (i !== activeIndex) {
        activeIndex = i;
        updateCarousel();
        resetAutoSlide();
      }
    });
    track.appendChild(card);

    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", `สไลด์ที่ ${i + 1}`);
    dot.addEventListener("click", () => {
      activeIndex = i;
      updateCarousel();
      resetAutoSlide();
    });
    dotsContainer.appendChild(dot);
  });

  const cards = Array.from(track.children);
  const dots = Array.from(dotsContainer.children);

  function updateCarousel() {
    const screenW = window.innerWidth;
    // ระยะห่างของการ์ดซ้าย-ขวาตามขนาดหน้าจอ
    const step1 = screenW <= 600 ? 195 : screenW <= 1024 ? 310 : 390;
    const step2 = screenW <= 600 ? 330 : screenW <= 1024 ? 540 : 690;

    cards.forEach((card, i) => {
      // คำนวณระยะห่างแบบวนลูป (Circular)
      let offset = i - activeIndex;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      let translateX = 0;
      let scale = 0.55;
      let opacity = 0;
      let zIndex = 1;

      if (offset === 0) {
        translateX = 0;
        scale = 1;
        opacity = 1;
        zIndex = 20;
      } else if (Math.abs(offset) === 1) {
        translateX = Math.sign(offset) * step1;
        scale = 0.78;
        opacity = 0.85;
        zIndex = 15;
      } else if (Math.abs(offset) === 2) {
        translateX = Math.sign(offset) * step2;
        scale = 0.6;
        opacity = screenW <= 600 ? 0 : 0.5;
        zIndex = 10;
      } else {
        translateX = Math.sign(offset) * (step2 + 150);
        scale = 0.5;
        opacity = 0;
        zIndex = 1;
      }

      card.style.transform = `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
      card.style.pointerEvents = opacity > 0 ? "auto" : "none";
    });

    dots.forEach((dot, i) => dot.classList.toggle("active", i === activeIndex));
  }

  function nextSlide() {
    activeIndex = (activeIndex + 1) % total;
    updateCarousel();
  }

  function prevSlide() {
    activeIndex = (activeIndex - 1 + total) % total;
    updateCarousel();
  }

  function startAutoSlide() {
    autoSlideTimer = setInterval(nextSlide, 4000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideTimer);
    startAutoSlide();
  }

  prevBtn.addEventListener("click", () => { prevSlide(); resetAutoSlide(); });
  nextBtn.addEventListener("click", () => { nextSlide(); resetAutoSlide(); });

  // รองรับการปัดซ้าย-ขวา (Touch & Mouse Drag)
  let startX = 0;
  let isDragging = false;

  stage.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    clearInterval(autoSlideTimer);
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? nextSlide() : prevSlide();
    }
    startAutoSlide();
  });

  stage.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    clearInterval(autoSlideTimer);
  });

  window.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide();
    }
    startAutoSlide();
  });

  window.addEventListener("resize", updateCarousel);

  updateCarousel();
  startAutoSlide();
});