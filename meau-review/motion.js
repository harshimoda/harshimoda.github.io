/* Reference motion: soft focus transitions and one product per scroll stage. */
window.MEAUMotion=(()=>{
 let busy=false,activeAnimation=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function duration(){return Number(config.tokens?.motionDuration ?? 260)}
 async function transition(commit){
  if(busy)return;const screen=document.getElementById('screen'),ms=duration(),blur=Number(config.tokens?.fadeBlur??2);busy=true;
  const phone=screen.closest('.phone');phone.setAttribute('aria-busy','true');phone.inert=true;
  try{
   screen.classList.remove('page-enter');
   if(!reduced()&&ms>0){activeAnimation=screen.animate([{opacity:1,filter:'blur(0px)',transform:'translateY(0)'},{opacity:0,filter:'blur('+blur+'px)',transform:'translateY(-3px)'}],{duration:ms*.65,easing:'cubic-bezier(.4,0,.8,.4)',fill:'forwards'});await activeAnimation.finished.catch(()=>{});}
   commit();activeAnimation?.cancel();
   if(!reduced()&&ms>0){activeAnimation=screen.animate([{opacity:0,filter:'blur('+blur+'px)',transform:'translateY(3px)'},{opacity:1,filter:'blur(0px)',transform:'scale(1)'}],{duration:ms*1.35,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});await activeAnimation.finished.catch(()=>{});activeAnimation.cancel();}
   const heading=screen.querySelector('h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
  }finally{busy=false;activeAnimation=null;phone.inert=false;phone.removeAttribute('aria-busy');}
 }
 function gallery(){
  const root=document.getElementById('shapeGallery');if(!root)return;
  const slides=[...root.querySelectorAll('.shape-stage')],dots=[...document.querySelectorAll('[data-gallery]')];
  const update=()=>{if(document.getElementById('screen').getAttribute('data-page')==='shape-two'){slides.forEach(slide=>{slide.style.setProperty('--stage-opacity',1);slide.style.setProperty('--stage-scale',1);slide.style.setProperty('--stage-offset','0px')});return}const index=slides.reduce((nearest,slide,i)=>Math.abs(root.scrollTop-slide.offsetTop)<Math.abs(root.scrollTop-slides[nearest].offsetTop)?i:nearest,0);const topline=root.parentElement.querySelector('.shape-topline>span');if(topline)topline.hidden=Boolean(slides[index]?.classList.contains('essence-stage'));const scrollHint=root.parentElement.querySelector('.gallery-caption>span:first-child');if(scrollHint)scrollHint.style.visibility=index===slides.length-1?'hidden':'visible';dots.forEach((dot,i)=>{dot.setAttribute('aria-current',i===index?'true':'false');dot.classList.toggle('active-dot',i===index)});slides.forEach((slide,i)=>{const distance=Math.min(1,Math.abs((root.scrollTop-slide.offsetTop)/root.clientHeight));slide.style.setProperty('--stage-opacity',reduced()?1:1-distance*.55);slide.style.setProperty('--stage-scale',reduced()?1:1-distance*.18);slide.style.setProperty('--stage-offset',reduced()?'0px':(((root.scrollTop-slide.offsetTop)/root.clientHeight)*55)+'px');});};
  const scrollToIndex=i=>root.scrollTo({top:slides[Math.max(0,Math.min(slides.length-1,i))].offsetTop,behavior:reduced()?'instant':'smooth'});
  dots.forEach((dot,i)=>dot.onclick=()=>scrollToIndex(i));
  root.addEventListener('scroll',update,{passive:true});
  root.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))return;if(e.target.closest('button'))return;e.preventDefault();const current=slides.reduce((nearest,slide,i)=>Math.abs(root.scrollTop-slide.offsetTop)<Math.abs(root.scrollTop-slides[nearest].offsetTop)?i:nearest,0);scrollToIndex(e.key==='Home'?0:e.key==='End'?slides.length-1:current+(['ArrowDown','PageDown'].includes(e.key)?1:-1));});
  update();
 }
 return {transition,gallery,get busy(){return busy}};
})();
