const API_URL = 'https://wa.mrdsolution.my.id/cms-api/api';
let token = '';

// Kredensial dinamis yang akan di-overwrite oleh data dari database setelah login sukses
let CLOUDINARY_CLOUD_NAME = 'dnobafum2'; 
let CLOUDINARY_PRESET = ''; 

let globalSettings = [];
let globalTestimonials = [];

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('cms_admin_token');
  if (savedToken) {
    token = savedToken;
    showDashboard();
  }
});

async function attemptLogin() {
  const inputToken = document.getElementById('input-token').value;
  try {
    // Verifikasi Token ke Endpoint Dinamis MySQL di VPS Anda
    const res = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'X-API-KEY': inputToken }
    }).then(r => r.json());

    if (res.status === 'success') {
      token = inputToken;
      localStorage.setItem('cms_admin_token', token);
      
      // Ambil Konfigurasi Cloudinary secara dinamis dari database (Sangat Aman)
      const cloudNameItem = res.data.find(d => d.setting_key === 'cloudinary_cloud_name');
      const presetItem = res.data.find(d => d.setting_key === 'cloudinary_preset');
      
      if (cloudNameItem) CLOUDINARY_CLOUD_NAME = cloudNameItem.setting_value;
      if (presetItem) CLOUDINARY_PRESET = presetItem.setting_value;

      showDashboard();
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('cms_admin_token');
  location.reload();
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  loadAllData();
}

