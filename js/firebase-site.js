const firebaseConfig = {
  apiKey: 'AIzaSyAVP7JAdrbJ9Vfm8Zk4p0x2kTUCk8iFw7U',
  authDomain: 'nysa-academy.firebaseapp.com',
  projectId: 'nysa-academy',
  storageBucket: 'nysa-academy.firebasestorage.app',
  messagingSenderId: '47128581308',
  appId: '1:47128581308:web:60720343ade94f6cf32cb9',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const SITE_DOC = db.collection('siteContent').doc('main');

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.keys(patch).forEach((key) => {
    const pv = patch[key];
    const bv = out[key];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[key] = deepMerge(bv, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  });
  return out;
}

function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function youtubeThumbnail(url) {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

function normalizeVideos(videos) {
  return (videos || []).map((v) => {
    const youtubeUrl = v.youtubeUrl || '';
    const thumb = youtubeThumbnail(youtubeUrl) || '';
    return { ...v, youtubeUrl, img: thumb };
  });
}

function newCourseId() {
  return `course_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFullCourses(courses) {
  return (courses || []).map((c) => ({
    ...c,
    id: c.id || newCourseId(),
  }));
}

function extractPopularCourseIds(data, fullCourses) {
  if (Array.isArray(data.popularCourseIds) && data.popularCourseIds.length) {
    const valid = new Set(fullCourses.map((c) => c.id));
    return data.popularCourseIds.filter((id) => valid.has(id));
  }
  const legacy = data.popularCourses;
  if (!Array.isArray(legacy) || !legacy.length) return [];
  return legacy
    .map((p) => {
      if (typeof p === 'string') return p;
      if (p.id && fullCourses.some((c) => c.id === p.id)) return p.id;
      const match = fullCourses.find((c) => c.title && p.title && c.title === p.title);
      return match ? match.id : null;
    })
    .filter(Boolean);
}

function resolvePopularCourses(fullCourses, ids) {
  const byId = Object.fromEntries(fullCourses.map((c) => [c.id, c]));
  return (ids || []).map((id) => byId[id]).filter(Boolean);
}

function normalizeContent(data) {
  const base = window.SITE_DEFAULTS || {};
  const merged = deepMerge(base, data || {});
  merged.videos = normalizeVideos(merged.videos);
  merged.fullVideos = normalizeVideos(merged.fullVideos || merged.videos);
  merged.gallery = merged.gallery || [];
  merged.galleryPage = deepMerge(base.galleryPage || {}, merged.galleryPage || {});
  if (!merged.galleryPage.stats?.length && base.galleryPage?.stats) {
    merged.galleryPage.stats = base.galleryPage.stats;
  }
  merged.videoGalleryPage = deepMerge(base.videoGalleryPage || {}, merged.videoGalleryPage || {});
  if (!merged.videoGalleryPage.stats?.length && base.videoGalleryPage?.stats) {
    merged.videoGalleryPage.stats = base.videoGalleryPage.stats;
  }
  merged.fullCourses = normalizeFullCourses(merged.fullCourses);
  merged.popularCourseIds = extractPopularCourseIds(merged, merged.fullCourses);
  merged.popularCourses = resolvePopularCourses(merged.fullCourses, merged.popularCourseIds);
  return merged;
}

async function loadSiteContent() {
  try {
    const snap = await SITE_DOC.get();
    if (snap.exists) {
      return normalizeContent(snap.data());
    }
  } catch (err) {
    console.warn('NYSA: Could not load Firestore content, using defaults.', err);
  }
  return normalizeContent(null);
}

async function saveSiteContent(data) {
  const normalized = normalizeContent(data);
  const payload = {
    ...normalized,
    popularCourseIds: normalized.popularCourseIds,
    fullCourses: normalized.fullCourses,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    popularCourses: firebase.firestore.FieldValue.delete(),
  };
  await SITE_DOC.set(payload, { merge: true });
  return normalized;
}

window.NYSA_FIREBASE = {
  loadSiteContent,
  saveSiteContent,
  extractYoutubeId,
  youtubeThumbnail,
  normalizeContent,
};
