// 2. UTILITÁRIOS (Utils) & SISTEMA DE ÍCONES VETORIAIS (Icons)

const Icons = {
  svgs: {
    theater: '<path d="M3 11c0 4.4 3.6 8 8 8s8-3.6 8-8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5z"/><circle cx="8" cy="9" r="1.5"/><circle cx="14" cy="9" r="1.5"/><path d="M8 14c1 1.2 3 1.2 4 0"/>',
    masks: '<path d="M3 11c0 4.4 3.6 8 8 8s8-3.6 8-8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5z"/><circle cx="8" cy="9" r="1.5"/><circle cx="14" cy="9" r="1.5"/><path d="M8 14c1 1.2 3 1.2 4 0"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/>',
    script: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/>',
    lightning: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>',
    clapper: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m4 4 3 4M9 4l3 4M14 4l3 4M19 4l1 4M2 8h20"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>',
    speak: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 8a3 3 0 0 1 0 6"/><path d="M21 6a6 6 0 0 1 0 10"/>',
    puzzle: '<path d="M19.4 7.8c0-1.6.8-2.2 1.6-2.8-1.3-1.3-3.1-2-5-2-1.6 0-2.2.8-2.8 1.6a2 2 0 0 1-2.3 0C10.2 3.8 9.6 3 8 3 6.2 3 4.3 3.7 3 5c.8.7 1.6 1.3 1.6 2.8a2 2 0 0 1-1.1 1.8C2.8 10.2 2 10.8 2 12.4c0 1.6.8 2.2 1.6 2.8a2 2 0 0 1 1.1 1.8c-.8.8-1.6 1.4-2.4 2.1 1.3 1.3 3.1 2 5 2 1.6 0 2.2-.8 2.8-1.6a2 2 0 0 1 2.3 0c.7.8 1.3 1.6 2.8 1.6 1.8 0 3.7-.7 5-2-.8-.7-1.6-1.3-1.6-2.8a2 2 0 0 1 1.1-1.8c.6-.5 1.4-1.1 1.4-2.7 0-1.6-.8-2.2-1.6-2.8a2 2 0 0 1-1.1-1.8Z"/>',
    keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 2.5 6h9c1-1.5 2.5-3.5 2.5-6a7 7 0 0 0-7-7Z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    retry: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    badgeCheck: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><polyline points="9 12 11 14 15 10"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    waveform: '<path d="M2 12h2l3-7 4 14 4-14 3 7h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
  },

  get(name, { size = 18, className = '', strokeWidth = 2 } = {}) {
    const inner = this.svgs[name];
    if (!inner) return '';
    const cls = className ? `app-icon app-icon-${name} ${className}` : `app-icon app-icon-${name}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${inner}</svg>`;
  }
};

const Utils = {
  icons: Icons,

  $(id) {
    return document.getElementById(id);
  },

  escapeHtml(str) {
    return (str || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  },

  sanitizeId(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
  },

  isFunctionWord(word) {
    const clean = (word || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return AppConfig.FUNCTION_WORDS.has(clean);
  },

  hashCoord(i, j) {
    let x = (i * 73856093) ^ (j * 19349663);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return Math.abs(x ^ (x >>> 16)) % 100;
  },

  maskWord(word, mode) {
    if (!word) return '';
    const regex = /([\p{L}\p{N}]+)/gu;
    const parts = word.split(regex);
    return parts.map(part => {
      if (!part) return '';
      if (/^[\p{L}\p{N}]+$/u.test(part)) {
        const escaped = Utils.escapeHtml(part);
        if (mode === 'initial') {
          const first = escaped[0];
          const restDots = '·'.repeat(Math.max(1, Math.min(3, escaped.length - 1)));
          return `<span class="first-letter-word">${first}<span class="dots">${restDots}</span></span>`;
        } else {
          const blank = '•'.repeat(Math.max(2, Math.min(5, escaped.length)));
          return `<span class="masked-word">${blank}</span>`;
        }
      }
      return Utils.escapeHtml(part);
    }).join('');
  },

  triggerHaptic(type = 'tap') {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'tap') navigator.vibrate(25);
        else if (type === 'success') navigator.vibrate([20, 30, 20]);
        else if (type === 'error') navigator.vibrate([40, 50, 40]);
      }
    } catch (e) {}
  },

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  base64ToBlob(base64Data, defaultType = 'audio/webm') {
    let contentType = defaultType;
    let base64 = base64Data;
    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      contentType = (parts[0].split(':')[1]) || defaultType;
      base64 = parts[1];
    }
    const raw = atob(base64);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.Icons = Icons;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils, Icons };
}
