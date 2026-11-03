import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const categories = ["Web Development","App Development","Video Editing","Graphic Design","AI & Automation","Writing","Digital Marketing","Programming","Other"];
const $ = id => document.getElementById(id);
let auth, db, currentUser = null, currentProfile = null, authMode = "signup";
const configured = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_");

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3000)}
function showModal(id){$(id).classList.add("show")}
function closeModals(){document.querySelectorAll(".modal-backdrop").forEach(x=>x.classList.remove("show"))}
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(v){return "₹"+Number(v||0).toLocaleString("en-IN")}
function dateLabel(ts){try{return ts?.toDate?ts.toDate().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Recently"}catch{return "Recently"}}
function setOptions(id){$(id).innerHTML=categories.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("")}
["jobCategory","talentCategory","serviceCategory","newJobCategory","newServiceCategory"].forEach(setOptions);

function go(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target=$("page-"+page)||$("page-home");target.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
  if(page==="jobs")loadJobs();if(page==="talent")loadTalent();if(page==="services")loadServices();if(page==="dashboard")loadDashboard();
}
document.addEventListener("click",e=>{
  const page=e.target.closest("[data-page]");if(page){e.preventDefault();go(page.dataset.page)}
  const open=e.target.closest("[data-open-auth]");if(open){openAuth(open.dataset.openAuth)}
  if(e.target.closest("[data-close-modal]"))closeModals();
  const cat=e.target.closest("[data-category]");if(cat){go("jobs");$("jobCategory").value=cat.dataset.category;loadJobs()}
});
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModals()}));
$("mobileMenu").addEventListener("click",()=>{const choice=prompt("Type: jobs, talent, services, or home");if(choice&&["jobs","talent","services","home","dashboard"].includes(choice))go(choice)});

function openAuth(mode){authMode=mode;const signup=mode==="signup";$("authTitle").textContent=signup?"Create your account.":"Welcome back."; $("authSubtitle").textContent=signup?"Choose how you want to use WorkSphere.":"Log in to continue to your workspace."; $("nameWrap").style.display=signup?"flex":"none";$("roleWrap").style.display=signup?"flex":"none";$("authSubmit").textContent=signup?"Create account":"Log in";$("authSwitch").innerHTML=signup?'Already have an account? <button type="button" id="switchAuth">Log in</button>':'New to WorkSphere? <button type="button" id="switchAuth">Create account</button>';$("authError").textContent="";showModal("authModal");}
$("switchAuth").addEventListener("click",()=>openAuth(authMode==="signup"?"login":"signup"));
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();$("authError").textContent="";
  if(!configured){$("authError").textContent="Connect Firebase first. Follow SETUP.md in the project folder.";return}
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  try{
    if(authMode==="signup"){
      const name=$("authName").value.trim();if(!name)throw new Error("Please enter your name.");
      const cred=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cred.user,{displayName:name});
      const role=$("authRole").value;
      await setDoc(doc(db,"users",cred.user.uid),{name,email,role,headline:"",skills:[],about:"",portfolio:"",createdAt:serverTimestamp()});
      currentUser=cred.user;closeModals();toast("Your account is ready.");go("dashboard");
    }else{await signInWithEmailAndPassword(auth,email,password);closeModals();toast("Logged in successfully.");go("dashboard")}
  }catch(err){$("authError").textContent=friendlyError(err)}
});
function friendlyError(err){const map={"auth/email-already-in-use":"This email already has an account.","auth/invalid-email":"Enter a valid email address.","auth/weak-password":"Use a password with at least 6 characters.","auth/invalid-credential":"Email or password is incorrect.","auth/network-request-failed":"Network error. Check your internet connection."};return map[err.code]||err.message||"Something went wrong."}

onAuthStateChangedSafe();
function onAuthStateChangedSafe(){
  if(!configured){$("navActions").innerHTML='<button class="btn btn-primary" data-open-auth="signup">Join WorkSphere ↗</button>';return}
  try{
    const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
    onAuthStateChanged(auth,async user=>{
      currentUser=user;currentProfile=null;
      if(user){const snap=await getDoc(doc(db,"users",user.uid));currentProfile=snap.exists()?snap.data():{name:user.displayName||"Member",role:"both"};renderNav(true)}
      else renderNav(false);
    });
  }catch(e){console.error(e);toast("Firebase setup error. Check firebase-config.js")}
}
function renderNav(logged){$("navActions").innerHTML=logged?`<button class="btn btn-ghost" data-page="dashboard">Dashboard</button><button class="btn btn-primary" id="logoutBtn">Log out</button>`:`<button class="btn btn-ghost" data-open-auth="login">Log in</button><button class="btn btn-primary" data-open-auth="signup">Join WorkSphere ↗</button>`;const out=$("logoutBtn");if(out)out.onclick=async()=>{await signOut(auth);go("home");toast("You are logged out.")}}

