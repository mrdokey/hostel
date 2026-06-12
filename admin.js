const API_URL = 'https://wa.mrdsolution.my.id/cms-api/api';
let token = '';

let CLOUDINARY_CLOUD_NAME = 'dnobafum2'; 
let CLOUDINARY_PRESET = 'Hostel_Jacky'; 

let globalSettings = [];
let globalTestimonials = [];
let globalAlbumPhotos = [];
let globalPages = []; // Penyimpan state halaman kustom global (Anti-Crash HTML)

let quillPostEditor = null;
let quillPageEditor = null;

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('cms_admin_token');
  if (savedToken) {
    token = savedToken;
    showDashboard();
  }
});

function initQuillEditors() {
  const toolbarOptions = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ];

  if (!quillPostEditor) {
    quillPostEditor = new Quill('#post-editor', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions }
    });
  }
  
  if (!quillPageEditor) {
    quillPageEditor = new Quill('#page-editor', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions }
    });
  }
}

async function attemptLogin() {
  const inputToken = document.getElementById('input-token').value;
  try {
    const res = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'X-API-KEY': inputToken }
    }).then(r => r.json());

    if (res.status === 'success') {
      token = inputToken;
      localStorage.setItem('cms_admin_token', token);
      
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
  initQuillEditors();
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
      renderAlbumTab(resSettings.data);
      
      const cloudNameItem = resSettings.data.find(d => d.setting_key === 'cloudinary_cloud_name');
      const presetItem = resSettings.data.find(d => d.setting_key === 'cloudinary_preset');
      if (cloudNameItem) CLOUDINARY_CLOUD_NAME = cloudNameItem.setting_value;
      if (presetItem) CLOUDINARY_PRESET = presetItem.setting_value;
    }
    if (resRooms.status === 'success') renderRoomsList(resRooms.data);
    if (resPosts.status === 'success') renderPostsList(resPosts.data);
    if (resPages.status === 'success') {
      globalPages = resPages.data; // Simpan ke state global
      renderPagesList(resPages.data);
    }
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
  const tokenField = document.getElementById('setting-admin_token');
  if (tokenField) tokenField.value = token;
}

