// js/main_menu.js
document.addEventListener("DOMContentLoaded", () => {
  const viewport = document.getElementById("roomViewport");
  const prevBtn = document.getElementById("roomPrev");
  const nextBtn = document.getElementById("roomNext");
  const dots = document.querySelectorAll(".pager-dot");

  if (!viewport) return;

  let currentPage = 0;

  function goToPage(index) {
    currentPage = Math.max(0, Math.min(2, index));
    viewport.scrollTo({
      left: currentPage * viewport.clientWidth,
      behavior: "smooth"
    });
    updateDots();
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentPage);
    });
  }

  // อัปเดตจุดเมื่อผู้ใช้ปัดหน้าจอเอง
  viewport.addEventListener("scroll", () => {
    const pageWidth = viewport.clientWidth;
    if (pageWidth === 0) return;
    const newPage = Math.round(viewport.scrollLeft / pageWidth);
    if (newPage !== currentPage) {
      currentPage = newPage;
      updateDots();
    }
  });

  prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
  nextBtn.addEventListener("click", () => goToPage(currentPage + 1));

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goToPage(parseInt(dot.dataset.index, 10));
    });
  });

  // เมื่อเปิดบน iPad/Mobile ให้เริ่มที่หน้ากลาง (หน้า 2) หรือหน้าซ้าย (หน้า 1) ได้ตามต้องการ
  // ถ้าอยากให้เริ่มหน้ากลาง ให้เปิดบรรทัดด้านล่างนี้:
  // if (window.innerWidth <= 1024) goToPage(1);
});