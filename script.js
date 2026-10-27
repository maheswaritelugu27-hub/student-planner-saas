const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studyflow_tasks_v1";
const GOAL_KEY = "studyflow_goal_v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentFilter = "all";
let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let toastTimeout;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"});
};
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function showToast(message){
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(()=>$("toast").classList.remove("show"),2400);
}
function setupHeader(){
  const now = new Date();
  $("todayDate").textContent = now.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
  const hour = now.getHours();
  $("greeting").textContent = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}! 👋`;
  $("taskDate").value = todayISO();
}
function render(){
  const today = todayISO();
  const todayTasks = tasks.filter(t=>t.date===today);
  const completedToday = todayTasks.filter(t=>t.completed).length;
  const completedAll = tasks.filter(t=>t.completed).length;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7)); weekStart.setHours(0,0,0,0);
  const weekTasks = tasks.filter(t=>new Date(`${t.date}T12:00:00`)>=weekStart);
  const weekDone = weekTasks.filter(t=>t.completed).length;
  const plannedMinutes = todayTasks.reduce((sum,t)=>sum+Number(t.duration||0),0);
  $("todayTasksCount").textContent = todayTasks.length;
  $("completedCount").textContent = completedToday;
  $("studyHours").textContent = `${Math.round(plannedMinutes/6)/10}h`;
  $("weeklyProgress").textContent = `${weekTasks.length ? Math.round(weekDone/weekTasks.length*100) : 0}%`;
  const goal = Math.max(1,Math.min(30,Number(localStorage.getItem(GOAL_KEY)||3)));
  $("dailyGoal").value = goal;
  const progress = todayTasks.length ? Math.round(completedToday/todayTasks.length*100) : 0;
  $("ringPercent").textContent = `${progress}%`;
  $("progressRing").style.background = `conic-gradient(var(--purple) ${progress}%, var(--purple-soft) ${progress}% 100%)`;
  $("goalText").textContent = `${completedToday} of ${goal} tasks`;
  $("goalBar").style.width = `${Math.min(100,completedToday/goal*100)}%`;

  const filtered = tasks.filter(t=>currentFilter==="all" ? true : currentFilter==="pending" ? !t.completed : t.completed)
    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time));
  $("taskList").innerHTML = filtered.map(t=>`
    <article class="task-item ${t.completed?"is-complete":""}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(t.title)} complete" data-complete="${t.id}" ${t.completed?"checked":""}>
      <div>
        <div class="task-title">${escapeHTML(t.title)}</div>
        <div class="task-meta"><span><span class="subject-dot"></span>${escapeHTML(t.subject||"General")}</span><span>◷ ${escapeHTML(formatDate(t.date))} · ${escapeHTML(t.time)}</span><span>${Number(t.duration)} min</span></div>
      </div>
      <div class="task-actions"><span class="priority ${escapeHTML(t.priority)}">${escapeHTML(t.priority)}</span><button class="icon-btn" data-delete="${t.id}" aria-label="Delete task">✕</button></div>
    </article>`).join("");
  $("emptyState").classList.toggle("hidden", filtered.length>0);
}
$("openTaskForm").addEventListener("click",()=>{ $("taskForm").classList.toggle("hidden"); if(!$("taskForm").classList.contains("hidden")) $("taskTitle").focus(); });
$("cancelTask").addEventListener("click",()=>{$("taskForm").reset();$("taskDate").value=todayISO();$("taskTime").value="16:00";$("taskDuration").value=45;$("taskForm").classList.add("hidden");});
$("taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  tasks.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:$("taskTitle").value.trim(),subject:$("taskSubject").value.trim(),date:$("taskDate").value,time:$("taskTime").value,duration:Number($("taskDuration").value),priority:$("taskPriority").value,completed:false});
  saveTasks(); render(); $("taskForm").reset(); $("taskDate").value=todayISO(); $("taskTime").value="16:00"; $("taskDuration").value=45; $("taskForm").classList.add("hidden"); showToast("Task added to your planner!");
});
$("taskList").addEventListener("change",e=>{
  const id=e.target.dataset.complete; if(!id)return;
  const task=tasks.find(t=>t.id===id); if(task){task.completed=e.target.checked;saveTasks();render();showToast(task.completed?"Nice work! Task completed.":"Task marked as pending.");}
});
$("taskList").addEventListener("click",e=>{
  const id=e.target.dataset.delete; if(!id)return;
  tasks=tasks.filter(t=>t.id!==id);saveTasks();render();showToast("Task deleted.");
});
document.querySelectorAll(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter-btn").forEach(b=>b.classList.toggle("active",b===btn));currentFilter=btn.dataset.filter;render();
}));
$("dailyGoal").addEventListener("change",e=>{const n=Math.max(1,Math.min(30,Number(e.target.value)||3));localStorage.setItem(GOAL_KEY,n);render();});
$("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("studyflow_dark",document.body.classList.contains("dark")?"1":"0");});
if(localStorage.getItem("studyflow_dark")==="1")document.body.classList.add("dark");

document.querySelectorAll(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b===btn));
  if(btn.dataset.view==="tasks"){currentFilter="all";document.querySelectorAll(".filter-btn").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));$("taskHeading").textContent="All study tasks";}
  else if(btn.dataset.view==="schedule"){$("taskHeading").textContent="Your study schedule";currentFilter="all";document.querySelectorAll(".filter-btn").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));}
  else $("taskHeading").textContent="Today's tasks";
  render();
}));

function updateTimer(){const m=Math.floor(timerSeconds/60),s=timerSeconds%60;$("timerDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
$("timerStart").addEventListener("click",()=>{
  if(timerRunning){clearInterval(timerInterval);timerRunning=false;$("timerStart").textContent="▶ Resume";return;}
  timerRunning=true;$("timerStart").textContent="Ⅱ Pause";
  timerInterval=setInterval(()=>{timerSeconds--;updateTimer();if(timerSeconds<=0){clearInterval(timerInterval);timerRunning=false;$("timerStart").textContent="▶ Start";showToast("Focus session complete! Take a short break.");timerSeconds=25*60;updateTimer();}},1000);
});
$("timerReset").addEventListener("click",()=>{clearInterval(timerInterval);timerRunning=false;timerSeconds=25*60;updateTimer();$("timerStart").textContent="▶ Start";});
setupHeader();render();updateTimer();