async function saveSettings() {
  const keys = ['site_name', 'whatsapp_number', 'hero_title', 'hero_subtitle', 'slider_images', 'address', 'maps_iframe', 'instagram_toggle', 'instagram_embed_code', 'favicon_url', 'admin_token', 'album_toggle'];
  const newToken = document.getElementById('setting-admin_token').value;
  const payload = [];
  
  keys.forEach(key => {
    const input = document.getElementById(`setting-${key}`);
    if (input) {
      let val = input.value;
      if (key === 'slider_images') {
        val = val.split(',').map(url => autoConvertGoogleDriveLink(url)).join(',');
      }
      if (key === 'favicon_url') {
        val = autoConvertGoogleDriveLink(val);
      }
      payload.push({ key: key, value: val });
    }
  });

  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Pengaturan umum berhasil disimpan!');
      token = newToken;
      localStorage.setItem('cms_admin_token', token);
      loadAllData();
    }
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

  container.innerHTML = menuList.map((item, idx) => {
    if (item.children && item.children.length > 0) {
      return `
        <div class="border-2 border-dashed border-blue-200 p-4 rounded-xl bg-blue-50/30 nav-row" data-type="parent">
          <div class="flex space-x-4 items-center mb-3">
            <span class="text-xs font-bold text-blue-600 uppercase">MENU UTAMA (DROPDOWN)</span>
            <input type="text" placeholder="Nama Menu Dropdown" value="${item.label}" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none font-bold">
            <button onclick="this.parentElement.parentElement.remove()" class="text-red-500"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="sub-rows-container space-y-2 pl-6">
            ${item.children.map(sub => `
              <div class="flex space-x-4 items-center bg-white p-2 rounded-lg border border-gray-150 sub-row">
                <input type="text" placeholder="Nama Sub-Menu" value="${sub.label}" class="px-3 py-1 border rounded flex-1 text-xs sub-label outline-none">
                <input type="text" placeholder="Tautan URL" value="${sub.url}" class="px-3 py-1 border rounded flex-1 text-xs font-mono sub-url outline-none">
                <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-circle-minus"></i></button>
              </div>
            `).join('')}
          </div>
          <button onclick="addSubNavigationRow(this)" class="mt-2 text-xs text-blue-600 font-bold hover:underline">+ Tambah Anggota Sub-Menu</button>
        </div>
      `;
    }
    
    return `
      <div class="flex space-x-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 nav-row" data-type="single">
        <input type="text" placeholder="Nama Menu (Label)" value="${item.label}" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none">
        <input type="text" placeholder="Tautan (URL)" value="${item.url}" class="px-3 py-1.5 border rounded flex-1 text-xs font-mono nav-url outline-none">
        <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');
}

function addNavigationRow(type) {
  const container = document.getElementById('nav-editor-container');
  const div = document.createElement('div');
  
  if (type === 'parent') {
    div.className = "border-2 border-dashed border-blue-200 p-4 rounded-xl bg-blue-50/30 nav-row";
    div.setAttribute('data-type', 'parent');
    div.innerHTML = `
      <div class="flex space-x-4 items-center mb-3">
        <span class="text-xs font-bold text-blue-600 uppercase">MENU UTAMA (DROPDOWN)</span>
        <input type="text" placeholder="Nama Menu Dropdown" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none font-bold">
        <button onclick="this.parentElement.parentElement.remove()" class="text-red-500"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="sub-rows-container space-y-2 pl-6"></div>
      <button onclick="addSubNavigationRow(this)" class="mt-2 text-xs text-blue-600 font-bold hover:underline">+ Tambah Anggota Sub-Menu</button>
    `;
  } else {
    div.className = "flex space-x-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 nav-row";
    div.setAttribute('data-type', 'single');
    div.innerHTML = `
      <input type="text" placeholder="Nama Menu (Label)" class="px-3 py-1.5 border rounded flex-1 text-sm nav-label outline-none">
      <input type="text" placeholder="Tautan (URL)" class="px-3 py-1.5 border rounded flex-1 text-xs font-mono nav-url outline-none">
      <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 text-sm"><i class="fa-solid fa-trash"></i></button>
    `;
  }
  container.appendChild(div);
}

function addSubNavigationRow(btnElement) {
  const container = btnElement.parentElement.querySelector('.sub-rows-container');
  const div = document.createElement('div');
  div.className = "flex space-x-4 items-center bg-white p-2 rounded-lg border border-gray-150 sub-row";
  div.innerHTML = `
    <input type="text" placeholder="Nama Sub-Menu" class="px-3 py-1 border rounded flex-1 text-xs sub-label outline-none">
    <input type="text" placeholder="Tautan URL" class="px-3 py-1 border rounded flex-1 text-xs font-mono sub-url outline-none">
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-circle-minus"></i></button>
  `;
  container.appendChild(div);
}

async function saveNavigationMenu() {
  const rows = document.querySelectorAll('.nav-row');
  const menuData = [];

  rows.forEach(row => {
    const type = row.getAttribute('data-type');
    const label = row.querySelector('.nav-label').value;

    if (type === 'single') {
      const url = row.querySelector('.nav-url').value;
      if (label && url) {
        menuData.push({ label, url });
      }
    } else if (type === 'parent') {
      const subRows = row.querySelectorAll('.sub-row');
      const children = [];
      
      subRows.forEach(sub => {
        const subLabel = sub.querySelector('.sub-label').value;
        const subUrl = sub.querySelector('.sub-url').value;
        if (subLabel && subUrl) {
          children.push({ label: subLabel, url: subUrl });
        }
      });

      if (label) {
        menuData.push({ label, children });
      }
    }
  });

  const payload = [{ key: 'navigation_menu', value: JSON.stringify(menuData) }];

  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') alert('Susunan navigasi bertingkat berhasil disimpan!');
  } catch (err) {
    alert('Gagal menyimpan.');
  }
}

// --- TAB 3: KATALOG KAMAR ---
function renderRoomsList(rooms) {
  const container = document.getElementById('rooms-list-container');
  container.innerHTML = rooms.map(room => `
    <div class="border border-gray-200 p-4 rounded-lg flex space-x-4 items-center bg-gray-50 shadow-sm">
      <img src="${room.image_url.split(',')[0]}" class="w-16 h-16 object-cover rounded border">
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
  document.getElementById('room-meta-capacity').value = '4';
  document.getElementById('room-meta-beds').value = '2 Queen bed';
  document.getElementById('room-meta-bathrooms').value = '2';
  document.getElementById('room-meta-size').value = '150';
  document.getElementById('room-modal-title').innerText = 'Tambah Kamar Baru';
  document.getElementById('room-modal').classList.remove('hidden');
}

function editRoom(room) {
  document.getElementById('room-id').value = room.id;
  document.getElementById('room-id').disabled = true;
  document.getElementById('room-type').value = room.room_type;
  document.getElementById('room-price').value = room.price_start_from;
  document.getElementById('room-image').value = room.image_url;
  document.getElementById('room-desc').value = room.description;

  if (room.amenities.trim().startsWith('{')) {
    try {
      const meta = JSON.parse(room.amenities);
      document.getElementById('room-meta-capacity').value = meta.capacity || '4';
      document.getElementById('room-meta-beds').value = meta.beds || '2 Queen bed';
      document.getElementById('room-meta-bathrooms').value = meta.bathrooms || '2';
      document.getElementById('room-meta-size').value = meta.size || '150';
      document.getElementById('room-amenities').value = meta.list || '';
    } catch (e) {
      document.getElementById('room-amenities').value = room.amenities;
    }
  } else {
    document.getElementById('room-meta-capacity').value = '4';
    document.getElementById('room-meta-beds').value = '2 Queen bed';
    document.getElementById('room-meta-bathrooms').value = '2';
    document.getElementById('room-meta-size').value = '150';
    document.getElementById('room-amenities').value = room.amenities;
  }

  document.getElementById('room-modal-title').innerText = 'Edit Kamar';
  document.getElementById('room-modal').classList.remove('hidden');
}

function closeRoomModal() { document.getElementById('room-modal').classList.add('hidden'); }

async function saveRoom() {
  const rawImageUrl = document.getElementById('room-image').value;
  const metaObj = {
    capacity: document.getElementById('room-meta-capacity').value || "4",
    beds: document.getElementById('room-meta-beds').value || "2 Queen bed",
    bathrooms: document.getElementById('room-meta-bathrooms').value || "2",
    size: document.getElementById('room-meta-size').value || "150",
    list: document.getElementById('room-amenities').value
  };

  const payload = {
    id: document.getElementById('room-id').value,
    room_type: document.getElementById('room-type').value,
    price_start_from: document.getElementById('room-price').value,
    image_url: rawImageUrl.split(',').map(url => autoConvertGoogleDriveLink(url)).join(','), 
    amenities: JSON.stringify(metaObj), 
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
  quillPostEditor.root.innerHTML = ''; 
  document.getElementById('post-status').value = 'Published';
  document.getElementById('post-modal-title').innerText = 'Tulis Artikel Baru';
  document.getElementById('post-modal').classList.remove('hidden');
}

function editPost(post) {
  document.getElementById('post-id').value = post.id;
  document.getElementById('post-title').value = post.title;
  document.getElementById('post-slug').value = post.slug;
  quillPostEditor.root.innerHTML = post.content || ''; 
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
    content: quillPostEditor.root.innerHTML, 
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

// --- TAB 5: HALAMAN KUSTOM (DENGAN FIX SAKTI ANTI-HTML CRASH) ---
function renderPagesList(pages) {
  const container = document.getElementById('pages-list-container');
  // Ambil data halaman kustom dinamis menggunakan ID (Aman dari kutip/line-break)
  container.innerHTML = pages.map(page => `
    <div class="border border-gray-200 p-4 rounded-lg flex justify-between items-center bg-gray-50 shadow-sm">
      <div>
        <h4 class="font-bold text-sm text-gray-800">${page.title}</h4>
        <span class="text-xs text-gray-400 font-mono">?page=${page.slug}</span>
      </div>
      <button onclick="editPage(${page.id})" class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-3 py-1.5 rounded font-bold">Edit</button>
    </div>
  `).join('');
}

function openPageForm() {
  document.getElementById('page-id').value = '';
  document.getElementById('page-title-input').value = '';
  document.getElementById('page-slug').value = '';
  quillPageEditor.root.innerHTML = ''; 
  document.getElementById('page-modal-title').innerText = 'Buat Halaman Kustom Baru';
  document.getElementById('page-modal').classList.remove('hidden');
}

// Mengambil object halaman langsung dari state global memproses ID (Tanpa Inline Stringify)
function editPage(id) {
  const page = globalPages.find(p => p.id == id);
  if (!page) return;

  document.getElementById('page-id').value = page.id;
  document.getElementById('page-title-input').value = page.title;
  document.getElementById('page-slug').value = page.slug;
  quillPageEditor.root.innerHTML = page.content || ''; 
  document.getElementById('page-modal-title').innerText = 'Edit Halaman Kustom';
  document.getElementById('page-modal').classList.remove('hidden');
}

function closePageModal() { document.getElementById('page-modal').classList.add('hidden'); }

async function savePage() {
  const payload = {
    id: document.getElementById('page-id').value || null,
    title: document.getElementById('page-title-input').value,
    slug: document.getElementById('page-slug').value,
    content: quillPageEditor.root.innerHTML 
  };

  try {
    const res = await fetch(`${API_URL}/pages/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Halaman kustom berhasil disimpan!');
      closePageModal();
      loadAllData();
    }
  } catch (err) {
    alert('Gagal menyimpan halaman.');
  }
}

// --- TAB 6: PENGELOLA TESTIMONI ---
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

// --- TAB 7: PENGELOLA GALERI ALBUM ---
function renderAlbumTab(settings) {
  const container = document.getElementById('album-list-container');
  const albumSetting = settings.find(s => s.setting_key === 'album_photos');

  try {
    globalAlbumPhotos = albumSetting ? JSON.parse(albumSetting.setting_value) : [];
  } catch (e) {
    globalAlbumPhotos = [];
  }

  container.innerHTML = globalAlbumPhotos.map((item, idx) => `
    <div class="border border-gray-200 p-4 rounded-lg bg-gray-50 flex items-center space-x-4 shadow-sm relative">
      <img src="${item.image_url}" class="w-16 h-16 object-cover rounded border">
      <div class="flex-grow">
        <p class="text-xs font-bold text-gray-800 leading-relaxed truncate max-w-[200px]">${item.caption || '(No caption)'}</p>
      </div>
      <div class="flex space-x-2">
        <button onclick="editAlbum(${idx})" class="text-blue-600 hover:text-blue-800 text-xs font-semibold"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button onclick="deleteAlbum(${idx})" class="text-red-500 hover:text-red-700 text-xs font-semibold"><i class="fa-solid fa-trash"></i> Hapus</button>
      </div>
    </div>
  `).join('');
}

function openAlbumForm() {
  document.getElementById('album-index').value = '';
  document.getElementById('album-image-url').value = '';
  document.getElementById('album-caption').value = '';
  document.getElementById('album-modal-title').innerText = 'Tambah Foto Album';
  document.getElementById('album-modal').classList.remove('hidden');
}

function editAlbum(idx) {
  const item = globalAlbumPhotos[idx];
  document.getElementById('album-index').value = idx;
  document.getElementById('album-image-url').value = item.image_url;
  document.getElementById('album-caption').value = item.caption;
  document.getElementById('album-modal-title').innerText = 'Edit Foto Album';
  document.getElementById('album-modal').classList.remove('hidden');
}

function closeAlbumModal() { document.getElementById('album-modal').classList.add('hidden'); }

function deleteAlbum(idx) {
  if (confirm('Apakah Anda yakin ingin menghapus foto album ini?')) {
    globalAlbumPhotos.splice(idx, 1);
    saveAlbumState();
  }
}

async function saveAlbum() {
  const idx = document.getElementById('album-index').value;
  const data = {
    image_url: document.getElementById('album-image-url').value,
    caption: document.getElementById('album-caption').value
  };

  if (idx !== '') {
    globalAlbumPhotos[idx] = data;
  } else {
    globalAlbumPhotos.push(data);
  }

  await saveAlbumState();
  closeAlbumModal();
}

async function saveAlbumState() {
  const payload = [{ key: 'album_photos', value: JSON.stringify(globalAlbumPhotos) }];
  try {
    const res = await fetch(`${API_URL}/settings/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.status === 'success') {
      alert('Data album berhasil disinkronkan!');
      loadAllData();
    }
  } catch (err) {
    alert('Gagal sinkronisasi album.');
  }
}

function autoGenerateSlug(title, targetId) {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  document.getElementById(targetId).value = slug;
}

// --- LOGIKA CLOUDINARY UPLOAD UMUM ---
async function uploadToCloudinary(input, targetInputId, statusSpanId = 'upload-status-room') {
  const file = input.files[0];
  if (!file) return;

  const statusSpan = document.getElementById(statusSpanId);
  if (statusSpan) statusSpan.innerText = 'Mengunggah ke Cloudinary...';

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
      if (statusSpan) statusSpan.innerText = 'Unggah Berhasil!';
    } else {
      if (statusSpan) statusSpan.innerText = 'Gagal upload, periksa preset Anda.';
    }
  } catch (err) {
    if (statusSpan) statusSpan.innerText = 'Error jaringan Cloudinary.';
  }
}

// --- LOGIKA UPLOAD BANYAK GAMBAR UNTUK SLIDER DETAIL KAMAR ---
async function uploadToRoomImages(input) {
  const file = input.files[0];
  if (!file) return;

  const statusSpan = document.getElementById('upload-status-room');
  if (statusSpan) statusSpan.innerText = 'Mengunggah ke Cloudinary...';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.secure_url) {
      const txtArea = document.getElementById('room-image');
      const currentVal = txtArea.value.trim();
      txtArea.value = currentVal ? currentVal + ',' + res.secure_url : res.secure_url;
      if (statusSpan) statusSpan.innerText = 'Gambar Kamar Berhasil Ditambahkan ke Galeri!';
    } else {
      if (statusSpan) statusSpan.innerText = 'Gagal mengunggah gambar.';
    }
  } catch (err) {
    if (statusSpan) statusSpan.innerText = 'Error jaringan Cloudinary.';
  }
}

