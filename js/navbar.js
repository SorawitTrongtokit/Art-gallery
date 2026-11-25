// js/navbar.js
document.addEventListener("DOMContentLoaded", () => {
  const headerContainer = document.getElementById("site-header");
  if (!headerContainer) return;

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const urlParams = new URLSearchParams(window.location.search);
  const currentCat = parseInt(urlParams.get("cat"), 10);

  // สร้างรายการ 7 หมวดหมู่จาก data.js
  const categoryLinksHtml = CATEGORIES.map((cat) => {
    const isActive = currentPath === "art_show.html" && currentCat === cat.id ? "active" : "";
    return `
      <li>
        <a href="art_show.html?cat=${cat.id}" class="nav-link ${isActive}" title="${cat.code} ${cat.enTitle} - ${cat.thTitle}">
          ${cat.code} ${cat.thTitle}
        </a>
      </li>
    `;
  }).join("");

  headerContainer.innerHTML = `
    <div class="site-header-wrapper">
      <div class="header-top">
        <a href="index.html" class="brand-group">
          <div class="logo-circle">
            <!-- ใส่รูปโลโก้ตรงนี้ เช่น <img src="images/logo.png" alt="Inner Child Logo"> -->
            <span>LOGO</span>
          </div>
          <div class="brand-text">
            <h1>inner child</h1>
            <p>งานนิทรรศการศิลปะ ชั้นมัธยมศึกษาปีที่ 6 ปีการศึกษา 2569</p>
          </div>
        </a>
        <button class="hamburger-btn" id="hamburgerBtn" aria-label="เปิดเมนู">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <nav class="navbar" id="mainNavbar">
        <ul class="nav-list">
          <li>
            <a href="index.html" class="nav-link ${currentPath === "index.html" || currentPath === "" ? "active" : ""}">About Us</a>
          </li>
          <li>
            <a href="main_menu.html" class="nav-link ${currentPath === "main_menu.html" ? "active" : ""}">Main Menu</a>
          </li>
          ${categoryLinksHtml}
          <li>
            <a href="#personality" class="nav-link" onclick="alert('หน้า Personality Test กำลังอยู่ระหว่างการพัฒนา!'); return false;">Personality Test</a>
          </li>
        </ul>
      </nav>
    </div>
  `;

  // ควบคุม Dropdown บน iPad และ Mobile
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mainNavbar = document.getElementById("mainNavbar");

  hamburgerBtn.addEventListener("click", () => {
    hamburgerBtn.classList.toggle("open");
    mainNavbar.classList.toggle("open");
  });

  // ปิดเมนูเมื่อคลิกข้างนอก
  document.addEventListener("click", (e) => {
    if (!headerContainer.contains(e.target)) {
      hamburgerBtn.classList.remove("open");
      mainNavbar.classList.remove("open");
    }
  });
});