async function loadJobs(){
  if(!configured){$("jobsList").innerHTML='<div class="empty-state">Connect Firebase to load live projects. See SETUP.md.</div>';return}
  $("jobsList").innerHTML='<div class="empty-state">Loading projects…</div>';
  try{const snap=await getDocs(query(collection(db,"jobs"),where("status","==","open"),limit(60)));let rows=snap.docs.map(d=>({id:d.id,...d.data()}));rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));renderJobs(rows)}
  catch(e){$("jobsList").innerHTML='<div class="empty-state">Could not load projects. Check Firestore rules and connection.</div>';console.error(e)}
}
function renderJobs(rows){
  const term=$("jobSearch").value.toLowerCase(),cat=$("jobCategory").value;
  rows=rows.filter(x=>(!cat||x.category===cat)&&(!term||`${x.title} ${x.description} ${x.category}`.toLowerCase().includes(term)));
  $("jobsList").innerHTML=rows.length?rows.map(x=>`<article class="listing-card"><div class="listing-meta"><span class="tag">${escapeHTML(x.category)}</span><span>${dateLabel(x.createdAt)}</span></div><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.description).slice(0,220)}${x.description?.length>220?"…":""}</p><div class="listing-meta"><span>Posted by ${escapeHTML(x.clientName||"Client")}</span><span>${escapeHTML(x.timeline||"Flexible")}</span></div><div class="listing-bottom"><b>${money(x.budget)}</b><button class="small-action" data-apply="${x.id}" data-owner="${x.clientId}">Apply now ↗</button></div></article>`).join(""):'<div class="empty-state">No matching projects yet. Try another search or check back soon.</div>';
}
$("jobSearch").addEventListener("input",loadJobs);$("jobCategory").addEventListener("change",loadJobs);
$("jobsList").addEventListener("click",async e=>{const b=e.target.closest("[data-apply]");if(!b)return;if(!currentUser){openAuth("login");return}if(b.dataset.owner===currentUser.uid){toast("You cannot apply to your own project.");return}const message=prompt("Write a short introduction for the client:");if(!message?.trim())return;try{await addDoc(collection(db,"applications"),{jobId:b.dataset.apply,clientId:b.dataset.owner,freelancerId:currentUser.uid,freelancerName:currentProfile?.name||currentUser.displayName||"Freelancer",message:message.trim(),status:"pending",createdAt:serverTimestamp()});toast("Application submitted.");}catch(err){toast(friendlyError(err))}});

async function loadTalent(){
  if(!configured){$("talentList").innerHTML='<div class="empty-state">Connect Firebase to discover freelancers. See SETUP.md.</div>';return}
  $("talentList").innerHTML='<div class="empty-state">Loading talent…</div>';
  try{const snap=await getDocs(query(collection(db,"users"),limit(100)));let rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>["freelancer","both"].includes(x.role));renderTalent(rows)}
  catch(e){$("talentList").innerHTML='<div class="empty-state">Could not load profiles. Check Firestore rules.</div>'}
}
function renderTalent(rows){const term=$("talentSearch").value.toLowerCase(),cat=$("talentCategory").value;rows=rows.filter(x=>(!cat||(x.skills||[]).includes(cat))&&(!term||`${x.name} ${x.headline} ${(x.skills||[]).join(" ")}`.toLowerCase().includes(term)));$("talentList").innerHTML=rows.length?rows.map(x=>`<article class="listing-card"><div class="listing-meta"><span class="tag">${escapeHTML(x.role==="both"?"Freelancer · Client":"Freelancer")}</span><span>WorkSphere member</span></div><h3>${escapeHTML(x.name||"Freelancer")}</h3><p><b>${escapeHTML(x.headline||"Independent professional")}</b><br>${escapeHTML(x.about||"This member is building their profile.")}</p><div>${(x.skills||[]).slice(0,5).map(s=>`<span class="tag" style="margin:3px">${escapeHTML(s)}</span>`).join("")}</div><div class="listing-bottom"><span class="listing-meta">Portfolio ${x.portfolio?`· <a href="${escapeHTML(x.portfolio)}" target="_blank" rel="noopener">View ↗</a>`:"not added"}</span><button class="small-action" data-contact="${x.id}">View profile</button></div></article>`).join(""):'<div class="empty-state">No matching profiles yet.</div>'}
$("talentSearch").addEventListener("input",loadTalent);$("talentCategory").addEventListener("change",loadTalent);
$("talentList").addEventListener("click",e=>{const b=e.target.closest("[data-contact]");if(!b)return;if(!currentUser){openAuth("signup");return}const profileId=b.dataset.contact;if(profileId===currentUser.uid){go("dashboard");return}toast("Use the profile portfolio link to review work. In-app messaging can be added in the next release.")});

