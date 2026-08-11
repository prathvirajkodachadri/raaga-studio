/**
 * release-planner.js — Album Artwork Validator, ISRC Generator & Release Metadata Builder.
 *
 * Exposes window.RELEASE_PLANNER
 */
'use strict';

(function (root) {
  // ─── Artwork Validator ───────────────────────────────────────────────────
  /**
   * validateArtwork(file) -> Promise<ArtworkReport>
   */
  function validateArtwork(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }
      var isImage = /^image\//.test(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      if (!isImage) {
        reject(new Error('File is not an image (expected JPG or PNG).'));
        return;
      }

      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var sizeBytes = file.size;
        var ext = (file.name.split('.').pop() || '').toLowerCase();

        var checks = [];

        // 1. Dimensions (Ideal >= 3000 x 3000)
        var dimStatus = (w >= 3000 && h >= 3000) ? 'pass' : (w >= 1400 && h >= 1400) ? 'warn' : 'fail';
        checks.push({
          name: 'Resolution (Dimensions)',
          value: w + ' × ' + h + ' px',
          target: '≥ 3000 × 3000 px (Apple & Spotify requirement)',
          status: dimStatus,
          advice: dimStatus === 'pass' ? null :
                  dimStatus === 'warn' ? 'Image is ' + w + '×' + h + ' px. Most stores accept min 1400×1400, but 3000×3000 is strongly recommended to avoid rejection.' :
                  'Image is too small (< 1400×1400 px). Stores will reject this cover art.'
        });

        // 2. Aspect Ratio (Must be 1:1 square)
        var isSquare = (w === h);
        var ratioStatus = isSquare ? 'pass' : 'fail';
        checks.push({
          name: 'Aspect Ratio',
          value: (w / h).toFixed(2) + ':1' + (isSquare ? ' (Perfect Square)' : ' (Non-Square)'),
          target: '1:1 Square',
          status: ratioStatus,
          advice: isSquare ? null : 'Cover art must be strictly square (1:1 aspect ratio). Crop the image to equal width and height.'
        });

        // 3. File Format (JPG or PNG)
        var isJpgOrPng = ext === 'jpg' || ext === 'jpeg' || ext === 'png';
        var fmtStatus = isJpgOrPng ? 'pass' : 'warn';
        checks.push({
          name: 'File Format',
          value: ext.toUpperCase(),
          target: 'JPEG (.jpg) or PNG (.png)',
          status: fmtStatus,
          advice: isJpgOrPng ? null : 'Prefer high-quality JPEG or PNG. Some distributors reject WebP/GIF.'
        });

        // 4. File Size (Max 10 MB, recommended 1–6 MB)
        var sizeMb = sizeBytes / (1024 * 1024);
        var sizeStatus = (sizeMb >= 0.5 && sizeMb <= 8) ? 'pass' : (sizeMb < 10) ? 'warn' : 'fail';
        checks.push({
          name: 'File Size',
          value: sizeMb.toFixed(2) + ' MB',
          target: 'Under 10 MB (ideal 1–6 MB)',
          status: sizeStatus,
          advice: sizeStatus === 'pass' ? null :
                  sizeMb > 10 ? 'File exceeds 10 MB limit. Compress or export at quality 90% JPG.' :
                  'File size is very small — verify that image compression has not caused visual artifacts.'
        });

        var passCount = checks.filter(function (c) { return c.status === 'pass'; }).length;
        var failCount = checks.filter(function (c) { return c.status === 'fail'; }).length;
        var score = Math.round((passCount * 100) / checks.length);

        resolve({
          fileName: file.name,
          url: url,
          width: w,
          height: h,
          sizeMb: sizeMb,
          checks: checks,
          score: score,
          ready: failCount === 0 && score >= 75
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not decode image file.'));
      };
      img.src = url;
    });
  }

  // ─── ISRC Generator & Formatter ──────────────────────────────────────────
  /**
   * generateIsrc(country, registrant, year, designation)
   * e.g. generateIsrc('IN', 'RGS', 26, 1) -> 'IN-RGS-26-00001'
   */
  function generateIsrc(country, registrant, year, designation) {
    country = (country || 'IN').toUpperCase().slice(0, 2);
    while (country.length < 2) country += 'X';

    registrant = (registrant || 'RGS').toUpperCase().slice(0, 3);
    while (registrant.length < 3) registrant += '0';

    var yStr = String(year != null ? year : new Date().getFullYear() % 100);
    if (yStr.length > 2) yStr = yStr.slice(-2);
    while (yStr.length < 2) yStr = '0' + yStr;

    var desStr = String(designation != null ? designation : 1);
    while (desStr.length < 5) desStr = '0' + desStr;
    if (desStr.length > 5) desStr = desStr.slice(-5);

    var code = country + registrant + yStr + desStr;
    var formatted = country + '-' + registrant + '-' + yStr + '-' + desStr;

    return {
      raw: code,
      formatted: formatted,
      country: country,
      registrant: registrant,
      year: yStr,
      designation: desStr,
      valid: /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(code)
    };
  }

  // ─── Distribution Checklist ──────────────────────────────────────────────
  var DISTRIBUTION_CHECKLIST = [
    { id: 'master_audio', label: 'Master WAV (24-bit 48kHz or 44.1kHz lossless)', group: 'Audio' },
    { id: 'master_check', label: 'Passed Master Check with Grade A / Release-Ready', group: 'Audio' },
    { id: 'artwork_3000', label: 'Cover art validated 3000×3000 px 1:1 RGB JPG', group: 'Artwork' },
    { id: 'metadata_titles', label: 'Accurate Title, Primary Artist & Kannada Lyricist tags', group: 'Metadata' },
    { id: 'isrc_code', label: 'ISRC code assigned (CC-XXX-YY-NNNNN)', group: 'Metadata' },
    { id: 'upc_ean', label: 'UPC / Barcode generated by distributor', group: 'Metadata' },
    { id: 'spotify', label: 'Submitted to Spotify for Artists (4+ weeks ahead for playlist pitching)', group: 'Stores' },
    { id: 'apple_music', label: 'Apple Music / iTunes Lossless delivery ready', group: 'Stores' },
    { id: 'youtube_content_id', label: 'YouTube Music & Content ID fingerprint enabled', group: 'Stores' },
    { id: 'jiosaavn_wynk', label: 'Indian streaming stores (JioSaavn, Wynk, Gaana) delivery confirmed', group: 'Stores' },
    { id: 'social_audio', label: 'Instagram & TikTok audio snippet synced (15s chorus hook)', group: 'Social' }
  ];

  var API = {
    validateArtwork: validateArtwork,
    generateIsrc: generateIsrc,
    DISTRIBUTION_CHECKLIST: DISTRIBUTION_CHECKLIST
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.RELEASE_PLANNER = API;
})(typeof window !== 'undefined' ? window : globalThis);
