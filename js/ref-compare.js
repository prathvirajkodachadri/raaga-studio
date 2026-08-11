/**
 * ref-compare.js — Reference Track Analysis & A/B Spectrum Comparison Engine.
 * Allows comparing your mix or master against a commercial reference track,
 * plotting dual spectral curves, calculating Delta EQ and generating Match EQ advice.
 *
 * Exposes window.REF_COMPARE
 */
'use strict';

(function (root) {
  function compareReports(myReport, refReport) {
    if (!myReport || !refReport) return null;

    var myLoud = myReport.loudness || {};
    var refLoud = refReport.loudness || {};
    var myLev = myReport.levels || {};
    var refLev = refReport.levels || {};
    var mySt = myReport.stereo || {};
    var refSt = refReport.stereo || {};
    var mySpec = myReport.spectrum || {};
    var refSpec = refReport.spectrum || {};

    // 1. Loudness & Dynamics Comparison
    var myInteg = myLoud.integrated;
    var refInteg = refLoud.integrated;
    var lufsDiff = (isFinite(myInteg) && isFinite(refInteg)) ? (myInteg - refInteg) : 0;

    var myDr = myLev.dynamicRange;
    var refDr = refLev.dynamicRange;
    var drDiff = (isFinite(myDr) && isFinite(refDr)) ? (myDr - refDr) : 0;

    var myCrest = myLev.crestFactor;
    var refCrest = refLev.crestFactor;
    var crestDiff = (isFinite(myCrest) && isFinite(refCrest)) ? (myCrest - refCrest) : 0;

    var myTp = myReport.truePeak;
    var refTp = refReport.truePeak;
    var tpDiff = (isFinite(myTp) && isFinite(refTp)) ? (myTp - refTp) : 0;

    var myCorr = mySt.correlation;
    var refCorr = refSt.correlation;

    // 2. Frequency Band Ratios & Delta
    var bands = [
      { name: 'Sub-Bass (20–60 Hz)', my: (mySpec.subBassRatio || 0) * 100, ref: (refSpec.subBassRatio || 0) * 100 },
      { name: 'Low-End (60–250 Hz)', my: (mySpec.lowRatio || 0) * 100, ref: (refSpec.lowRatio || 0) * 100 },
      { name: 'Midrange (200–5 kHz)', my: (mySpec.midRatio || 0) * 100, ref: (refSpec.midRatio || 0) * 100 },
      { name: 'Presence (2–6 kHz)', my: (mySpec.presenceRatio || 0) * 100, ref: (refSpec.presenceRatio || 0) * 100 },
      { name: 'Air (> 10 kHz)', my: (mySpec.airRatio || 0) * 100, ref: (refSpec.airRatio || 0) * 100 }
    ];

    bands.forEach(function (b) {
      b.diff = b.my - b.ref;
      b.ratio = b.ref > 0 ? (b.my / b.ref) : 1;
    });

    // 3. Match EQ Advice
    var advice = [];

    // Sub-bass advice
    var subRatio = (mySpec.subBassRatio || 0) / Math.max(1e-6, refSpec.subBassRatio || 0);
    if (subRatio > 1.4) {
      advice.push({
        band: 'Sub-bass (20–60 Hz)',
        type: 'cut',
        text: 'Your low-end is significantly heavier (+ ' + ((subRatio - 1) * 100).toFixed(0) + '%) than the reference. Consider high-passing non-bass tracks at 30 Hz to save headroom.'
      });
    } else if (subRatio < 0.65) {
      advice.push({
        band: 'Sub-bass (20–60 Hz)',
        type: 'boost',
        text: 'Your track has less sub-bass weight than the reference. Check kick/bass fundamental around 45–60 Hz.'
      });
    }

    // Highs / Air advice
    var airRatio = (mySpec.airRatio || 0) / Math.max(1e-6, refSpec.airRatio || 0);
    if (airRatio < 0.6) {
      advice.push({
        band: 'Air (> 10 kHz)',
        type: 'boost',
        text: 'Your track lacks the top-end sparkle and open air present in the reference. Try a gentle high-shelf boost (+1 to +2 dB) at 12 kHz.'
      });
    } else if (airRatio > 1.5) {
      advice.push({
        band: 'Air (> 10 kHz)',
        type: 'cut',
        text: 'Your top-end is brighter than reference. Check vocal sibilance (de-essing) or harsh cymbals.'
      });
    }

    // Midrange balance
    var midRatio = (mySpec.midRatio || 0) / Math.max(1e-6, refSpec.midRatio || 0);
    if (midRatio < 0.75) {
      advice.push({
        band: 'Midrange (500 Hz – 2 kHz)',
        type: 'boost',
        text: 'The reference track has more vocal body and instrument presence in the midrange. Bring up lead vocals or main melodic instruments.'
      });
    }

    // Dynamic Range advice
    if (isFinite(myDr) && isFinite(refDr)) {
      if (myDr < refDr - 2.5) {
        advice.push({
          band: 'Dynamics (DR)',
          type: 'dynamics',
          text: 'Your track is more heavily compressed (DR ' + myDr.toFixed(1) + ' vs Reference DR ' + refDr.toFixed(1) + '). Ease off the bus limiter for punchier transients.'
        });
      } else if (myDr > refDr + 3.0) {
        advice.push({
          band: 'Dynamics (DR)',
          type: 'dynamics',
          text: 'Your track is more dynamic than the reference. If aiming for commercial loudness, apply moderate bus compression.'
        });
      }
    }

    if (!advice.length) {
      advice.push({
        band: 'Overall Balance',
        type: 'pass',
        text: 'Excellent match! Spectral energy distribution and dynamics closely align with your reference track.'
      });
    }

    return {
      myFileName: myReport.fileName || 'Your Track',
      refFileName: refReport.fileName || 'Reference Track',
      lufsDiff: lufsDiff,
      gainMatchOffset: -lufsDiff, // gain to apply to reference to match my track's LUFS
      drDiff: drDiff,
      crestDiff: crestDiff,
      tpDiff: tpDiff,
      corrDiff: (isFinite(myCorr) && isFinite(refCorr)) ? (myCorr - refCorr) : 0,
      bands: bands,
      advice: advice,
      metrics: [
        { label: 'Integrated LUFS', my: myInteg, ref: refInteg, unit: 'LUFS', diff: lufsDiff },
        { label: 'True Peak', my: myTp, ref: refTp, unit: 'dBTP', diff: tpDiff },
        { label: 'Dynamic Range (DR)', my: myDr, ref: refDr, unit: 'dB', diff: drDiff },
        { label: 'Crest Factor', my: myCrest, ref: refCrest, unit: 'dB', diff: crestDiff },
        { label: 'Stereo Correlation', my: myCorr, ref: refCorr, unit: '', diff: (isFinite(myCorr) && isFinite(refCorr)) ? (myCorr - refCorr) : 0 }
      ]
    };
  }

  // ─── Dual Spectrum Overlay Canvas Drawing ────────────────────────────────
  function drawComparisonSpectrum(canvas, myReport, refReport) {
    if (!canvas || !myReport || !refReport) return;
    var myCurve = myReport.spectrum ? myReport.spectrum.curve : [];
    var refCurve = refReport.spectrum ? refReport.spectrum.curve : [];
    if (!myCurve || !refCurve || !myCurve.length || !refCurve.length) return;

    var parent = canvas.parentElement;
    var w = parent ? parent.clientWidth - 28 : 800;
    var dpr = window.devicePixelRatio || 1;
    var h = canvas.height || 180;
    canvas.width = Math.floor(w * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1613';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(51,43,36,0.9)';
    ctx.fillStyle = 'rgba(168,159,148,0.6)';
    ctx.font = '10px system-ui';
    var dbMin = -70, dbMax = 0;
    for (var d = dbMin; d <= dbMax; d += 15) {
      var y = h - ((d - dbMin) / (dbMax - dbMin)) * (h - 20) - 10;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillText(d + ' dB', 6, y - 2);
    }

    // 1. Draw Reference Track Curve (Cyan / Blue)
    ctx.beginPath();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    for (var i = 0; i < refCurve.length; i++) {
      var x = (i / (refCurve.length - 1)) * w;
      var dVal = refCurve[i].dbRel;
      var yPos = h - ((dVal - dbMin) / (dbMax - dbMin)) * (h - 20) - 10;
      yPos = Math.max(0, Math.min(h, yPos));
      if (i === 0) ctx.moveTo(x, yPos); else ctx.lineTo(x, yPos);
    }
    ctx.stroke();

    // 2. Draw My Track Curve (Coral / Pink)
    ctx.beginPath();
    ctx.strokeStyle = '#e4577f';
    ctx.lineWidth = 2;
    for (var j = 0; j < myCurve.length; j++) {
      var x2 = (j / (myCurve.length - 1)) * w;
      var dVal2 = myCurve[j].dbRel;
      var yPos2 = h - ((dVal2 - dbMin) / (dbMax - dbMin)) * (h - 20) - 10;
      yPos2 = Math.max(0, Math.min(h, yPos2));
      if (j === 0) ctx.moveTo(x2, yPos2); else ctx.lineTo(x2, yPos2);
    }
    ctx.stroke();

    // Frequency labels along bottom
    ctx.fillStyle = 'rgba(168,159,148,0.8)';
    ['20 Hz', '100 Hz', '500 Hz', '2 kHz', '8 kHz', '20 kHz'].forEach(function (lab, idx) {
      var x = (idx / 5) * (w - 45) + 6;
      ctx.fillText(lab, x, h - 2);
    });
  }

  var API = {
    compareReports: compareReports,
    drawComparisonSpectrum: drawComparisonSpectrum
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.REF_COMPARE = API;
})(typeof window !== 'undefined' ? window : globalThis);