async function loadAllData() {
  const headers = { 'X-API-KEY': token };
  try {
    const [resSettings, resRooms, resPosts, resPages] = await Promise.all([
      fetch(`${API_URL}/settings`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/rooms`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/posts`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/pages`, { headers }).then(r => r.json())
    ]);

    if (resSettings.status === 'success') {
      globalSettings = resSettings.data;
      fillSettingsForm(resSettings.data);
      renderNavigationEditor(resSettings.data);
      renderTestimonialsTab(resSettings.data);
      
      // Sinkronisasi Cloudinary ulang setelah reload dari localStorage jika belum ter-set
      const cloudNameItem = resSettings.data.find(d => d.setting_key === 'cloudinary_cloud_name');
      const presetItem = resSettings.data.find(d => d.setting_key === 'cloudinary_preset');
      if (cloudNameItem) CLOUDINARY_CLOUD_NAME = cloudNameItem.setting_value;
      if (presetItem) CLOUDINARY_PRESET = presetItem.setting_value;
    }
    if (resRooms.status === 'success') renderRoomsList(resRooms.data);
    if (resPosts.status === 'success') renderPostsList(resPosts.data);
    if (resPages.status === 'success') renderPagesList(resPages.data);
  } catch (err) {
    alert('Terjadi kesalahan otentikasi server.');
    logout();
  }
}

// --- TAB 1: PENGATURAN UMUM ---
function fillSettingsForm(data) {
  data.forEach(item => {
    const input = document.getElementById(`setting-${item.setting_key}`);
    if (input) input.value = item.setting_value;
  });
}

async function saveSettings() {
  const keys = ['site_name', 'whatsapp_number', 'hero_title', 'hero_subtitle', 'slider_images', 'address', 'maps_iframe', 'instagram_toggle', 'instagram_embed_code'];
  const payload = keys.map(key => ({
    key: key,
    value: document.getElementById(`setting-${key}`).value
  }));

  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') alert('Pengaturan umum berhasil disimpan!');
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 2: MENU NAVIGASI ---
function renderNavigationEditor(settings) {
  const container = document.getElementById('nav-editor-container');
  const menuSetting = settings.find(s => s.setting_key === 'navigation_menu');
  let menuList = [];

  try {
    menuList = menuSetting ? JSON.parse(menuSetting.setting_value) : [];
  } catch (e) {
    menuList = [];
  }

  container.innerHTML = menuList.map((item, idx) => `
    <div class="flex space-x-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 nav-row">
      <input type="text" placeholder="Nama Menu (Label)" value="${item.label}" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none">
      <input type="text" placeholder="Tautan (URL)" value="${item.url}" class="px-3 py-1.5 border rounded flex-1 text-xs font-mono nav-url outline-none">
      <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

function addNavigationRow() {
  const container = document.getElementById('nav-editor-container');
  const div = document.createElement('div');
  div.className = "flex space-x-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 nav-row";
  div.innerHTML = `
    <input type="text" placeholder="Nama Menu (Label)" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none">
    <input type="text" placeholder="Tautan (URL)" class="px-3 py-1.5 border rounded flex-1 text-xs font-mono nav-url outline-none">
    <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm"><i class="fa-solid fa-trash"></i></button>
  `;
  container.appendChild(div);
}

async function saveNavigationMenu() {
  const rows = document.querySelectorAll('.nav-row');
  const menuData = [];

  rows.forEach(row => {
    const label = row.querySelector('.nav-label').value;
    const url = row.querySelector('.nav-url').value;
    if (label && url) {
      menuData.push({ label, url });
    }
  });

  const payload = [{ key: 'navigation_menu', value: JSON.stringify(menuData) }];

  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') alert('Susunan navigasi berhasil disimpan!');
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 3: KATALOG KAMAR ---
function renderRoomsList(rooms) {
  const container = document.getElementById('rooms-list-container');
  container.innerHTML = rooms.map(room => `
    <div class="border border-gray-200 p-4 rounded-lg flex space-x-4 items-center bg-gray-50 shadow-sm">
      <img src="${room.image_url}" class="w-16 h-16 object-cover rounded border">
      <div class="flex-grow">
        <h4 class="font-bold text-sm text-gray-800">${room.room_type}</h4>
        <p class="text-xs text-blue-600 font-bold">Rp ${parseInt(room.price_start_from).toLocaleString('id-ID')}</p>
      </div>
      <button onclick='editRoom(${JSON.stringify(room)})' class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-3 py-1.5 rounded font-bold">Edit</button>
    </div>
  `).join('');
}

function openRoomForm() {
  document.getElementById('room-id').disabled = false;
  document.getElementById('room-id').value = '';
  document.getElementById('room-type').value = '';
  document.getElementById('room-price').value = '';
  document.getElementById('room-image').value = '';
  document.getElementById('room-amenities').value = '';
  document.getElementById('room-desc').value = '';
  document.getElementById('room-modal-title').innerText = 'Tambah Kamar Baru';
  document.getElementById('room-modal').classList.remove('hidden');
}

function editRoom(room) {
  document.getElementById('room-id').value = room.id;
  document.getElementById('room-id').disabled = true;
  document.getElementById('room-type').value = room.room_type;
  document.getElementById('room-price').value = room.price_start_from;
  document.getElementById('room-image').value = room.image_url;
  document.getElementById('room-amenities').value = room.amenities;
  document.getElementById('room-desc').value = room.description;
  document.getElementById('room-modal-title').innerText = 'Edit Kamar';
  document.getElementById('room-modal').classList.remove('hidden');
}

function closeRoomModal() { document.getElementById('room-modal').classList.add('hidden'); }

async function saveRoom() {
  const payload = {
    id: document.getElementById('room-id').value,
    room_type: document.getElementById('room-type').value,
    price_start_from: document.getElementById('room-price').value,
    image_url: document.getElementById('room-image').value,
    amenities: document.getElementById('room-amenities').value,
    description: document.getElementById('room-desc').value
  };

  try {
    const res = await fetch(`${API_URL}/rooms/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Kamar berhasil disimpan!');
      closeRoomModal();
      loadAllData();
    }
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 4: ARTIKEL & PROMO ---
function renderPostsList(posts) {
  const container = document.getElementById('posts-list-container');
  container.innerHTML = posts.map(post => `
    <div class="border border-gray-200 p-4 rounded-lg flex justify-between items-center bg-gray-50 shadow-sm">
      <div>
        <h4 class="font-bold text-sm">${post.title}</h4>
        <span class="text-xs px-2 py-0.5 rounded ${post.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${post.status}</span>
      </div>
      <button onclick='editPost(${JSON.stringify(post)})' class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-3 py-1.5 rounded font-bold">Edit</button>
    </div>
  `).join('');
}

function openPostForm() {
  document.getElementById('post-id').value = '';
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-status').value = 'Published';
  document.getElementById('post-modal-title').innerText = 'Tulis Artikel Baru';
  document.getElementById('post-modal').classList.remove('hidden');
}

function editPost(post) {
  document.getElementById('post-id').value = post.id;
  document.getElementById('post-title').value = post.title;
  document.getElementById('post-slug').value = post.slug;
  document.getElementById('post-content').value = post.content;
  document.getElementById('post-status').value = post.status;
  document.getElementById('post-modal-title').innerText = 'Edit Artikel';
  document.getElementById('post-modal').classList.remove('hidden');
}

function closePostModal() { document.getElementById('post-modal').classList.add('hidden'); }

async function savePost() {
  const payload = {
    id: document.getElementById('post-id').value || null,
    title: document.getElementById('post-title').value,
    slug: document.getElementById('post-slug').value,
    content: document.getElementById('post-content').value,
    status: document.getElementById('post-status').value
  };

  try {
    const res = await fetch(`${API_URL}/posts/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Artikel berhasil disimpan!');
      closePostModal();
      loadAllData();
    }
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 5: HALAMAN KUSTOM ---
function renderPagesList(pages) {
  const container = document.getElementById('pages-list-container');
  container.innerHTML = pages.map(page => `
    <div class="border border-gray-200 p-4 rounded-lg flex justify-between items-center bg-gray-50 shadow-sm">
      <div>
        <h4 class="font-bold text-sm text-gray-800">${page.title}</h4>
        <span class="text-xs text-gray-400 font-mono">?page=${page.slug}</span>
      </div>
      <button onclick='editPage(${JSON.stringify(page)})' class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-3 py-1.5 rounded font-bold">Edit</button>
    </div>
  `).join('');
}

function openPageForm() {
  document.getElementById('page-id').value = '';
  document.getElementById('page-title-input').value = '';
  document.getElementById('page-slug').value = '';
  document.getElementById('page-content-input').value = '';
  document.getElementById('page-modal-title').innerText = 'Buat Halaman Baru';
  document.getElementById('page-modal').classList.remove('hidden');
}

function editPage(page) {
  document.getElementById('page-id').value = page.id;
  document.getElementById('page-title-input').value = page.title;
  document.getElementById('page-slug').value = page.slug;
  document.getElementById('page-content-input').value = page.content;
  document.getElementById('page-modal-title').innerText = 'Edit Halaman';
  document.getElementById('page-modal').classList.remove('hidden');
}

function closePageModal() { document.getElementById('page-modal').classList.add('hidden'); }

async function savePage() {
  const payload = {
    id: document.getElementById('page-id').value || null,
    title: document.getElementById('page-title-input').value,
    slug: document.getElementById('page-slug').value,
    content: document.getElementById('page-content-input').value
  };

  try {
    const res = await fetch(`${API_URL}/pages/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Halaman berhasil disimpan!');
      closePageModal();
      loadAllData();
    }
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 6: TESTIMONI ---
function renderTestimonialsTab(settings) {
  const container = document.getElementById('testimonials-list-container');
  const testiSetting = settings.find(s => s.setting_key === 'testimonials');

  try {
    globalTestimonials = testiSetting ? JSON.parse(testiSetting.setting_value) : [];
  } catch (e) {
    globalTestimonials = [];
  }

  container.innerHTML = globalTestimonials.map((item, idx) => `
    <div class="border border-gray-200 p-4 rounded-lg bg-gray-50 flex flex-col justify-between shadow-sm relative">
      <div>
        <div class="flex text-amber-400 mb-2">
          ${Array.from({ length: item.stars }, () => '<i class="fa-solid fa-star text-xs"></i>').join('')}
        </div>
        <p class="text-xs italic text-gray-600 mb-2 leading-relaxed">"${item.comment}"</p>
        <div class="font-bold text-xs text-gray-800">- ${item.name}</div>
      </div>
      <div class="flex space-x-2 mt-4 justify-end">
        <button onclick="editTestimonial(${idx})" class="text-blue-600 hover:text-blue-800 text-xs"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button onclick="deleteTestimonial(${idx})" class="text-red-500 hover:text-red-700 text-xs"><i class="fa-solid fa-trash"></i> Hapus</button>
      </div>
    </div>
  `).join('');
}

function openTestimonialForm() {
  document.getElementById('testimonial-index').value = '';
  document.getElementById('testi-name').value = '';
  document.getElementById('testi-stars').value = '5';
  document.getElementById('testi-comment').value = '';
  document.getElementById('testimonial-modal-title').innerText = 'Tambah Testimoni';
  document.getElementById('testimonial-modal').classList.remove('hidden');
}

function editTestimonial(idx) {
  const item = globalTestimonials[idx];
  document.getElementById('testimonial-index').value = idx;
  document.getElementById('testi-name').value = item.name;
  document.getElementById('testi-stars').value = item.stars;
  document.getElementById('testi-comment').value = item.comment;
  document.getElementById('testimonial-modal-title').innerText = 'Edit Testimoni';
  document.getElementById('testimonial-modal').classList.remove('hidden');
}

function closeTestimonialModal() { document.getElementById('testimonial-modal').classList.add('hidden'); }

function deleteTestimonial(idx) {
  if (confirm('Apakah Anda yakin ingin menghapus testimoni ini?')) {
    globalTestimonials.splice(idx, 1);
    saveTestimonialsState();
  }
}

async function saveTestimonial() {
  const idx = document.getElementById('testimonial-index').value;
  const data = {
    name: document.getElementById('testi-name').value,
    stars: parseInt(document.getElementById('testi-stars').value),
    comment: document.getElementById('testi-comment').value
  };

  if (idx !== '') {
    globalTestimonials[idx] = data;
  } else {
    globalTestimonials.push(data);
  }

  await saveTestimonialsState();
  closeTestimonialModal();
}

async function saveTestimonialsState() {
  const payload = [{ key: 'testimonials', value: JSON.stringify(globalTestimonials) }];
  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Testimoni berhasil disinkronkan!');
      loadAllData();
    }
  } catch (err) {
    alert('Gagal sinkronisasi.');
  }
}

function autoGenerateSlug(title, targetId) {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  document.getElementById(targetId).value = slug;
}

// --- LOGIKA CLOUDINARY UPLOAD DENGAN KREDENSIAL DINAMIS DARI DATABASE ---
async function uploadToCloudinary(input, targetInputId) {
  const file = input.files[0];
  if (!file) return;

  const statusSpan = document.getElementById('upload-status-room');
  statusSpan.innerText = 'Mengunggah ke Cloudinary...';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.secure_url) {
      document.getElementById(targetInputId).value = res.secure_url;
      statusSpan.innerText = 'Unggah Berhasil!';
    } else {
      statusSpan.innerText = 'Gagal, periksa Upload Preset Anda.';
    }
  } catch (err) {
    statusSpan.innerText = 'Error jaringan Cloudinary.';
  }
}

function switchTab(tab) {
  const tabs = ['settings', 'menu', 'rooms', 'posts', 'pages', 'testimonials'];
  tabs.forEach(t => {
    const element = document.getElementById(`section-${t}`);
    const button = document.getElementById(`tab-${t}`);
    if (t === tab) {
      element.classList.remove('hidden');
      button.className = "border-b-2 border-blue-600 pb-3 px-4 font-bold text-blue-600 outline-none transition";
    } else {
      element.classList.add('hidden');
      button.className = "border-b-2 border-transparent pb-3 px-4 font-semibold text-gray-500 hover:text-gray-700 outline-none transition";
    }
  });
}