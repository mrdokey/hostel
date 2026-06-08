const API_URL = 'https://wa.mrdsolution.my.id/cms-api/api';
const API_TOKEN = 'RAHASIA_CMS_HOSTEL_123'; // Ini bisa diabaikan di sisi publik jika token di DB sudah Anda ganti
let slideIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  handleRouting();
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

async function fetchFreshData() {
  const headers = { 'X-API-KEY': API_TOKEN };
  try {
    const [resSettings, resRooms, resPosts] = await Promise.all([
      fetch(`${API_URL}/settings`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/rooms`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/posts`, { headers }).then(r => r.json())
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
    console.error('Gagal mengambil data segar:', err);
  }
}

async function loadPageContent(slug) {
  const headers = { 'X-API-KEY': API_TOKEN };
  try {
    const resSettings = await fetch(`${API_URL}/settings`, { headers }).then(r => r.json());
    if (resSettings.status === 'success') {
      const settingsObj = {};
      resSettings.data.forEach(item => { settingsObj[item.setting_key] = item.setting_value; });
      renderSettings(settingsObj);
    }

    const resPages = await fetch(`${API_URL}/pages`, { headers }).then(r => r.json());
    if (resPages.status === 'success') {
      const page = resPages.data.find(p => p.slug === slug);
      if (page) {
        document.getElementById('page-title').innerText = page.title;
        document.getElementById('page-content').innerHTML = page.content;
      } else {
        document.getElementById('page-title').innerText = 'Halaman Tidak Ditemukan';
        document.getElementById('page-content').innerHTML = '<p>Maaf, halaman tidak ditemukan.</p>';
      }
    }
  } catch (err) {
    console.error('Error load custom page:', err);
  }
}

function renderSettings(settings) {
  if (!settings) return;
  document.getElementById('nav-brand').innerText = settings.site_name || 'Hostel';
  document.getElementById('footer-site-name').innerText = settings.site_name || 'Hostel';
  document.getElementById('footer-address').innerText = settings.address || '';
  
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : '#';
  if (document.getElementById('btn-hero-wa')) document.getElementById('btn-hero-wa').href = waLink;
  document.getElementById('floating-wa').href = waLink;

  if (document.getElementById('maps-iframe')) document.getElementById('maps-iframe').src = settings.maps_iframe || '';

  if (settings.navigation_menu) {
    try { renderNavigation(JSON.parse(settings.navigation_menu)); } catch (e) {}
  }

  if (document.getElementById('slider-container') && settings.slider_images) {
    const images = settings.slider_images.split(',');
    const sliderContainer = document.getElementById('slider-container');
    sliderContainer.innerHTML = images.map((img, idx) => `
      <div class="slide absolute inset-0 w-full h-full bg-cover bg-center ${idx === 0 ? 'active' : ''}" style="background-image: url('${img.trim()}')"></div>
    `).join('');
    startSlider();
  }

  if (settings.instagram_toggle === 'ON' && settings.instagram_embed_code && document.getElementById('instagram-section')) {
    document.getElementById('instagram-section').classList.remove('hidden');
    document.getElementById('instagram-container').innerHTML = settings.instagram_embed_code;
    if (window.instgrm) window.instgrm.Embeds.process();
  } else if (document.getElementById('instagram-section')) {
    document.getElementById('instagram-section').classList.add('hidden');
  }

  if (settings.testimonials) {
    try { renderTestimonials(JSON.parse(settings.testimonials)); } catch (e) {}
  }
}

function renderNavigation(menuList) {
  const desktop = document.getElementById('desktop-menu');
  const mobile = document.getElementById('mobile-menu');

  const htmlMenu = menuList.map(item => {
    if (item.url.startsWith('?page=')) {
      return `<a href="${item.url}" class="hover:text-blue-600 transition" onclick="setTimeout(handleRouting, 50)">${item.label}</a>`;
    }
    return `<a href="${item.url}" class="hover:text-blue-600 transition">${item.label}</a>`;
  }).join('');

  desktop.innerHTML = htmlMenu;
  
  const htmlMobileMenu = menuList.map(item => {
    if (item.url.startsWith('?page=')) {
      return `<a href="${item.url}" onclick="toggleMobileMenu(); setTimeout(handleRouting, 50)" class="hover:text-blue-600">${item.label}</a>`;
    }
    return `<a href="${item.url}" onclick="toggleMobileMenu()" class="hover:text-blue-600">${item.label}</a>`;
  }).join('');
  
  mobile.innerHTML = htmlMobileMenu;
}

function startSlider() {
  const slides = document.querySelectorAll('.slide');
  if (slides.length <= 1) return;
  setInterval(() => {
    slides[slideIndex].classList.remove('active');
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add('active');
  }, 5000);
}

function renderRooms(rooms) {
  const container = document.getElementById('rooms-container');
  if (!container || !rooms || rooms.length === 0) return;
  container.innerHTML = rooms.map(room => `
    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition hover:shadow-md">
      <img src="${room.image_url}" alt="${room.room_type}" class="w-full h-48 object-cover">
      <div class="p-6">
        <h3 class="text-xl font-bold mb-1">${room.room_type}</h3>
        <p class="text-blue-600 font-extrabold text-lg mb-3">Rp ${parseInt(room.price_start_from).toLocaleString('id-ID')} <span class="text-xs text-gray-400 font-normal">/ malam</span></p>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed">${room.description}</p>
        <div class="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-100">
          <strong class="text-gray-700">Fasilitas:</strong> ${room.amenities}
        </div>
      </div>
    </div>
  `).join('');
}

function renderPosts(posts) {
  const container = document.getElementById('posts-container');
  if (!container || !posts || posts.length === 0) return;
  const publishedPosts = posts.filter(p => p.status === 'Published');
  container.innerHTML = publishedPosts.map(post => `
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition hover:shadow-md">
      <h3 class="text-xl font-bold mb-2">${post.title}</h3>
      <div class="text-gray-600 text-sm mb-4 leading-relaxed">${post.content}</div>
      <span class="text-xs text-gray-400 font-medium">
        <i class="fa-regular fa-calendar-days mr-1"></i> Dipublikasikan pada: ${new Date(post.published_at).toLocaleDateString('id-ID')}
      </span>
    </div>
  `).join('');
}

function renderTestimonials(list) {
  const container = document.getElementById('testimonials-container');
  if (!container || !list || list.length === 0) return;
  container.innerHTML = list.map(item => `
    <div class="bg-white border border-gray-100 p-6 rounded-xl shadow-sm">
      <div class="flex items-center space-x-1 mb-3 text-amber-400">
        ${Array.from({ length: item.stars }, () => '<i class="fa-solid fa-star text-sm"></i>').join('')}
      </div>
      <p class="text-gray-600 text-sm italic mb-4 leading-relaxed">"${item.comment}"</p>
      <div class="font-bold text-gray-800 text-sm">- ${item.name}</div>
    </div>
  `).join('');
}