/* Raaga Studio — Key, Chord & Transposition
 * Music-theory calculations are kept here, separate from presentation.
 */
'use strict';
(function(){
  var PITCHES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  var PC={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  var KEY_SPELLINGS={C:['C','D','E','F','G','A','B'],Db:['Db','Eb','F','Gb','Ab','Bb','C'],D:['D','E','F#','G','A','B','C#'],Eb:['Eb','F','G','Ab','Bb','C','D'],E:['E','F#','G#','A','B','C#','D#'],F:['F','G','A','Bb','C','D','E'],Gb:['Gb','Ab','Bb','Cb','Db','Eb','F'],G:['G','A','B','C','D','E','F#'],Ab:['Ab','Bb','C','Db','Eb','F','G'],A:['A','B','C#','D','E','F#','G#'],Bb:['Bb','C','D','Eb','F','G','A'],B:['B','C#','D#','E','F#','G#','A#']};
  var SCALE_TYPES={
    major:{label:'Major',intervals:[0,2,4,5,7,9,11]},
    'natural-minor':{label:'Natural Minor',intervals:[0,2,3,5,7,8,10]},
    'harmonic-minor':{label:'Harmonic Minor',intervals:[0,2,3,5,7,8,11]},
    'melodic-minor':{label:'Melodic Minor (ascending)',intervals:[0,2,3,5,7,9,11]}
  };
  var ROMAN_MAJOR=['I','ii','iii','IV','V','vi','vii°'];
  var ROMAN_MINOR=['i','ii°','III','iv','v','VI','VII'];
  var INTERVAL_NAMES={0:'Unison / Perfect 8ve',1:'minor 2nd',2:'Major 2nd',3:'minor 3rd',4:'Major 3rd',5:'Perfect 4th',6:'Tritone',7:'Perfect 5th',8:'minor 6th',9:'Major 6th',10:'minor 7th',11:'Major 7th'};
  var TRIAD_SUFFIXES={major:['','','','','','','°'],'natural-minor':['m','°','','m','m','',''],'harmonic-minor':['m','°','+','m','','','°'],'melodic-minor':['m','m','+','','','°','°']};
  var TRIAD_QUALITIES={major:['Major','minor','minor','Major','Major','minor','diminished'],'natural-minor':['minor','diminished','Major','minor','minor','Major','Major'],'harmonic-minor':['minor','diminished','augmented','minor','Major','Major','diminished'],'melodic-minor':['minor','minor','augmented','Major','Major','diminished','diminished']};
  var SEVENTH_SUFFIXES={major:['maj7','7','7','maj7','7','7','ø7'],'natural-minor':['m7','ø7','maj7','m7','m7','maj7','7'],'harmonic-minor':['mMaj7','ø7','+maj7','m7','7','maj7','°7'],'melodic-minor':['mMaj7','m7','+maj7','7','7','ø7','ø7']};
  var SEVENTH_QUALITIES={major:['Major 7','minor 7','minor 7','Major 7','Dominant 7','minor 7','half-diminished 7'],'natural-minor':['minor 7','half-diminished 7','Major 7','minor 7','minor 7','Major 7','Dominant 7'],'harmonic-minor':['minor-major 7','half-diminished 7','augmented-major 7','minor 7','Dominant 7','Major 7','diminished 7'],'melodic-minor':['minor-major 7','minor 7','augmented-major 7','Dominant 7','Dominant 7','half-diminished 7','half-diminished 7']};

  function wrap(n){return ((n%12)+12)%12;}
  function pc(n){return PC[n];}
  function scaleNotes(key,type){
    var base=KEY_SPELLINGS[key]||KEY_SPELLINGS.C, ints=SCALE_TYPES[type].intervals, rootPc=pc(key);
    return ints.map(function(semitone,i){
      var exact=base.filter(function(n){return pc(n)===wrap(rootPc+semitone);})[0];
      if(exact)return exact;
      return PITCHES[wrap(rootPc+semitone)];
    });
  }
  function buildKeyData(key,type,view){
    var notes=scaleNotes(key,type), minor=type!=='major', roman=minor?ROMAN_MINOR:ROMAN_MAJOR;
    var suffixes=view==='sevenths'?SEVENTH_SUFFIXES[type]:TRIAD_SUFFIXES[type];
    var qualities=view==='sevenths'?SEVENTH_QUALITIES[type]:TRIAD_QUALITIES[type];
    return notes.map(function(root,i){
      var c={degree:roman[i],root:root,third:notes[(i+2)%7],fifth:notes[(i+4)%7],seventh:notes[(i+6)%7],quality:qualities[i],suffix:suffixes[i]};
      c.name=root+c.suffix;
      c.intervals=[wrap(pc(c.third)-pc(root)),wrap(pc(c.fifth)-pc(root))];
      if(view==='sevenths')c.intervals.push(wrap(pc(c.seventh)-pc(root)));
      return c;
    });
  }
  function fillKeys(sel){sel.innerHTML='';PITCHES.forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n+(n==='F#'?' / Gb':'');sel.appendChild(o);});}
  function intervalName(n){return INTERVAL_NAMES[wrap(n)]||'';}
  function transpose(from,to,direction){
    var raw=wrap(pc(to)-pc(from));
    if(raw===0)return {signed:0,abs:0,direction:'No change',interval:'Unison / Perfect 8ve'};
    var signed=direction==='down'?(raw===0?0:raw-12):raw;
    return {signed:signed,abs:Math.abs(signed),direction:signed>0?'Upward':'Downward',interval:intervalName(signed)};
  }
  function resultHtml(t,from,to){var sign=t.signed>0?'+':t.signed<0?'−':'';return '<strong>'+t.direction+'</strong><span class="kc-big">'+sign+t.abs+' semitones</span><span>'+t.interval+'</span><small>'+from+' → '+to+' · pitch-class shift '+(t.signed>0?'+':'')+t.signed+' st</small>';}
  function bothHtml(up,down){return '<div><b>↑ Upward</b><span>+'+up.abs+' semitones</span><em>'+up.interval+'</em></div><div><b>↓ Downward</b><span>'+(down.signed===0?'0':'−'+down.abs)+' semitones</span><em>'+down.interval+'</em></div>';}

  var keySel=document.getElementById('kc-key'), typeSel=document.getElementById('kc-scale-type'), original=document.getElementById('kc-original-key'), target=document.getElementById('kc-target-key'), body=document.getElementById('kc-chord-body'), scaleEl=document.getElementById('kc-scale'), chrom=document.getElementById('kc-chromatic'), formula=document.getElementById('kc-scale-formula');
  fillKeys(keySel);fillKeys(original);fillKeys(target);keySel.value='C';original.value='C';target.value='D';
  var view='triads',direction='up',selectedChord=0;

  function renderScale(){
    var key=keySel.value,type=typeSel.value,notes=scaleNotes(key,type);scaleEl.innerHTML='';
    notes.forEach(function(n,i){var b=document.createElement('button');b.type='button';b.className='kc-scale-note'+(i===0?' tonic':'');b.innerHTML='<small>'+['1','2','3','4','5','6','7'][i]+'</small><strong>'+n+'</strong>';b.title=n+' — scale degree '+(i+1);b.addEventListener('click',function(){showNote(i,n);});scaleEl.appendChild(b);});
    formula.innerHTML='<b>'+SCALE_TYPES[type].label+'</b> · semitone formula: '+SCALE_TYPES[type].intervals.join(' – ')+' · notes: '+notes.join(' · ');
  }
  function renderChromatic(){chrom.innerHTML='';PITCHES.forEach(function(n,i){var d=document.createElement('button');d.type='button';d.className='kc-chromatic-note'+(i%2?' blackish':'');d.innerHTML='<small>'+i+'</small><strong>'+n+'</strong>';d.addEventListener('click',function(){original.value=n;updateTranspose();});chrom.appendChild(d);});}
  function renderTable(){
    var data=buildKeyData(keySel.value,typeSel.value,view);body.innerHTML='';
    data.forEach(function(c,i){var tr=document.createElement('tr');if(i===selectedChord)tr.className='selected';tr.tabIndex=0;tr.innerHTML='<th scope="row"><button class="kc-chord-btn" type="button">'+c.degree+'</button></th><td><button class="kc-chord-btn" type="button"><strong>'+c.name+'</strong></button></td><td>'+c.quality+'</td><td>'+c.root+'</td><td>'+c.third+'</td><td>'+c.fifth+'</td><td class="kc-seventh-col">'+(view==='sevenths'?c.seventh:'—')+'</td>';tr.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){selectedChord=i;renderTable();showChord(c);});});tr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();selectedChord=i;renderTable();showChord(c);}});body.appendChild(tr);});showChord(data[selectedChord]);
  }
  function showChord(c){document.getElementById('kc-detail-title').textContent=c.name+' · '+c.degree;var html='<div class="kc-detail-grid-mini"><div><span>Quality</span><b>'+c.quality+'</b></div><div><span>Root</span><b>'+c.root+'</b></div><div><span>3rd</span><b>'+c.third+'</b></div><div><span>5th</span><b>'+c.fifth+'</b></div>';if(view==='sevenths')html+='<div><span>7th</span><b>'+c.seventh+'</b></div>';html+='</div><p><strong>Notes:</strong> '+[c.root,c.third,c.fifth].concat(view==='sevenths'?[c.seventh]:[]).join(' · ')+'</p><p><strong>Intervals from root:</strong> '+c.intervals.map(function(n){return n+' st · '+intervalName(n);}).join(' &nbsp;|&nbsp; ')+'</p>';document.getElementById('kc-detail-content').innerHTML=html;}
  function showNote(i,n){var data=buildKeyData(keySel.value,typeSel.value,view),assoc=data.filter(function(c){return [c.root,c.third,c.fifth].concat(view==='sevenths'?[c.seventh]:[]).some(function(x){return pc(x)===pc(n);});});document.getElementById('kc-note-title').textContent=n+' · scale degree '+(i+1);document.getElementById('kc-note-content').innerHTML='<p>This note occurs in <strong>'+assoc.length+'</strong> diatonic '+(view==='sevenths'?'7th chords':'triads')+' in '+SCALE_TYPES[typeSel.value].label+'.</p><div class="kc-associated">'+assoc.map(function(c){return '<span>'+c.degree+' <b>'+c.name+'</b></span>';}).join('')+'</div>';}
  function updateChordOptions(){var o=document.getElementById('kc-original-chord'),t=document.getElementById('kc-target-chord'),items=[];PITCHES.forEach(function(n){items.push({value:n,label:n+' major'});items.push({value:n,label:n+' minor'});items.push({value:n,label:n+' diminished'});});[o,t].forEach(function(s){var cur=s.value;s.innerHTML='';items.forEach(function(x){var op=document.createElement('option');op.value=x.value;op.textContent=x.label;s.appendChild(op);});if(cur)s.value=cur;});if(!o.value)o.value='C';if(!t.value)t.value='D';}
  function updateChordTranspose(){var o=document.getElementById('kc-original-chord'),t=document.getElementById('kc-target-chord'),up=transpose(o.value,t.value,'up'),down=transpose(o.value,t.value,'down');document.getElementById('kc-chord-result').innerHTML=resultHtml(direction==='up'?up:down,o.value,t.value);document.getElementById('kc-chord-both')&&(document.getElementById('kc-chord-both').innerHTML=bothHtml(up,down));}
  function updateTranspose(){var up=transpose(original.value,target.value,'up'),down=transpose(original.value,target.value,'down');document.getElementById('kc-key-result').innerHTML=resultHtml(direction==='up'?up:down,original.value,target.value);document.getElementById('kc-key-both').innerHTML=bothHtml(up,down);updateChordOptions();updateChordTranspose();}

  keySel.addEventListener('change',function(){selectedChord=0;renderScale();renderTable();updateTranspose();});
  typeSel.addEventListener('change',function(){selectedChord=0;renderScale();renderTable();});
  original.addEventListener('change',updateTranspose);target.addEventListener('change',updateTranspose);
  document.getElementById('kc-swap-keys').addEventListener('click',function(){var x=original.value;original.value=target.value;target.value=x;updateTranspose();});
  document.querySelectorAll('.kc-direction button').forEach(function(b){b.addEventListener('click',function(){direction=b.getAttribute('data-direction');document.querySelectorAll('.kc-direction button').forEach(function(x){x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});updateTranspose();});});
  document.querySelectorAll('.kc-toggle button').forEach(function(b){b.addEventListener('click',function(){view=b.getAttribute('data-view');document.querySelectorAll('.kc-toggle button').forEach(function(x){x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});selectedChord=0;renderTable();});});
  document.getElementById('kc-original-chord').addEventListener('change',updateChordTranspose);document.getElementById('kc-target-chord').addEventListener('change',updateChordTranspose);
  renderChromatic();renderScale();renderTable();updateTranspose();
})();