async function loadServices(){
  if(!configured){$("servicesList").innerHTML='<div class="empty-state">Connect Firebase to load services. See SETUP.md.</div>';return}
  $("servicesList").innerHTML='<div class="empty-state">Loading services…</div>';
  try{const snap=await getDocs(query(collection(db,"services"),limit(80)));let rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));renderServices(rows)}
  catch(e){$("servicesList").innerHTML='<div class="empty-state">Could not load services. Check Firestore rules.</div>'}
}
function renderServices(rows){const term=$("serviceSearch").value.toLowerCase(),cat=$("serviceCategory").value;rows=rows.filter(x=>(!cat||x.category===cat)&&(!term||`${x.title} ${x.description} ${x.category}`.toLowerCase().includes(term)));$("servicesList").innerHTML=rows.length?rows.map(x=>`<article class="listing-card"><div class="listing-meta"><span class="tag">${escapeHTML(x.category)}</span><span>By ${escapeHTML(x.ownerName||"Freelancer")}</span></div><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.description)}</p><div class="listing-bottom"><b>From ${money(x.price)}</b><button class="small-action" data-service-owner="${x.ownerId}">I'm interested ↗</button></div></article>`).join(""):'<div class="empty-state">No services listed yet.</div>'}
$("serviceSearch").addEventListener("input",loadServices);$("serviceCategory").addEventListener("change",loadServices);
$("servicesList").addEventListener("click",e=>{const b=e.target.closest("[data-service-owner]");if(!b)return;if(!currentUser){openAuth("signup");return}toast("Contact workflow is not enabled in this starter version. Please use the freelancer's portfolio link or public contact details.")});

$("postJobBtn").addEventListener("click",()=>currentUser?showModal("jobModal"):openAuth("login"));
$("addServiceBtn").addEventListener("click",()=>currentUser?showModal("serviceModal"):openAuth("login"));
$("editProfileBtn").addEventListener("click",()=>{if(!currentUser)return;const p=currentProfile||{};$("profileName").value=p.name||"";$("profileHeadline").value=p.headline||"";$("profileSkills").value=(p.skills||[]).join(", ");$("profileAbout").value=p.about||"";$("profilePortfolio").value=p.portfolio||"";showModal("profileModal")});
$("jobForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;try{await addDoc(collection(db,"jobs"),{title:$("jobTitle").value.trim(),category:$("newJobCategory").value,description:$("jobDescription").value.trim(),budget:Number($("jobBudget").value),timeline:$("jobTimeline").value,clientId:currentUser.uid,clientName:currentProfile?.name||currentUser.displayName||"Client",status:"open",createdAt:serverTimestamp()});closeModals();e.target.reset();toast("Project published.");loadJobs();loadDashboard()}catch(err){$("jobError").textContent=friendlyError(err)}});
$("serviceForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;try{await addDoc(collection(db,"services"),{title:$("serviceTitle").value.trim(),category:$("newServiceCategory").value,description:$("serviceDescription").value.trim(),price:Number($("servicePrice").value),ownerId:currentUser.uid,ownerName:currentProfile?.name||currentUser.displayName||"Freelancer",createdAt:serverTimestamp()});closeModals();e.target.reset();toast("Service published.");loadServices();loadDashboard()}catch(err){$("serviceError").textContent=friendlyError(err)}});
$("profileForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;try{const data={name:$("profileName").value.trim(),headline:$("profileHeadline").value.trim(),skills:$("profileSkills").value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,15),about:$("profileAbout").value.trim(),portfolio:$("profilePortfolio").value.trim()};await setDoc(doc(db,"users",currentUser.uid),data,{merge:true});currentProfile={...currentProfile,...data};closeModals();toast("Profile updated.");loadDashboard()}catch(err){$("profileError").textContent=friendlyError(err)}});

async function loadDashboard(){
  if(!currentUser){$("dashboardName").textContent="there";return}
  $("dashboardName").textContent=currentProfile?.name||currentUser.displayName||"there";
  const p=currentProfile||{};$("myProfile").innerHTML=`<strong>${escapeHTML(p.name||"Your name")}</strong><br>${escapeHTML(p.headline||"Add a professional headline")}<br>Skills: ${escapeHTML((p.skills||[]).join(", ")||"Not added yet")}`;
  try{
    const [jobs,apps,services]=await Promise.all([
      getDocs(query(collection(db,"jobs"),where("clientId","==",currentUser.uid),limit(30))),
      getDocs(query(collection(db,"applications"),where("freelancerId","==",currentUser.uid),limit(30))),
      getDocs(query(collection(db,"services"),where("ownerId","==",currentUser.uid),limit(30)))
    ]);
    $("myJobsCount").textContent=jobs.size;$("myAppsCount").textContent=apps.size;$("myServicesCount").textContent=services.size;
    $("myJobs").innerHTML=jobs.empty?"No projects posted yet.":jobs.docs.map(d=>`<div class="dash-row"><b>${escapeHTML(d.data().title)}</b><span>${escapeHTML(d.data().status||"open")}</span></div>`).join("");
    $("myApps").innerHTML=apps.empty?"No applications yet.":apps.docs.map(d=>`<div class="dash-row"><b>${escapeHTML(d.data().freelancerName||"Application")}</b><span>${escapeHTML(d.data().status||"pending")}</span></div>`).join("");
    $("myServices").innerHTML=services.empty?"No services listed yet.":services.docs.map(d=>`<div class="dash-row"><b>${escapeHTML(d.data().title)}</b><span>${money(d.data().price)}</span></div>`).join("");
  }catch(e){console.error(e);toast("Dashboard data could not load. Check Firestore rules.")}
}
$("year").textContent=new Date().getFullYear();
go("home");
