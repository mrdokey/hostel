// ========================================================
// GLOBAL ERROR CATCHER (Sistem Deteksi Error Faktual di Browser)
// ========================================================
window.addEventListener('error', function(e) {
  alert('JS ERROR DETECTED:\n\nError: ' + e.message + '\nFile: ' + e.filename + '\nLine: ' + e.lineno);
});

const API_URL = 'https://wa.mrdsolution.my.id/cms-api/api';
let slideIndex = 0;
const roomSlideIndexes = {};

// State penyimpan index slider kamar dan galeri album
let albumSlideIndex = 0;
let totalAlbumPhotos = 0;

document.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  // Menutup dropdown navigasi saat klik di luar area
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-trigger') && !e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
    }
  });
});

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const icon = document.getElementById('menu-icon');
  menu.classList.toggle('hidden');
  icon.className = menu.classList.contains('hidden') ? "fa-solid fa-bars text-2xl" : "fa-solid fa-xmark text-2xl";
}

function handleRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const pageSlug = urlParams.get('page');

  if (pageSlug) {
    document.getElementById('homepage-area').classList.add('hidden');
    document.getElementById('custom-page-area').classList.remove('hidden');
    loadPageContent(pageSlug);
  } else {
    document.getElementById('homepage-area').classList.remove('hidden');
    document.getElementById('custom-page-area').classList.add('hidden');
    loadCachedData();
    fetchFreshData();
  }
}

function navigateHome() {
  window.history.pushState({}, '', window.location.pathname);
  handleRouting();
}

function loadCachedData() {
  const cachedSettings = localStorage.getItem('cms_settings');
  const cachedRooms = localStorage.getItem('cms_rooms');
  const cachedPosts = localStorage.getItem('cms_posts');

  if (cachedSettings) renderSettings(JSON.parse(cachedSettings));
  if (cachedRooms) renderRooms(JSON.parse(cachedRooms));
  if (cachedPosts) renderPosts(JSON.parse(cachedPosts));
}

// AMBIL DATA SEGAR DARI VPS SECARA PUBLIK (TANPA TOKEN)
async function fetchFreshData() {
  try {
    const [resSettings, resRooms, resPosts] = await Promise.all([
      fetch(`${API_URL}/settings`).then(r => r.json()),
      fetch(`${API_URL}/rooms`).then(r => r.json()),
      fetch(`${API_URL}/posts`).then(r => r.json())
    ]);

    if (resSettings.status === 'success') {
      const settingsObj = {};
      resSettings.data.forEach(item => {
        settingsObj[item.setting_key] = item.setting_value;
      });
      localStorage.setItem('cms_settings', JSON.stringify(settingsObj));
      renderSettings(settingsObj);
    }
    if (resRooms.status === 'success') {
      localStorage.setItem('cms_rooms', JSON.stringify(resRooms.data));
      renderRooms(resRooms.data);
    }
    if (resPosts.status === 'success') {
      localStorage.setItem('cms_posts', JSON.stringify(resPosts.data));
      renderPosts(resPosts.data);
    }
  } catch (err) {
    console.error('API Fetch failed, using cache:', err);
    alert('API FETCH ERROR:\n\nJika pesan ini muncul, koneksi internet tablet Anda ke VPS diblokir atau timed out.\n\nDetail: ' + err.message);
  }
}

// AMBIL HALAMAN KUSTOM SECARA PUBLIK (TANPA TOKEN)
async function loadPageContent(slug) {
  try {
    const resSettings = await fetch(`${API_URL}/settings`).then(r => r.json());
    if (resSettings.status === 'success') {
      const settingsObj = {};
      resSettings.data.forEach(item => { settingsObj[item.setting_key] = item.setting_value; });
      renderSettings(settingsObj);
    }

    const resPages = await fetch(`${API_URL}/pages`).then(r => r.json());
    if (resPages.status === 'success') {
      const page = resPages.data.find(p => p.slug === slug);
      if (page) {
        document.getElementById('page-title').innerText = page.title;
        document.getElementById('page-content').innerHTML = page.content;
      } else {
        document.getElementById('page-title').innerText = 'Page Not Found';
        document.getElementById('page-content').innerHTML = '<p>Sorry, the page you are looking for does not exist.</p>';
      }
    }
  } catch (err) {
    console.error('Failed to load custom page:', err);
    alert('PAGE LOAD ERROR:\n\nDetail: ' + err.message);
  }
}

