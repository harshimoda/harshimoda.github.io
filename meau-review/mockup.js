/* Additive USP exploration; original app navigation and renderer are retained. */
(()=>{

if(!pages.some(p=>p[0]==='submitted-scans'))pages.push(['submitted-scans','Submitted order scans','Submitted scans.','The captures linked to your order.']);
if(!pages.some(p=>p[0]==='saved-scans'))pages.push(['saved-scans','Saved scans','Saved scans.','Your front and sweep captures.']);
if(!pages.some(p=>p[0]==='order-details'))pages.push(['order-details','Order details','Your order.','Your pair, fitting and submitted scans.']);
if(!pages.some(p=>p[0]==='scan-guide'))pages.push(['scan-guide','Scanning guide','Let’s get your scan right.','Three simple demonstrations to help you capture your fit.']);
for(const page of [['order-prescription','Order prescription','Your pair’s prescription.','Provide the prescription for this ordered pair.'],['essence-project','Essence project','Your personal design.','Follow your consultation, proposal and order.'],['essence-proposal','Essence design review','A design to make yours.','Review the proposal and quote before approving.'],['essence-approved','Essence approval','Your design, approved.','Review your confirmed design before payment.'],['essence-payment','Essence order payment','Bring your design to life.','Pay for your approved design.'],['essence-ordered','Essence order confirmed','Your Essence order.','Your approved design and scans are linked to your order.']])if(!pages.some(p=>p[0]===page[0]))pages.push(page);
let guideReturn='intro',guideStep=0,guidePaused=false;
let pendingOrderDetails=null,viewedOrderId=null,sharingOrderId=null,essenceFeeBooking=false;
let essenceProjects=[],viewedProjectId=null,pendingProjectBooking=false,orderPrescriptionTarget=null,orderPrescriptionMessage='',orderPrescriptionBusy=false;
let projectScanTarget=null;
let selectedPath=null,reviewedForSharing=false,retakeReturn=null,pendingCapture=null,consentReturn=null,assistanceReturn=null;
const scanKeys=['front','sweep'],storageKey='meau-fit-preview-v1';
let scanRecords={},submissions={},orderHistory=[],storageWarning='';
const validRecord=r=>r&&typeof r.id==='string'&&r.id.length<100&&Number.isFinite(Date.parse(r.capturedAt));
try{
 const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
 for(const key of scanKeys)if(validRecord(saved.records?.[key])){scanRecords[key]=saved.records[key];s.captures[key]=true}
 for(const kind of ['order','essence'])if(scanKeys.every(key=>validRecord(saved.submissions?.[kind]?.captures?.[key])))submissions[kind]=saved.submissions[kind];
 if(Array.isArray(saved.orderHistory))orderHistory=saved.orderHistory.filter(item=>item?.order&&Number.isFinite(item.order.total)||scanKeys.every(key=>validRecord(item?.captures?.[key])));
 if(Array.isArray(saved.essenceProjects))essenceProjects=saved.essenceProjects.filter(p=>p&&typeof p.id==='string'&&typeof p.status==='string'&&p.appointment&&typeof p.appointment.day==='string'&&typeof p.appointment.time==='string'&&Number.isFinite(p.consultationPaid)&&Number.isFinite(p.feeCreditUsed)&&(!p.proposal||(Number.isFinite(p.proposal.price)&&Number.isInteger(p.proposal.version))));
 s.scanConsent=false;
 if(saved.order&&Number.isFinite(saved.order.total)&&typeof saved.order.summary==='string'){s.order=saved.order;s.paid=true}
 if(['essentials','essence'].includes(saved.path))selectedPath=saved.path;
}catch{storageWarning='Saved scans could not be restored on this device.'}
if(s.order&&!s.order.id)s.order.id='MEAU-0001';
for(const order of [s.order,...orderHistory.map(record=>record.order)])for(const item of order?.items||[])if(item.prescription)verifyPrescription(item.prescription);
let retainedOrder=s.order;
function syncOrder(){
 if(s.order&&s.order!==retainedOrder){
  if(retainedOrder)orderHistory=[...orderHistory,{order:structuredClone(retainedOrder),...(submissions.order||{})}];
  Object.assign(s.order,pendingOrderDetails||{});pendingOrderDetails=null;
  s.order.id=s.order.id||'MEAU-'+String(Date.now()).slice(-6);
  delete submissions.order;s.order.status='fitting-review';retainedOrder=s.order;
 }
}
function persistScans(){
 try{localStorage.setItem(storageKey,JSON.stringify({records:scanRecords,submissions,orderHistory,consent:s.scanConsent,path:selectedPath,order:s.order?structuredClone(s.order):null,essenceProjects}))}
 catch{storageWarning='Device storage is unavailable. Keep this page open to retain your scans.'}
}
function recordCapture(key){scanRecords[key]={id:key+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),capturedAt:new Date().toISOString()};s.captures[key]=true;reviewedForSharing=false;persistScans()}
function captureDetails(key){
 const record=scanRecords[key];if(!record)return '<p class="note">Capture date unavailable.</p>';
 const date=new Date(record.capturedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 return '<p class="note">Captured '+esc(date)+'</p><span class="badge">Saved on this device</span>';
}
function orderStatus(order){return order?.status==='delivered'?'Delivered':order?.status==='production'?'In production':'Fitting review'}
function findOrder(id){if(!id||s.order?.id===id)return s.order?{order:s.order,submitted:submissions.order,current:true}:null;const archived=orderHistory.find(record=>record.order?.id===id);return archived?{order:archived.order,submitted:archived,current:false}:null}
function sharingOrder(){return findOrder(sharingOrderId)}
function orderPairSnapshot(pair){return {label:pairLabel(pair),type:pair.type,lens:pair.lens,quantity:pair.quantity||1,price:pair.price,options:reviewOptions(pair).map(option=>option[0]),prescription:requiresPrescription(pair)&&pair.prescription?structuredClone(pair.prescription):null}}
function sharingConsent(){return !s.scanConsent?'<label class="scan-consent"><input type="checkbox" data-check="scanConsent"> I agree to share face scans with MEAU for custom fit.</label>':''}
function orderPrescriptionRow(item,orderId,index){
 const required=item.type==='eyeglasses'&&(item.lens?item.lens!=='Zero power':item.options?.some(option=>/^Lens type · (Single vision|Progressive)$/.test(option)));
 if(!required)return '';
 const status=prescriptionStatus({...item,lens:item.lens||'Single vision'},true);
 return '<div class="usp-order-prescription"><h3>Prescription · '+status+'</h3>'+(item.prescription?'<p class="note">'+esc(item.prescription.name)+' · Attached '+esc(new Date(item.prescription.attachedAt).toLocaleString())+'</p>':'<p class="note">Provide a prescription for this pair so MEAU can review your lens requirements.</p>')+'<button class="secondary" data-order-prescription="'+esc(orderId)+'" data-pair-index="'+index+'">'+(status==='Required'?'Provide prescription':'Replace prescription')+'</button></div>';
}
function orderPrescriptionPage(){
 const record=findOrder(orderPrescriptionTarget?.orderId),item=record?.order.items?.[orderPrescriptionTarget?.index];
 if(!item)return '<h1>Prescription.</h1><p>Select a pair from your order details.</p><button class="secondary" data-go="profile">Back to profile</button>';
 return '<h1>Your pair’s prescription.</h1><p class="lead">'+esc(item.label)+'</p><span class="badge">'+esc(record.order.id)+'</span><label for="orderPrescriptionUpload">Attach PDF, JPG or PNG</label><input id="orderPrescriptionUpload" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" '+(orderPrescriptionBusy?'disabled':'')+'><p class="note">Up to 10 MB. This attachment belongs only to this ordered pair.</p><p role="status" class="note">'+esc(orderPrescriptionMessage)+'</p><button class="secondary" data-order-id="'+esc(record.order.id)+'">Return to order</button>';
}
async function attachOrderPrescription(file){
 if(!file||orderPrescriptionBusy)return;
 const target={...orderPrescriptionTarget},record=findOrder(target.orderId),item=record?.order.items?.[target.index];if(!item)return;
 const error=prescriptionFileError(file);if(error){orderPrescriptionMessage=error;render();return}
 orderPrescriptionBusy=true;orderPrescriptionMessage='Saving prescription…';render();
 try{const metadata=await storePrescriptionFile(file);item.prescription=metadata;persistScans();orderPrescriptionMessage='Provided for this pair. Awaiting prescription review.'}
 catch{orderPrescriptionMessage='Unable to save the prescription on this device. Please try again.'}
 finally{orderPrescriptionBusy=false;render()}
}
function orderDetailsPage(){
 const record=findOrder(viewedOrderId),order=record?.order,submitted=record?.submitted;
 if(!order)return '<h1>Your order.</h1><p>No order placed yet.</p><button class="secondary" data-go="profile">Back to profile</button>';
 const date=value=>Number.isFinite(Date.parse(value))?esc(new Date(value).toLocaleString()):'Unavailable for this earlier preview order';
 return '<h1>Your order.</h1><div class="card"><strong>'+esc(order.id||'MEAU-0001')+'</strong>'+row('Placed',date(order.placedAt))+row('Payment','Complete')+row('Payment method',esc(order.paymentMethod||'Unavailable'))+row('Order total',money(order.total))+'</div><h3>Your pair</h3>'+ (order.items?.length?order.items.map((item,index)=>'<section class="card"><strong>'+esc(item.label)+'</strong><small>'+esc(item.type==='sunglasses'?'Sunglasses':'Eyeglasses')+'</small>'+row('Quantity',String(item.quantity))+(item.options||[]).map(option=>row(esc(option), 'Included in pair')).join('')+row('Pair price',money(item.price))+orderPrescriptionRow(item,order.id,index)+'</section>').join(''):'<div class="card"><strong>'+esc(order.summary)+'</strong><small>Detailed configuration is unavailable for this earlier preview order.</small></div>')+(order.design?'<h3>Approved design</h3><section class="card"><strong>'+esc(order.design.title)+'</strong>'+row('Proposal','Version '+order.design.version)+row('Approved',date(order.approvedAt))+row('Consultation credit',money(order.consultationCredit||0))+'</section>':'')+'<h3>Submitted scans</h3>'+(submitted?.captures?'<p class="note">Shared '+date(submitted.sharedAt)+'. These captures remain linked to this order when you rescan.</p><div class="usp-review-captures">'+scanKeys.map(key=>'<section class="card">'+scanOutput(key)+'<p class="note">Captured '+date(submitted.captures[key].capturedAt)+'</p><span class="badge">Shared with MEAU</span></section>').join('')+'</div>':'<p>Your scans have not been shared for this order.</p>'+'<button class="primary" data-open-review="'+esc(order.id)+'">Review and share scans</button>')+'<button class="secondary" data-go="profile">Back to profile</button>';
}
function commitSharing(kind){
 if(!s.scanConsent||!completeScans())return false;
 if(kind==='order')syncOrder();
 const target=kind==='order'?sharingOrder():null;
 if(kind==='order'&&!target)return false;
 for(const key of scanKeys)if(!scanRecords[key])recordCapture(key);
 const snapshot={captures:structuredClone(scanRecords),sharedAt:new Date().toISOString()};
 if(kind==='order'){
  if(target.submitted?.captures)return false;
  if(target.current)submissions.order=snapshot;else Object.assign(target.submitted,snapshot);
  target.order.status='fitting-review';
 }else {submissions.essence=snapshot;if(projectScanTarget){const project=essenceProjects.find(p=>p.id===projectScanTarget);if(project&&!project.scans)project.scans=structuredClone(snapshot)}}
 s.shared=Boolean(submissions.order);s.fittingContext=kind;persistScans();return true;
}

function currentProject(){return essenceProjects.find(project=>project.id===viewedProjectId)||null}
function createEssenceProject(feePaid){
 const project={id:'ESS-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),createdAt:new Date().toISOString(),status:'consultation-booked',appointment:{day:bookingDayLabel(s.date),time:s.time},consultationPaid:feePaid?s.consultationFee:0,feeCreditUsed:0,scans:submissions.essence?structuredClone(submissions.essence):null,proposal:null};
 if(feePaid)s.feeCreditRemaining=Math.max(0,s.feeCreditRemaining-s.consultationFee);
 essenceProjects.push(project);viewedProjectId=project.id;persistScans();return project;
}
function makeDemoProposal(project){
 if(!project||project.orderId||(project.proposal&&!project.changeRequested))return;
 const version=(project.proposal?.version||0)+1;
 project.proposal={id:'DESIGN-'+project.id,version,title:'Soft square · Personal contour',description:'A softly squared silhouette with a gently lifted brow and slim temples. Final bridge and temple dimensions are confirmed during fitting review.',colour:'Warm charcoal',material:'Lightweight printed frame',lens:'Zero power',price:28000,sample:true};
 project.status='proposal-ready';project.changeRequested=false;project.approvedAt=null;project.approvedVersion=null;persistScans();
}
function approveProposal(project){
 if(!project?.proposal||project.orderId||!project.scans?.captures||project.changeRequested||!s.essenceApproval)return false;
 project.approvedVersion=project.proposal.version;project.approvedAt=new Date().toISOString();project.status='approved';s.essenceApproval=false;persistScans();return true;
}
function projectTotal(project){return Math.max(0,(project?.proposal?.price||0)-Math.max(0,(project?.consultationPaid||0)-(project?.feeCreditUsed||0)))}
function placeEssenceOrder(project){
 if(!project?.proposal||project.orderId||project.changeRequested||project.approvedVersion!==project.proposal.version||!project.scans?.captures||!s.loggedIn)return false;
 const quote=project.proposal;
 pendingOrderDetails={id:'MEAU-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),placedAt:new Date().toISOString(),paymentMethod:s.paymentMethod,projectId:project.id,design:structuredClone(quote),approvedAt:project.approvedAt,consultationCredit:project.consultationPaid-project.feeCreditUsed,items:[{label:'Essence · '+quote.title,type:'eyeglasses',lens:quote.lens,quantity:1,price:quote.price,prescription:null,options:['Frame colour · '+quote.colour,'Lens type · '+quote.lens,'Material · '+quote.material]}]};
 s.order={total:projectTotal(project),summary:'Essence · '+quote.title};syncOrder();
 submissions.order=structuredClone(project.scans);
 project.orderId=s.order.id;project.feeCreditUsed=project.consultationPaid;project.status='ordered';s.paid=true;s.shared=true;sharingOrderId=s.order.id;viewedOrderId=s.order.id;
 persistScans();return true;
}
function proposalArtwork(){return '<div class="usp-proposal-art"><svg viewBox="0 0 360 170" role="img" aria-label="Illustrative soft square Essence design"><path d="M45 55q42-21 100-1l-8 60q-40 24-84-1zm170-1q58-20 100 1l-8 58q-44 25-84 1z" fill="#e9ddd2" stroke="#393731" stroke-width="5" stroke-linejoin="round"/><path d="M145 64q35-20 70 0M45 68 21 52m294 16 24-16" fill="none" stroke="#393731" stroke-width="5"/><path d="M45 139h270m-270-6v12m270-12v12" stroke="#bba99a" stroke-width="1" stroke-dasharray="3 4"/></svg><span class="note">Illustrative design · Final dimensions follow fitting review</span></div>'}
function essenceProjectPage(){
 const project=currentProject();if(!project)return '<h1>Your personal design.</h1><p>Book an Essence consultation to start your project.</p><button class="primary" data-go="essence">Explore Essence</button>';
 const status={'consultation-booked':'Consultation booked','proposal-ready':'Design ready to review','approved':'Design approved','ordered':'Order placed','changes-requested':'Design change requested'}[project.status]||'Consultation booked';
 return '<h1>Your personal design.</h1><span class="badge">'+esc(status)+'</span><div class="card"><strong>'+esc(project.id)+'</strong>'+row('Consultation',project.appointment.day+' · '+project.appointment.time)+row('Consultation fee',project.consultationPaid?money(project.consultationPaid)+' paid':'Not paid')+'</div><ol class="usp-essence-timeline">'+[['Personal consultation','Booked'],['Design proposal',project.proposal?'Ready':'After consultation'],['Your approval',project.approvedAt?'Approved':'You decide'],['Crafted to fit and look',project.orderId?'Order placed':'After payment']].map(([label,state],index)=>'<li class="'+(index===0||(index===1&&project.proposal)||(index===2&&project.approvedAt)||(index===3&&project.orderId)?'is-complete':'')+'"><span class="usp-timeline-dot" aria-hidden="true"></span><strong>'+label+'</strong><span class="usp-timeline-status">'+state+'</span></li>').join('')+'</ol>'+(project.scans?'<p class="note">The scans shared for this project are retained separately from new saved captures.</p>':'<p class="note">Review and share your scans before approving a design.</p><button class="secondary" data-project-scans>Review and share scans</button>')+(project.orderId?'<button class="primary" data-order-id="'+esc(project.orderId)+'">View your order</button>':project.status==='approved'?'<button class="primary" data-go="essence-approved">Continue with approved design</button>':project.proposal?'<button class="primary" data-go="essence-proposal">Review design & quote</button>':'<section class="card"><strong>Next: your personal consultation</strong><small>Your specialist will discuss your preferences before preparing a proposal. You approve the design and price before anything is crafted.</small></section><p class="note">Explore an illustrative proposal below to preview the next stage.</p><button class="secondary" data-demo-proposal>Preview design proposal</button>')+'<button class="secondary" data-go="profile">Back to profile</button>';
}
function essenceProposalPage(){
 const project=currentProject(),quote=project?.proposal;if(!quote)return essenceProjectPage();
 return '<h1>A design to make yours.</h1><span class="badge">Illustrative proposal · Version '+quote.version+'</span>'+proposalArtwork()+'<section class="card"><strong>'+esc(quote.title)+'</strong><p>'+esc(quote.description)+'</p>'+row('Frame colour',quote.colour)+row('Material',quote.material)+row('Lenses',quote.lens)+row('Pair price',money(quote.price))+row('Consultation credit',money(Math.max(0,project.consultationPaid-project.feeCreditUsed)))+row('Total payable',money(projectTotal(project)))+'</section><p class="note">This demonstration quote is not a specialist-issued offer. No payment is collected.</p>'+(project.orderId?'<button class="primary" data-order-id="'+esc(project.orderId)+'">View placed order</button>':project.approvedAt?'<button class="primary" data-go="essence-approved">View approved design</button>':'<label class="scan-consent"><input type="checkbox" data-check="essenceApproval" '+(s.essenceApproval?'checked':'')+'> I approve this design and the quoted price.</label><button class="primary" data-approve-proposal '+(s.essenceApproval&&project.scans?.captures&&!project.changeRequested?'':'disabled')+'>Approve design & quote</button><label for="essenceChangeNote">What would you like to change?</label><textarea id="essenceChangeNote" maxlength="1000" placeholder="Shape, colour or another preference">'+esc(project.changeNote||'')+'</textarea><button class="secondary" data-proposal-changes>Request a design change</button>')+'<p class="note" role="status">'+esc(project.changeRequested?'A design change has been requested. Your approval is paused until a revised proposal is available.':project.changeError||'')+'</p>'+(project.changeRequested?'<button class="secondary" data-demo-proposal>Preview revised proposal</button>':'')+'<button class="text" data-go="essence-project">Back to project</button>';
}
function essenceApprovedPage(){
 const project=currentProject();if(!project?.approvedAt||project.changeRequested)return essenceProposalPage();
 return '<h1>Your design, approved.</h1>'+proposalArtwork()+'<div class="card"><strong>'+esc(project.proposal.title)+'</strong>'+row('Proposal','Version '+project.approvedVersion)+row('Approved',new Date(project.approvedAt).toLocaleString())+row('Pair price',money(project.proposal.price))+row('Consultation credit',money(Math.max(0,project.consultationPaid-project.feeCreditUsed)))+row('Total payable',money(projectTotal(project)))+'</div><p class="note">Your project scans and approved proposal will be attached to this order.</p><button class="primary" data-go="essence-payment">Continue to payment</button><button class="secondary" data-go="essence-proposal">Review your approved proposal</button>';
}
function essencePaymentPage(){
 const project=currentProject();if(!project?.approvedAt||project.changeRequested)return essenceProjectPage();
 if(project.orderId)return '<h1>Your order is placed.</h1><button class="primary" data-order-id="'+esc(project.orderId)+'">View your order</button>';
 return '<h1>Bring your design to life.</h1><div class="card"><strong>'+esc(project.proposal.title)+'</strong>'+row('Total payable',money(projectTotal(project)))+'</div><h3>Payment method</h3><div class="seg">'+['UPI','Card','Net banking'].map(method=>'<button data-payment-method="'+method+'" aria-pressed="'+(s.paymentMethod===method)+'" class="'+(s.paymentMethod===method?'selected':'')+'">'+method+'</button>').join('')+'</div><p class="note">Demonstration payment. No charge is made.</p><button class="primary" data-pay-essence>Pay '+money(projectTotal(project))+'</button><button class="secondary" data-go="essence-approved">Back to approved design</button>';
}
function essenceOrderedPage(){
 const project=currentProject();return '<h1>Your Essence order.</h1><span class="badge">Order confirmed</span><p class="lead">Your approved design and shared scans are linked to this order. MEAU reviews fitting before production.</p><div class="card"><strong>'+esc(project?.orderId||'No order placed')+'</strong><small>'+esc(project?.proposal?.title||'')+'</small></div>'+(project?.orderId?'<button class="primary" data-order-id="'+esc(project.orderId)+'">View all order details</button>':'')+'<button class="secondary" data-go="essence-project">View your Essence project</button>';
}

function beginReplacement(key,target){
 if(!scanKeys.includes(key))return;
 if(!s.scanConsent){consentReturn={key,target};go('intro');return}
 pendingCapture={key,complete:false};retakeReturn=target;s.scanning=null;rescan=Boolean(target);go(key);
}
function finishInitialScans(){const resume=s.uspResume;s.uspResume=null;go(resume||(selectedPath==='essence'?'essence':'path-choice'))}
const completeScans=()=>Boolean(s.captures.front&&s.captures.sweep);
const canShare=()=>Boolean(s.scanConsent&&completeScans()&&(selectedPath==='essence'||(sharingOrder()&&!sharingOrder().submitted?.captures&&reviewedForSharing)));
for(const item of [['path-choice','Essentials or Essence','How will you make it yours?','Choose your starting point.'],['share-scans','Share your scans','Your fit, shared with care.','Front and sweep scans are ready.'],['scan-review','Review scans after payment','Review your scans.','Check both captures before sharing.']])if(!pages.some(p=>p[0]===item[0]))pages.push(item);
const originalNavigate=navigate;
navigate=function(page,push=true){
 if(page==='intro')s.scanConsent=false;
 if(page==='review')page=s.paid?'scan-review':'path-choice';
 if(page==='share-scans'&&selectedPath!=='essence'&&s.paid&&!reviewedForSharing)page='scan-review';
 if(page==='type')page='shape';
 if(page==='essence'){selectedPath='essence';s.fittingContext='essence'}
 if(pendingCapture&&page!==pendingCapture.key&&page!=='scan-guide'){pendingCapture=null;retakeReturn=null;rescan=false}
 if(scanKeys.includes(page)&&!s.scanConsent){consentReturn={key:page,target:retakeReturn};page='intro'}
 if(['checkout','payment'].includes(page)&&!completeScans()){s.uspResume=page;page='intro'}
 if(['payment','consultation-payment','essence-payment'].includes(page)&&!s.loggedIn){s.authReturn=page;s.loginStage='email';page='login'}
 return originalNavigate(page,push);
};
function routeSelection(path){
 if(!completeScans()){go('intro');return}
 selectedPath=path;s.fittingContext=path==='essence'?'essence':'order';s.shared=false;reviewedForSharing=false;
 go(path==='essence'?'essence':'shape');
}

function scanGuideIllustration(step){
 const person='<path d="M59 286q6-65 101-65t101 65" fill="#c2ccc3"/><path d="M138 200v30q22 22 44 0v-30" fill="#c68f76"/><ellipse cx="94" cy="145" rx="10" ry="19" fill="#d6a58a"/><ellipse cx="226" cy="145" rx="10" ry="19" fill="#d6a58a"/><path d="M95 98q0-65 65-65t65 65v66q-8 50-65 58-57-8-65-58z" fill="#dfb397"/><path d="M94 112q-16-81 66-84 78 0 66 83l-14-36q-48 16-108-1z" fill="#4c4039"/><path d="M115 122q12-7 24 0m42 0q12-7 24 0" fill="none" stroke="#685149" stroke-width="3" stroke-linecap="round"/><ellipse cx="127" cy="136" rx="4" ry="3" fill="#332d29"/><ellipse cx="193" cy="136" rx="4" ry="3" fill="#332d29"/><path d="m160 142-5 25h9m-24 20q20 8 40 0" fill="none" stroke="#9c6656" stroke-width="2" stroke-linecap="round"/>';
 const phone='<g class="usp-guide-phone"><rect x="143" y="113" width="35" height="66" rx="7" fill="#37332f" stroke="#fffcf7" stroke-width="2"/><circle cx="153" cy="123" r="3" fill="#b8c4bb"/><path d="M155 168h11" stroke="#fffcf7" stroke-width="2" stroke-linecap="round"/></g>';
 let extra='';
 if(step===0)extra='<g class="usp-guide-light" fill="none" stroke="#cb806c" stroke-width="2"><circle cx="39" cy="51" r="13"/><path d="M39 27v-7m0 55v7M15 51H8m55 0h7M22 34l-5-5m39 39 5 5m-39-5-5 5m39-39 5-5"/></g><g class="usp-guide-remove-glasses" fill="none" stroke="#66544a" stroke-width="3"><rect x="108" y="124" width="40" height="24" rx="8"/><rect x="172" y="124" width="40" height="24" rx="8"/><path d="M148 134h24"/></g><circle cx="235" cy="47" r="13" fill="#4c4039"/><text x="160" y="313" text-anchor="middle">Light on your face · Eyes and ears clear</text>';
 if(step===1)extra='<path d="M72 136h176" stroke="#cb806c" stroke-width="2" stroke-dasharray="4 4"/><path d="M160 20v215" stroke="#b5aca2" stroke-dasharray="3 5"/><text x="72" y="118">EYE LEVEL</text><path class="usp-guide-scan-line" d="M102 75h116" stroke="#cb806c" stroke-width="2"/><g class="usp-guide-hold"><circle cx="263" cy="227" r="24" fill="#f5e5dd"/><text x="263" y="232" text-anchor="middle" class="usp-guide-seconds">3s</text></g><text x="160" y="313" text-anchor="middle">Keep your head still</text>';
 if(step===2)extra='<path d="M46 157q114 124 228 0" fill="none" stroke="#cb806c" stroke-width="2" stroke-dasharray="5 5"/><path d="m48 164-2-9 9 2m213 7 6-7-9-1" fill="none" stroke="#cb806c" stroke-width="2"/>'+phone+'<text x="37" y="130">EAR</text><text x="258" y="130">EAR</text><text x="160" y="313" text-anchor="middle">Move the phone · Keep your face still</text>';
 return '<svg viewBox="0 0 320 335" role="img" aria-label="'+['Preparation: even light, remove eyewear and keep hair clear of your face.','Front capture: eyes on the line, chin down, hold still for three seconds.','Sweep capture: move the phone in an arc from ear to ear while keeping your head still.'][step]+'">'+person+extra+'</svg>';
}
function scanGuidePage(){
 const steps=[['Prepare your face','Find a well-lit space. Remove eyewear and tuck or tie your hair so your forehead and ears are clearly visible.','Before you begin'],['Capture the front','Hold the phone in front of your face. Align your eyes with the line, look straight ahead and lower your chin slightly. Tap to start, hold still for 3 seconds, then tap again to finish.','About 3 seconds'],['Make a gentle sweep','Keep your head still and your eyes level with the line. Hold the phone in front of your face and move it slowly in an arc from ear to ear. Tap to start, then tap again to finish.','Slow and steady']];
 const item=steps[guideStep];
 return '<h1>Let’s get your scan right.</h1><p class="lead">Watch each demonstration, then return to your scan when you’re ready.</p><div class="usp-guide-tabs" role="group" aria-label="Scanning demonstrations">'+steps.map((step,i)=>'<button data-guide-step="'+i+'" aria-pressed="'+(guideStep===i)+'" class="'+(guideStep===i?'selected':'')+'">'+['Prepare','Front','Sweep'][i]+'</button>').join('')+'</div><section class="card usp-guide-demo '+(guidePaused?'is-paused':'')+'"><div class="usp-guide-stage usp-guide-stage-'+guideStep+'">'+scanGuideIllustration(guideStep)+'</div><div class="usp-guide-meta"><span>Demonstration '+(guideStep+1)+' of 3 · '+item[2]+'</span><button class="text" data-guide-pause aria-pressed="'+guidePaused+'">'+(guidePaused?'Play animation':'Pause animation')+'</button></div></section><h3>'+item[0]+'</h3><p class="lead usp-guide-instructions">'+item[1]+'</p>'+(guideStep<2?'<button class="secondary" data-guide-step="'+(guideStep+1)+'">Next demonstration →</button>':'')+'<button class="primary" data-guide-return>Return to '+(guideReturn==='intro'?'scan preparation':guideReturn==='front'?'front scan':guideReturn==='sweep'?'sweep scan':'scanning')+'</button><button class="text usp-guide-help" data-book="Assisted fitting">Still finding it difficult? Book scanning help</button>';
}

const screen=document.getElementById('screen'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,baseRender=render;
function enhance(){
 screen.classList.toggle('usp-landing',s.page==='landing');
 updateChrome();
 applyFlow();
 if(s.page==='landing'){
 screen.innerHTML='<section class="usp-intro"><h1>Maximum Eyewear Autonomy</h1><p class="lead">Your face defines the fit.<br>Your choices define the expression.</p></section><div class="usp-film"><video id="landingFilm" muted loop playsinline controls preload="metadata" aria-label="MEAU expression film"><source src="assets/express%20final1.mp4" type="video/mp4"></video><p class="usp-film-error" hidden>The film could not load. You can still explore your fit below.</p></div><button class="primary" data-usp-start>Discover your fit</button>';
 const film=document.getElementById('landingFilm');film.muted=true;
 film.addEventListener('error',()=>{film.hidden=true;screen.querySelector('.usp-film-error').hidden=false});
 film.querySelector('source').addEventListener('error',()=>{film.hidden=true;screen.querySelector('.usp-film-error').hidden=false});
 if(!reduced)film.play().catch(()=>{});
 }
}

function applyFlow(){
 const scanPage=['front','sweep','right','left'].includes(s.page);
 screen.classList.toggle('usp-scan-page',scanPage);
 screen.classList.toggle('usp-prep-page',s.page==='intro');
 const back=document.getElementById('back');
 back.hidden=s.page==='landing';
 const caption=screen.querySelector('h1');
 if(scanPage){
  const stepIndex=['front','sweep'].includes(s.page)?['front','sweep'].indexOf(s.page):['right','left'].indexOf(s.page);
  screen.querySelectorAll('.scan-stepper > span[aria-hidden="true"]').forEach((step,index)=>{if(index>stepIndex)step.classList.remove('complete')});
  if(caption)caption.textContent=s.page==='front'?'Face the camera.':s.page==='sweep'?'A gentle sweep.':caption.textContent;
  const instructions=screen.querySelector('.scan-instructions');
  if(instructions)instructions.textContent=s.page==='front'?'Align your eyes. Look straight ahead. Chin down. Do not move. Tap to start, hold 3 seconds, then tap again to finish.':'Keep your head still and eyes level with the line. Hold the phone in front of your face and move it slowly in a circle from ear to ear.';
  const completedCopy=screen.querySelector('.capture-review-copy');
  if(completedCopy)completedCopy.textContent='Capture complete. Continue when you’re ready.';
  const next=screen.querySelector('#nextScan');if(next&&s.page==='sweep')next.textContent='Browse collection';
  if(next&&retakeReturn)next.textContent=retakeReturn==='saved-scans'?'Return to saved scans':'Return to scan review';
  const help=screen.querySelector('[data-book]');if(help)help.textContent='Need help with scanning?';
  const watch=document.createElement('button');watch.type='button';watch.className='text usp-watch-guide';watch.setAttribute('data-open-guide','');watch.textContent='Watch the scanning guide';if(help)help.before(watch);else screen.append(watch);
  if(pendingCapture?.key===s.page){
   if(next)next.textContent='Accept Scan';
   if(completedCopy)completedCopy.textContent='Review this capture, then accept it or try again. Your saved capture stays unchanged until you accept.';
  }
 }
 if(s.page==='intro'){
  if(caption)caption.textContent='A quick SCAN';
  const start=screen.querySelector('#startFitting');if(start)start.textContent='Start scans';
  const anatomy=screen.querySelector('h3');if(anatomy)anatomy.textContent='3D MAP ANATOMY';
  screen.querySelectorAll('[data-go="privacy"]').forEach(x=>x.remove());
  const lead=screen.querySelectorAll('.lead');if(lead[0])lead[0].textContent='Find a well-lit space, remove eyewear, and tuck/tie your hair so your forehead and ears are clearly visible.';if(lead[1])lead[1].remove();
  const consent=screen.querySelector('.scan-consent');
  if(consent){const input=consent.querySelector('input');consent.replaceChildren(input,document.createTextNode(' I agree to share face scans with MEAU for custom fit.'))}
  if(consent){const link=document.createElement('button');link.type='button';link.className='text usp-scan-privacy';link.setAttribute('data-usp-privacy','');link.textContent='How we use your scans';consent.after(link)}
  const guide=document.createElement('button');guide.type='button';guide.className='secondary usp-watch-guide';guide.setAttribute('data-open-guide','');guide.textContent='Watch the scanning guide';const startButton=screen.querySelector('#startFitting');if(startButton)startButton.before(guide);else screen.append(guide);
 }
 if(s.page==='scan-guide')screen.innerHTML=scanGuidePage();
 if(s.page==='path-choice'){
  screen.innerHTML='<h1>How will you make it yours?</h1><p class="lead">Your two scans are complete. Choose a starting point for your eyewear.</p><button class="card usp-path" data-choose-path="essentials"><strong>Essentials</strong><small>Choose a classic shape &amp; configure style.</small><span>Customise your pair</span></button><button class="card usp-path" data-choose-path="essence"><strong>Essence</strong><small>Discover original design with MEAU specialist.</small><span>Personal design consultation</span></button>';
 }
 if(s.page==='checkout'){
  screen.querySelectorAll('.card').forEach(card=>{if(card.textContent.includes('Personal fitting follows.'))card.innerHTML='<strong>Secure a perfect fit.</strong><small>After payment, review and share your scans.</small>'});
 }
 if(s.page==='paid'){
  const amount=s.order?s.order.total:total();
  screen.innerHTML='<h1>Payment confirmed.</h1><span class="badge">Payment complete</span><div class="card"><strong>'+esc(s.order?.id||'MEAU-0001')+'</strong><small>'+esc(s.order?s.order.summary:essentialName(s.shape))+'</small>'+row('Order total',money(amount))+'</div><button class="primary" data-open-review>Review your scans</button><button class="secondary" data-order-id="">View order details</button>';
 }
 if(s.page==='essence'){
  const captured=completeScans(),fee=money(s.consultationFee);
  screen.innerHTML='<h1>Designed only for you.</h1><p class="lead">A shape drawn from your scan, with a specialist, before anything is made.</p><ol class="usp-essence-timeline" aria-label="Your Essence journey">'+[['Scan',captured?'Done':'You capture'],['Personal consultation','You book'],['Design review','You approve'],['Crafted to fit and look','After approval']].map(([label,status],index)=>'<li class="'+(index===0&&captured?'is-complete':'')+'"><span class="usp-timeline-dot" aria-hidden="true"></span><strong>'+label+'</strong><span class="usp-timeline-status">'+status+'</span></li>').join('')+'</ol><section class="card usp-essence-pricing" aria-label="Consultation and frame pricing"><dl><div><dt>Consultation</dt><dd>'+fee+'</dd></div><div><dt>Credited to your order</dt><dd>Yes</dd></div><div><dt>Frame price</dt><dd>Quoted after consultation, before you commit</dd></div></dl></section><p class="note usp-essence-terms">The consultation fee is non-refundable and credited toward your confirmed order. Review the fee terms before payment.</p><div class="usp-essence-dock"><button class="primary" data-essence-consultation>Book consultation · '+fee+'</button><button class="text" data-go="path-choice">Back to your fit</button></div>';
 }
 if(s.page==='scan-review'){
  const allowed=(selectedPath==='essence'||(sharingOrder()&&!sharingOrder().submitted?.captures))&&completeScans()&&s.scanConsent;
  screen.innerHTML='<h1>Review your scans.</h1><p class="lead">Check both captures. Retake either scan if needed before sharing with MEAU.</p>'+ (selectedPath!=='essence'&&sharingOrder()?'<span class="badge">'+esc(sharingOrder().order.id)+'</span>':'')+'<div class="usp-review-captures">'+['front','sweep'].map(key=>'<section class="card">'+(s.captures[key]?scanOutput(key):'<div class="capture">Not captured</div>')+'<button class="secondary" data-usp-rescan="'+key+'">'+(s.captures[key]?'Retake ':'Capture ')+(key==='front'?'front':'sweep')+'</button></section>').join('')+'</div>'+(selectedPath!=='essence'&&!s.paid?'<p class="note">Complete payment before reviewing scans for your order.</p>':'')+sharingConsent()+'<button class="primary" data-review-confirm '+(allowed?'':'disabled')+'>Share with MEAU</button>';
 }
 if(s.page==='share-scans'){
  const allowed=canShare();
  screen.innerHTML='<h1>Review your scans.</h1><p class="lead">Check both captures. Retake either scan before sharing with MEAU.</p><div class="usp-review-captures">'+scanKeys.map(key=>'<section class="card">'+(s.captures[key]?scanOutput(key)+captureDetails(key):'<p>No '+key+' scan saved yet.</p>')+'<button class="secondary" data-usp-rescan="'+key+'" data-rescan-return="share-scans">'+(s.captures[key]?'Retake ':'Capture ')+key+'</button></section>').join('')+'</div>'+sharingConsent()+'<button class="primary" id="uspShareScans" '+(allowed?'':'disabled')+'>Share with MEAU</button>';
 }
 if(s.page==='shared'){
  screen.innerHTML='<h1>Shared with care.</h1><p class="lead">'+(selectedPath==='essence'?'Your sample scans are linked to your Essence journey. Choose a time to meet a specialist.':'Your sample scans are linked to your order. MEAU reviews fitting before production.')+'</p><span class="badge">Scans shared</span><div class="card"><strong>Front & sweep</strong><small>'+ (selectedPath==='essence'?'Essence consultation':esc(sharingOrder()?.order.id||s.order?.id||'MEAU-0001'))+'</small></div>'+ (selectedPath==='essence'?'<button class="primary" data-book="Essence consultation">Book an appointment</button>':'<button class="primary" data-order-id="'+esc(sharingOrderId||s.order?.id||'')+'">View your order</button>');
  if(selectedPath==='essence'&&essenceFeeBooking){const book=screen.querySelector('[data-book]');if(book){book.removeAttribute('data-book');book.setAttribute('data-go','booking-fee');book.textContent='Book consultation · '+money(s.consultationFee)}}
 }
 if(s.page==='shared'&&selectedPath==='essence'&&projectScanTarget){
  const project=essenceProjects.find(p=>p.id===projectScanTarget);
  if(project)screen.innerHTML='<h1>Scans shared.</h1><p class="lead">Your captures are linked to '+esc(project.id)+'.</p><button class="primary" data-project-id="'+esc(project.id)+'">Return to your project</button>';
 }
 if(s.page==='style'){
  const options=document.createElement('section');options.className='usp-eyewear-options';
  options.innerHTML='<div class="seg" role="group" aria-label="Eyewear type">'+[['eyeglasses','Eyeglasses'],['sunglasses','Sunglasses']].map(([type,label])=>'<button data-eyewear="'+type+'" class="'+(s.type===type?'selected':'')+'" aria-pressed="'+(s.type===type)+'">'+label+'</button>').join('')+'</div>';
  const preview=screen.querySelector('.custom-preview');if(preview)preview.after(options);else screen.append(options);
 }
 if(s.page==='login'&&['payment','consultation-payment','essence-payment'].includes(s.authReturn)){
  screen.querySelectorAll('[data-go="payment"]').forEach(button=>button.remove());
  const notice=screen.querySelector('#loginNotice');if(notice)notice.textContent='Sign in to continue to payment. Your pair and scans are kept in this session.';
 }
 if(s.page==='submitted-scans'){
  const submitted=submissions.order;
  screen.innerHTML='<h1>Submitted order scans.</h1><p class="lead">These captures stay linked to your order when you rescan.</p><div class="usp-review-captures">'+scanKeys.map(key=>'<section class="card">'+(submitted?.captures[key]?scanOutput(key)+'<p class="note">Captured '+esc(new Date(submitted.captures[key].capturedAt).toLocaleString())+'</p><span class="badge">Shared with MEAU</span>':'<p>No submitted scan.</p>')+'</section>').join('')+'</div><button class="secondary" data-go="profile">Back to profile</button>';
 }
 if(s.page==='saved-scans'){
  screen.innerHTML='<h1>Saved scans.</h1><p class="lead">Your front and sweep captures.</p><div class="usp-review-captures">'+['front','sweep'].map(key=>'<section class="card">'+(s.captures[key]?scanOutput(key)+captureDetails(key):'<strong>'+(key==='front'?'Front scan':'Sweep scan')+'</strong><p>No scan saved yet.</p>')+'<button class="secondary" data-usp-rescan="'+key+'" data-rescan-return="saved-scans">'+(s.captures[key]?'Rescan ':'Capture ')+(key==='front'?'front':'sweep')+'</button></section>').join('')+'</div><button class="secondary" data-go="profile">Back to profile</button>'+(!completeScans()?'<button class="primary" data-go="intro">Capture scans</button>':'');
 }
 if(s.page==='profile'){
  const ordersHeading=Array.from(screen.querySelectorAll('h3')).find(heading=>heading.textContent==='Orders');
  if(s.order&&ordersHeading){const card=ordersHeading.nextElementSibling;if(card?.classList.contains('card')){card.querySelector('strong').textContent=s.order.id||'MEAU-0001';card.insertAdjacentHTML('beforeend','<span class="badge">'+orderStatus(s.order)+'</span><button class="secondary" data-order-id="">View order details</button>')}}
  if(ordersHeading)for(const item of orderHistory.filter(item=>item.order)){const card=document.createElement('section');card.className='card';card.innerHTML='<strong>'+esc(item.order.id||'Earlier order')+'</strong><small>'+esc(item.order.summary)+'</small><button class="secondary" data-order-id="'+esc(item.order.id||'')+'">View order details</button>';ordersHeading.parentNode.insertBefore(card,ordersHeading.nextElementSibling)}
  if(essenceProjects.length)screen.insertAdjacentHTML('beforeend','<h3>Essence projects</h3>'+essenceProjects.map(project=>'<section class="card"><strong>'+esc(project.id)+'</strong><small>'+esc(project.orderId?'Order placed':project.changeRequested?'Design change requested':project.status==='approved'?'Design approved':project.proposal?'Design ready to review':'Consultation booked')+'</small><button class="secondary" data-project-id="'+esc(project.id)+'">View project</button></section>').join(''));
  const scans=document.createElement('button');scans.type='button';scans.className='secondary';scans.setAttribute('data-go','saved-scans');scans.textContent='Saved scans';const links=screen.querySelector('.profile-links');if(links)links.append(scans);else screen.append(scans);
  screen.querySelectorAll('[data-go="privacy"]').forEach(button=>button.remove());
  const policy=document.createElement('button');policy.type='button';policy.className='usp-profile-privacy';policy.setAttribute('data-usp-privacy','');policy.setAttribute('aria-label','Privacy policy');policy.title='Privacy policy';policy.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/></svg>';screen.append(policy);
 }
 if(s.page==='saved-scans'&&storageWarning){const note=document.createElement('p');note.className='note';note.textContent=storageWarning;screen.append(note)}
 if(s.page==='order-details')screen.innerHTML=orderDetailsPage();
 if(s.page==='order-prescription')screen.innerHTML=orderPrescriptionPage();
 if(s.page==='booked'&&s.reason==='Essence consultation'){
  if(pendingProjectBooking){createEssenceProject(pendingProjectBooking.feePaid);pendingProjectBooking=false}
  if(currentProject())screen.insertAdjacentHTML('beforeend','<button class="primary" data-project-id="'+esc(currentProject().id)+'">Follow your Essence project</button>');
 }
 const projectPages={'essence-project':essenceProjectPage,'essence-proposal':essenceProposalPage,'essence-approved':essenceApprovedPage,'essence-payment':essencePaymentPage,'essence-ordered':essenceOrderedPage};
 if(projectPages[s.page])screen.innerHTML=projectPages[s.page]();
 if(s.page==='booked'&&s.reason==='Assisted fitting'&&assistanceReturn){
  const returnButton=screen.querySelector('[data-go="review"]');
  if(returnButton){returnButton.setAttribute('data-go',assistanceReturn);returnButton.textContent='Return to scanning'}
 }
 updateFlowMap();
 const profileContinue=screen.querySelector('[data-go="intro"]');
 if(s.page==='profile'&&s.paid&&!s.shared&&completeScans()&&profileContinue){profileContinue.removeAttribute('data-go');profileContinue.setAttribute('data-open-sharing','');profileContinue.textContent='Share your scans'}
}
document.addEventListener('change',event=>{if(event.target.id==='orderPrescriptionUpload')attachOrderPrescription(event.target.files?.[0])});
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 const stop=()=>{event.preventDefault();event.stopImmediatePropagation()};
 if(['confirmBooking','payConsultationFee'].includes(button.id)&&s.reason==='Essence consultation')pendingProjectBooking={feePaid:button.id==='payConsultationFee'};
 if(button.hasAttribute('data-project-id')){stop();viewedProjectId=button.dataset.projectId;s.essenceApproval=false;go('essence-project');return}
 if(button.hasAttribute('data-project-scans')){stop();projectScanTarget=currentProject()?.id||null;s.essenceApproval=false;selectedPath='essence';reviewedForSharing=false;essenceFeeBooking=false;go('share-scans');return}
 if(button.hasAttribute('data-demo-proposal')){stop();makeDemoProposal(currentProject());s.essenceApproval=false;go('essence-proposal');return}
 if(button.hasAttribute('data-approve-proposal')){stop();if(approveProposal(currentProject()))go('essence-approved');return}
 if(button.hasAttribute('data-proposal-changes')){stop();const project=currentProject();if(project&&!project.orderId){project.changeNote=screen.querySelector('#essenceChangeNote')?.value.trim()||'';if(!project.changeNote){project.changeError='Describe the change you would like.';render();return}project.changeError='';project.changeRequested=true;project.status='changes-requested';s.essenceApproval=false;persistScans();render()}return}
 if(button.hasAttribute('data-pay-essence')){stop();if(placeEssenceOrder(currentProject()))go('essence-ordered');return}
 if(button.hasAttribute('data-order-prescription')){stop();orderPrescriptionTarget={orderId:button.dataset.orderPrescription,index:Number(button.dataset.pairIndex)};orderPrescriptionMessage='';go('order-prescription');return}
 if(button.hasAttribute('data-open-guide')){stop();guideReturn=s.page;guideStep=s.page==='sweep'?2:s.page==='front'?1:0;guidePaused=reduced;s.scanning=null;go('scan-guide');return}
 if(button.dataset.guideStep!==undefined){stop();const step=Number(button.dataset.guideStep);if(Number.isInteger(step)&&step>=0&&step<3){guideStep=step;render()}return}
 if(button.hasAttribute('data-guide-pause')){stop();guidePaused=!guidePaused;render();return}
 if(button.hasAttribute('data-guide-return')){stop();go(guideReturn);return}
 if(button.hasAttribute('data-essence-consultation')){stop();selectedPath='essence';s.fittingContext='essence';essenceFeeBooking=true;projectScanTarget=null;go(completeScans()?'share-scans':'intro');return}
 if(button.hasAttribute('data-order-id')){stop();viewedOrderId=button.dataset.orderId||null;go('order-details');return}
 if(button.dataset.book==='Assisted fitting')assistanceReturn=s.page==='scan-guide'?guideReturn:s.page;
 if(button.hasAttribute('data-view-submitted')){stop();go('submitted-scans');return}
 if(button.id==='capture'&&scanKeys.includes(s.page)){
  stop();if(!s.scanConsent){consentReturn={key:s.page,target:retakeReturn};go('intro');return}
  if(!pendingCapture)pendingCapture={key:s.page,complete:false};
  if(s.scanning===s.page){pendingCapture.complete=true;s.scanning=null}else s.scanning=s.page;
  render();return;
 }
 if(button.id==='retry'&&scanKeys.includes(s.page)){stop();beginReplacement(s.page,retakeReturn);render();return}
 if(button.id==='nextScan'&&pendingCapture?.key===s.page&&pendingCapture.complete){
  stop();const key=s.page,target=retakeReturn;recordCapture(key);pendingCapture=null;retakeReturn=null;rescan=false;
  if(target)go(target);else if(key==='front')beginReplacement('sweep',null);else finishInitialScans();return;
 }
 if(button.id==='clearScans'){stop();scanRecords={};pendingCapture=null;consentReturn=null;retakeReturn=null;s.captures={};s.scanning=null;s.scanConsent=false;s.shared=Boolean(submissions.order);s.privacyMessage='Saved captures cleared. Previously submitted order scans remain linked to that order.';persistScans();render();return}
 if(button.id==='restart'){pendingCapture=null;retakeReturn=null;consentReturn=null}
 if(s.page==='style'&&['style','variation'].includes(button.dataset.set)){event.preventDefault();event.stopImmediatePropagation();const scroll=screen.scrollTop;s[button.dataset.set]=Number(button.dataset.value);render();screen.scrollTop=scroll;return}
 if(button.hasAttribute('data-usp-privacy')){event.preventDefault();event.stopImmediatePropagation();s.privacyReturn=s.page;go('privacy');return}
 if(button.dataset.choosePath){event.preventDefault();event.stopImmediatePropagation();routeSelection(button.dataset.choosePath);return}
 if(button.hasAttribute('data-open-review')){event.preventDefault();event.stopImmediatePropagation();selectedPath='essentials';sharingOrderId=button.getAttribute('data-open-review')||s.order?.id||null;reviewedForSharing=false;go('scan-review');return}
 if(button.hasAttribute('data-review-confirm')){event.preventDefault();event.stopImmediatePropagation();if((selectedPath==='essence'||sharingOrder())&&s.scanConsent&&completeScans()){reviewedForSharing=true;if(commitSharing(selectedPath==='essence'?'essence':'order'))go('shared')}return}
 if(button.dataset.uspRescan){stop();beginReplacement(button.dataset.uspRescan,['saved-scans','share-scans'].includes(button.dataset.rescanReturn)?button.dataset.rescanReturn:'scan-review');return}
 if(button.id==='nextScan'&&retakeReturn&&s.captures[s.page]){event.preventDefault();event.stopImmediatePropagation();const target=retakeReturn;retakeReturn=null;rescan=false;go(target);return}
 if(button.hasAttribute('data-open-sharing')){event.preventDefault();event.stopImmediatePropagation();selectedPath='essentials';sharingOrderId=s.order?.id||null;reviewedForSharing=false;go('scan-review');return}
 if(button.id==='uspShareScans'){event.preventDefault();event.stopImmediatePropagation();if(canShare()&&commitSharing(selectedPath==='essence'?'essence':'order')){go('shared')}return}
 if(button.id==='nextScan'&&s.page==='sweep'&&completeScans()){event.preventDefault();event.stopImmediatePropagation();rescan=false;finishInitialScans();return}
 if(button.id==='startFitting'&&s.page==='intro'){stop();if(s.scanConsent){persistScans();if(consentReturn){const target=consentReturn;consentReturn=null;beginReplacement(target.key,target.target)}else beginReplacement('front',null)}return}
 if(button.id==='pay'&&s.page==='payment'&&!s.loggedIn){event.preventDefault();event.stopImmediatePropagation();s.authReturn='payment';s.loginStage='email';go('login');return}
 if(button.id==='pay'&&s.page==='payment'&&s.loggedIn&&(!s.checkoutCart||s.cart.length)){
  if(prescriptionBusy){stop();return}
  sharingOrderId=null;pendingOrderDetails={id:'MEAU-'+Date.now(),placedAt:new Date().toISOString(),paymentMethod:s.paymentMethod,items:(s.checkoutCart?s.cart:[{...pairSnapshot(),quantity:1}]).map(orderPairSnapshot)};
 }
 if(button.dataset.eyewear){event.preventDefault();event.stopImmediatePropagation();setEyewear(button.dataset.eyewear);return}
 if(button.id==='retry'||button.id==='clearScans')reviewedForSharing=false;
 if(button.id==='restart'){sharingOrderId=null;viewedOrderId=null;viewedProjectId=null;pendingProjectBooking=false;projectScanTarget=null;selectedPath=null;reviewedForSharing=false;retakeReturn=null;essenceFeeBooking=false}
},true);

function setEyewear(type){
 if(!['eyeglasses','sunglasses'].includes(type)||type===s.type)return;
 s.type=type;s.lens=type==='sunglasses'?'Zero power':'Single vision';s.thickness='Standard';s.coating=type==='sunglasses'?'Chrome UV':'Standard';s.tint=type==='sunglasses'?'Grey':'Clear';s.photo=false;s.polar=false;
 const scroll=screen.scrollTop;render();screen.scrollTop=scroll;
}
function updateFlowMap(){
 const main=['landing','intro','front','sweep','path-choice','shape','style','custom','saved','cart','checkout','login','payment','paid','scan-review','shared','profile','order-details'];
 const assistance=['essence','essence-project','essence-proposal','essence-approved','essence-payment','essence-ordered','scan-guide','booking','booked','saved-scans','submitted-scans','privacy'];
 const alternatives=['type','share-scans','shape-essence','shape-two','right','left','booking-fee','consultation-payment'];
 const map=document.getElementById('map');
 const group=(label,ids)=>'<h3>'+label+'</h3>'+ids.map(id=>{const item=pages.find(p=>p[0]===id);if(!item)return '';return '<button class="node '+(s.page===id?'selected':'')+'" data-inspect="'+id+'"><i>'+String(pages.indexOf(item)+1).padStart(2,'0')+'</i>'+(id==='type'?'Eyewear type · dedicated alternative':esc(item[1]))+'</button>'}).join('');
 if(map)map.innerHTML=group('Main flow ↓',main)+group('Essence / assistance ↘',assistance)+group('Alternate pages',alternatives);
 const boards=document.getElementById('boards');for(const id of ['type','share-scans']){const alternative=boards?.querySelector('[data-board="'+id+'"]');if(alternative)boards.append(alternative);}
}
function updateChrome(){
 document.getElementById('uspFooter')?.remove();
 let actions=document.getElementById('uspHeaderActions');
 if(!actions){
 actions=document.createElement('nav');actions.id='uspHeaderActions';actions.className='usp-header-actions';actions.setAttribute('aria-label','Your MEAU');
 const paths={cart:'<path d="M2 3h3l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',profile:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'};
 actions.innerHTML=[['cart','Cart'],['profile','Profile']].map(([route,label])=>'<button data-header-go="'+route+'" aria-label="'+label+'" title="'+label+'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'+paths[route]+'</svg></button>').join('');
 document.querySelector('.phone>.nav').append(actions);
 actions.addEventListener('click',e=>{const button=e.target.closest('[data-header-go]');if(!button)return;go(button.dataset.headerGo)});
 }
 actions.querySelectorAll('button').forEach(b=>{if(b.dataset.headerGo===s.page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 let progress=document.getElementById('uspProgress');
 if(!progress){progress=document.createElement('div');progress.id='uspProgress';progress.className='usp-progress';progress.setAttribute('aria-label','Your journey');screen.before(progress)}
 const scanPages=['landing','intro','front','sweep','right','left','scan-guide'];
 const payPages=['checkout','payment','paid','scan-review','consultation-payment','essence-payment','essence-ordered'];
 const utility=['profile','saved-scans','submitted-scans','login','saved','cart','privacy','booking','booked','booking-fee','order-prescription'];
 progress.hidden=utility.includes(s.page);
 const current=scanPages.includes(s.page)?0:s.page==='order-details'?(orderHistory.find(item=>item.order?.id===viewedOrderId)?.order?.status||s.order?.status)==='delivered'?3:2:s.page==='shared'&&selectedPath!=='essence'?(sharingOrder()?.order.status==='delivered'?3:2):payPages.includes(s.page)||(s.page==='share-scans'&&selectedPath!=='essence')?2:1;
 progress.innerHTML=['Scan','Design','Order','Wear'].map((label,i)=>'<div class="'+(i===current?'current':'')+'" '+(i===current?'aria-current="step"':'')+'><i aria-hidden="true"></i><span>'+label+'</span></div>').join('');
 progress.title='Proposed journey: scan, design, order, wear. Production is not connected in this mockup.';
}
render=function(){
 syncOrder();
 for(const key of scanKeys)if(scanRecords[key])s.captures[key]=true;
 if(pendingCapture&&s.page!==pendingCapture.key&&s.page!=='scan-guide'){pendingCapture=null;retakeReturn=null;rescan=false}
 if(scanKeys.includes(s.page)&&!s.scanConsent){consentReturn={key:s.page,target:retakeReturn};s.page='intro'}
 if(s.page==='review')s.page=s.paid?'scan-review':'path-choice';
 if(s.page==='share-scans'&&selectedPath!=='essence'&&s.paid&&!reviewedForSharing)s.page='scan-review';
 if(['payment','consultation-payment','essence-payment'].includes(s.page)&&!s.loggedIn){s.authReturn=s.page;s.loginStage='email';s.page='login'}
 s.shared=Boolean(submissions.order);
 const savedCaptures=s.captures;
 if(pendingCapture?.key===s.page)s.captures={...savedCaptures,[pendingCapture.key]:pendingCapture.complete};
 try{baseRender();enhance()}finally{s.captures=savedCaptures}
 persistScans();
};
screen.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
if(button.hasAttribute('data-usp-start')){s.fittingContext='order';selectedPath=null;go('intro');return}
});s.shared=Boolean(submissions.order);render();
})();
