/**
 * master-check.js — Audio master quality analysis engine (browser).
 * Implements LUFS (ITU-R BS.1770-ish), true peak, DR, spectrum, stereo,
 * silence/noise, clipping, format & metadata checks. Zero dependencies.
 *
 * Exposes window.MASTER_CHECK
 */
'use strict';

(function (root) {
  // ─── Platform loudness targets (Integrated LUFS) ─────────────────────────
  var PLATFORMS = [
    { id: 'spotify',      name: 'Spotify',         target: -14, note: 'normalized' },
    { id: 'apple',        name: 'Apple Music',     target: -16, note: 'normalized' },
    { id: 'youtube',      name: 'YouTube',         target: -14, note: 'normalized' },
    { id: 'tidal',        name: 'Tidal',           target: -14, note: 'normalized' },
    { id: 'amazon',       name: 'Amazon Music',    target: -14, note: 'normalized' },
    { id: 'cd',           name: 'CD',              target: -10.5, targetMin: -12, targetMax: -9, note: 'typical' },
    { id: 'broadcast',    name: 'Broadcast (EBU)', target: -23, note: 'EBU R128' }
  ];

  var GENRE_DR = {
    'pop-edm':    { name: 'Pop / EDM',       min: 6, max: 8,  failBelow: 4 },
    'rock':       { name: 'Rock',            min: 8, max: 10, failBelow: 5 },
    'hiphop':     { name: 'Hip-Hop / Trap',  min: 5, max: 8,  failBelow: 4 },
    'jazz':       { name: 'Jazz / Classical', min: 12, max: 20, failBelow: 8 },
    'general':    { name: 'General / Other', min: 7, max: 14, failBelow: 5 }
  };

  var LOSSY_EXTS = { mp3: 1, ogg: 1, opus: 1, aac: 1, m4a: 1, wma: 1, webm: 1 };
  var LOSSLESS_EXTS = { wav: 1, wave: 1, flac: 1, aiff: 1, aif: 1, aifc: 1, caf: 1 };

  // ─── Utilities ───────────────────────────────────────────────────────────
  function db(x) {
    if (x <= 0) return -Infinity;
    return 20 * Math.log10(x);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function statusOf(pass, warn) {
    if (pass) return 'pass';
    if (warn) return 'warn';
    return 'fail';
  }

  function scoreOf(st) {
    if (st === 'pass') return 100;
    if (st === 'warn') return 50;
    return 0;
  }

  function gradeOf(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  function gradeLabel(g) {
    return ({
      A: 'Excellent — Ready for release',
      B: 'Good — Minor issues, acceptable',
      C: 'Fair — Some issues need attention',
      D: 'Poor — Significant issues',
      F: 'Fail — Major problems, re-master recommended'
    })[g] || '';
  }

  function fmtDb(v, digits) {
    if (!isFinite(v)) return '−∞';
    digits = digits == null ? 1 : digits;
    var s = v.toFixed(digits);
    return (v > 0 ? '+' : '') + s + ' dB';
  }

  function fmtLufs(v) {
    if (!isFinite(v)) return '−∞ LUFS';
    return v.toFixed(1) + ' LUFS';
  }

  function fmtDur(sec) {
    if (!isFinite(sec)) return '—';
    var m = Math.floor(sec / 60);
    var s = (sec - m * 60).toFixed(2);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  // ─── File format detection ───────────────────────────────────────────────
  function detectFormat(file, buffer) {
    var name = (file && file.name) || '';
    var ext = (name.split('.').pop() || '').toLowerCase();
    var mime = (file && file.type) || '';
    var u8 = new Uint8Array(buffer.slice(0, 16));
    var magic = '';
    var bitDepth = null;
    var containerSampleRate = null;
    var channels = null;
    var integrity = 'ok';
    var formatName = ext.toUpperCase() || 'UNKNOWN';

    // Magic bytes
    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
      // RIFF
      var riffType = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]);
      if (riffType === 'WAVE') {
        formatName = 'WAV';
        var wavInfo = parseWavHeader(buffer);
        if (wavInfo) {
          bitDepth = wavInfo.bitsPerSample;
          containerSampleRate = wavInfo.sampleRate;
          channels = wavInfo.channels;
          if (wavInfo.formatTag === 3) formatName = 'WAV (IEEE float)';
          if (wavInfo.formatTag === 1) formatName = 'WAV (PCM)';
        } else {
          integrity = 'suspect';
        }
      } else {
        formatName = 'RIFF/' + riffType;
      }
    } else if (u8[0] === 0x66 && u8[1] === 0x4C && u8[2] === 0x61 && u8[3] === 0x43) {
      formatName = 'FLAC';
    } else if (u8[0] === 0x4F && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) {
      formatName = 'OGG';
    } else if (
      (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) || // ID3
      (u8[0] === 0xFF && (u8[1] & 0xE0) === 0xE0)
    ) {
      formatName = 'MP3';
    } else if (u8[0] === 0x66 && u8[1] === 0x74 && u8[2] === 0x79 && u8[3] === 0x70) {
      formatName = 'MP4/M4A';
    } else if (
      (u8[0] === 0x46 && u8[1] === 0x4F && u8[2] === 0x52 && u8[3] === 0x4D) ||
      (u8[0] === 0x46 && u8[1] === 0x4F && u8[2] === 0x52 && u8[3] === 0x4D)
    ) {
      formatName = 'AIFF';
    } else if (ext === 'aiff' || ext === 'aif') {
      formatName = 'AIFF';
    } else if (ext) {
      formatName = ext.toUpperCase();
    }

    // AIFF FORM
    if (u8[0] === 0x46 && u8[1] === 0x4F && u8[2] === 0x52 && u8[3] === 0x4D) {
      formatName = 'AIFF';
    }

    var isLossy = !!(LOSSY_EXTS[ext] || /mp3|ogg|aac|m4a|opus|wma|webm/i.test(formatName + mime));
    var isLossless = !!(LOSSLESS_EXTS[ext] || /wav|flac|aiff|caf/i.test(formatName));

    return {
      name: name,
      ext: ext,
      mime: mime,
      formatName: formatName,
      bitDepth: bitDepth,
      containerSampleRate: containerSampleRate,
      channels: channels,
      size: file ? file.size : buffer.byteLength,
      isLossy: isLossy,
      isLossless: isLossless,
      integrity: integrity
    };
  }

  function parseWavHeader(buffer) {
    try {
      var view = new DataView(buffer);
      if (view.byteLength < 44) return null;
      if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'RIFF') return null;
      if (String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)) !== 'WAVE') return null;

      var offset = 12;
      var formatTag = null, channels = null, sampleRate = null, bitsPerSample = null;
      while (offset + 8 <= view.byteLength) {
        var id = String.fromCharCode(
          view.getUint8(offset), view.getUint8(offset + 1),
          view.getUint8(offset + 2), view.getUint8(offset + 3)
        );
        var size = view.getUint32(offset + 4, true);
        if (id === 'fmt ') {
          formatTag = view.getUint16(offset + 8, true);
          channels = view.getUint16(offset + 10, true);
          sampleRate = view.getUint32(offset + 12, true);
          bitsPerSample = view.getUint16(offset + 22, true);
        }
        offset += 8 + size + (size % 2);
        if (id === 'data') break;
      }
      if (formatTag == null) return null;
      return { formatTag: formatTag, channels: channels, sampleRate: sampleRate, bitsPerSample: bitsPerSample };
    } catch (e) {
      return null;
    }
  }

  // ─── Lightweight metadata (ID3v2 + common) ───────────────────────────────
  function readMetadata(buffer, format) {
    var meta = {
      title: null, artist: null, albumArtist: null, album: null,
      track: null, year: null, genre: null, isrc: null,
      artwork: null, artworkWidth: null, artworkHeight: null
    };

    try {
      var u8 = new Uint8Array(buffer);
      // ID3v2
      if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
        parseId3v2(u8, meta);
      }
      // RIFF INFO / LIST
      if (format && /WAV/i.test(format.formatName)) {
        parseRiffInfo(buffer, meta);
      }
      // FLAC Vorbis comments (basic)
      if (format && /FLAC/i.test(format.formatName)) {
        parseFlacComments(u8, meta);
      }
    } catch (e) { /* ignore parse errors */ }

    return meta;
  }

  function id3Text(data) {
    if (!data || !data.length) return null;
    var enc = data[0];
    var bytes = data.subarray(1);
    try {
      if (enc === 0) {
        // ISO-8859-1
        var s = '';
        for (var i = 0; i < bytes.length; i++) {
          if (bytes[i] === 0) break;
          s += String.fromCharCode(bytes[i]);
        }
        return s || null;
      }
      if (enc === 3) {
        // UTF-8
        var dec = new TextDecoder('utf-8');
        return dec.decode(bytes).replace(/\0/g, '').trim() || null;
      }
      if (enc === 1 || enc === 2) {
        // UTF-16
        var dec2 = new TextDecoder(enc === 1 ? 'utf-16' : 'utf-16be');
        return dec2.decode(bytes).replace(/\0/g, '').trim() || null;
      }
    } catch (e) {}
    return null;
  }

  function parseId3v2(u8, meta) {
    var ver = u8[3];
    var tagSize = ((u8[6] & 0x7f) << 21) | ((u8[7] & 0x7f) << 14) | ((u8[8] & 0x7f) << 7) | (u8[9] & 0x7f);
    var pos = 10;
    if (u8[5] & 0x40) {
      // extended header
      var eh = ((u8[10] & 0x7f) << 21) | ((u8[11] & 0x7f) << 14) | ((u8[12] & 0x7f) << 7) | (u8[13] & 0x7f);
      pos += 4 + eh;
    }
    var end = Math.min(10 + tagSize, u8.length);
    while (pos + 10 < end) {
      var id = String.fromCharCode(u8[pos], u8[pos + 1], u8[pos + 2], u8[pos + 3]);
      if (id === '\0\0\0\0' || id.charCodeAt(0) === 0) break;
      var size;
      if (ver >= 4) {
        size = ((u8[pos + 4] & 0x7f) << 21) | ((u8[pos + 5] & 0x7f) << 14) |
               ((u8[pos + 6] & 0x7f) << 7) | (u8[pos + 7] & 0x7f);
      } else {
        size = (u8[pos + 4] << 24) | (u8[pos + 5] << 16) | (u8[pos + 6] << 8) | u8[pos + 7];
      }
      if (size <= 0 || pos + 10 + size > u8.length) break;
      var data = u8.subarray(pos + 10, pos + 10 + size);
      if (id === 'TIT2') meta.title = id3Text(data);
      else if (id === 'TPE1') meta.artist = id3Text(data);
      else if (id === 'TPE2') meta.albumArtist = id3Text(data);
      else if (id === 'TALB') meta.album = id3Text(data);
      else if (id === 'TRCK') meta.track = id3Text(data);
      else if (id === 'TYER' || id === 'TDRC') meta.year = id3Text(data);
      else if (id === 'TCON') meta.genre = id3Text(data);
      else if (id === 'TSRC') meta.isrc = id3Text(data);
      else if (id === 'APIC') {
        meta.artwork = true;
        // skip text encoding + mime + type + desc to find image — optional dims unknown without decode
      }
      pos += 10 + size;
    }
  }

  function parseRiffInfo(buffer, meta) {
    var view = new DataView(buffer);
    var offset = 12;
    while (offset + 8 <= view.byteLength) {
      var id = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1),
        view.getUint8(offset + 2), view.getUint8(offset + 3)
      );
      var size = view.getUint32(offset + 4, true);
      if (id === 'LIST' && offset + 12 <= view.byteLength) {
        var listType = String.fromCharCode(
          view.getUint8(offset + 8), view.getUint8(offset + 9),
          view.getUint8(offset + 10), view.getUint8(offset + 11)
        );
        if (listType === 'INFO') {
          var p = offset + 12;
          var listEnd = offset + 8 + size;
          while (p + 8 <= listEnd && p + 8 <= view.byteLength) {
            var cid = String.fromCharCode(
              view.getUint8(p), view.getUint8(p + 1),
              view.getUint8(p + 2), view.getUint8(p + 3)
            );
            var csz = view.getUint32(p + 4, true);
            var bytes = new Uint8Array(buffer, p + 8, Math.min(csz, view.byteLength - p - 8));
            var text = '';
            for (var i = 0; i < bytes.length; i++) {
              if (bytes[i] === 0) break;
              text += String.fromCharCode(bytes[i]);
            }
            text = text.trim();
            if (cid === 'INAM') meta.title = text;
            else if (cid === 'IART') meta.artist = text;
            else if (cid === 'IPRD') meta.album = text;
            else if (cid === 'ICRD') meta.year = text;
            else if (cid === 'IGNR') meta.genre = text;
            else if (cid === 'ITRK') meta.track = text;
            p += 8 + csz + (csz % 2);
          }
        }
      }
      if (id === 'data') break;
      offset += 8 + size + (size % 2);
      if (offset <= 12) break;
    }
  }

  function parseFlacComments(u8, meta) {
    // skip fLaC
    var pos = 4;
    while (pos + 4 < u8.length) {
      var header = u8[pos];
      var isLast = (header & 0x80) !== 0;
      var type = header & 0x7f;
      var size = (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3];
      pos += 4;
      if (type === 4 && pos + size <= u8.length) {
        // VORBIS_COMMENT
        var dv = new DataView(u8.buffer, u8.byteOffset + pos, size);
        var vendorLen = dv.getUint32(0, true);
        var o = 4 + vendorLen;
        if (o + 4 > size) break;
        var n = dv.getUint32(o, true);
        o += 4;
        for (var i = 0; i < n && o + 4 <= size; i++) {
          var len = dv.getUint32(o, true);
          o += 4;
          if (o + len > size) break;
          var s = '';
          for (var j = 0; j < len; j++) s += String.fromCharCode(u8[pos + o + j]);
          o += len;
          var eq = s.indexOf('=');
          if (eq < 0) continue;
          var key = s.slice(0, eq).toUpperCase();
          var val = s.slice(eq + 1);
          if (key === 'TITLE') meta.title = val;
          else if (key === 'ARTIST') meta.artist = val;
          else if (key === 'ALBUMARTIST') meta.albumArtist = val;
          else if (key === 'ALBUM') meta.album = val;
          else if (key === 'TRACKNUMBER') meta.track = val;
          else if (key === 'DATE' || key === 'YEAR') meta.year = val;
          else if (key === 'GENRE') meta.genre = val;
          else if (key === 'ISRC') meta.isrc = val;
        }
      }
      if (type === 6) meta.artwork = true; // PICTURE block
      pos += size;
      if (isLast) break;
    }
  }

  function validateIsrc(isrc) {
    if (!isrc) return { valid: false, reason: 'missing' };
    var cleaned = String(isrc).replace(/[-\s]/g, '').toUpperCase();
    if (!/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(cleaned)) {
      return { valid: false, reason: 'invalid format (expect CC-XXX-YY-NNNNN)' };
    }
    return {
      valid: true,
      formatted: cleaned.slice(0, 2) + '-' + cleaned.slice(2, 5) + '-' + cleaned.slice(5, 7) + '-' + cleaned.slice(7)
    };
  }

  // ─── K-weighting (BS.1770 simplified biquad cascade) ─────────────────────
  // Pre-filter + RLB highpass, bilinear-transformed coefficients at given sr.
  function designKWeight(sr) {
    // Stage 1: high-shelf pre-filter (~+4 dB above 1.5 kHz)
    // Stage 2: high-pass RLB (~100 Hz)
    // Coefficients adapted from BS.1770 reference at 48 kHz, then resampled
    // via bilinear with pre-warping for arbitrary sample rates.
    function biquadHighShelf(fs, f0, gainDb, Q) {
      var A = Math.pow(10, gainDb / 40);
      var w0 = 2 * Math.PI * f0 / fs;
      var alpha = Math.sin(w0) / (2 * Q);
      var cosw = Math.cos(w0);
      var b0 = A * ((A + 1) + (A - 1) * cosw + 2 * Math.sqrt(A) * alpha);
      var b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
      var b2 = A * ((A + 1) + (A - 1) * cosw - 2 * Math.sqrt(A) * alpha);
      var a0 = (A + 1) - (A - 1) * cosw + 2 * Math.sqrt(A) * alpha;
      var a1 = 2 * ((A - 1) - (A + 1) * cosw);
      var a2 = (A + 1) - (A - 1) * cosw - 2 * Math.sqrt(A) * alpha;
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
    }
    function biquadHighPass(fs, f0, Q) {
      var w0 = 2 * Math.PI * f0 / fs;
      var alpha = Math.sin(w0) / (2 * Q);
      var cosw = Math.cos(w0);
      var b0 = (1 + cosw) / 2;
      var b1 = -(1 + cosw);
      var b2 = (1 + cosw) / 2;
      var a0 = 1 + alpha;
      var a1 = -2 * cosw;
      var a2 = 1 - alpha;
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
    }
    return [
      biquadHighShelf(sr, 1681.974450955533, 3.999843853973347, 0.7071752369554196),
      biquadHighPass(sr, 38.13547087602444, 0.5003270373238773)
    ];
  }

  function applyBiquad(input, coef) {
    var n = input.length;
    var out = new Float32Array(n);
    var b0 = coef.b0, b1 = coef.b1, b2 = coef.b2, a1 = coef.a1, a2 = coef.a2;
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < n; i++) {
      var x = input[i];
      var y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      out[i] = y;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
    }
    return out;
  }

  function kWeightChannel(ch, sr) {
    var stages = designKWeight(sr);
    var y = ch;
    for (var s = 0; s < stages.length; s++) y = applyBiquad(y, stages[s]);
    return y;
  }

  // Channel weights for BS.1770 (stereo L/R = 1.0)
  function channelWeight(index, channelCount) {
    if (channelCount <= 2) return 1.0;
    // surround: LFE ignored, surrounds *1.41 — simplified: all 1.0
    return 1.0;
  }

  function meanSquareGated(channels, sr) {
    // Returns integrated loudness, short-term series, momentary series, LRA
    var nCh = channels.length;
    var n = channels[0].length;
    var weighted = [];
    for (var c = 0; c < nCh; c++) weighted.push(kWeightChannel(channels[c], sr));

    var blockMs = 400; // momentary
    var hopMs = 100;
    var blockN = Math.max(1, Math.round(sr * blockMs / 1000));
    var hopN = Math.max(1, Math.round(sr * hopMs / 1000));
    var absThresh = Math.pow(10, (-70 + 0.691) / 10); // -70 LUFS absolute gate in linear MS

    var momentary = []; // { t, lufs, ms }
    for (var i = 0; i + blockN <= n; i += hopN) {
      var msSum = 0;
      for (var c = 0; c < nCh; c++) {
        var w = channelWeight(c, nCh);
        var acc = 0;
        var ch = weighted[c];
        for (var j = 0; j < blockN; j++) {
          var v = ch[i + j];
          acc += v * v;
        }
        msSum += w * (acc / blockN);
      }
      var lufs = -0.691 + 10 * Math.log10(Math.max(msSum, 1e-20));
      momentary.push({ t: i / sr, ms: msSum, lufs: lufs });
    }

    // Absolute gate
    var gated = [];
    for (var k = 0; k < momentary.length; k++) {
      if (momentary[k].ms > absThresh) gated.push(momentary[k]);
    }

    // Relative gate: −10 LU relative to absolute-gated mean
    var meanMs = 0;
    for (var k = 0; k < gated.length; k++) meanMs += gated[k].ms;
    meanMs = gated.length ? meanMs / gated.length : 0;
    var relThresh = meanMs * Math.pow(10, -10 / 10);
    var gated2 = [];
    for (var k = 0; k < gated.length; k++) {
      if (gated[k].ms > relThresh) gated2.push(gated[k]);
    }

    var integMs = 0;
    for (var k = 0; k < gated2.length; k++) integMs += gated2[k].ms;
    integMs = gated2.length ? integMs / gated2.length : 0;
    var integrated = gated2.length ? (-0.691 + 10 * Math.log10(Math.max(integMs, 1e-20))) : -Infinity;

    // Short-term LUFS: 3 s window, 100 ms hop
    var stN = Math.max(1, Math.round(sr * 3));
    var shortTerm = [];
    var stMax = -Infinity;
    for (var i = 0; i + stN <= n; i += hopN) {
      var msSum = 0;
      for (var c = 0; c < nCh; c++) {
        var w = channelWeight(c, nCh);
        var acc = 0;
        var ch = weighted[c];
        for (var j = 0; j < stN; j++) {
          var v = ch[i + j];
          acc += v * v;
        }
        msSum += w * (acc / stN);
      }
      var lufs = -0.691 + 10 * Math.log10(Math.max(msSum, 1e-20));
      shortTerm.push({ t: i / sr, lufs: lufs });
      if (lufs > stMax) stMax = lufs;
    }

    // LRA from short-term distribution (10th–95th percentile of gated ST)
    var stVals = shortTerm.map(function (x) { return x.lufs; }).filter(function (v) { return isFinite(v) && v > -70; });
    stVals.sort(function (a, b) { return a - b; });
    var lra = 0;
    if (stVals.length > 4) {
      // relative gate on ST: mean of abs-gated then −20 LU
      var stMean = 0;
      var stG = stVals.filter(function (v) { return v > -70; });
      for (var i = 0; i < stG.length; i++) stMean += stG[i];
      stMean = stG.length ? stMean / stG.length : -70;
      var stRel = stMean - 20;
      var stG2 = stG.filter(function (v) { return v >= stRel; });
      stG2.sort(function (a, b) { return a - b; });
      if (stG2.length > 1) {
        var p10 = stG2[Math.floor(0.10 * (stG2.length - 1))];
        var p95 = stG2[Math.floor(0.95 * (stG2.length - 1))];
        lra = p95 - p10;
      }
    }

    // Momentary max
    var momMax = -Infinity;
    for (var k = 0; k < momentary.length; k++) {
      if (momentary[k].lufs > momMax) momMax = momentary[k].lufs;
    }

    // Downsample series for UI (max ~400 points)
    function downsample(arr, maxPts, key) {
      if (arr.length <= maxPts) {
        return arr.map(function (x) { return { t: x.t, v: key ? x[key] : x.lufs }; });
      }
      var step = arr.length / maxPts;
      var out = [];
      for (var i = 0; i < maxPts; i++) {
        var idx = Math.floor(i * step);
        var x = arr[idx];
        out.push({ t: x.t, v: key ? x[key] : x.lufs });
      }
      return out;
    }

    return {
      integrated: integrated,
      shortTermMax: stMax,
      momentaryMax: momMax,
      lra: lra,
      shortTermSeries: downsample(shortTerm, 400),
      momentarySeries: downsample(momentary, 400)
    };
  }

  // ─── True peak (4× oversample via Catmull-Rom interpolation) ─────────────
  function truePeakDbTP(channels) {
    var peak = 0;
    for (var c = 0; c < channels.length; c++) {
      var ch = channels[c];
      var n = ch.length;
      for (var i = 0; i < n - 1; i++) {
        var a = ch[i], b = ch[i + 1];
        var a0 = Math.abs(a), b0 = Math.abs(b);
        if (a0 > peak) peak = a0;
        if (b0 > peak) peak = b0;
        // 3 interpolated points
        for (var k = 1; k < 4; k++) {
          var t = k / 4;
          // Catmull-Rom / cubic with neighbors when available
          var ym1 = i > 0 ? ch[i - 1] : a;
          var yp2 = i + 2 < n ? ch[i + 2] : b;
          var t2 = t * t, t3 = t2 * t;
          var y = 0.5 * ((2 * a) + (-ym1 + b) * t + (2 * ym1 - 5 * a + 4 * b - yp2) * t2 + (-ym1 + 3 * a - 3 * b + yp2) * t3);
          var ay = Math.abs(y);
          if (ay > peak) peak = ay;
        }
      }
    }
    return db(peak);
  }

  // ─── Peak / RMS / crest / DR ─────────────────────────────────────────────
  function analyzeLevels(channels, sr) {
    var nCh = channels.length;
    var n = channels[0].length;
    var peak = 0;
    var sumSq = 0;
    var count = 0;

    for (var c = 0; c < nCh; c++) {
      var ch = channels[c];
      for (var i = 0; i < n; i++) {
        var a = Math.abs(ch[i]);
        if (a > peak) peak = a;
        sumSq += ch[i] * ch[i];
        count++;
      }
    }
    var rms = Math.sqrt(sumSq / Math.max(1, count));
    var peakDb = db(peak);
    var rmsDb = db(rms);
    var crest = peakDb - rmsDb; // dB

    // DR-like: split into 3s blocks, take RMS of each (max abs across ch),
    // use 95th percentile peak of blocks vs RMS of top 20% loudest
    var blockN = Math.max(1, Math.round(sr * 3));
    var blockRms = [];
    var blockPeak = [];
    for (var i = 0; i + blockN <= n; i += blockN) {
      var bSum = 0, bPeak = 0, bCnt = 0;
      for (var c = 0; c < nCh; c++) {
        var ch = channels[c];
        for (var j = 0; j < blockN; j++) {
          var v = ch[i + j];
          var a = Math.abs(v);
          if (a > bPeak) bPeak = a;
          bSum += v * v;
          bCnt++;
        }
      }
      blockRms.push(Math.sqrt(bSum / Math.max(1, bCnt)));
      blockPeak.push(bPeak);
    }
    // fallback for short files
    if (!blockRms.length) {
      blockRms.push(rms);
      blockPeak.push(peak);
    }
    var indexed = blockRms.map(function (r, i) { return { r: r, p: blockPeak[i] }; });
    indexed.sort(function (a, b) { return b.r - a.r; });
    var topN = Math.max(1, Math.ceil(indexed.length * 0.2));
    var topSum = 0, topPeak = 0;
    for (var i = 0; i < topN; i++) {
      topSum += indexed[i].r * indexed[i].r;
      if (indexed[i].p > topPeak) topPeak = indexed[i].p;
    }
    var topRms = Math.sqrt(topSum / topN);
    var dr = db(topPeak) - db(topRms);
    if (!isFinite(dr)) dr = crest;

    return {
      peak: peak,
      peakDb: peakDb,
      rms: rms,
      rmsDb: rmsDb,
      crestFactor: crest,
      dynamicRange: dr
    };
  }

  // ─── Clipping detection ──────────────────────────────────────────────────
  function detectClipping(channels) {
    var nCh = channels.length;
    var n = channels[0].length;
    var thresh = 0.999; // near full scale
    var clippedSamples = 0;
    var clipRuns = 0;
    var inRun = false;
    var maxRun = 0;
    var runLen = 0;
    var clipPositions = []; // times later

    for (var i = 0; i < n; i++) {
      var hit = false;
      for (var c = 0; c < nCh; c++) {
        if (Math.abs(channels[c][i]) >= thresh) { hit = true; break; }
      }
      if (hit) {
        clippedSamples++;
        if (!inRun) {
          inRun = true;
          runLen = 1;
          clipRuns++;
          if (clipPositions.length < 50) clipPositions.push(i);
        } else {
          runLen++;
        }
      } else {
        if (inRun) {
          if (runLen > maxRun) maxRun = runLen;
          inRun = false;
        }
      }
    }
    if (inRun && runLen > maxRun) maxRun = runLen;

    var severity = 'None';
    if (clippedSamples === 0) severity = 'None';
    else if (clippedSamples < 10 || maxRun < 3) severity = 'Minor';
    else if (clippedSamples < 200 || maxRun < 20) severity = 'Major';
    else severity = 'Critical';

    return {
      clippedSamples: clippedSamples,
      clipRuns: clipRuns,
      maxRun: maxRun,
      severity: severity,
      positions: clipPositions
    };
  }

  // ─── Spectrum / DC / bands ───────────────────────────────────────────────
  function analyzeSpectrum(channels, sr) {
    // Average magnitude spectrum via Welch (several windows)
    var nCh = channels.length;
    var n = channels[0].length;
    var fftSize = 4096;
    var hop = fftSize;
    var half = fftSize / 2;
    var avg = new Float64Array(half);
    var windows = 0;
    var maxWindows = 48;
    var step = Math.max(hop, Math.floor(n / maxWindows));

    // Hann window
    var win = new Float32Array(fftSize);
    for (var i = 0; i < fftSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));

    // Mixdown mono for spectrum
    for (var start = 0; start + fftSize <= n && windows < maxWindows; start += step) {
      var re = new Float64Array(fftSize);
      var im = new Float64Array(fftSize);
      for (var i = 0; i < fftSize; i++) {
        var s = 0;
        for (var c = 0; c < nCh; c++) s += channels[c][start + i];
        s /= nCh;
        re[i] = s * win[i];
        im[i] = 0;
      }
      fftRadix2(re, im);
      for (var k = 0; k < half; k++) {
        avg[k] += re[k] * re[k] + im[k] * im[k];
      }
      windows++;
    }
    if (!windows) {
      // pad short
      var re = new Float64Array(fftSize);
      var im = new Float64Array(fftSize);
      for (var i = 0; i < Math.min(n, fftSize); i++) {
        var s = 0;
        for (var c = 0; c < nCh; c++) s += channels[c][i];
        re[i] = (s / nCh) * win[i];
      }
      fftRadix2(re, im);
      for (var k = 0; k < half; k++) avg[k] = re[k] * re[k] + im[k] * im[k];
      windows = 1;
    }
    for (var k = 0; k < half; k++) avg[k] = avg[k] / windows;

    // DC offset from time domain
    var dcSum = 0, dcCnt = 0;
    for (var c = 0; c < nCh; c++) {
      var ch = channels[c];
      for (var i = 0; i < n; i++) { dcSum += ch[i]; dcCnt++; }
    }
    var dc = dcSum / Math.max(1, dcCnt);
    var dcDb = db(Math.abs(dc));

    // Band energies
    function bandEnergy(f0, f1) {
      var k0 = Math.max(1, Math.floor(f0 * fftSize / sr));
      var k1 = Math.min(half - 1, Math.ceil(f1 * fftSize / sr));
      var e = 0, cnt = 0;
      for (var k = k0; k <= k1; k++) { e += avg[k]; cnt++; }
      return cnt ? e / cnt : 0;
    }

    var total = bandEnergy(20, 20000) || 1e-20;
    var subBass = bandEnergy(20, 60);
    var lowEnd = bandEnergy(20, 30);
    var highEnd = bandEnergy(16000, 20000);
    var mid = bandEnergy(200, 5000);
    var low = bandEnergy(60, 250);
    var presence = bandEnergy(2000, 6000);
    var air = bandEnergy(10000, 16000);

    // Spectrum curve for UI (log-ish sample of bins)
    var curve = [];
    var nPts = 120;
    for (var i = 0; i < nPts; i++) {
      var t = i / (nPts - 1);
      var freq = 20 * Math.pow(20000 / 20, t);
      var k = Math.min(half - 1, Math.max(1, Math.round(freq * fftSize / sr)));
      var mag = avg[k];
      var d = 10 * Math.log10(Math.max(mag, 1e-20));
      curve.push({ f: freq, db: d });
    }

    // Normalize curve relative to peak for display
    var maxD = -Infinity;
    for (var i = 0; i < curve.length; i++) if (curve[i].db > maxD) maxD = curve[i].db;
    for (var i = 0; i < curve.length; i++) curve[i].dbRel = curve[i].db - maxD;

    return {
      dc: dc,
      dcDb: dcDb,
      subBassRatio: subBass / total,
      lowEndRatio: lowEnd / total,
      highEndRatio: highEnd / total,
      lowRatio: low / total,
      midRatio: mid / total,
      presenceRatio: presence / total,
      airRatio: air / total,
      subBassDb: 10 * Math.log10(Math.max(subBass, 1e-20)),
      lowEndDb: 10 * Math.log10(Math.max(lowEnd, 1e-20)),
      highEndDb: 10 * Math.log10(Math.max(highEnd, 1e-20)),
      curve: curve,
      // spectrogram-lite: a few time slices
      spectrogram: buildSpectrogram(channels, sr, 64, 48)
    };
  }

  function buildSpectrogram(channels, sr, nTime, nFreq) {
    var nCh = channels.length;
    var n = channels[0].length;
    var fftSize = 2048;
    var half = fftSize / 2;
    var win = new Float32Array(fftSize);
    for (var i = 0; i < fftSize; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    var hop = Math.max(1, Math.floor((n - fftSize) / Math.max(1, nTime - 1)));
    var rows = [];
    for (var t = 0; t < nTime; t++) {
      var start = Math.min(n - fftSize, t * hop);
      if (start < 0) start = 0;
      var re = new Float64Array(fftSize);
      var im = new Float64Array(fftSize);
      for (var i = 0; i < fftSize && start + i < n; i++) {
        var s = 0;
        for (var c = 0; c < nCh; c++) s += channels[c][start + i];
        re[i] = (s / nCh) * win[i];
      }
      fftRadix2(re, im);
      var col = [];
      for (var f = 0; f < nFreq; f++) {
        var frac = f / (nFreq - 1);
        var freq = 20 * Math.pow(sr / 2 / 20, frac);
        var k = Math.min(half - 1, Math.max(1, Math.round(freq * fftSize / sr)));
        var mag = re[k] * re[k] + im[k] * im[k];
        col.push(10 * Math.log10(Math.max(mag, 1e-20)));
      }
      rows.push(col);
    }
    return { rows: rows, nTime: nTime, nFreq: nFreq };
  }

  // In-place radix-2 FFT
  function fftRadix2(re, im) {
    var n = re.length;
    var j = 0;
    for (var i = 0; i < n - 1; i++) {
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
      var k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1;
      var tableStep = Math.PI * 2 / size;
      for (var i = 0; i < n; i += size) {
        for (var k = 0; k < half; k++) {
          var angle = tableStep * k;
          var wr = Math.cos(angle), wi = -Math.sin(angle);
          var ur = re[i + k], ui = im[i + k];
          var vr = re[i + k + half] * wr - im[i + k + half] * wi;
          var vi = re[i + k + half] * wi + im[i + k + half] * wr;
          re[i + k] = ur + vr;
          im[i + k] = ui + vi;
          re[i + k + half] = ur - vr;
          im[i + k + half] = ui - vi;
        }
      }
    }
  }

  // ─── Stereo field ────────────────────────────────────────────────────────
  function analyzeStereo(channels) {
    if (channels.length < 2) {
      return {
        mono: true,
        correlation: 1,
        width: 0,
        midRms: 0,
        sideRms: 0,
        lrBalanceDb: 0,
        phaseIssues: false,
        correlationSeries: []
      };
    }
    var L = channels[0], R = channels[1];
    var n = Math.min(L.length, R.length);
    var sumL = 0, sumR = 0, sumLR = 0, sumL2 = 0, sumR2 = 0;
    var sumMid2 = 0, sumSide2 = 0;
    for (var i = 0; i < n; i++) {
      var l = L[i], r = R[i];
      sumL += l; sumR += r;
      sumLR += l * r;
      sumL2 += l * l;
      sumR2 += r * r;
      var mid = 0.5 * (l + r);
      var side = 0.5 * (l - r);
      sumMid2 += mid * mid;
      sumSide2 += side * side;
    }
    var denom = Math.sqrt(sumL2 * sumR2);
    var corr = denom > 0 ? (sumLR / denom) : 1;

    var rmsL = Math.sqrt(sumL2 / n);
    var rmsR = Math.sqrt(sumR2 / n);
    var bal = db(rmsL + 1e-12) - db(rmsR + 1e-12);
    var midRms = Math.sqrt(sumMid2 / n);
    var sideRms = Math.sqrt(sumSide2 / n);
    var width = midRms > 0 ? (sideRms / midRms) : 0;

    // Correlation over time (1s windows)
    var srEst = n; // caller will scale — we use sample index; series uses fraction
    var win = Math.max(1, Math.floor(n / 100));
    var series = [];
    for (var i = 0; i + win <= n; i += win) {
      var sLR = 0, sL2 = 0, sR2 = 0;
      for (var j = 0; j < win; j++) {
        var l = L[i + j], r = R[i + j];
        sLR += l * r; sL2 += l * l; sR2 += r * r;
      }
      var d = Math.sqrt(sL2 * sR2);
      var c = d > 0 ? sLR / d : 1;
      series.push({ t: i / n, v: c });
    }
    var minCorr = 1;
    for (var i = 0; i < series.length; i++) if (series[i].v < minCorr) minCorr = series[i].v;

    return {
      mono: false,
      correlation: corr,
      minCorrelation: minCorr,
      width: width,
      midRms: midRms,
      sideRms: sideRms,
      lrBalanceDb: bal,
      phaseIssues: corr < 0 || minCorr < 0,
      correlationSeries: series
    };
  }

  // ─── Silence & noise ─────────────────────────────────────────────────────
  function analyzeSilenceNoise(channels, sr) {
    var nCh = channels.length;
    var n = channels[0].length;
    var duration = n / sr;

    // Envelope (abs max across ch) with 10ms hop
    var hop = Math.max(1, Math.round(sr * 0.01));
    var env = [];
    for (var i = 0; i < n; i += hop) {
      var m = 0;
      var end = Math.min(n, i + hop);
      for (var c = 0; c < nCh; c++) {
        for (var j = i; j < end; j++) {
          var a = Math.abs(channels[c][j]);
          if (a > m) m = a;
        }
      }
      env.push(m);
    }

    var silenceThresh = Math.pow(10, -50 / 20); // -50 dBFS
    var noiseFloorThresh = Math.pow(10, -60 / 20);

    // Leading silence
    var lead = 0;
    while (lead < env.length && env[lead] < silenceThresh) lead++;
    var leadSec = (lead * hop) / sr;

    // Trailing silence
    var trail = 0;
    var idx = env.length - 1;
    while (idx >= 0 && env[idx] < silenceThresh) { trail++; idx--; }
    var trailSec = (trail * hop) / sr;

    // Abrupt start: first non-silent sample jumps high without ramp
    var abruptStart = false;
    if (lead < env.length) {
      var first = env[lead];
      if (db(first) > -18 && leadSec < 0.02) abruptStart = true;
    }

    // Abrupt end
    var abruptEnd = false;
    if (idx >= 0) {
      var last = env[idx];
      if (db(last) > -18 && trailSec < 0.05) abruptEnd = true;
    }

    // Noise floor: median of quietest 10% of envelope (excluding pure digital silence)
    var nonzero = env.filter(function (v) { return v > 1e-8; }).slice();
    nonzero.sort(function (a, b) { return a - b; });
    var noiseFloorDb = -Infinity;
    if (nonzero.length) {
      var q = nonzero[Math.floor(nonzero.length * 0.1)] || nonzero[0];
      noiseFloorDb = db(q);
    }

    // Click/pop detection: sudden spikes in derivative of envelope
    var clicks = 0;
    for (var i = 2; i < env.length - 2; i++) {
      var prev = (env[i - 2] + env[i - 1]) / 2;
      var next = (env[i + 1] + env[i + 2]) / 2;
      var local = env[i];
      if (local > 0.05 && local > prev * 8 && local > next * 8 && prev < 0.02 && next < 0.02) {
        clicks++;
      }
    }

    // Hum detection heuristic: strong 50/60 Hz relative energy — approximate via short FFT of quiet regions
    var humLikely = false;
    // use overall spectrum ratio if available later; simple time-domain notch energy
    // Skip heavy work — flag only if noise floor high
    var hissLikely = isFinite(noiseFloorDb) && noiseFloorDb > -55 && noiseFloorDb < -30;

    return {
      duration: duration,
      leadSec: leadSec,
      trailSec: trailSec,
      abruptStart: abruptStart,
      abruptEnd: abruptEnd,
      noiseFloorDb: noiseFloorDb,
      clicks: clicks,
      hissLikely: hissLikely,
      humLikely: humLikely,
      envelope: downsampleEnv(env, hop, sr, 500)
    };
  }

  function downsampleEnv(env, hop, sr, maxPts) {
    var out = [];
    if (!env.length) return out;
    var step = Math.max(1, Math.floor(env.length / maxPts));
    for (var i = 0; i < env.length; i += step) {
      var m = 0;
      for (var j = i; j < Math.min(env.length, i + step); j++) if (env[j] > m) m = env[j];
      out.push({ t: (i * hop) / sr, db: db(m) });
    }
    return out;
  }

  // ─── Waveform peaks for display ──────────────────────────────────────────
  function buildWaveform(channels, peaks) {
    peaks = peaks || 800;
    var nCh = channels.length;
    var n = channels[0].length;
    var out = [];
    var step = n / peaks;
    for (var i = 0; i < peaks; i++) {
      var a = Math.floor(i * step);
      var b = Math.floor((i + 1) * step);
      var mn = 0, mx = 0;
      for (var c = 0; c < nCh; c++) {
        for (var j = a; j < b && j < n; j++) {
          var v = channels[c][j];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      out.push({ min: mn, max: mx });
    }
    return out;
  }

  // ─── Brick-wall / over-compression heuristic ─────────────────────────────
  function detectOverCompression(levels, clipping, loudness) {
    var flags = [];
    var brickwalled = false;
    if (levels.crestFactor < 6) {
      flags.push('Crest factor < 6 dB — heavily limited');
      brickwalled = true;
    }
    if (levels.dynamicRange < 5) {
      flags.push('Very low dynamic range (DR ' + levels.dynamicRange.toFixed(1) + ')');
      brickwalled = true;
    }
    if (clipping.severity === 'Major' || clipping.severity === 'Critical') {
      flags.push('Limiter likely constantly hitting the ceiling');
    }
    // LRA very low
    if (isFinite(loudness.lra) && loudness.lra < 3) {
      flags.push('Loudness Range (LRA) < 3 LU — sausage/brick-wall dynamics');
      brickwalled = true;
    }
    return { brickwalled: brickwalled, flags: flags };
  }

  // ─── Scoring ─────────────────────────────────────────────────────────────
  function buildChecks(ctx) {
    var f = ctx.format;
    var loud = ctx.loudness;
    var levels = ctx.levels;
    var clip = ctx.clipping;
    var spec = ctx.spectrum;
    var st = ctx.stereo;
    var sil = ctx.silence;
    var meta = ctx.metadata;
    var genreKey = ctx.genre || 'general';
    var genre = GENRE_DR[genreKey] || GENRE_DR.general;
    var tp = ctx.truePeak;
    var over = ctx.overCompression;

    var categories = [];

    // 1. File format
    var fmtChecks = [];
    var lossySt = f.isLossy ? 'warn' : 'pass';
    fmtChecks.push({
      id: 'format',
      name: 'File format',
      value: f.formatName + (f.isLossy ? ' (lossy)' : f.isLossless ? ' (lossless)' : ''),
      detail: f.isLossy
        ? 'Lossy formats (MP3, OGG, AAC) are not recommended for final masters. Prefer WAV/FLAC 24-bit.'
        : 'Lossless or acceptable container for mastering delivery.',
      status: lossySt,
      recommendation: f.isLossy ? 'Export a lossless master (WAV 24-bit / FLAC) for distribution.' : null
    });
    var bd = f.bitDepth;
    // WebAudio often decodes to float32 — report container bit depth if known, else decoded
    var bdLabel = bd != null ? (bd + '-bit') : '32-bit float (decoded)';
    var bdSt = 'pass';
    if (bd != null && bd < 16) bdSt = 'fail';
    else if (bd != null && bd === 16) bdSt = 'warn';
    fmtChecks.push({
      id: 'bitdepth',
      name: 'Bit depth',
      value: bdLabel,
      detail: 'Recommended: 24-bit (or 32-bit float) for masters.',
      status: bdSt,
      recommendation: bdSt !== 'pass' ? 'Render/export at 24-bit minimum.' : null
    });
    var sr = ctx.sampleRate;
    var srSt = (sr === 44100 || sr === 48000 || sr === 88200 || sr === 96000 || sr === 192000) ? 'pass' :
               (sr >= 44100 ? 'warn' : 'fail');
    fmtChecks.push({
      id: 'samplerate',
      name: 'Sample rate',
      value: (sr / 1000).toFixed(1) + ' kHz',
      detail: 'Common masters: 44.1 / 48 / 96 kHz.',
      status: srSt
    });
    fmtChecks.push({
      id: 'integrity',
      name: 'File integrity',
      value: f.integrity === 'ok' && ctx.decodeOk ? 'OK — decoded successfully' : 'Suspect / decode issues',
      detail: 'Container headers and decode path checked.',
      status: (f.integrity === 'ok' && ctx.decodeOk) ? 'pass' : 'fail',
      recommendation: (f.integrity === 'ok' && ctx.decodeOk) ? null : 'Re-export the file; it may be truncated or corrupted.'
    });
    // File size reasonableness
    var expectedBytesPerSec = sr * ctx.channelCount * ((bd || 16) / 8);
    if (f.isLossy) expectedBytesPerSec = 320000 / 8; // ~320kbps
    var expected = expectedBytesPerSec * ctx.duration;
    var ratio = f.size / Math.max(1, expected);
    var sizeSt = 'pass';
    if (f.isLossless && ratio < 0.3) sizeSt = 'warn';
    if (f.isLossless && ratio < 0.1) sizeSt = 'fail';
    fmtChecks.push({
      id: 'filesize',
      name: 'File size vs duration',
      value: fmtBytes(f.size) + ' for ' + fmtDur(ctx.duration),
      detail: 'Rough expected size ratio: ' + ratio.toFixed(2) + '×',
      status: sizeSt
    });
    categories.push({
      id: 'format',
      name: 'File Format Validation',
      weight: 0, // not in overall weights list — fold into metadata-ish; we'll give small weight
      checks: fmtChecks
    });

    // 2. Loudness
    var loudChecks = [];
    var integ = loud.integrated;
    loudChecks.push({
      id: 'lufs-i',
      name: 'Integrated LUFS',
      value: fmtLufs(integ),
      detail: 'Overall loudness of the entire track (ITU-R BS.1770).',
      status: isFinite(integ) ? 'pass' : 'fail',
      meter: { value: integ, min: -30, max: 0, unit: 'LUFS' }
    });
    loudChecks.push({
      id: 'lufs-st',
      name: 'Short-Term LUFS (max)',
      value: fmtLufs(loud.shortTermMax),
      detail: 'Maximum 3-second loudness window.',
      status: 'pass',
      meter: { value: loud.shortTermMax, min: -30, max: 0, unit: 'LUFS' }
    });
    loudChecks.push({
      id: 'lufs-m',
      name: 'Momentary LUFS (max)',
      value: fmtLufs(loud.momentaryMax),
      detail: 'Maximum 400 ms loudness window.',
      status: 'pass',
      meter: { value: loud.momentaryMax, min: -30, max: 0, unit: 'LUFS' }
    });
    var tpSt = !isFinite(tp) ? 'fail' : (tp > 0 ? 'fail' : (tp > -1.0 ? 'warn' : 'pass'));
    loudChecks.push({
      id: 'truepeak',
      name: 'True Peak (dBTP)',
      value: fmtDb(tp) + 'TP',
      detail: 'Flag if exceeds −1.0 dBTP (inter-sample safe ceiling).',
      status: tpSt,
      recommendation: tpSt !== 'pass' ? 'Lower limiter ceiling to −1.0 dBTP (or −1.5 for lossy encode headroom).' : null,
      meter: { value: tp, min: -6, max: 3, unit: 'dBTP', limit: -1 }
    });
    loudChecks.push({
      id: 'lra',
      name: 'Loudness Range (LRA)',
      value: (isFinite(loud.lra) ? loud.lra.toFixed(1) : '—') + ' LU',
      detail: 'Variation in loudness across the track.',
      status: (!isFinite(loud.lra) ? 'warn' : loud.lra < 3 ? 'warn' : 'pass')
    });

    // Platform comparisons
    var platforms = PLATFORMS.map(function (p) {
      var gain = p.target - integ;
      if (p.targetMin != null && isFinite(integ)) {
        if (integ >= p.targetMin && integ <= p.targetMax) gain = 0;
        else if (integ > p.targetMax) gain = p.targetMax - integ;
        else gain = p.targetMin - integ;
      }
      return {
        id: p.id,
        name: p.name,
        target: p.target,
        targetLabel: p.targetMin != null
          ? (p.targetMin + ' to ' + p.targetMax + ' LUFS')
          : (p.target + ' LUFS'),
        note: p.note,
        gain: isFinite(integ) ? gain : null,
        action: !isFinite(integ) ? '—' :
          (Math.abs(gain) < 0.5 ? 'No change' :
            gain > 0 ? ('Turn up ' + gain.toFixed(1) + ' dB') :
              ('Turn down ' + Math.abs(gain).toFixed(1) + ' dB'))
      };
    });

    categories.push({
      id: 'loudness',
      name: 'Loudness Analysis (LUFS / dBTP)',
      weight: 0.25,
      checks: loudChecks,
      platforms: platforms
    });

    // 3. Dynamic range
    var drChecks = [];
    var dr = levels.dynamicRange;
    var drSt = dr < genre.failBelow ? 'fail' : (dr < genre.min ? 'warn' : 'pass');
    drChecks.push({
      id: 'dr',
      name: 'Dynamic Range (DR)',
      value: dr.toFixed(1) + ' dB',
      detail: genre.name + ' target: DR ' + genre.min + '–' + genre.max + ' (fail if < ' + genre.failBelow + ').',
      status: drSt,
      recommendation: drSt === 'fail' ? 'Reduce limiting/compression; aim for DR ≥ ' + genre.min + ' for ' + genre.name + '.' :
                      drSt === 'warn' ? 'Slightly over-compressed for ' + genre.name + '; consider more peak headroom.' : null,
      meter: { value: dr, min: 0, max: 20, unit: 'dB', low: genre.failBelow, ok: genre.min }
    });
    var crestSt = levels.crestFactor < 6 ? 'fail' : (levels.crestFactor < 8 ? 'warn' : 'pass');
    drChecks.push({
      id: 'crest',
      name: 'Crest Factor (Peak-to-RMS)',
      value: levels.crestFactor.toFixed(1) + ' dB',
      detail: 'Peak-to-RMS ratio. < 6 dB often indicates brick-wall limiting.',
      status: crestSt,
      recommendation: crestSt !== 'pass' ? 'Back off the limiter; allow more transient peaks.' : null
    });
    drChecks.push({
      id: 'brickwall',
      name: 'Over-compression / brick-wall',
      value: over.brickwalled ? 'Detected' : 'Not detected',
      detail: over.flags.length ? over.flags.join(' · ') : 'Waveform dynamics look healthy.',
      status: over.brickwalled ? 'fail' : 'pass',
      recommendation: over.brickwalled ? 'Revisit mastering chain; reduce limiter gain reduction and restore micro-dynamics.' : null
    });
    categories.push({
      id: 'dynamics',
      name: 'Dynamic Range Analysis',
      weight: 0.20,
      checks: drChecks
    });

    // 4. Clipping
    var clipChecks = [];
    var digSt = clip.severity === 'None' ? 'pass' : clip.severity === 'Minor' ? 'warn' : 'fail';
    clipChecks.push({
      id: 'digital-clip',
      name: 'Digital clipping',
      value: clip.clippedSamples === 0
        ? 'None'
        : (clip.clippedSamples + ' samples · ' + clip.clipRuns + ' regions · max run ' + clip.maxRun),
      detail: 'Consecutive samples near 0 dBFS.',
      status: digSt,
      recommendation: digSt !== 'pass' ? 'Reduce output gain / limiter ceiling; re-render without overs.' : null
    });
    var ispSt = tp > 0 ? 'fail' : tp > -1 ? 'warn' : 'pass';
    clipChecks.push({
      id: 'isp',
      name: 'Inter-sample peaks',
      value: fmtDb(tp) + 'TP',
      detail: 'True Peak above 0 dBTP can distort on DACs and lossy encoders.',
      status: ispSt
    });
    clipChecks.push({
      id: 'severity',
      name: 'Severity rating',
      value: clip.severity,
      detail: 'None / Minor / Major / Critical',
      status: digSt
    });
    clipChecks.push({
      id: 'distortion',
      name: 'Distortion artifacts',
      value: (clip.severity === 'Major' || clip.severity === 'Critical') ? 'Likely (clipping)' : 'None detected',
      detail: 'Based on clipping density and true-peak overs.',
      status: (clip.severity === 'Major' || clip.severity === 'Critical') ? 'fail' : 'pass'
    });
    categories.push({
      id: 'clipping',
      name: 'Clipping & Distortion Detection',
      weight: 0.20,
      checks: clipChecks
    });

    // 5. Frequency
    var freqChecks = [];
    // Sub-bass presence
    var subSt = spec.subBassRatio < 0.0005 ? 'warn' : 'pass';
    freqChecks.push({
      id: 'subbass',
      name: 'Sub-bass presence (20–60 Hz)',
      value: 'rel energy ' + (spec.subBassRatio * 100).toFixed(2) + '%',
      detail: 'Checks whether low-end foundation is present.',
      status: subSt,
      recommendation: subSt === 'warn' ? 'Little energy in sub-bass — intentional for some genres; otherwise check high-pass filters.' : null
    });
    var lowEndSt = spec.lowEndRatio > 0.15 ? 'warn' : (spec.lowEndRatio > 0.35 ? 'fail' : 'pass');
    // lowEnd is 20-30 only — ratios are small; use db relative
    // Better: compare lowEndDb to mid
    var lowBuildup = (spec.lowEndDb - (10 * Math.log10(Math.max(spec.midRatio * (spec.subBassDb ? 1 : 1), 1e-20))));
    // simpler heuristic: if absolute low-end band is hotter than -20 relative peak and dominates
    lowEndSt = spec.lowEndRatio > spec.midRatio * 0.5 && spec.lowEndRatio > 0.02 ? 'warn' : 'pass';
    if (spec.lowEndRatio > spec.midRatio && spec.lowEndRatio > 0.05) lowEndSt = 'fail';
    freqChecks.push({
      id: 'low-buildup',
      name: 'Low-end buildup (< 30 Hz)',
      value: 'rel energy ' + (spec.lowEndRatio * 100).toFixed(2) + '%',
      detail: 'Excessive energy below 30 Hz can waste headroom (rumble).',
      status: lowEndSt,
      recommendation: lowEndSt !== 'pass' ? 'Apply a gentle high-pass (20–30 Hz) to remove inaudible rumble.' : null
    });
    var hfSt = spec.highEndRatio < 1e-6 ? 'warn' : 'pass';
    // lack of energy above 16k
    if (spec.airRatio + spec.highEndRatio < 1e-5) hfSt = 'warn';
    freqChecks.push({
      id: 'hf-rolloff',
      name: 'High-frequency content (> 16 kHz)',
      value: spec.highEndRatio < 1e-8 ? 'Very low / rolled off' : 'Present',
      detail: 'Lossy encodes or heavy LP filters remove air band.',
      status: hfSt,
      recommendation: hfSt === 'warn' ? 'HF is sparse — expected for lossy sources; check if intentional.' : null
    });
    var dcSt = Math.abs(spec.dc) > 0.02 ? 'fail' : (Math.abs(spec.dc) > 0.005 ? 'warn' : 'pass');
    freqChecks.push({
      id: 'dc',
      name: 'DC offset',
      value: Math.abs(spec.dc) < 1e-6 ? 'None' : (spec.dc.toExponential(2) + ' (' + fmtDb(Math.abs(spec.dc)) + ')'),
      detail: 'DC offset reduces headroom and can click on edits.',
      status: dcSt,
      recommendation: dcSt !== 'pass' ? 'Apply a DC blocker / high-pass at ~5–10 Hz.' : null
    });
    // Spectral balance rough
    var balNote = 'Low ' + (spec.lowRatio * 100).toFixed(1) + '% · Mid ' + (spec.midRatio * 100).toFixed(1) +
      '% · Presence ' + (spec.presenceRatio * 100).toFixed(1) + '% · Air ' + (spec.airRatio * 100).toFixed(1) + '%';
    freqChecks.push({
      id: 'balance',
      name: 'Spectral balance',
      value: balNote,
      detail: 'Broad-band energy distribution vs typical balanced master.',
      status: 'pass'
    });
    categories.push({
      id: 'frequency',
      name: 'Frequency Spectrum Analysis',
      weight: 0.10,
      checks: freqChecks
    });

    // 6. Stereo
    var stChecks = [];
    if (st.mono) {
      stChecks.push({
        id: 'mono-file',
        name: 'Channel layout',
        value: 'Mono',
        detail: 'Single-channel file — stereo checks limited.',
        status: 'warn',
        recommendation: 'Deliver stereo masters unless mono is intentional.'
      });
    } else {
      var corrSt = st.correlation < 0 ? 'fail' : (st.correlation < 0.3 ? 'warn' : 'pass');
      stChecks.push({
        id: 'correlation',
        name: 'Stereo correlation',
        value: st.correlation.toFixed(3) + ' (min ' + (st.minCorrelation != null ? st.minCorrelation.toFixed(3) : '—') + ')',
        detail: '1 = mono, 0 = uncorrelated, < 0 = phase issues.',
        status: corrSt,
        recommendation: corrSt === 'fail' ? 'Phase problems detected — check mid/side, stereo wideners, and multi-mic phase.' : null,
        meter: { value: st.correlation, min: -1, max: 1, unit: '', limitLow: 0 }
      });
      stChecks.push({
        id: 'mono-compat',
        name: 'Mono compatibility',
        value: st.phaseIssues ? 'Poor (correlation drops below 0)' : 'Good',
        detail: 'Flags if correlation drops below 0 (phase cancellation risk).',
        status: st.phaseIssues ? 'fail' : 'pass',
        recommendation: st.phaseIssues ? 'Check the mix in mono; fix out-of-phase elements.' : null
      });
      var msRatio = st.midRms > 0 ? st.sideRms / st.midRms : 0;
      stChecks.push({
        id: 'midside',
        name: 'Mid/Side balance',
        value: 'Side/Mid = ' + msRatio.toFixed(2) + '  (width ' + (msRatio * 100).toFixed(0) + '%)',
        detail: 'Higher side energy = wider image.',
        status: msRatio > 1.2 ? 'warn' : 'pass',
        recommendation: msRatio > 1.2 ? 'Very wide Sides — verify mono fold-down.' : null
      });
      var balSt = Math.abs(st.lrBalanceDb) > 1.5 ? 'fail' : (Math.abs(st.lrBalanceDb) > 1.0 ? 'warn' : 'pass');
      stChecks.push({
        id: 'lr-balance',
        name: 'Left/Right balance',
        value: (st.lrBalanceDb >= 0 ? 'L+' : 'R+') + Math.abs(st.lrBalanceDb).toFixed(2) + ' dB',
        detail: 'Flag if imbalanced > 1 dB.',
        status: balSt,
        recommendation: balSt !== 'pass' ? 'Re-balance L/R levels; check panning and asymmetric processing.' : null
      });
      stChecks.push({
        id: 'phase-cancel',
        name: 'Phase cancellation',
        value: st.phaseIssues ? 'Detected' : 'Not detected',
        detail: 'Based on negative correlation regions.',
        status: st.phaseIssues ? 'fail' : 'pass'
      });
    }
    categories.push({
      id: 'stereo',
      name: 'Stereo Field Analysis',
      weight: 0.10,
      checks: stChecks
    });

    // 7. Silence & noise
    var silChecks = [];
    var leadSt = (sil.leadSec >= 0.3 && sil.leadSec <= 1.5) ? 'pass' :
                 (sil.leadSec >= 0.1 && sil.leadSec < 3) ? 'warn' : 'fail';
    if (sil.leadSec > 3) leadSt = 'warn';
    silChecks.push({
      id: 'lead-silence',
      name: 'Silence at start',
      value: sil.leadSec.toFixed(2) + ' s',
      detail: 'Recommended 0.5–1.0 s of clean silence/head.',
      status: leadSt,
      recommendation: leadSt !== 'pass' ? 'Aim for ~0.5–1 s of silence (or natural room tone) before the first transient.' : null
    });
    var trailSt = (sil.trailSec >= 1.5 && sil.trailSec <= 4) ? 'pass' :
                  (sil.trailSec >= 0.5 && sil.trailSec < 6) ? 'warn' : 'fail';
    silChecks.push({
      id: 'trail-silence',
      name: 'Silence at end',
      value: sil.trailSec.toFixed(2) + ' s',
      detail: 'Recommended 2–3 s of tail silence.',
      status: trailSt,
      recommendation: trailSt !== 'pass' ? 'Leave ~2–3 s after the last sound so platforms don’t truncate the reverb tail.' : null
    });
    silChecks.push({
      id: 'abrupt',
      name: 'Abrupt start / end',
      value: (sil.abruptStart || sil.abruptEnd)
        ? ((sil.abruptStart ? 'Abrupt start' : '') + (sil.abruptStart && sil.abruptEnd ? ' · ' : '') + (sil.abruptEnd ? 'Abrupt end' : ''))
        : 'OK',
      detail: 'Detects missing fades.',
      status: (sil.abruptStart || sil.abruptEnd) ? 'warn' : 'pass',
      recommendation: (sil.abruptStart || sil.abruptEnd) ? 'Add short fade-in/fade-out to avoid clicks.' : null
    });
    var nfSt = !isFinite(sil.noiseFloorDb) ? 'pass' :
               (sil.noiseFloorDb > -40 ? 'fail' : sil.noiseFloorDb > -55 ? 'warn' : 'pass');
    silChecks.push({
      id: 'noise-floor',
      name: 'Noise floor',
      value: isFinite(sil.noiseFloorDb) ? sil.noiseFloorDb.toFixed(1) + ' dBFS' : '—',
      detail: 'Estimated from quietest regions (hiss/hum/buzz).',
      status: nfSt,
      recommendation: nfSt !== 'pass' ? 'Denoise carefully or re-record noisy sections; check grounding/hum.' : null
    });
    var clickSt = sil.clicks === 0 ? 'pass' : sil.clicks < 3 ? 'warn' : 'fail';
    silChecks.push({
      id: 'clicks',
      name: 'Clicks / pops / glitches',
      value: sil.clicks === 0 ? 'None detected' : (sil.clicks + ' possible event(s)'),
      detail: 'Transient spikes in near-silence.',
      status: clickSt,
      recommendation: clickSt !== 'pass' ? 'Inspect waveform at flagged regions; remove clicks manually or with a declicker.' : null
    });
    categories.push({
      id: 'silence',
      name: 'Silence & Noise Detection',
      weight: 0.10,
      checks: silChecks
    });

    // 8. Metadata
    var metaChecks = [];
    var fields = [
      ['title', 'Title'],
      ['artist', 'Artist'],
      ['albumArtist', 'Album Artist'],
      ['album', 'Album name'],
      ['track', 'Track number'],
      ['year', 'Year / Date'],
      ['genre', 'Genre'],
      ['isrc', 'ISRC code']
    ];
    var missing = [];
    fields.forEach(function (pair) {
      var key = pair[0], label = pair[1];
      var val = meta[key];
      var present = val != null && String(val).trim() !== '';
      if (!present) missing.push(label);
      var stt = present ? 'pass' : 'warn';
      if (key === 'title' || key === 'artist') stt = present ? 'pass' : 'fail';
      metaChecks.push({
        id: 'meta-' + key,
        name: label,
        value: present ? String(val) : '— missing —',
        detail: present ? 'Embedded' : 'Missing or empty',
        status: stt,
        recommendation: present ? null : 'Embed ' + label + ' in the file tags before distribution.'
      });
    });
    var isrcVal = validateIsrc(meta.isrc);
    if (meta.isrc) {
      metaChecks.push({
        id: 'isrc-format',
        name: 'ISRC format',
        value: isrcVal.valid ? isrcVal.formatted : ('Invalid: ' + (isrcVal.reason || '')),
        detail: 'Expected pattern CC-XXX-YY-NNNNN',
        status: isrcVal.valid ? 'pass' : 'fail',
        recommendation: isrcVal.valid ? null : 'Correct ISRC to CC-XXX-YY-NNNNN (12 characters).'
      });
    }
    metaChecks.push({
      id: 'artwork',
      name: 'Embedded artwork',
      value: meta.artwork ? 'Present' : '— missing —',
      detail: 'Recommend ≥ 3000×3000 px album art.',
      status: meta.artwork ? 'pass' : 'warn',
      recommendation: meta.artwork ? 'Verify artwork is ≥ 3000×3000 px for store delivery.' :
        'Embed high-resolution cover art (≥ 3000×3000).'
    });
    // Note: browser may not see tags on WAV without LIST/INFO
    categories.push({
      id: 'metadata',
      name: 'Metadata Check',
      weight: 0.05,
      checks: metaChecks
    });

    // Re-weight: format gets 0 weight in suggested list — redistribute by adding format into scoring with 0
    // Suggested weights sum to 1.0 without format. We'll score format separately but include at 0 in overall,
    // OR give format a small presence by folding. Spec says:
    // Loudness 25, DR 20, Clip 20, Freq 10, Stereo 10, Silence 10, Metadata 5.
    // Format is extra — include as informational with weight 0, still show in UI.

    // Compute scores
    var totalW = 0;
    var acc = 0;
    var passN = 0, warnN = 0, failN = 0;
    categories.forEach(function (cat) {
      var sum = 0;
      cat.checks.forEach(function (ch) {
        sum += scoreOf(ch.status);
        if (ch.status === 'pass') passN++;
        else if (ch.status === 'warn') warnN++;
        else failN++;
      });
      cat.score = cat.checks.length ? (sum / cat.checks.length) : 0;
      cat.grade = gradeOf(cat.score);
      if (cat.weight > 0) {
        acc += cat.score * cat.weight;
        totalW += cat.weight;
      }
    });
    // If format has weight 0, overall uses only weighted cats
    var overall = totalW > 0 ? acc / totalW : 0;

    return {
      categories: categories,
      overallScore: Math.round(overall),
      grade: gradeOf(overall),
      gradeLabel: gradeLabel(gradeOf(overall)),
      summary: { pass: passN, warn: warnN, fail: failN },
      platforms: platforms
    };
  }

  // ─── Main analyze entry ──────────────────────────────────────────────────
  function getAudioContext() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API not supported in this browser.');
    return new AC();
  }

  /**
   * analyzeFile(file, options) -> Promise<report>
   * options.genre: 'pop-edm' | 'rock' | 'hiphop' | 'jazz' | 'general'
   * options.onProgress: function(0..1, message)
   */
  function analyzeFile(file, options) {
    options = options || {};
    var onProgress = options.onProgress || function () {};

    return file.arrayBuffer().then(function (buffer) {
      onProgress(0.05, 'Detecting format…');
      var format = detectFormat(file, buffer);
      onProgress(0.1, 'Reading metadata…');
      var metadata = readMetadata(buffer, format);

      onProgress(0.15, 'Decoding audio…');
      var ctx = getAudioContext();
      // copy buffer because decodeAudioData may detach
      var copy = buffer.slice(0);
      return ctx.decodeAudioData(copy).then(function (audioBuffer) {
        onProgress(0.35, 'Analyzing levels…');
        var sr = audioBuffer.sampleRate;
        var nCh = audioBuffer.numberOfChannels;
        var duration = audioBuffer.duration;
        var channels = [];
        for (var c = 0; c < nCh; c++) channels.push(audioBuffer.getChannelData(c));

        // Offline work — yield to UI via chunks conceptually (sync is OK for ~few min tracks)
        onProgress(0.4, 'Measuring loudness (LUFS)…');
        var loudness = meanSquareGated(channels, sr);

        onProgress(0.55, 'True peak & dynamics…');
        var tp = truePeakDbTP(channels);
        var levels = analyzeLevels(channels, sr);
        var clipping = detectClipping(channels);
        var over = detectOverCompression(levels, clipping, loudness);

        onProgress(0.7, 'Spectrum & stereo…');
        var spectrum = analyzeSpectrum(channels, sr);
        var stereo = analyzeStereo(channels);
        // fix stereo series time to seconds
        if (stereo.correlationSeries) {
          stereo.correlationSeries = stereo.correlationSeries.map(function (p) {
            return { t: p.t * duration, v: p.v };
          });
        }

        onProgress(0.85, 'Silence & noise…');
        var silence = analyzeSilenceNoise(channels, sr);

        onProgress(0.92, 'Building waveform…');
        var waveform = buildWaveform(channels, 900);

        var analysisCtx = {
          format: format,
          metadata: metadata,
          sampleRate: sr,
          channelCount: nCh,
          duration: duration,
          decodeOk: true,
          loudness: loudness,
          truePeak: tp,
          levels: levels,
          clipping: clipping,
          overCompression: over,
          spectrum: spectrum,
          stereo: stereo,
          silence: silence,
          genre: options.genre || 'general'
        };

        onProgress(0.97, 'Scoring…');
        var scored = buildChecks(analysisCtx);

        try { ctx.close(); } catch (e) {}

        onProgress(1, 'Done');

        return {
          fileName: format.name,
          format: format,
          metadata: metadata,
          sampleRate: sr,
          channelCount: nCh,
          duration: duration,
          loudness: loudness,
          truePeak: tp,
          levels: levels,
          clipping: clipping,
          overCompression: over,
          spectrum: spectrum,
          stereo: stereo,
          silence: silence,
          waveform: waveform,
          genre: analysisCtx.genre,
          overallScore: scored.overallScore,
          grade: scored.grade,
          gradeLabel: scored.gradeLabel,
          summary: scored.summary,
          categories: scored.categories,
          platforms: scored.platforms,
          analyzedAt: new Date().toISOString()
        };
      }).catch(function (err) {
        try { ctx.close(); } catch (e) {}
        // Still return format/metadata failure report
        var failed = {
          fileName: format.name,
          format: format,
          metadata: metadata,
          sampleRate: format.containerSampleRate || 0,
          channelCount: format.channels || 0,
          duration: 0,
          decodeOk: false,
          decodeError: String(err && err.message || err),
          overallScore: 0,
          grade: 'F',
          gradeLabel: gradeLabel('F'),
          summary: { pass: 0, warn: 0, fail: 1 },
          categories: [{
            id: 'format',
            name: 'File Format Validation',
            weight: 1,
            score: 0,
            grade: 'F',
            checks: [{
              id: 'decode',
              name: 'Audio decode',
              value: 'Failed',
              detail: String(err && err.message || err),
              status: 'fail',
              recommendation: 'File may be corrupt or in an unsupported codec for this browser.'
            }]
          }],
          platforms: [],
          waveform: [],
          spectrum: { curve: [], spectrogram: { rows: [] } },
          analyzedAt: new Date().toISOString()
        };
        return failed;
      });
    });
  }

  function reportToJSON(report) {
    // Strip bulky typed arrays already plain
    return JSON.stringify(report, function (k, v) {
      if (v == null) return v;
      if (typeof v === 'number' && !isFinite(v)) return null;
      return v;
    }, 2);
  }

  // Public API
  var API = {
    PLATFORMS: PLATFORMS,
    GENRE_DR: GENRE_DR,
    analyzeFile: analyzeFile,
    reportToJSON: reportToJSON,
    gradeOf: gradeOf,
    gradeLabel: gradeLabel,
    fmtDb: fmtDb,
    fmtLufs: fmtLufs,
    fmtDur: fmtDur,
    fmtBytes: fmtBytes,
    validateIsrc: validateIsrc
  };

  // UMD-ish
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  root.MASTER_CHECK = API;
})(typeof window !== 'undefined' ? window : globalThis);