// ==========================================
// RENDERING PENGATURAN UTAMA WEBSITE
// ==========================================
function renderSettings(settings) {
  if (!settings) return;

  // 1. Teks Identitas dan Hero
  if (document.getElementById('nav-brand')) document.getElementById('nav-brand').innerText = settings.site_name || 'Hostel';
  if (document.getElementById('footer-site-name')) document.getElementById('footer-site-name').innerText = settings.site_name || 'Hostel';
  if (document.getElementById('footer-address')) document.getElementById('footer-address').innerText = settings.address || '';
  
  if (document.getElementById('hero-title')) document.getElementById('hero-title').innerText = settings.hero_title || 'Welcome';
  if (document.getElementById('hero-subtitle')) document.getElementById('hero-subtitle').innerText = settings.hero_subtitle || '';

  // 2. Favicon & Tautan WhatsApp
  if (settings.favicon_url && document.getElementById('favicon-link')) {
    document.getElementById('favicon-link').href = settings.favicon_url + "?v=" + new Date().getTime();
  }

  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : '#';
  if (document.getElementById('btn-hero-wa')) document.getElementById('btn-hero-wa').href = waLink;
  if (document.getElementById('floating-wa')) document.getElementById('floating-wa').href = waLink;

  if (document.getElementById('maps-iframe')) document.getElementById('maps-iframe').src = settings.maps_iframe || '';

  // 3. Menu Navigasi Bertingkat (Dengan Pelindung Crash)
  if (settings.navigation_menu) {
    try { renderNavigation(JSON.parse(settings.navigation_menu)); } catch (e) {}
  }

  // 4. Galeri Album Foto (Tampil Sesuai Toggle)
  if (settings.album_toggle === 'ON' && settings.album_photos && document.getElementById('album-section')) {
    document.getElementById('album-section').classList.remove('hidden');
    try {
      renderAlbum(JSON.parse(settings.album_photos));
    } catch (e) {
      console.error("Gagal mendecode data JSON album", e);
    }
  } else if (document.getElementById('album-section')) {
    document.getElementById('album-section').classList.add('hidden');
  }

  // 5. Widget Instagram (Tampil Sesuai Toggle)
  if (settings.instagram_toggle === 'ON' && settings.instagram_embed_code && document.getElementById('instagram-section')) {
    document.getElementById('instagram-section').classList.remove('hidden');
    document.getElementById('instagram-container').innerHTML = settings.instagram_embed_code;
    if (window.instgrm) window.instgrm.Embeds.process();
  } else if (document.getElementById('instagram-section')) {
    document.getElementById('instagram-section').classList.add('hidden');
  }

  // 6. Testimoni Tamu
  if (settings.testimonials) {
    try { renderTestimonials(JSON.parse(settings.testimonials)); } catch (e) {}
  }

  // 7. Slider Hero (Dijalankan Paling Akhir Agar Tidak Memblokir Fungsi Lain Jika Gagal)
  if (document.getElementById('slider-container') && settings.slider_images) {
    const images = settings.slider_images.split(',');
    const sliderContainer = document.getElementById('slider-container');
    sliderContainer.innerHTML = images.map((img, idx) => `
      <div class="slide absolute inset-0 w-full h-full bg-cover bg-center ${idx === 0 ? 'active' : ''}" style="background-image: url('${img.trim()}')"></div>
    `).join('');
    
    startSlider();
  }
}

