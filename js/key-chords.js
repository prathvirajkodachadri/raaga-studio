/* Raaga Studio — Key, Chord & Transposition */
'use strict';
(function(){
  var PITCHES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  var PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  var KEY_SPELLINGS={C:['C','D','E','F','G','A','B'],Db:['Db','Eb','F','Gb','Ab','Bb','C'],D:['D','E','F#','G','A','B','C#'],Eb:['Eb','F','G','Ab','Bb','C','D'],E:['E','F#','G#','A','B','C#','D#'],F:['F','G','A','Bb','C','D','E'],Gb:['Gb','Ab','Bb','Cb','Db','Eb','F'],G:['G','A','B','C','D','E','F#'],Ab:['Ab','Bb','C','Db','Eb','F','G'],A:['A','B','C#','D','E','F#','G#'],Bb:['Bb','C','D','Eb','F','G','A'],B:['B','C#','D#','E','F#','G#','A#']};
  var SCALE=[0,2,4,5,7,9,11], TRIAD_QUAL=['Major','minor','minor','Major','Major','minor','diminished'], TRIAD_SUFFIX=['','','','','','','°'], SEVENTH_QUAL=['Major 7','minor 7','minor 7','Major 7','Dominant 7','minor 7','half-diminished 7'], SEVENTH_SUFFIX=['maj7','7','7','maj7','7','7','ø7'];
  var ROMAN=['I','ii','iii','IV','V','vi','vii°'];
  var INTERVAL_NAMES={0:'Unison / Perfect 8ve',1:'minor 2nd',2:'Major 2nd',3:'minor 3rd',4:'Major 3rd',5:'Perfect 4th',6:'Tritone',7:'Perfect 5th',8:'minor 6th',9:'Major 6th',10:'minor 7th',11:'Major 7th'};
  function pc(note){ return PC[note]; }
  function wrap(n){ return ((n%12)+12)%12; }
  function noteAt(root, semitones){
    var scale=KEY_SPELLINGS[root] || KEY_SPELLINGS.C, r=pc(root), target=wrap(r+semitones);
    var exact=scale.filter(function(n){return pc[n]===target;})[0];
    if(exact) return exact;
    return PITCHES[target];
  }
  function buildKeyData(key, kind){
    var scale=KEY_SPELLINGS[key] || KEY_SPELLINGS.C, out=[];
    for(var i=0;i<7;i++){
      var root=scale[i], third=scale[(i+2)%7], fifth=scale[(i+4)%7], seventh=scale[(i+6)%7];
      var chord={degree:ROMAN[i], root:root, third:third, fifth:fifth, seventh:seventh, quality:kind==='sevenths'?SEVENTH_QUAL[i]:TRIAD_QUAL[i], suffix:kind==='sevenths'?SEVENTH_SUFFIX[i]:TRIAD_SUFFIX[i]};
      chord.name=root+chord.suffix; chord.intervals=[wrap(pc(third)-pc(root)),wrap(pc(fifth)-pc(root))]; if(kind==='sevenths') chord.intervals.push(wrap(pc(seventh)-pc(root))); out.push(chord);
    }
    return out;
  }
  function fillKeys(sel){ sel.innerHTML=''; PITCHES.forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n+(n==='F#'?' / Gb':'');sel.appendChild(o);}); }
  var keySel=document.getElementById('kc-key'), original=document.getElementById('kc-original-key'), target=document.getElementById('kc-target-key'), body=document.getElementById('kc-chord-body'), scaleEl=document.getElementById('kc-scale'), chrom=document.getElementById('kc-chromatic');
  fillKeys(keySel);fillKeys(original);fillKeys(target); keySel.value='C'; original.value='C'; target.value='D';
  var view='triads', selectedChord=0;
  function renderScale(){
    var key=keySel.value, notes=KEY_SPELLINGS[key]||KEY_SPELLINGS.C; scaleEl.innerHTML=''; notes.forEach(function(n,i){var b=document.createElement('button');b.type='button';b.className='kc-scale-note'+(i===0?' tonic':'');b.innerHTML='<small>'+['1','2','3','4','5','6','7'][i]+'</small><strong>'+n+'</strong>';b.title=n+' — scale degree '+(i+1);b.addEventListener('click',function(){showNote(i,n)});scaleEl.appendChild(b);}); }
  function renderChromatic(){ chrom.innerHTML='';PITCHES.forEach(function(n,i){var d=document.createElement('button');d.type='button';d.className='kc-chromatic-note'+(i%2?' blackish':'');d.innerHTML='<small>'+i+'</small><strong>'+n+'</strong>';d.addEventListener('click',function(){selectChromatic(n,i)});chrom.appendChild(d);}); }
  function renderTable(){
    var data=buildKeyData(keySel.value,view); body.innerHTML=''; data.forEach(function(c,i){var tr=document.createElement('tr');if(i===selectedChord)tr.className='selected';tr.tabIndex=0;tr.innerHTML='<th scope="row"><button class="kc-chord-btn" type="button">'+c.degree+'</button></th><td><button class="kc-chord-btn" type="button"><strong>'+c.name+'</strong></button></td><td>'+c.quality+'</td><td>'+c.root+'</td><td>'+c.third+'</td><td>'+c.fifth+'</td><td class="kc-seventh-col">'+(view==='sevenths'?c.seventh:'—')+'</td>';var btns=tr.querySelectorAll('button');btns.forEach(function(b){b.addEventListener('click',function(){selectedChord=i;renderTable();showChord(c,i);});});tr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectedChord=i;renderTable();showChord(c,i);}});body.appendChild(tr);}); showChord(data[selectedChord],selectedChord); }
  function showChord(c,i){ document.getElementById('kc-detail-title').textContent=c.name+' · '+c.degree;var html='<div class="kc-detail-grid-mini"><div><span>Quality</span><b>'+c.quality+'</b></div><div><span>Root</span><b>'+c.root+'</b></div><div><span>3rd</span><b>'+c.third+'</b></div><div><span>5th</span><b>'+c.fifth+'</b></div>';if(view==='sevenths')html+='<div><span>7th</span><b>'+c.seventh+'</b></div>';html+='</div><p><strong>Notes:</strong> '+[c.root,c.third,c.fifth].concat(view==='sevenths'?[c.seventh]:[]).join(' · ')+'</p><p><strong>Intervals from root:</strong> '+c.intervals.map(function(n){return n+' st · '+(INTERVAL_NAMES[n]||'');}).join(' &nbsp;|&nbsp; ')+'</p>';document.getElementById('kc-detail-content').innerHTML=html; }
  function showNote(i,n){var data=buildKeyData(keySel.value,view), assoc=data.filter(function(c){return pc(c.root)===pc(n)||pc(c.third)===pc(n)||pc(c.fifth)===pc(n)||(view==='sevenths'&&pc(c.seventh)===pc(n));});document.getElementById('kc-note-title').textContent=n+' · scale degree '+(i+1);document.getElementById('kc-note-content').innerHTML='<p>This note occurs in <strong>'+assoc.length+'</strong> '+(view==='sevenths'?'diatonic 7th chords':'diatonic triads')+' in '+keySel.value+' major.</p><div class="kc-associated">'+assoc.map(function(c){return '<span>'+c.degree+' <b>'+c.name+'</b></span>';}).join('')+'</div>';}
  function selectChromatic(n,pos){ original.value=n; updateTranspose(); }
  function transpose(from,to){var d=wrap(pc(to)-pc(from));var signed=d<=6?d:d-12;return {signed:signed,abs:Math.abs(signed),direction:signed===0?'No change':(signed>0?'Upward':'Downward'),interval:INTERVAL_NAMES[wrap(signed)]};}
  function keyResult(t){var sign=t.signed>0?'+':t.signed<0?'−':''; return '<strong>'+t.direction+'</strong><span class="kc-big">'+sign+t.abs+' semitones</span><span>'+t.interval+'</span>'+(t.signed===0?'':'<small>Pitch-class change: '+(t.signed>0?'+':'')+t.signed+' st</small>');}
  function updateTranspose(){document.getElementById('kc-key-result').innerHTML=keyResult(transpose(original.value,target.value));updateChordOptions();updateChordTranspose();}
  function updateChordOptions(){var o=document.getElementById('kc-original-chord'),t=document.getElementById('kc-target-chord');var notes=PITCHES.map(function(n){return n+' major';}).concat(PITCHES.map(function(n){return n+'m';}));[o,t].forEach(function(s){var current=s.value;s.innerHTML='';notes.forEach(function(n){var op=document.createElement('option');op.value=n.split(' ')[0];op.textContent=n;s.appendChild(op);});if(current)s.value=current;});if(!o.value)o.value='C';if(!t.value)t.value='D';}
  function updateChordTranspose(){var o=document.getElementById('kc-original-chord'),t=document.getElementById('kc-target-chord');document.getElementById('kc-chord-result').innerHTML=keyResult(transpose(o.value,t.value));}
  keySel.addEventListener('change',function(){selectedChord=0;renderScale();renderTable();updateTranspose();});
  original.addEventListener('change',updateTranspose);target.addEventListener('change',updateTranspose);document.getElementById('kc-swap-keys').addEventListener('click',function(){var x=original.value;original.value=target.value;target.value=x;updateTranspose();});
  document.querySelectorAll('.kc-toggle button').forEach(function(b){b.addEventListener('click',function(){view=b.getAttribute('data-view');document.querySelectorAll('.kc-toggle button').forEach(function(x){x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});selectedChord=0;renderTable();});});
  document.getElementById('kc-original-chord').addEventListener('change',updateChordTranspose);document.getElementById('kc-target-chord').addEventListener('change',updateChordTranspose);
  renderChromatic();renderScale();renderTable();updateTranspose();
})();