// --- LOGIKA UPLOAD LANGSUNG KE DALAM KOLOM SLIDER GAMBAR ---
async function uploadToSlider(input) {
  const file = input.files[0];
  if (!file) return;

  const statusSpan = document.getElementById('upload-status-slider');
  if (statusSpan) statusSpan.innerText = 'Mengunggah ke Cloudinary...';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.secure_url) {
      const txtArea = document.getElementById('setting-slider_images');
      const currentVal = txtArea.value.trim();
      txtArea.value = currentVal ? currentVal + ',' + res.secure_url : res.secure_url;
      if (statusSpan) statusSpan.innerText = 'Tautan Berhasil Ditambahkan ke Slider!';
    } else {
      if (statusSpan) statusSpan.innerText = 'Gagal unggah gambar.';
    }
  } catch (err) {
    if (statusSpan) statusSpan.innerText = 'Error jaringan Cloudinary.';
  }
}

function autoConvertGoogleDriveLink(url) {
  if (!url) return '';
  
  const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const queryIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  
  let match = url.match(fileIdRegex);
  if (!match) {
    match = url.match(queryIdRegex);
  }
  
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
  }
  
  return url.trim();
}

function switchTab(tab) {
  const tabs = ['settings', 'menu', 'rooms', 'posts', 'pages', 'testimonials', 'album'];
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