// LOGIKA RENDER MENU NAVIGASI BERTINGKAT (ANTI-CRASH)
function renderNavigation(menuList) {
  const desktop = document.getElementById('desktop-menu');
  const mobile = document.getElementById('mobile-menu');

  if (!desktop || !mobile || !Array.isArray(menuList)) return;

  desktop.innerHTML = menuList.map((item, idx) => {
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      return `
        <div class="relative dropdown-container">
          <button onclick="toggleDropdown(${idx})" class="dropdown-trigger hover:text-blue-600 transition flex items-center space-x-1 outline-none">
            <span>${item.label || ''}</span> <i class="fa-solid fa-chevron-down text-xs"></i>
          </button>
          <div id="dropdown-${idx}" class="dropdown-menu hidden absolute left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-md py-2 text-sm z-50">
            ${item.children.map(sub => `
              <a href="${sub.url || '#'}" class="block px-4 py-2 hover:bg-slate-50 hover:text-blue-600 transition" ${(sub.url || '').startsWith('?page=') ? 'onclick="setTimeout(handleRouting, 50)"' : ''}>${sub.label || ''}</a>
            `).join('')}
          </div>
        </div>
      `;
    }
    return `<a href="${item.url || '#'}" class="hover:text-blue-600 transition" ${(item.url || '').startsWith('?page=') ? 'onclick="setTimeout(handleRouting, 50)"' : ''}>${item.label || ''}</a>`;
  }).join('');

  mobile.innerHTML = menuList.map((item, idx) => {
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      return `
        <div class="flex flex-col space-y-2">
          <span class="text-slate-400 font-bold text-xs uppercase px-2">${item.label || ''}</span>
          <div class="flex flex-col space-y-2 pl-4">
            ${item.children.map(sub => `
              <a href="${sub.url || '#'}" onclick="toggleMobileMenu(); ${(sub.url || '').startsWith('?page=') ? 'setTimeout(handleRouting, 50)' : ''}" class="hover:text-blue-600 text-sm">${sub.label || ''}</a>
            `).join('')}
          </div>
        </div>
      `;
    }
    return `<a href="${item.url || '#'}" onclick="toggleMobileMenu(); ${(item.url || '').startsWith('?page=') ? 'setTimeout(handleRouting, 50)' : ''}" class="hover:text-blue-600">${item.label || ''}</a>`;
  }).join('');
}

function toggleDropdown(idx) {
  document.querySelectorAll('.dropdown-menu').forEach((el, i) => {
    if (i !== idx) el.classList.add('hidden');
  });
  document.getElementById(`dropdown-${idx}`).classList.toggle('hidden');
}

// LOGIKA RENDER AUTO-SLIDER BANNER (ANTI-CRASH 1 GAMBAR)
function startSlider() {
  const slides = document.querySelectorAll('#slider-container .slide');
  if (!slides || slides.length <= 1) {
    if (slides && slides.length === 1) {
      slides[0].classList.add('active'); 
    }
    return;
  }
  setInterval(() => {
    if (slides[slideIndex]) slides[slideIndex].classList.remove('active');
    slideIndex = (slideIndex + 1) % slides.length;
    if (slides[slideIndex]) slides[slideIndex].classList.add('active');
  }, 5000);
}

// LOGIKA RENDER GALERI ALBUM FOTO PEMANDANGAN
function renderAlbum(photos) {
  const container = document.getElementById('album-slider');
  if (!container || !photos || photos.length === 0) return;
  
  totalAlbumPhotos = photos.length;
  albumSlideIndex = 0; 
  container.style.transform = `translateX(0%)`;

  container.innerHTML = photos.map(photo => {
    const imgUrl = String(photo.image_url || '').trim();
    const captionStr = String(photo.caption || '').trim();
    return `
      <div class="shrink-0 w-full h-full relative">
        <img src="${imgUrl}" class="w-full h-full object-cover" alt="Gallery Photo">
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-8 pt-20 text-white text-center">
          <p class="text-base md:text-lg font-bold tracking-wide drop-shadow-md leading-relaxed">${captionStr}</p>
        </div>
      </div>
    `;
  }).join('');
}

function slideAlbum(direction) {
  const slider = document.getElementById('album-slider');
  if (!slider || totalAlbumPhotos <= 1) return;

  albumSlideIndex += direction;
  if (albumSlideIndex < 0) albumSlideIndex = totalAlbumPhotos - 1;
  if (albumSlideIndex >= totalAlbumPhotos) albumSlideIndex = 0;

  slider.style.transform = `translateX(-${albumSlideIndex * 100}%)`;
}

