// 2. UTILITÁRIOS (Utils)
    const Utils = {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils };
}
