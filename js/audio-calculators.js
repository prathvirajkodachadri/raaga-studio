/* Raaga Studio Audio Calculators — shared BPM workflow. */
'use strict';
(function(){
  var EPS=1e-12, NOTE_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  function n(v,f){var x=Number(v);return isFinite(x)?x:f} function fmt(x,d){if(!isFinite(x))return '—';return Number(x.toFixed(d==null?2:d)).toString()}
  function bpm(){var e=document.getElementById('ac-master-bpm');return Math.min(300,Math.max(20,n(e&&e.value,120)))}
  function beatMs(b){return 60000/Math.max(EPS,b)}
  function noteFromHz(hz){if(!(hz>0))return{name:'—',midi:null,cents:null};var mf=69+12*Math.log2(hz/440),m=Math.round(mf),c=(mf-m)*100,o=Math.floor(m/12)-1;return{name:NOTE_NAMES[((m%12)+12)%12]+o,midi:m,cents:c}}
  function qToBw(q){return 2*Math.asinh(1/(2*Math.max(EPS,q)))} function bwToQ(bw){return 1/(2*Math.sinh(Math.max(EPS,bw/2)))}
  var F={
    bpmDelay:{title:'BPM → Delay Time',formula:'Quarter note = 60,000 ÷ BPM ms; dotted = ×1.5; triplet = ×2/3',note:'Enter BPM once above. Use straight, dotted or triplet values for delay, echo and tempo-synced effects.'},
    reverb:{title:'Reverb Time',formula:'Musical RT60 = selected note/bar duration; Sabine RT60 ≈ 0.161 × V / A',note:'Use the musical values as practical starting points. Longer tails create larger spaces but can mask the next phrase.'},
    predelay:{title:'Reverb Pre-Delay',formula:'Pre-delay = quarter-note time × subdivision factor',note:'Useful starting points: 1/32 for tight vocals, 1/16 for clarity, 1/8 for a more obvious separation.'},
    attack:{title:'Compressor Attack',formula:'Attack starting point = quarter-note time × subdivision factor',note:'Tempo is only a starting point. Final attack should follow the transient and desired punch.'},
    release:{title:'Compressor Release',formula:'Release starting point = quarter-note time × subdivision factor',note:'Use 1/16–1/4 as musical starting points, then adjust by gain-return and groove.'},
    releaseBpm:{title:'Release Time → BPM',formula:'BPM = 60,000 × musical factor ÷ release(ms)',note:'Enter a release you like and see the approximate tempo it follows.'},
    gate:{title:'Gate Hold / Release',formula:'Time = quarter-note time × subdivision factor',note:'Great for tight drums, percussion and rhythmic noise gates.'},
    lfo:{title:'LFO / Modulation Rate',formula:'Hz = 1000 ÷ time(ms)',note:'Use these tempo-synced rates for tremolo, auto-pan, filter LFO and modulation.'},
    qbw:{title:'Q ↔ Bandwidth',formula:'BW(oct) = 2 asinh(1/(2Q)); Q = 1/(2 sinh(BW/2))',note:'Useful for translating EQ Q into bandwidth in octaves.'},
    note:{title:'Frequency → Note',formula:'MIDI = 69 + 12 log₂(f / 440)',note:'A4 = 440 Hz. Cents show tuning offset from the nearest equal-tempered note.'},
    haas:{title:'Haas Delay',formula:'Distance = delay(ms) × sound speed ÷ 1000',note:'Shows the path-length difference represented by a short stereo delay.'},
    pan:{title:'Pan Law',formula:'Linear center gain = 10^(−attenuation/20)',note:'Check the center gain produced by a 3, 4.5 or 6 dB pan-law setting.'},
    crossover:{title:'Crossover Frequency',formula:'fc = 1 ÷ (2πRC)',note:'Simple RC corner-frequency calculation; real crossover networks depend on topology and slope.'},
    lufs:{title:'LUFS Reference',formula:'Reference = RMS value + calibration offset',note:'Educational reference only. Use a standards-compliant loudness meter for final integrated LUFS.'},
    tp:{title:'True Peak / Headroom',formula:'Headroom = ceiling(dBTP) − measured peak(dBTP)',note:'True-peak measurement itself requires oversampling/inter-sample peak detection.'},
    dbfs:{title:'dBFS ↔ dBu',formula:'dBu = dBFS + interface calibration reference',note:'There is no universal conversion without the interface calibration reference.'},
    phase:{title:'Wavelength / Phase',formula:'λ = c / f; phase° = delay × f × 360',note:'At 20 °C, sound speed is approximately 343 m/s.'}
  };
  function card(num,id,key){var x=F[key];return '<article class="ac-card" id="ac-'+id+'"><header class="ac-card-head"><div><span class="ac-num">'+num+'</span><h3>'+x.title+'</h3></div></header><div class="ac-formula"><span>Formula</span><code>'+x.formula+'</code></div><p class="ac-note">'+x.note+'</p><div class="ac-fields" data-calc="'+id+'"></div><div class="ac-result" id="ac-result-'+id+'">Enter values to calculate.</div></article>'}
  function field(label,id,value,unit,step,min){return '<label class="ac-field"><span>'+label+'</span><div class="ac-input-wrap"><input id="'+id+'" type="number" inputmode="decimal" value="'+value+'" step="'+(step||'any')+'"'+(min!=null?' min="'+min+'"':'')+'><em>'+unit+'</em></div></label>'}
  function val(id){return n(document.getElementById(id)&&document.getElementById(id).value,NaN)} function set(id,html){var e=document.getElementById('ac-result-'+id);if(e)e.innerHTML=html}
  function divisionSelect(id,value){return '<label class="ac-field"><span>Note division</span><select id="'+id+'"><option value="4" '+(value===4?'selected':'')+'>1/4 · Quarter</option><option value="2" '+(value===2?'selected':'')+'>1/8 · Eighth</option><option value="1" '+(value===1?'selected':'')+'>1/16 · Sixteenth</option><option value="0.5">1/32</option><option value="8">1/2 · Half</option><option value="16">1/1 · Whole</option></select></label>'}
  function build(){
    var m=document.getElementById('ac-grid');if(!m)return;
    m.innerHTML=[card('01','bpm-delay','bpmDelay'),card('02','reverb','reverb'),card('03','predelay','predelay'),card('04','attack','attack'),card('05','release','release'),card('06','release-bpm','releaseBpm'),card('07','gate','gate'),card('08','lfo','lfo'),card('09','q-bandwidth','qbw'),card('10','frequency-note','note'),card('11','haas','haas'),card('12','pan-law','pan'),card('13','crossover','crossover'),card('14','lufs','lufs'),card('15','true-peak','tp'),card('16','dbfs-dbu','dbfs'),card('17','wavelength-phase','phase')].join('');
    document.querySelector('[data-calc="bpm-delay"]').innerHTML='<div class="ac-wide-table"><table><thead><tr><th>Note</th><th>Straight</th><th>Dotted</th><th>Triplet</th><th>Hz</th></tr></thead><tbody id="ac-delay-table"></tbody></table></div>';
    document.querySelector('[data-calc="reverb"]').innerHTML=divisionSelect('ac-rv-div',4)+'<label class="ac-field"><span>Reverb style</span><select id="ac-rv-style"><option value="0.5">Tight · 1/2 beat</option><option value="1">Short · 1 beat</option><option value="2" selected>Room · 2 beats</option><option value="4">1 bar · 4 beats</option><option value="8">2 bars · 8 beats</option></select></label>';
    document.querySelector('[data-calc="predelay"]').innerHTML=divisionSelect('ac-pd-div',1)+'<label class="ac-field"><span>Feel</span><select id="ac-pd-feel"><option value="1">Straight</option><option value="1.5">Dotted</option><option value="0.6666667">Triplet</option></select></label>';
    document.querySelector('[data-calc="attack"]').innerHTML=divisionSelect('ac-at-div',1)+'<label class="ac-field"><span>Preset feel</span><select id="ac-at-feel"><option value="0.5">Very fast</option><option value="1" selected>Fast</option><option value="2">Medium</option><option value="4">Slow</option></select></label>';
    document.querySelector('[data-calc="release"]').innerHTML=divisionSelect('ac-rel-div',2)+'<label class="ac-field"><span>Feel</span><select id="ac-rel-feel"><option value="0.6666667">Fast</option><option value="1" selected>Musical</option><option value="1.5">Dotted</option><option value="2">Slow</option></select></label>';
    document.querySelector('[data-calc="release-bpm"]').innerHTML=field('Release','ac-rm',300,'ms','1',0.1)+field('Musical factor','ac-rf',1,'beat','0.001',0.001);
    document.querySelector('[data-calc="gate"]').innerHTML=divisionSelect('ac-g-div',1)+'<label class="ac-field"><span>Function</span><select id="ac-g-fn"><option value="hold">Hold</option><option value="release">Release</option></select></label>';
    document.querySelector('[data-calc="lfo"]').innerHTML=divisionSelect('ac-lfo-div',2)+'<label class="ac-field"><span>Feel</span><select id="ac-lfo-feel"><option value="1">Straight</option><option value="1.5">Dotted</option><option value="0.6666667">Triplet</option></select></label>';
    document.querySelector('[data-calc="q-bandwidth"]').innerHTML=field('Q','ac-q',2,'','0.01',0.001)+field('Bandwidth','ac-bw',1,'oct','0.001',0.001);
    document.querySelector('[data-calc="frequency-note"]').innerHTML=field('Frequency','ac-f',440,'Hz','0.01',0.001);
    document.querySelector('[data-calc="haas"]').innerHTML=field('Delay','ac-hm',20,'ms','0.1',0)+field('Sound speed','ac-hc',343,'m/s','0.1',1);
    document.querySelector('[data-calc="pan-law"]').innerHTML=field('Center attenuation','ac-pan',3,'dB','0.1',0);
    document.querySelector('[data-calc="crossover"]').innerHTML=field('Resistance','ac-xr',10000,'Ω','1',0.001)+field('Capacitance','ac-xc',0.0000001,'F','any',0.000000000001);
    document.querySelector('[data-calc="lufs"]').innerHTML=field('RMS reference','ac-lr',-18,'dBFS','0.1')+field('Calibration offset','ac-lo',0,'dB','0.1');
    document.querySelector('[data-calc="true-peak"]').innerHTML=field('Measured peak','ac-tp',-1,'dBTP','0.1')+field('Ceiling','ac-tc',-1,'dBTP','0.1');
    document.querySelector('[data-calc="dbfs-dbu"]').innerHTML=field('dBFS','ac-dv',-18,'dBFS','0.1')+field('Calibration','ac-dc',18,'dB','0.1');
    document.querySelector('[data-calc="wavelength-phase"]').innerHTML=field('Frequency','ac-wf',1000,'Hz','0.1',0.001)+field('Delay','ac-wm',0.5,'ms','0.001',0)+field('Sound speed','ac-wc',343,'m/s','0.1',1);
    document.querySelectorAll('#ac-grid input,#ac-grid select').forEach(function(e){e.addEventListener('input',calc);e.addEventListener('change',calc)});
    var master=document.getElementById('ac-master-bpm');
    if(master){var saved=localStorage.getItem('raagaStudioBpm');if(saved)master.value=saved;master.addEventListener('input',function(){localStorage.setItem('raagaStudioBpm',master.value);calc()});}
    document.querySelectorAll('[data-bpm]').forEach(function(b){b.addEventListener('click',function(){master.value=b.dataset.bpm;master.dispatchEvent(new Event('input'))})});
    document.getElementById('ac-half-tempo').onclick=function(){master.value=fmt(bpm()/2,1);master.dispatchEvent(new Event('input'))};
    document.getElementById('ac-double-tempo').onclick=function(){master.value=fmt(bpm()*2,1);master.dispatchEvent(new Event('input'))};
    var taps=[];document.getElementById('ac-tap-tempo').onclick=function(){var now=performance.now();if(taps.length&&now-taps[taps.length-1]>2000)taps=[];taps.push(now);if(taps.length>5)taps.shift();if(taps.length>=2){var sum=0;for(var i=1;i<taps.length;i++)sum+=taps[i]-taps[i-1];var detected=60000/(sum/(taps.length-1));if(detected>=20&&detected<=300){master.value=fmt(detected,1);master.dispatchEvent(new Event('input'))}}};
    document.querySelectorAll('[data-ac-jump]').forEach(function(b){b.addEventListener('click',function(){var e=document.getElementById('ac-'+b.dataset.acJump);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})})});calc();
  }
  function calc(){
    var b=bpm(),q=beatMs(b),summary=document.getElementById('ac-tempo-summary');
    if(summary)summary.innerHTML='<span>1 beat <b>'+fmt(q,1)+' ms</b></span><span>1/8 <b>'+fmt(q/2,1)+' ms</b></span><span>1/16 <b>'+fmt(q/4,1)+' ms</b></span><span>1 bar <b>'+fmt(q*4/1000,2)+' s</b></span>';
    var rows=[['1/1',q*4,q*6,q*8/3],['1/2',q*2,q*3,q*4/3],['1/4',q,q*1.5,q*2/3],['1/8',q/2,q*.75,q/3],['1/16',q/4,q*.375,q/6],['1/32',q/8,q*.1875,q/12],['1/64',q/16,q*.09375,q/24]];
    var tb=document.getElementById('ac-delay-table');if(tb)tb.innerHTML=rows.map(function(r){return '<tr><td><b>'+r[0]+'</b></td><td>'+fmt(r[1],2)+' ms</td><td>'+fmt(r[2],2)+' ms</td><td>'+fmt(r[3],2)+' ms</td><td>'+fmt(1000/r[1],2)+' Hz</td></tr>'}).join('');
    var rd=val('ac-rv-div'),style=val('ac-rv-style');if(rd>0&&style>0)set('reverb','<strong>'+fmt(q*(rd/4),2)+' ms</strong> · '+style+' beats · '+fmt(q*style/1000,2)+' s RT60 starting point');
    var pd=val('ac-pd-div'),pf=val('ac-pd-feel');if(pd>0&&pf>0)set('predelay','<strong>'+fmt(q*(pd/4)*pf,2)+' ms</strong> pre-delay');
    var ad=val('ac-at-div'),af=val('ac-at-feel');if(ad>0&&af>0)set('attack','<strong>'+fmt(q*(ad/4)*af,2)+' ms</strong> starting point');
    var rel=val('ac-rel-div'),rf=val('ac-rel-feel');if(rel>0&&rf>0)set('release','<strong>'+fmt(q*(rel/4)*rf,2)+' ms</strong> starting point');
    var rm=val('ac-rm'),rff=val('ac-rf');if(rm>0&&rff>0)set('release-bpm','<strong>'+fmt(60000*rff/rm,2)+' BPM</strong>');
    var gd=val('ac-g-div');if(gd>0)set('gate','<strong>'+fmt(q*(gd/4),2)+' ms</strong> '+(document.getElementById('ac-g-fn')||{}).value+' time');
    var ld=val('ac-lfo-div'),lf=val('ac-lfo-feel');if(ld>0&&lf>0){var lm=q*(ld/4)*lf;set('lfo','<strong>'+fmt(lm,2)+' ms</strong> · <strong>'+fmt(1000/lm,3)+' Hz</strong>')}
    var qv=val('ac-q'),bw=val('ac-bw');if(qv>0)set('q-bandwidth','<strong>Bandwidth '+fmt(qToBw(qv),3)+' oct</strong>');else if(bw>0)set('q-bandwidth','<strong>Q '+fmt(bwToQ(bw),3)+'</strong>');
    var f=val('ac-f');if(f>0){var x=noteFromHz(f);set('frequency-note','<strong>'+x.name+'</strong> · MIDI '+x.midi+' · '+(x.cents>=0?'+':'')+fmt(x.cents,1)+' cents')}
    var hm=val('ac-hm'),hc=val('ac-hc');if(hm>=0&&hc>0)set('haas','<strong>'+fmt(hm*hc/1000,3)+' m</strong> path difference');
    var p=val('ac-pan');if(p>=0)set('pan-law','<strong>'+fmt(Math.pow(10,-p/20),4)+'</strong> linear center gain');
    var xr=val('ac-xr'),xc=val('ac-xc');if(xr>0&&xc>0)set('crossover','<strong>'+fmt(1/(2*Math.PI*xr*xc),1)+' Hz</strong> RC corner');
    var lr=val('ac-lr'),lo=val('ac-lo');if(isFinite(lr)&&isFinite(lo))set('lufs','<strong>'+fmt(lr+lo,2)+' LUFS-equivalent reference</strong><small>Use a standards-compliant meter for true integrated LUFS.</small>');
    var tp=val('ac-tp'),tc=val('ac-tc');if(isFinite(tp)&&isFinite(tc))set('true-peak','<strong>'+fmt(tc-tp,2)+' dB headroom</strong>');
    var dv=val('ac-dv'),dc=val('ac-dc');if(isFinite(dv)&&isFinite(dc))set('dbfs-dbu','<strong>'+fmt(dv+dc,2)+' dBu</strong>');
    var wf=val('ac-wf'),wm=val('ac-wm'),wc=val('ac-wc');if(wf>0&&wc>0)set('wavelength-phase','<strong>λ = '+fmt(wc/wf,4)+' m</strong> · <strong>'+fmt(wm*wf*360/1000,2)+'°</strong> phase');
  }
  window.AudioCalculators={build:build,formulas:F};
})();
