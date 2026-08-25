'use strict';
/* Synthesized-audio contract checks for the dependency-free Tempo Lab engine. */
var T=require('../js/tempo-lab'), ok=0, bad=0;
function yes(v,m){if(v)ok++;else {bad++;console.error('FAIL '+m);}}
function clicks(bpm,seconds){var sr=22050,x=new Float32Array(sr*seconds);for(var t=0;t<seconds;t+=60/bpm)for(var i=0;i<700&&((t*sr+i)|0)<x.length;i++)x[(t*sr+i)|0]=Math.exp(-i/120);return x;}
[60,75,90,100,120,140,180].forEach(function(b){var r=T.analyze(clicks(b,12),22050);yes(r.bpm!==null,'BPM is reported '+b);yes(Math.abs(r.bpm-b)<5,'BPM vicinity '+b);yes(Array.isArray(r.beatTimes),'beats array '+b);yes(r.beatTimes.every(function(v,i,a){return i===0||v>a[i-1];}),'ordered beats '+b);yes(r.durationSec===12,'duration '+b);yes(typeof r.confidence==='number','confidence '+b);yes(r.tempoCandidates.length===3,'candidates '+b);yes(Array.isArray(r.energy),'energy '+b);});
var silent=T.analyze(new Float32Array(22050*6),22050);yes(silent.bpm===null,'silence rejected');yes(silent.warnings.length>0,'silence warns');
var short=T.analyze(clicks(120,3),22050);yes(short.warnings.length>0,'short clip warning');yes(typeof T.resample(clicks(100,1),22050,22050).length==='number','resample API');
console.log(ok+' passed, '+bad+' failed');process.exit(bad?1:0);
