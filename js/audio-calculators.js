/* Audio Calculators — formula reference + interactive calculations. */
'use strict';
(function () {
  var EPS = 1e-12;
  var NOTE_NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  function n(v,f){var x=Number(v);return isFinite(x)?x:f} function fmt(x,d){if(!isFinite(x))return '—';return Number(x.toFixed(d==null?3:d)).toString()}
  function noteFromHz(hz){if(!(hz>0))return{name:'—',midi:null,cents:null};var mf=69+12*Math.log2(hz/440),m=Math.round(mf),c=(mf-m)*100,o=Math.floor(m/12)-1;return{name:NOTE_NAMES[((m%12)+12)%12]+o,midi:m,cents:c}}
  function qToBw(q){return 2*Math.asinh(1/(2*Math.max(EPS,q)))} function bwToQ(bw){return 1/(2*Math.sinh(Math.max(EPS,bw/2)))} function beatMs(bpm){return 60000/Math.max(EPS,bpm)}
  var F={
    bpmDelay:{title:'BPM → Delay Time',formula:'1 beat = 60,000 / BPM ms; subdivision = beat × numerator / denominator',note:'Common musical delays: 1/4, 1/8, 1/8T, 1/16 and dotted 1/8.'},
    reverb:{title:'Reverb Time (RT60)',formula:'RT60 ≈ 0.161 × V / A  (Sabine, SI units)',note:'V = room volume in m³; A = equivalent absorption area in sabins.'},
    predelay:{title:'Pre-Delay',formula:'Pre-delay ≈ distance / speed of sound × 1000 ms',note:'At about 20 °C, use 343 m/s. In music, choose by tempo and clarity.'},
    attack:{title:'Attack Time',formula:'Attack ≈ beat × musical subdivision',note:'No universal attack formula exists; this gives tempo-synced starting points.'},
    release:{title:'Release Time',formula:'Release ≈ beat × musical subdivision',note:'Use the subdivision as a starting point, then tune by groove and gain return.'},
    releaseBpm:{title:'Compressor Release → BPM',formula:'BPM ≈ 60,000 × musical factor / release(ms)',note:'Inverse beat-time conversion for tempo-related compressor release settings.'},
    qbw:{title:'Q ↔ Bandwidth',formula:'BW(oct) = 2 asinh(1/(2Q)); Q = 1/(2 sinh(BW/2))',note:'Common constant-Q bandwidth relationship in octaves.'},
    note:{title:'Frequency → Note',formula:'MIDI = 69 + 12 log₂(f / 440)',note:'A4 = 440 Hz reference; cents show tuning offset from the nearest note.'},
    haas:{title:'Haas Delay',formula:'Distance ≈ delay(ms) × speed of sound / 1000',note:'Useful for understanding the path-length difference behind short stereo offsets.'},
    pan:{title:'Pan Law',formula:'Linear center gain = 10^(attenuation(dB)/20)',note:'Enter the chosen center attenuation such as 3, 4.5 or 6 dB.'},
    crossover:{title:'Crossover Frequency',formula:'fc = 1 / (2πRC)',note:'This is the simple RC corner. Real crossover networks depend on topology and slope.'},
    lufs:{title:'LUFS / Loudness',formula:'RMS reference in dB + calibration offset',note:'This is an educational reference, not a standards-certified integrated LUFS meter.'},
    tp:{title:'True Peak / Headroom',formula:'Headroom = ceiling(dBTP) − measured peak(dBTP)',note:'True-peak measurement itself requires oversampling/inter-sample peak detection.'},
    dbfs:{title:'dBFS ↔ dBu',formula:'dBu = dBFS + calibration level',note:'There is no universal conversion without the interface calibration reference.'},
    phase:{title:'Wavelength / Phase',formula:'λ = c / f; phase° = delay × f × 360',note:'At 20 °C, c ≈ 343 m/s. One full-cycle delay equals 360°.'}
  };
  function card(num,id,key){var x=F[key];return '<article class="ac-card" id="ac-'+id+'"><header class="ac-card-head"><div><span class="ac-num">'+num+'</span><h3>'+x.title+'</h3></div></header><div class="ac-formula"><span>Formula</span><code>'+x.formula+'</code></div><p class="ac-note">'+x.note+'</p><div class="ac-fields" data-calc="'+id+'"></div><div class="ac-result" id="ac-result-'+id+'">Enter values to calculate.</div></article>'}
  function field(label,id,value,unit,step,min){return '<label class="ac-field"><span>'+label+'</span><input id="'+id+'" type="number" inputmode="decimal" value="'+value+'" step="'+(step||'any')+'"'+(min!=null?' min="'+min+'"':'')+'><em>'+unit+'</em></label>'}
  function val(id){return n(document.getElementById(id)&&document.getElementById(id).value,NaN)} function set(id,html){var e=document.getElementById('ac-result-'+id);if(e)e.innerHTML=html}
  function build(){var m=document.getElementById('ac-grid');if(!m)return;m.innerHTML=[card('01','bpm-delay','bpmDelay'),card('02','reverb','reverb'),card('03','predelay','predelay'),card('04','attack','attack'),card('05','release','release'),card('06','release-bpm','releaseBpm'),card('07','q-bandwidth','qbw'),card('08','frequency-note','note'),card('09','haas','haas'),card('10','pan-law','pan'),card('11','crossover','crossover'),card('12','lufs','lufs'),card('13','true-peak','tp'),card('14','dbfs-dbu','dbfs'),card('15','wavelength-phase','phase')].join('');
    document.querySelector('[data-calc="bpm-delay"]').innerHTML=field('BPM','ac-bpm',100,'BPM','0.1',1)+field('Numerator','ac-num',1,'num','1',1)+field('Denominator','ac-den',4,'den','1',1);
    document.querySelector('[data-calc="reverb"]').innerHTML=field('Room volume','ac-rv',100,'m³','0.1',0)+field('Absorption','ac-ra',50,'sabins','0.1',0.01);
    document.querySelector('[data-calc="predelay"]').innerHTML=field('Distance','ac-pd',3,'m','0.01',0)+field('Sound speed','ac-pdc',343,'m/s','0.1',1);
    document.querySelector('[data-calc="attack"]').innerHTML=field('BPM','ac-ab',100,'BPM','0.1',1)+field('Subdivision','ac-as',1,'factor','0.001',0.001);
    document.querySelector('[data-calc="release"]').innerHTML=field('BPM','ac-rb',100,'BPM','0.1',1)+field('Subdivision','ac-rs',0.5,'factor','0.001',0.001);
    document.querySelector('[data-calc="release-bpm"]').innerHTML=field('Release','ac-rm',300,'ms','1',0.1)+field('Musical factor','ac-rf',1,'beat','0.001',0.001);
    document.querySelector('[data-calc="q-bandwidth"]').innerHTML=field('Q','ac-q',2,'','0.01',0.001)+field('Bandwidth','ac-bw',1,'oct','0.001',0.001);
    document.querySelector('[data-calc="frequency-note"]').innerHTML=field('Frequency','ac-f',440,'Hz','0.01',0.001);
    document.querySelector('[data-calc="haas"]').innerHTML=field('Delay','ac-hm',20,'ms','0.1',0)+field('Sound speed','ac-hc',343,'m/s','0.1',1);
    document.querySelector('[data-calc="pan-law"]').innerHTML=field('Center attenuation','ac-pan',3,'dB','0.1',0);
    document.querySelector('[data-calc="crossover"]').innerHTML=field('Resistance','ac-xr',10000,'Ω','1',0.001)+field('Capacitance','ac-xc',0.0000001,'F','any',0.000000000001);
    document.querySelector('[data-calc="lufs"]').innerHTML=field('RMS reference','ac-lr',-18,'dBFS','0.1')+field('Calibration offset','ac-lo',0,'dB','0.1');
    document.querySelector('[data-calc="true-peak"]').innerHTML=field('Measured peak','ac-tp',-1,'dBTP','0.1')+field('Ceiling','ac-tc',-1,'dBTP','0.1');
    document.querySelector('[data-calc="dbfs-dbu"]').innerHTML=field('dBFS','ac-dv',-18,'dBFS','0.1')+field('Calibration','ac-dc',18,'dB','0.1');
    document.querySelector('[data-calc="wavelength-phase"]').innerHTML=field('Frequency','ac-wf',1000,'Hz','0.1',0.001)+field('Delay','ac-wm',0.5,'ms','0.001',0)+field('Sound speed','ac-wc',343,'m/s','0.1',1);
    document.querySelectorAll('#ac-grid input').forEach(function(e){e.addEventListener('input',calc);e.addEventListener('change',calc)});document.querySelectorAll('[data-ac-jump]').forEach(function(b){b.addEventListener('click',function(){var e=document.getElementById('ac-'+b.dataset.acJump);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})})});calc()}
  function calc(){var bpm=val('ac-bpm'),nu=val('ac-num'),de=val('ac-den');if(bpm>0&&nu>0&&de>0)set('bpm-delay','<strong>'+fmt(60000/bpm*nu/de,2)+' ms</strong>');var v=val('ac-rv'),a=val('ac-ra');if(v>=0&&a>0)set('reverb','<strong>'+fmt(.161*v/a,2)+' s RT60</strong>');var d=val('ac-pd'),c=val('ac-pdc');if(d>=0&&c>0)set('predelay','<strong>'+fmt(d/c*1000,2)+' ms</strong>');var ab=val('ac-ab'),as=val('ac-as');if(ab>0&&as>0)set('attack','<strong>'+fmt(beatMs(ab)*as,2)+' ms</strong>');var rb=val('ac-rb'),rs=val('ac-rs');if(rb>0&&rs>0)set('release','<strong>'+fmt(beatMs(rb)*rs,2)+' ms</strong>');var rm=val('ac-rm'),rf=val('ac-rf');if(rm>0&&rf>0)set('release-bpm','<strong>'+fmt(60000*rf/rm,2)+' BPM</strong>');var q=val('ac-q'),bw=val('ac-bw');if(q>0)set('q-bandwidth','<strong>Bandwidth '+fmt(qToBw(q),3)+' oct</strong>');else if(bw>0)set('q-bandwidth','<strong>Q '+fmt(bwToQ(bw),3)+'</strong>');var f=val('ac-f');if(f>0){var x=noteFromHz(f);set('frequency-note','<strong>'+x.name+'</strong> · MIDI '+x.midi+' · '+(x.cents>=0?'+':'')+fmt(x.cents,1)+' cents')}var hm=val('ac-hm'),hc=val('ac-hc');if(hm>=0&&hc>0)set('haas','<strong>'+fmt(hm*hc/1000,3)+' m</strong>');var p=val('ac-pan');if(p>=0)set('pan-law','<strong>'+fmt(Math.pow(10,-p/20),4)+'</strong> linear center gain');var xr=val('ac-xr'),xc=val('ac-xc');if(xr>0&&xc>0)set('crossover','<strong>'+fmt(1/(2*Math.PI*xr*xc),1)+' Hz</strong> RC corner');var lr=val('ac-lr'),lo=val('ac-lo');if(isFinite(lr)&&isFinite(lo))set('lufs','<strong>'+fmt(lr+lo,2)+' LUFS-equivalent reference</strong><small>Use a standards-compliant meter for true integrated LUFS.</small>');var tp=val('ac-tp'),tc=val('ac-tc');if(isFinite(tp)&&isFinite(tc))set('true-peak','<strong>'+fmt(tc-tp,2)+' dB headroom</strong>');var dv=val('ac-dv'),dc=val('ac-dc');if(isFinite(dv)&&isFinite(dc))set('dbfs-dbu','<strong>'+fmt(dv+dc,2)+' dBu</strong>');var wf=val('ac-wf'),wm=val('ac-wm'),wc=val('ac-wc');if(wf>0&&wc>0)set('wavelength-phase','<strong>λ = '+fmt(wc/wf,4)+' m</strong> · <strong>'+fmt(wm*wf*360/1000,2)+'°</strong> phase')}
  window.AudioCalculators={build:build,formulas:F};
})();