// LOGIKA RENDER KATALOG KAMAR
function renderRooms(rooms) {
  const container = document.getElementById('rooms-container');
  if (!container || !rooms || rooms.length === 0) return;
  
  container.innerHTML = rooms.map(room => {
    try {
      const imageUrlStr = String(room.image_url || '');
      const roomIdStr = String(room.id || 'RM-TEMP');
      const amenitiesStr = String(room.amenities || '');
      const descriptionStr = String(room.description || '');

      const images = imageUrlStr.split(',').map(img => img.trim()).filter(img => img !== '');
      const roomIdSafe = roomIdStr.replace(/[^a-zA-Z0-9]/g, ''); 
      roomSlideIndexes[roomIdSafe] = 0; 

      let capacity = "4", beds = "2 Queen beds", bathrooms = "2", size = "150", list = amenitiesStr;
      
      if (amenitiesStr.trim().startsWith('{')) {
        try {
          const meta = JSON.parse(amenitiesStr);
          capacity = meta.capacity || capacity;
          beds = meta.beds || beds;
          bathrooms = meta.bathrooms || bathrooms;
          size = meta.size || size;
          list = meta.list || list;
        } catch (e) {}
      }

      return `
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100/80 transition hover:shadow-md duration-300 flex flex-col h-full">
          
          <div class="relative h-56 bg-slate-900 group overflow-hidden">
            <div id="room-slider-${roomIdSafe}" class="absolute inset-0 w-full h-full flex transition-transform duration-500 ease-out">
              ${images.map(img => `
                <img src="${img}" class="w-full h-full object-cover shrink-0 select-none" alt="${room.room_type}">
              `).join('')}
            </div>

            ${images.length > 1 ? `
              <button onclick="slideRoomImg('${roomIdSafe}', -1, ${images.length})" class="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100 z-10">
                <i class="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button onclick="slideRoomImg('${roomIdSafe}', 1, ${images.length})" class="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100 z-10">
                <i class="fa-solid fa-chevron-right text-xs"></i>
              </button>
            ` : ''}
          </div>

          <div class="p-6 flex flex-col flex-grow">
            <h3 class="text-xl font-bold mb-1 text-slate-800 leading-tight">${room.room_type}</h3>
            
            <p class="text-blue-600 font-extrabold text-xl mb-4">
              Rp ${parseInt(room.price_start_from || 0).toLocaleString('id-ID')} 
              <span class="text-xs text-slate-400 font-normal">/ night</span>
            </p>

            <div class="grid grid-cols-2 gap-3 mb-5 py-3 border-y border-slate-100 text-xs font-semibold text-slate-500">
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-user-group text-slate-400 text-sm"></i>
                <span>${capacity} Guests</span>
              </div>
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-bed text-slate-400 text-sm"></i>
                <span>${beds}</span>
              </div>
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-shower text-slate-400 text-sm"></i>
                <span>${bathrooms} Bathrooms</span>
              </div>
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-maximize text-slate-400 text-sm"></i>
                <span>${size} m²</span>
              </div>
            </div>

            <div class="text-[11px] font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-5">
              <strong class="text-slate-700 block mb-1">Amenities:</strong> 
              ${list}
            </div>

            <p class="text-slate-600 text-sm leading-relaxed flex-grow">${descriptionStr}</p>
          </div>
        </div>
      `;
    } catch (roomErr) {
      return ''; 
    }
  }).join('');
}

function slideRoomImg(roomIdSafe, direction, totalImgs) {
  const slider = document.getElementById(`room-slider-${roomIdSafe}`);
  let curIndex = roomSlideIndexes[roomIdSafe];

  curIndex += direction;
  if (curIndex < 0) curIndex = totalImgs - 1;
  if (curIndex >= totalImgs) curIndex = 0;

  roomSlideIndexes[roomIdSafe] = curIndex;
  slider.style.transform = `translateX(-${curIndex * 100}%)`;
}

// LOGIKA RENDER PROMO & ARTIKEL
function renderPosts(posts) {
  const container = document.getElementById('posts-container');
  if (!container || !posts || posts.length === 0) return;
  const publishedPosts = posts.filter(p => p.status === 'Published');
  container.innerHTML = publishedPosts.map(post => `
    <div class="bg-white rounded-2xl shadow-sm p-6 border border-slate-100/80 transition hover:shadow-md duration-300">
      <h3 class="text-xl font-bold mb-2 text-slate-800 leading-tight">${post.title}</h3>
      <div class="text-slate-600 text-sm mb-4 leading-relaxed">${post.content}</div>
      <span class="text-xs text-slate-400 font-semibold">
        <i class="fa-regular fa-calendar-days mr-1"></i> Published at: ${new Date(post.published_at).toLocaleDateString('en-US')}
      </span>
    </div>
  `).join('');
}

// LOGIKA RENDER TESTIMONI
function renderTestimonials(list) {
  const container = document.getElementById('testimonials-container');
  if (!container || !list || list.length === 0) return;
  container.innerHTML = list.map(item => `
    <div class="bg-white border border-slate-100/80 p-6 rounded-2xl shadow-sm">
      <div class="flex items-center space-x-1 mb-3 text-amber-400">
        ${Array.from({ length: item.stars }, () => '<i class="fa-solid fa-star text-sm"></i>').join('')}
      </div>
      <p class="text-slate-600 text-sm italic mb-4 leading-relaxed">"${item.comment}"</p>
      <div class="font-bold text-slate-800 text-xs">- ${item.name}</div>
    </div>
  `).join('');
}