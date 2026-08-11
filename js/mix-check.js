/**
 * mix-check.js — pre-master "Mix Check" assessment engine.
 * Consumes a MASTER_CHECK.analyzeFile() report and grades it against MIXING
 * targets (headroom, dynamics, stereo, buildup, noise) instead of mastering
 * targets. Verdict: ready for mastering / almost there / fix first.
 *
 * Exposes window.MIX_CHECK = { assessMix(report) }
 */
'use strict';

(function (root) {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fmtDb(v) {
    if (!isFinite(v)) return '−∞';
    return (v > 0 ? '+' : '') + v.toFixed(1) + ' dB';
  }

  function fmtLufs(v) {
    if (!isFinite(v)) return '−∞ LUFS';
    return v.toFixed(1) + ' LUFS';
  }

  function statusOf(pass, warn) {
    if (pass) return 'pass';
    if (warn) return 'warn';
    return 'fail';
  }

  /**
   * assessMix(report) -> {
   *   checks: [{ id, name, value, target, status, advice }],
   *   verdict: { level: 'ready'|'almost'|'fix', title, subtitle, points: [] },
   *   numbers: { integrated, truePeak, dr, crest, correlation, noiseFloor }
   * }
   */
  function assessMix(report) {
    if (!report) {
      return { checks: [], verdict: { level: 'fix', title: 'No analysis', subtitle: '', points: [] }, numbers: {} };
    }

    var r = report;
    var loud = r.loudness || {};
    var levels = r.levels || {};
    var clip = r.clipping || {};
    var spec = r.spectrum || {};
    var st = r.stereo || {};
    var sil = r.silence || {};
    var tp = r.truePeak;
    var checks = [];

    function add(id, name, value, target, status, advice) {
      checks.push({ id: id, name: name, value: value, target: target, status: status, advice: advice || null });
    }

    // 1. Integrated loudness / headroom
    var integ = loud.integrated;
    var lufsSt = !isFinite(integ) ? 'fail'
      : (integ >= -20 && integ <= -12) ? 'pass'
      : (integ >= -22 && integ <= -10) ? 'warn' : 'fail';
    add('lufs', 'Integrated loudness',
      fmtLufs(integ),
      '≈ −18 to −14 LUFS (leave room for mastering)',
      lufsSt,
      lufsSt === 'pass' ? null
        : !isFinite(integ) ? 'Could not measure loudness.'
        : integ > -12 ? 'Mix is very loud already — pull the master fader / limiter off and leave headroom.'
        : 'Mix is quiet — bring levels up so the master chain starts near −18 LUFS.');

    // 2. True peak headroom
    var tpSt = !isFinite(tp) ? 'fail' : (tp <= -3 ? 'pass' : tp <= -1 ? 'warn' : 'fail');
    add('truepeak', 'True peak (headroom)',
      fmtDb(tp) + 'TP',
      '≤ −6 dBFS sample / −3 dBTP — reserve headroom',
      tpSt,
      tpSt === 'pass' ? null
        : tp > -1 ? 'Master bus is hitting the ceiling. Turn everything down so peaks stay below −6 dBFS.'
        : 'Peaks are close to full scale. Aim for −6 dBFS peaks on the mix bus.');

    // 3. Crest factor
    var crest = levels.crestFactor;
    var crestSt = !isFinite(crest) ? 'warn' : (crest >= 8 ? 'pass' : crest >= 6 ? 'warn' : 'fail');
    add('crest', 'Crest factor (dynamics)',
      isFinite(crest) ? crest.toFixed(1) + ' dB' : '—',
      '≥ 8 dB in the mix — more than the finished master',
      crestSt,
      crestSt === 'pass' ? null
        : crest < 6 ? 'The mix is already heavily compressed/limited — keep the mix bus free of limiters.'
        : 'Dynamics are a little tight; check bus compression amounts.');

    // 4. Dynamic range
    var dr = levels.dynamicRange;
    var drSt = !isFinite(dr) ? 'warn' : (dr >= 8 ? 'pass' : dr >= 5 ? 'warn' : 'fail');
    add('dr', 'Dynamic range (DR)',
      isFinite(dr) ? dr.toFixed(1) + ' dB' : '—',
      '≥ 8 dB — mastering should be the only compression stage',
      drSt,
      drSt === 'pass' ? null : 'Low DR in the mix leaves nothing for the mastering limiter. Ease off compression.');

    // 5. Clipping
    var clipSt = clip.severity === 'None' ? 'pass' : clip.severity === 'Minor' ? 'warn' : 'fail';
    add('clip', 'Clipping',
      clip.severity + (clip.clippedSamples ? ' (' + clip.clippedSamples + ' samples)' : ''),
      'No digital clipping at all',
      clipSt,
      clipSt === 'pass' ? null
        : 'You are clipping the mix bus. Lower levels or fix the limiter/clip plugin before mastering.');

    // 6. Stereo correlation / phase
    var corr = st.correlation;
    var corrSt = st.mono ? 'warn'
      : (corr >= 0.5 ? 'pass' : corr >= 0.3 ? 'warn' : 'fail');
    add('corr', 'Stereo correlation',
      st.mono ? 'mono file' : corr.toFixed(3) + (st.minCorrelation != null ? ' (min ' + st.minCorrelation.toFixed(3) + ')' : ''),
      '≥ 0.5 overall; nothing below 0',
      corrSt,
      st.mono ? 'You are checking a mono file — deliver a stereo mix for release.'
        : corrSt === 'pass' ? null
        : corr < 0 ? 'Phase cancellation detected — check wideners, delays and multi-mic instruments in mono.'
        : 'Correlation is low; verify the stereo image collapses well to mono.');

    // 7. Low-end buildup
    var lowEnd = spec.lowEndRatio || 0;
    var midR = spec.midRatio || 0;
    var lowSt = (lowEnd > 0.05 && lowEnd > midR) ? 'fail' : (lowEnd > 0.02) ? 'warn' : 'pass';
    add('lowend', 'Low-end buildup (< 30 Hz)',
      'rel energy ' + (lowEnd * 100).toFixed(2) + '%',
      'Minimal rumble below 30 Hz',
      lowSt,
      lowSt === 'pass' ? null : 'Excess sub-low rumble eats headroom — high-pass non-bass tracks around 20–30 Hz.');

    // 8. Noise floor
    var nf = sil.noiseFloorDb;
    var nfSt = !isFinite(nf) ? 'pass' : (nf <= -55 ? 'pass' : nf <= -45 ? 'warn' : 'fail');
    add('noise', 'Noise floor',
      isFinite(nf) ? nf.toFixed(1) + ' dBFS' : '—',
      '≤ −55 dBFS',
      nfSt,
      nfSt === 'pass' ? null : 'Noticeable hiss/hum in quiet parts — clean up before mastering.');

    // 9. Head/tail silence
    var lead = sil.leadSec || 0;
    var trail = sil.trailSec || 0;
    var silSt = (lead >= 0.05 && trail >= 0.2) ? 'pass' : 'warn';
    add('silence', 'Head / tail silence',
      lead.toFixed(2) + ' s / ' + trail.toFixed(2) + ' s',
      '≥ 0.05 s head, ≥ 0.2 s tail (fades in/out)',
      silSt,
      silSt === 'pass' ? null : 'Add tiny fades at the very start/end so the master doesn\'t click.');

    // 10. Abrupt edges
    if (sil.abruptStart || sil.abruptEnd) {
      add('abrupt', 'Abrupt edges',
        (sil.abruptStart ? 'start' : '') + (sil.abruptStart && sil.abruptEnd ? ' + ' : '') + (sil.abruptEnd ? 'end' : ''),
        'Faded edges',
        'warn',
        'Add 10–50 ms fades on the edges — they\'ll become audible clicks after mastering.');
    }

    // ─── Verdict ────────────────────────────────────────────────────────────
    var fails = checks.filter(function (c) { return c.status === 'fail'; });
    var warns = checks.filter(function (c) { return c.status === 'warn'; });
    var level = fails.length ? 'fix' : (warns.length <= 1 ? 'ready' : 'almost');
    var points = checks.filter(function (c) { return c.status !== 'pass'; })
      .map(function (c) { return c.advice || (c.name + ': ' + c.target); });

    var title, subtitle;
    if (level === 'ready') {
      title = '✅ Ready for mastering';
      subtitle = 'This mix has clean headroom, healthy dynamics and no showstoppers. Bounce it as WAV 24-bit and run Master Check.';
    } else if (level === 'almost') {
      title = '⚠️ Almost there — a few tweaks';
      subtitle = 'No deal-breakers, but these small fixes will make the master cleaner:';
    } else {
      title = '🔴 Fix these before mastering';
      subtitle = fails.length + ' critical issue(s) must be resolved — mastering cannot repair them:';
    }

    return {
      checks: checks,
      verdict: { level: level, title: title, subtitle: subtitle, points: points, fails: fails.length, warns: warns.length },
      numbers: {
        integrated: integ,
        truePeak: tp,
        dr: dr,
        crest: crest,
        correlation: st.mono ? null : corr,
        noiseFloor: nf,
        duration: r.duration
      }
    };
  }

  // Compact summary shared with Master Check for the mix↔master comparison.
  function summaryOf(report) {
    var a = assessMix(report);
    return {
      fileName: report && report.fileName,
      integrated: a.numbers.integrated,
      truePeak: a.numbers.truePeak,
      dr: a.numbers.dr,
      crest: a.numbers.crest,
      correlation: a.numbers.correlation,
      verdictLevel: a.verdict.level,
      analyzedAt: report && report.analyzedAt
    };
  }

  var API = { assessMix: assessMix, summaryOf: summaryOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.MIX_CHECK = API;
})(typeof window !== 'undefined' ? window : globalThis);
