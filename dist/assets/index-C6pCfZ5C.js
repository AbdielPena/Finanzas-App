(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function o(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function l(s){if(s.ep)return;s.ep=!0;const a=o(s);fetch(s.href,a)}})();const ht="modulepreload",xt=function(e){return"/"+e},Pe={},Ve=function(t,o,l){let s=Promise.resolve();if(o&&o.length>0){let c=function(r){return Promise.all(r.map(n=>Promise.resolve(n).then(i=>({status:"fulfilled",value:i}),i=>({status:"rejected",reason:i}))))};document.getElementsByTagName("link");const p=document.querySelector("meta[property=csp-nonce]"),d=(p==null?void 0:p.nonce)||(p==null?void 0:p.getAttribute("nonce"));s=c(o.map(r=>{if(r=xt(r),r in Pe)return;Pe[r]=!0;const n=r.endsWith(".css"),i=n?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${i}`))return;const v=document.createElement("link");if(v.rel=n?"stylesheet":ht,n||(v.as="script"),v.crossOrigin="",v.href=r,d&&v.setAttribute("nonce",d),document.head.appendChild(v),n)return new Promise((u,g)=>{v.addEventListener("load",u),v.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${r}`)))})}))}function a(c){const p=new Event("vite:preloadError",{cancelable:!0});if(p.payload=c,window.dispatchEvent(p),!p.defaultPrevented)throw c}return s.then(c=>{for(const p of c||[])p.status==="rejected"&&a(p.reason);return t().catch(a)})},Y="finanzapp_";let ke=null;function Ge(e){ke=e}function $t(){return ke?`${Y}${ke}_`:`${Y}legacy_`}class wt{constructor(){this._listeners={},this._cache={}}_getKey(t){return`${$t()}${t}`}getAll(t){if(this._cache[t])return this._cache[t];try{const o=localStorage.getItem(this._getKey(t)),l=o?JSON.parse(o):[];return this._cache[t]=l,l}catch{return[]}}getById(t,o){return this.getAll(t).find(l=>l.id===o)||null}save(t,o){this._cache[t]=o,localStorage.setItem(this._getKey(t),JSON.stringify(o)),this._notify(t)}add(t,o){const l=this.getAll(t);return l.push({...o,createdAt:new Date().toISOString()}),this.save(t,l),o}update(t,o,l){const s=this.getAll(t),a=s.findIndex(c=>c.id===o);return a===-1?null:(s[a]={...s[a],...l,updatedAt:new Date().toISOString()},this.save(t,s),s[a])}remove(t,o){const l=this.getAll(t).filter(s=>s.id!==o);this.save(t,l)}filter(t,o){return this.getAll(t).filter(o)}find(t,o){return this.getAll(t).find(o)||null}count(t,o){return o?this.filter(t,o).length:this.getAll(t).length}sum(t,o,l){return(l?this.filter(t,l):this.getAll(t)).reduce((a,c)=>a+(parseFloat(c[o])||0),0)}getSetting(t,o=null){try{const l=this._getKey("settings"),s=JSON.parse(localStorage.getItem(l)||"{}");if(Object.keys(s).length===0){const a=JSON.parse(localStorage.getItem(`${Y}settings`)||"{}");if(a[t]!==void 0)return a[t]}return s[t]!==void 0?s[t]:o}catch{return o}}setSetting(t,o){try{const l=this._getKey("settings"),s=JSON.parse(localStorage.getItem(l)||"{}");s[t]=o,localStorage.setItem(l,JSON.stringify(s)),this._notify("settings")}catch{}}getSettings(){try{const t=this._getKey("settings");let o=JSON.parse(localStorage.getItem(t)||"null");return(!o||Object.keys(o).length===0)&&(o=JSON.parse(localStorage.getItem(`${Y}settings`)||"{}")),o.notifications||(o.notifications={global:!0,anticipationDays:3,types:{cc_payments:!0,subs:!0,debts:!0,receivables:!0,smart:!0}}),o}catch{return{notifications:{global:!0,anticipationDays:3,types:{}}}}}saveSettings(t){localStorage.setItem(this._getKey("settings"),JSON.stringify(t)),this._notify("settings")}getAuth(){try{return JSON.parse(localStorage.getItem(`${Y}auth`)||"{}")}catch{return{}}}saveAuth(t){localStorage.setItem(`${Y}auth`,JSON.stringify(t))}isFirstUse(){try{return JSON.parse(localStorage.getItem("finanzapp_users")||"[]").length===0}catch{return!0}}isLoggedIn(){try{const t=JSON.parse(sessionStorage.getItem("finanzapp_session")||"null");return!!(t!=null&&t.userId&&(t!=null&&t.workspaceId))}catch{return!1}}setSession(t){t||sessionStorage.removeItem("finanzapp_session")}on(t,o){return this._listeners[t]||(this._listeners[t]=[]),this._listeners[t].push(o),()=>{this._listeners[t]=this._listeners[t].filter(l=>l!==o)}}_notify(t){(this._listeners[t]||[]).forEach(o=>o()),(this._listeners["*"]||[]).forEach(o=>o(t))}exportData(){const t={};return["banks","accounts","cards","transactions","categories","subscriptions","subscription_charges","debts","debt_payments","debt_templates","receivables","payables","goals","goal_contributions","notifications","tithe","settings"].forEach(l=>{const s=this._getKey(l),a=localStorage.getItem(s);a&&(t[l]=JSON.parse(a))}),t._exportDate=new Date().toISOString(),t._version="1.0.0",t}importData(t){if(!t||typeof t!="object")throw new Error("Datos inválidos");Object.keys(t).forEach(o=>{o.startsWith("_")||localStorage.setItem(this._getKey(o),JSON.stringify(t[o]))}),this._cache={},this._notify("*")}clearAll(){Object.keys(localStorage).filter(o=>o.startsWith(Y)).forEach(o=>localStorage.removeItem(o)),this._cache={},sessionStorage.removeItem(`${Y}session`)}invalidate(t){t?delete this._cache[t]:this._cache={}}}const m=new wt;class St{constructor(){this.routes={},this.currentRoute=null,this.beforeEach=null,this._container=null}init(t){this._container=document.getElementById(t),window.addEventListener("hashchange",()=>this._resolve()),window.location.hash?this._resolve():window.location.hash="#/dashboard"}register(t,o){return this.routes[t]=o,this}navigate(t){window.location.hash=`#${t}`}_resolve(){const o=(window.location.hash.slice(1)||"/dashboard").split("?")[0];if(this.beforeEach&&!this.beforeEach(o))return;const l=this.routes[o];l&&this._container?(this.currentRoute=o,document.querySelectorAll(".nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.route===o)}),document.querySelectorAll(".bottom-nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.route===o)}),this._updateHeader(o),this._container.innerHTML=`
        <div style="padding:20px; animation: fadeIn 0.15s ease;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 24px">
            <div style="width:300px">
              <div class="skeleton skeleton-text" style="height:28px; width:60%; margin-bottom:12px"></div>
              <div class="skeleton skeleton-text" style="height:14px; width:40%"></div>
            </div>
            <div class="skeleton skeleton-button"></div>
          </div>
          <div class="grid grid-3" style="margin-bottom: 24px">
            <div class="skeleton" style="height:110px"></div>
            <div class="skeleton" style="height:110px"></div>
            <div class="skeleton" style="height:110px"></div>
          </div>
          <div class="skeleton" style="height:300px; border-radius:var(--radius-xl)"></div>
        </div>
      `,setTimeout(()=>{this._container.innerHTML="";const s=l();typeof s=="string"?this._container.innerHTML=s:s instanceof HTMLElement&&this._container.appendChild(s),this._container.scrollTop=0,window.scrollTo(0,0)},150)):this._container&&(this._container.innerHTML=`
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          <h3>Página no encontrada</h3>
          <p>La ruta "${o}" no existe.</p>
          <button class="btn btn-primary" onclick="location.hash='#/dashboard'">Ir al Dashboard</button>
        </div>
      `)}_updateHeader(t){const o={"/dashboard":["Dashboard","Resumen financiero general"],"/accounts":["Cuentas Bancarias","Gestiona tus bancos y cuentas"],"/cards":["Tarjetas de Crédito","Control de tus tarjetas"],"/transactions":["Transacciones","Registro de ingresos y gastos"],"/subscriptions":["Suscripciones","Servicios y pagos recurrentes"],"/debts":["Deudas","Préstamos y obligaciones"],"/receivables":["Cuentas por Cobrar","Dinero que te deben"],"/payables":["Cuentas por Pagar","Pagos pendientes"],"/external_cards":["Tarjetas Terceros","Tarjetas externas que gestionas"],"/goals":["Metas Financieras","Objetivos de ahorro"],"/tithe":["Cálculo del 10%","Gestión del diezmo"],"/notifications":["Notificaciones","Centro de alertas"],"/categories":["Categorías","Categorías personalizadas"],"/settings":["Configuración","Preferencias de la aplicación"]},[l,s]=o[t]||["FinanzApp",""],a=document.getElementById("header-title"),c=document.getElementById("header-subtitle");a&&(a.textContent=l),c&&(c.textContent=s)}}const M=new St,De={dashboard:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',bank:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',creditCard:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',transaction:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',subscription:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',debt:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',receivable:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',payable:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',goal:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',tithe:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',notification:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',category:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>',settings:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',plus:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',edit:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',trash:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',close:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',check:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',search:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',filter:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',download:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',upload:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',moreVertical:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',arrowUp:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',arrowDown:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',chevronDown:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',menu:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',panelLeft:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>',moon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',sun:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',logout:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',wallet:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',trendingUp:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',trendingDown:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>',dollarSign:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',alert:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',info:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',checkCircle:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',eye:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',eyeOff:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',calendar:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',pieChart:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',barChart:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>',lock:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',handCoins:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>',fileText:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>',star:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'};function f(e,t=20){return(De[e]||De.info).replace(/width="24"/,`width="${t}"`).replace(/height="24"/,`height="${t}"`)}function P(){return Date.now().toString(36)+Math.random().toString(36).substr(2,9)}const Ee={DOP:{symbol:"RD$",code:"DOP",name:"Peso Dominicano",locale:"es-DO"},USD:{symbol:"$",code:"USD",name:"Dólar Estadounidense",locale:"en-US"},EUR:{symbol:"€",code:"EUR",name:"Euro",locale:"de-DE"},MXN:{symbol:"MX$",code:"MXN",name:"Peso Mexicano",locale:"es-MX"},COP:{symbol:"COL$",code:"COP",name:"Peso Colombiano",locale:"es-CO"},ARS:{symbol:"AR$",code:"ARS",name:"Peso Argentino",locale:"es-AR"},BRL:{symbol:"R$",code:"BRL",name:"Real Brasileño",locale:"pt-BR"},CLP:{symbol:"CL$",code:"CLP",name:"Peso Chileno",locale:"es-CL"},PEN:{symbol:"S/",code:"PEN",name:"Sol Peruano",locale:"es-PE"},GTQ:{symbol:"Q",code:"GTQ",name:"Quetzal",locale:"es-GT"}};function Je(){return Ee}function w(e,t=null){const o=t||kt().currency||"DOP",l=Ee[o]||Ee.DOP;try{return new Intl.NumberFormat(l.locale,{style:"currency",currency:o,minimumFractionDigits:2,maximumFractionDigits:2}).format(e)}catch{return`${l.symbol} ${Number(e).toLocaleString("es-DO",{minimumFractionDigits:2})}`}}function B(e){return e?new Date(e).toLocaleDateString("es-DO",{year:"numeric",month:"short",day:"numeric"}):""}function We(e){if(!e)return"";const t=new Date,o=new Date(e),l=t-o,s=Math.floor(l/(1e3*60*60*24));return s===0?"Hoy":s===1?"Ayer":s<7?`Hace ${s} días`:s<30?`Hace ${Math.floor(s/7)} semanas`:B(e)}function R(){return new Date().toISOString().split("T")[0]}function je(){const e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}`}function ze(e){if(!e)return"";const[t,o]=e.split("-");return new Date(parseInt(t),parseInt(o)-1).toLocaleDateString("es-DO",{month:"long",year:"numeric"})}function K(e){if(!e)return 1/0;const t=new Date;t.setHours(0,0,0,0);const o=new Date(e);return o.setHours(0,0,0,0),Math.ceil((o-t)/(1e3*60*60*24))}function se(e){return K(e)<0}function Q(e,t){return t?Math.round(e/t*100):0}function kt(){try{return JSON.parse(localStorage.getItem("finanzapp_settings")||"{}")}catch{return{}}}function Et(e,t,o,l){let s=null;const a=c=>{s||(s=c);const p=Math.min((c-s)/l,1),d=1-Math.pow(1-p,3),r=Math.floor(d*(o-t)+t);e.innerHTML=w(r),p<1?window.requestAnimationFrame(a):e.innerHTML=w(o)};window.requestAnimationFrame(a)}const fe={"azul-fintech":{primary:"#4f46e5",hover:"#6366f1",glow:"rgba(79, 70, 229, 0.25)",name:"Azul Fintech"},"morado-premium":{primary:"#9333ea",hover:"#a855f7",glow:"rgba(147, 51, 234, 0.25)",name:"Morado Premium"},"verde-inversion":{primary:"#059669",hover:"#10b981",glow:"rgba(5, 150, 105, 0.25)",name:"Verde Inversión"},"oscuro-minimalista":{primary:"#fafafa",hover:"#a1a1aa",glow:"rgba(255, 255, 255, 0.15)",name:"Minimalista (B&W)"}};function oe(e){const t=document.documentElement;if(typeof e=="object"&&e!==null&&e.isCustom){e.bgPrimary&&t.style.setProperty("--bg-primary",e.bgPrimary),e.bgCard&&t.style.setProperty("--bg-card",e.bgCard),e.textPrimary&&t.style.setProperty("--text-primary",e.textPrimary),e.colorIncome&&t.style.setProperty("--color-income",e.colorIncome),e.colorExpense&&t.style.setProperty("--color-expense",e.colorExpense),e.accentPrimary&&(t.style.setProperty("--accent-primary",e.accentPrimary),t.style.setProperty("--accent-primary-hover",`color-mix(in srgb, ${e.accentPrimary} 85%, white)`),t.style.setProperty("--accent-primary-glow",`color-mix(in srgb, ${e.accentPrimary} 25%, transparent)`));return}if(t.style.removeProperty("--bg-primary"),t.style.removeProperty("--bg-card"),t.style.removeProperty("--text-primary"),t.style.removeProperty("--color-income"),t.style.removeProperty("--color-expense"),typeof e=="string"&&e.startsWith("#")){t.style.setProperty("--accent-primary",e),t.style.setProperty("--accent-primary-hover",`color-mix(in srgb, ${e} 85%, white)`),t.style.setProperty("--accent-primary-glow",`color-mix(in srgb, ${e} 25%, transparent)`);return}const o=fe[e]||fe["azul-fintech"];t.style.setProperty("--accent-primary",o.primary),t.style.setProperty("--accent-primary-hover",o.hover),t.style.setProperty("--accent-primary-glow",o.glow)}function Ye(e){return e!=null&&e._aiModified?'<span class="ai-badge" title="Operación ejecutada por IA" style="font-size:0.85em; margin-left:4px">🤖</span>':""}const Ct=Object.freeze(Object.defineProperty({__proto__:null,THEME_PALETTES:fe,aiBadge:Ye,animateValue:Et,applyUserPalette:oe,formatDate:B,formatMoney:w,formatRelativeDate:We,generateId:P,getCurrencies:Je,getCurrentMonth:je,getDaysUntil:K,getMonthName:ze,getToday:R,isOverdue:se,percentage:Q},Symbol.toStringTag,{value:"Module"})),Me=[{id:"cat_salary",nombre:"Salario",icono:"💰",color:"#00e676",tipo:"ingreso",esSistema:!0},{id:"cat_freelance",nombre:"Freelance",icono:"💻",color:"#69f0ae",tipo:"ingreso",esSistema:!0},{id:"cat_investment",nombre:"Inversiones",icono:"📈",color:"#00bcd4",tipo:"ingreso",esSistema:!0},{id:"cat_clients",nombre:"Clientes",icono:"👥",color:"#81c784",tipo:"ingreso",esSistema:!0},{id:"cat_gift",nombre:"Regalos",icono:"🎁",color:"#ab47bc",tipo:"ingreso",esSistema:!0},{id:"cat_other_income",nombre:"Otros Ingresos",icono:"💵",color:"#66bb6a",tipo:"ingreso",esSistema:!0},{id:"cat_food",nombre:"Alimentación",icono:"🍔",color:"#ff7043",tipo:"gasto",esSistema:!0},{id:"cat_transport",nombre:"Transporte",icono:"🚗",color:"#42a5f5",tipo:"gasto",esSistema:!0},{id:"cat_home",nombre:"Hogar",icono:"🏠",color:"#ffa726",tipo:"gasto",esSistema:!0},{id:"cat_health",nombre:"Salud",icono:"🏥",color:"#ef5350",tipo:"gasto",esSistema:!0},{id:"cat_education",nombre:"Educación",icono:"📚",color:"#5c6bc0",tipo:"gasto",esSistema:!0},{id:"cat_entertainment",nombre:"Entretenimiento",icono:"🎮",color:"#ec407a",tipo:"gasto",esSistema:!0},{id:"cat_clothing",nombre:"Ropa",icono:"👕",color:"#8d6e63",tipo:"gasto",esSistema:!0},{id:"cat_services",nombre:"Servicios",icono:"📱",color:"#26a69a",tipo:"gasto",esSistema:!0},{id:"cat_subscriptions",nombre:"Suscripciones",icono:"🔄",color:"#7e57c2",tipo:"gasto",esSistema:!0},{id:"cat_personal",nombre:"Personal",icono:"🧴",color:"#78909c",tipo:"gasto",esSistema:!0},{id:"cat_debt_payment",nombre:"Pago de Deudas",icono:"📋",color:"#ff5252",tipo:"gasto",esSistema:!0},{id:"cat_other_expense",nombre:"Otros Gastos",icono:"📦",color:"#bdbdbd",tipo:"gasto",esSistema:!0},{id:"cat_transfer",nombre:"Transferencia",icono:"↔️",color:"#90a4ae",tipo:"ambos",esSistema:!0},{id:"cat_tithe",nombre:"Diezmo/10%",icono:"❤️",color:"#e91e63",tipo:"gasto",esSistema:!0}];function Ke(){const e=m.getAll("categories");if(e.length===0)m.save("categories",Me.map(t=>({...t,createdAt:new Date().toISOString()})));else{let t=!1;Me.forEach(o=>{e.find(l=>l.id===o.id)||(e.push({...o,createdAt:new Date().toISOString()}),t=!0)}),t&&m.save("categories",e)}}function Qe(e=null){const t=m.getAll("categories");return e?t.filter(o=>o.tipo===e||o.tipo==="ambos"):t}function ge(e){return m.getById("categories",e)}function It(e){return m.add("categories",{...e,id:P(),esSistema:!1})}function At(e,t){return m.update("categories",e,t)}function qt(e){const t=m.getById("categories",e);return t!=null&&t.esSistema?!1:(m.remove("categories",e),!0)}function ue(e=null){return Qe(e).map(t=>`<option value="${t.id}">${t.icono} ${t.nombre}</option>`).join("")}function ee(e,t,o,l="",s="",a=null){m.add("notifications",{id:P(),tipo:e,titulo:t,mensaje:o,moduloOrigen:l,referenciaId:s,leida:!1,fechaVencimiento:a})}function Ze(e=!1){let t=m.getAll("notifications");return e&&(t=t.filter(o=>!o.leida)),t.sort((o,l)=>new Date(l.createdAt)-new Date(o.createdAt))}function Xe(){return m.count("notifications",e=>!e.leida)}function Lt(e){m.update("notifications",e,{leida:!0})}function jt(){const e=m.getAll("notifications");e.forEach(t=>t.leida=!0),m.save("notifications",e)}function zt(e){m.remove("notifications",e)}function Tt(){m.save("notifications",[])}function et(){m.getAll("subscriptions").filter(r=>r.activa&&r.estado==="activa").forEach(r=>{if(r.proximoCobro){const n=K(r.proximoCobro);n>=0&&n<=3&&(m.find("notifications",v=>v.moduloOrigen==="subscriptions"&&v.referenciaId===r.id&&!v.leida)||ee("advertencia",`Cobro próximo: ${r.nombre}`,`Se cobra en ${n===0?"hoy":n+" días"} — ${formatMoney(r.monto)}`,"subscriptions",r.id,r.proximoCobro)),n<=0&&(m.find("subscription_charges",v=>v.suscripcionId===r.id&&v.fechaProgramada===r.proximoCobro)||(m.add("subscription_charges",{id:P(),suscripcionId:r.id,fechaProgramada:r.proximoCobro,fechaConfirmada:null,confirmado:!1,monto:r.monto}),ee("alerta",`Cobro generado de ${r.nombre}`,`Pulsa para confirmar el descuento por ${formatMoney(r.monto)}`,"subscriptions",r.id+"_charge")))}}),m.getAll("receivables").filter(r=>r.estado!=="cobrada").forEach(r=>{K(r.fechaLimite)<0&&(m.find("notifications",v=>v.moduloOrigen==="receivables"&&v.referenciaId===r.id&&!v.leida)||ee("alerta",`Vencida: ${r.deudor}`,`La cuenta por cobrar venció el ${B(r.fechaLimite)}`,"receivables",r.id))}),m.getAll("payables").filter(r=>r.estado!=="pagada").forEach(r=>{const n=K(r.fechaLimite);n>=0&&n<=5&&(m.find("notifications",v=>v.moduloOrigen==="payables"&&v.referenciaId===r.id&&!v.leida)||ee("advertencia",`Pago próximo: ${r.beneficiario}`,`Vence en ${n===0?"hoy":n+" días"}`,"payables",r.id,r.fechaLimite))});const l=m.getAll("cards").filter(r=>r.activa),s=new Date,a=s.getDate(),c=s.getMonth(),p=s.getFullYear(),d=new Date(p,c+1,0).getDate();l.forEach(r=>{const n=r.saldoUsado/r.limiteCredito*100;if(n>=80&&(m.find("notifications",v=>v.moduloOrigen==="cards"&&v.referenciaId===r.id+"_usage"&&!v.leida)||ee("alerta",`Tarjeta al ${Math.round(n)}%: ${r.nombre}`,`Has usado ${Math.round(n)}% del límite de crédito`,"cards",r.id+"_usage")),r.diaPago){const i=r.diaPago>=a?r.diaPago-a:d-a+r.diaPago;i>=0&&i<=3&&(m.find("notifications",u=>u.moduloOrigen==="cards"&&u.referenciaId===r.id+"_pago"&&!u.leida)||ee("advertencia","Pago de Tarjeta Próximo",`El límite de pago de tu ${r.nombre} es en ${i===0?"hoy":i+" día(s)"}`,"cards",r.id+"_pago"))}if(r.diaCorte){const i=r.diaCorte>=a?r.diaCorte-a:d-a+r.diaCorte;i>=0&&i<=2&&(m.find("notifications",u=>u.moduloOrigen==="cards"&&u.referenciaId===r.id+"_corte"&&!u.leida)||ee("info","Corte de Tarjeta",`Tu ${r.nombre} hace corte ${i===0?"hoy":"en "+i+" día(s)"}`,"cards",r.id+"_corte"))}})}const ye="finanzapp_",tt=`${ye}users`,at=`${ye}workspaces`,Ce=`${ye}session`,te={admin:"Admin",editor:"Editor",supervisor:"Supervisor",viewer:"Viewer"},Pt={admin:["viewDashboard","viewTransactions","viewAccounts","viewCards","viewDebts","viewSubscriptions","viewGoals","viewSettings","viewUsers","viewAI","viewReports","editTransactions","editAccounts","editCards","editDebts","editSubscriptions","editGoals","editSettings","manageUsers","confirmPayments","deleteTransactions"],editor:["viewDashboard","viewTransactions","viewAccounts","viewCards","viewDebts","viewSubscriptions","viewGoals","viewAI","viewReports","editTransactions","editDebts","editSubscriptions","editGoals","confirmPayments","deleteTransactions"],supervisor:["viewDashboard","viewTransactions","viewAccounts","viewCards","viewDebts","viewSubscriptions","viewGoals","viewReports"],viewer:["viewDashboard","viewTransactions","viewReports"]};async function he(){const e=crypto.getRandomValues(new Uint8Array(16));return Array.from(e).map(t=>t.toString(16).padStart(2,"0")).join("")}async function me(e,t){const l=new TextEncoder().encode(e+t),s=await crypto.subtle.digest("SHA-256",l);return Array.from(new Uint8Array(s)).map(c=>c.toString(16).padStart(2,"0")).join("")}function H(){try{return JSON.parse(localStorage.getItem(tt)||"[]")}catch{return[]}}function Z(e){localStorage.setItem(tt,JSON.stringify(e))}function ae(){try{return JSON.parse(localStorage.getItem(at)||"[]")}catch{return[]}}function xe(e){localStorage.setItem(at,JSON.stringify(e))}function G(){try{return JSON.parse(sessionStorage.getItem(Ce)||"null")}catch{return null}}function ot(e){e?sessionStorage.setItem(Ce,JSON.stringify(e)):sessionStorage.removeItem(Ce)}function $e(){const e=G();if(!e)return null;const t=H().find(o=>o.id===e.userId)||null;return t&&t.email==="soyabdielpena@gmail.com"&&(t.isSuperAdmin=!0),t}function rt(){const e=G();return e&&ae().find(t=>t.id===e.workspaceId)||null}function Dt(){const e=G();return(e==null?void 0:e.role)||null}function pe(){const e=G();return(e==null?void 0:e.workspaceId)||null}function st(){return!!G()}function nt(){ot(null)}function Se(e){const t=Dt();return t?(Pt[t]||[]).includes(e):!1}async function Mt({nombre:e,email:t,password:o,workspaceName:l}){const s=H();if(s.find(g=>g.email.toLowerCase()===t.toLowerCase()))throw new Error("Ya existe una cuenta con ese correo.");const a=`usr_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,c=`ws_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,p=await he(),d=await me(o,p),r={id:a,nombre:e.trim(),email:t.trim().toLowerCase(),passwordHash:d,salt:p,avatar:e.trim().charAt(0).toUpperCase(),workspaces:[{workspaceId:c,role:"admin"}],activo:!0,createdAt:new Date().toISOString()},n={id:c,nombre:(l==null?void 0:l.trim())||`${e.trim()}'s Finanzas`,ownerUserId:a,members:[{userId:a,role:"admin"}],createdAt:new Date().toISOString()};s.push(r),Z(s);const i=ae();i.push(n),xe(i);const v=s.length===1;let u=0;return v&&Te()&&(u=ct(c)),{user:r,workspace:n,migrated:u}}async function Bt(e,t){const l=H().find(d=>d.email.toLowerCase()===e.trim().toLowerCase());if(!l)throw new Error("No existe una cuenta con ese correo.");if(!l.activo)throw new Error("Esta cuenta está desactivada.");if(await me(t,l.salt)!==l.passwordHash)throw new Error("Contraseña incorrecta.");const a=ae(),c=l.workspaces||[];if(c.length===0)throw new Error("No tienes acceso a ningún workspace.");const p=c.map(d=>{const r=a.find(n=>n.id===d.workspaceId);return r?{...r,role:d.role}:null}).filter(Boolean);if(p.length===0)throw new Error("No se encontraron tus workspaces.");return Te()&&ct(p[0].id),{user:l,workspaces:p}}function ve(e,t){var a;const l=H().find(c=>c.id===e);if(!l)throw new Error("Usuario no encontrado.");const s=(a=l.workspaces)==null?void 0:a.find(c=>c.workspaceId===t);if(!s)throw new Error("Sin acceso a este workspace.");ot({userId:e,workspaceId:t,role:s.role,nombre:l.nombre,avatar:l.avatar})}async function _t({workspaceId:e,nombre:t,email:o,password:l,role:s}){var n;const a=H(),c=ae(),p=c.find(i=>i.id===e);if(!p)throw new Error("Workspace no encontrado.");let d,r=a.find(i=>i.email.toLowerCase()===o.toLowerCase());if(r){if((n=r.workspaces)!=null&&n.find(i=>i.workspaceId===e))throw new Error("Este usuario ya es miembro del workspace.");r.workspaces=[...r.workspaces||[],{workspaceId:e,role:s}],d=r.id,Z(a)}else{d=`usr_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;const i=await he(),v=await me(l,i),u={id:d,nombre:t.trim(),email:o.trim().toLowerCase(),passwordHash:v,salt:i,avatar:t.trim().charAt(0).toUpperCase(),workspaces:[{workspaceId:e,role:s}],activo:!0,createdAt:new Date().toISOString()};a.push(u),Z(a)}return p.members=[...p.members||[],{userId:d,role:s}],xe(c),d}function Nt(e,t,o){var p;const l=H(),s=ae(),a=s.find(d=>d.id===e);if(!a)throw new Error("Workspace no encontrado.");if(o!=="admin"){const d=(a.members||[]).filter(n=>n.role==="admin").length;if(((p=a.members.find(n=>n.userId===t))==null?void 0:p.role)==="admin"&&d<=1)throw new Error("Debe quedar al menos un administrador.")}a.members=a.members.map(d=>d.userId===t?{...d,role:o}:d),xe(s);const c=l.find(d=>d.id===t);c&&(c.workspaces=c.workspaces.map(d=>d.workspaceId===e?{...d,role:o}:d),Z(l))}function Ot(e,t){const o=H(),l=ae(),s=l.find(c=>c.id===e);if(!s)throw new Error("Workspace no encontrado.");if(s.ownerUserId===t)throw new Error("No puedes eliminar al propietario del workspace.");s.members=s.members.filter(c=>c.userId!==t),xe(l);const a=o.find(c=>c.id===t);a&&(a.workspaces=a.workspaces.filter(c=>c.workspaceId!==e),Z(o))}function it(e){const t=H(),o=ae().find(l=>l.id===e);return o?(o.members||[]).map(l=>{const s=t.find(a=>a.id===l.userId);return s?{...s,role:l.role}:null}).filter(Boolean):[]}function Ft(){return H().length>0}const lt=["banks","accounts","cards","transactions","categories","subscriptions","subscription_charges","debts","debt_payments","receivables","payables","goals","goal_contributions","notifications","tithe","settings","external_cards","notes"];function Te(){return lt.some(e=>{const t=localStorage.getItem(`finanzapp_${e}`),o=localStorage.getItem(`finanzapp_legacy_${e}`);if(!t&&!o)return!1;try{const l=JSON.parse(t||o);return Array.isArray(l)?l.length>0:Object.keys(l).length>0}catch{return!1}})}function ct(e){let t=0;return lt.forEach(o=>{const l=`finanzapp_${o}`,s=`finanzapp_legacy_${o}`,a=`finanzapp_${e}_${o}`,c=localStorage.getItem(s)||localStorage.getItem(l);if(!c)return;const p=localStorage.getItem(a);let d=[],r=[];try{d=JSON.parse(c)}catch{}try{r=p?JSON.parse(p):[]}catch{}if(Array.isArray(d)){Array.isArray(r)||(r=[]);const n=d.filter(i=>!r.find(v=>v.id===i.id));n.length>0&&(localStorage.setItem(a,JSON.stringify([...r,...n])),t++)}else(!p||Object.keys(r).length===0)&&(localStorage.setItem(a,c),t++)}),t}const dt=`${ye}admin_audit`;function pt(){try{return JSON.parse(localStorage.getItem(dt)||"[]")}catch{return[]}}function U(e,t,o,l=""){const s=pt();s.push({id:`log_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,adminId:e,targetUserId:t,action:o,details:l,timestamp:new Date().toISOString()}),localStorage.setItem(dt,JSON.stringify(s))}function we(){const e=$e();if(!e||!e.isSuperAdmin)throw new Error("Acceso denegado: Se requiere rol de SuperAdministrador.");return e}function Rt(){return we(),H().map(e=>({...e,passwordHash:void 0,salt:void 0}))}function Ht(e,t){const o=we(),l=H(),s=l.findIndex(a=>a.id===e);if(s===-1)throw new Error("Usuario no encontrado");l[s].estado=t,t==="activo"&&(l[s].activo=!0),(t==="suspendido"||t==="inactivo")&&(l[s].activo=!1),Z(l),U(o.id,e,`Cambio de estado a: ${t}`)}async function Ut(e,t,o){const l=we(),s=H(),a=s.findIndex(d=>d.id===e);if(a===-1)throw new Error("Usuario no encontrado");const c=await he(),p=await me(t,c);s[a].salt=c,s[a].passwordHash=p,s[a].forcePasswordChange=!!o,Z(s),U(l.id,e,"Restablecimiento de contraseña",`Cambio forzado en login: ${o}`)}async function Vt(e,t){const o=H(),l=o.findIndex(c=>c.id===e);if(l===-1)throw new Error("Usuario no encontrado");const s=await he(),a=await me(t,s);o[l].salt=s,o[l].passwordHash=a,o[l].forcePasswordChange=!1,Z(o),U(e,e,"Cambio de contraseña forzado completado")}function Gt(e){const t=we();U(t.id,e,"Cierre de sesión forzado (simulado)","Se requiere invalidar tokens en Backend para completitud real.")}const Be=["😊","🦁","🐼","🦊","🐸","🤖","🧑‍💻","👩‍💼","🧙","🦄"];function Jt(e){const t=document.createElement("div");t.id="login-root",t.style.cssText=`
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background: radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 50%),
                var(--bg-body);
    padding: 20px;
  `;function o(p){t.innerHTML="",t.appendChild(p())}function l(){const p=document.createElement("div");return p.style.cssText="width:100%;max-width:420px",p.innerHTML=`
      <div style="text-align:center;margin-bottom:36px">
        <div style="font-size:2.8rem;margin-bottom:12px">💰</div>
        <h1 style="font-family:var(--font-heading);font-size:1.8rem;color:var(--text-primary);margin:0">FinanzApp</h1>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-top:6px">Tu asistente financiero inteligente</p>
      </div>

      <div class="card" style="padding:32px">
        <h2 style="font-size:1.15rem;margin:0 0 24px;text-align:center">Iniciar Sesión</h2>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="email" class="form-input" id="login-email" placeholder="correo@ejemplo.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña</label>
            <input type="password" class="form-input" id="login-pass" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div id="login-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="login-btn">
            Entrar →
          </button>
        </form>
        <div style="text-align:center;margin-top:20px;font-size:0.85rem;color:var(--text-muted)">
          ¿No tienes cuenta?
          <button class="btn btn-ghost btn-sm" id="go-register" style="font-size:0.85rem">Regístrate gratis</button>
        </div>
      </div>
    `,p.querySelector("#go-register").addEventListener("click",()=>o(s)),p.querySelector("#login-form").addEventListener("submit",async d=>{d.preventDefault();const r=p.querySelector("#login-email").value,n=p.querySelector("#login-pass").value,i=p.querySelector("#login-btn"),v=p.querySelector("#login-error");v.style.display="none",i.disabled=!0,i.textContent="Verificando...";try{const u=await Bt(r,n);let g=u.user,b=u.workspaces;if(u.forcePasswordChange){o(()=>c(g,g.workspaces||[],e));return}b&&b.length===1?(ve(g.id,b[0].id),e()):o(()=>a(g,b,e))}catch(u){v.textContent=u.message,v.style.display="block",i.disabled=!1,i.textContent="Entrar →"}}),p}function s(){const p=document.createElement("div");return p.style.cssText="width:100%;max-width:460px",p.innerHTML=`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2.4rem;margin-bottom:8px">🚀</div>
        <h1 style="font-family:var(--font-heading);font-size:1.6rem;margin:0">Crear cuenta</h1>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:6px">Tu información y datos son completamente privados</p>
      </div>

      <div class="card" style="padding:32px">
        ${Te()?`
          <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:10px;padding:12px 14px;font-size:0.82rem;color:#f59e0b;margin-bottom:18px;display:flex;gap:8px;align-items:flex-start">
            <span style="font-size:1.1rem;flex-shrink:0">🔄</span>
            <div>
              <strong>¡Datos anteriores detectados!</strong><br/>
              Al crear tu cuenta, tus cuentas bancarias, transacciones y toda la configuración previa se migrarán automáticamente a tu nuevo workspace.
            </div>
          </div>
        `:""}
        <form id="reg-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tu nombre *</label>
              <input type="text" class="form-input" id="reg-name" placeholder="Juan Pérez" required />
            </div>
            <div class="form-group">
              <label class="form-label">Avatar</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap" id="avatar-picker">
                ${Be.map((d,r)=>`
                  <button type="button" class="avatar-btn" data-avatar="${d}"
                    style="width:34px;height:34px;border-radius:50%;border:2px solid ${r===0?"var(--accent-primary)":"var(--border-color)"};background:var(--bg-input);font-size:1.1rem;cursor:pointer;transition:all 0.15s">
                    ${d}
                  </button>`).join("")}
              </div>
              <input type="hidden" id="reg-avatar" value="${Be[0]}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Correo electrónico *</label>
            <input type="email" class="form-input" id="reg-email" placeholder="correo@ejemplo.com" required autocomplete="email" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contraseña *</label>
              <input type="password" class="form-input" id="reg-pass" placeholder="Mín. 6 caracteres" required minlength="6" />
            </div>
            <div class="form-group">
              <label class="form-label">Confirmar *</label>
              <input type="password" class="form-input" id="reg-pass2" placeholder="••••••••" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de tu espacio de trabajo</label>
            <input type="text" class="form-input" id="reg-ws" placeholder="Ej: Finanzas Personales, Mi Empresa..." />
          </div>
          <div id="reg-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="reg-btn">
            Crear mi cuenta →
          </button>
        </form>
        <div style="text-align:center;margin-top:16px;font-size:0.85rem;color:var(--text-muted)">
          ¿Ya tienes cuenta?
          <button class="btn btn-ghost btn-sm" id="go-login" style="font-size:0.85rem">Iniciar sesión</button>
        </div>
      </div>
    `,p.querySelector("#go-login").addEventListener("click",()=>o(l)),p.querySelectorAll(".avatar-btn").forEach(d=>{d.addEventListener("click",()=>{p.querySelectorAll(".avatar-btn").forEach(r=>r.style.borderColor="var(--border-color)"),d.style.borderColor="var(--accent-primary)",p.querySelector("#reg-avatar").value=d.dataset.avatar})}),p.querySelector("#reg-form").addEventListener("submit",async d=>{d.preventDefault();const r=p.querySelector("#reg-error"),n=p.querySelector("#reg-btn");r.style.display="none";const i=p.querySelector("#reg-pass").value,v=p.querySelector("#reg-pass2").value;if(i!==v){r.textContent="Las contraseñas no coinciden.",r.style.display="block";return}n.disabled=!0,n.textContent="Creando cuenta...";try{const{user:u,workspace:g,migrated:b}=await Mt({nombre:p.querySelector("#reg-name").value,email:p.querySelector("#reg-email").value,password:i,workspaceName:p.querySelector("#reg-ws").value||void 0,avatar:p.querySelector("#reg-avatar").value});ve(u.id,g.id),e(b)}catch(u){r.textContent=u.message,r.style.display="block",n.disabled=!1,n.textContent="Crear mi cuenta →"}}),p}function a(p,d,r){const n=document.createElement("div");return n.style.cssText="width:100%;max-width:440px",n.innerHTML=`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2rem;margin-bottom:8px">${p.avatar||"👤"}</div>
        <h2 style="font-size:1.2rem;margin:0">Hola, ${p.nombre}</h2>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Selecciona un espacio de trabajo</p>
      </div>
      <div class="card" style="padding:24px">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${d.map(i=>`
            <button class="ws-select-btn" data-ws-id="${i.id}"
              style="background:var(--bg-input);border:1px solid var(--border-color);border-radius:12px;padding:14px 18px;text-align:left;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:14px">
              <div style="font-size:1.4rem">🏢</div>
              <div>
                <div style="font-weight:600;font-size:0.95rem">${i.nombre}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Rol: ${te[i.role]||i.role}</div>
              </div>
              <div style="margin-left:auto;color:var(--text-muted)">→</div>
            </button>
          `).join("")}
        </div>
      </div>
    `,n.querySelectorAll(".ws-select-btn").forEach(i=>{i.addEventListener("mouseenter",()=>i.style.borderColor="var(--accent-primary)"),i.addEventListener("mouseleave",()=>i.style.borderColor="var(--border-color)"),i.addEventListener("click",()=>{ve(p.id,i.dataset.wsId),r()})}),n}function c(p,d,r){const n=document.createElement("div");return n.style.cssText="width:100%;max-width:440px",n.innerHTML=`
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:2rem;margin-bottom:8px">🔐</div>
        <h2 style="font-size:1.2rem;margin:0">Actualización Requerida</h2>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Hola ${p.nombre}, el administrador ha solicitado que restablezcas tu contraseña antes de continuar.</p>
      </div>
      <div class="card" style="padding:24px">
        <form id="force-pass-form">
          <div class="form-group">
            <label class="form-label">Nueva Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass" placeholder="Mínimo 6 caracteres" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Contraseña *</label>
            <input type="password" class="form-input" id="fp-pass2" placeholder="Repite la contraseña" required />
          </div>
          <div id="fp-error" style="color:var(--color-expense);font-size:0.82rem;margin:-8px 0 12px;display:none"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center" id="fp-btn">
            Actualizar y Entrar →
          </button>
        </form>
      </div>
    `,n.querySelector("#force-pass-form").addEventListener("submit",async i=>{i.preventDefault();const v=n.querySelector("#fp-error"),u=n.querySelector("#fp-btn");v.style.display="none";const g=n.querySelector("#fp-pass").value,b=n.querySelector("#fp-pass2").value;if(g!==b){v.textContent="Las contraseñas no coinciden.",v.style.display="block";return}if(g.length<6){v.textContent="La nueva contraseña debe tener al menos 6 caracteres.",v.style.display="block";return}u.disabled=!0,u.textContent="Actualizando...";try{await Vt(p.id,g),d.length===1?(ve(p.id,d[0].id),r()):o(()=>a(p,d,r))}catch(x){v.textContent=x.message,v.style.display="block",u.disabled=!1,u.textContent="Actualizar y Entrar →"}}),n}return Ft()?o(l):o(s),t}let le=null;function h(e,t,o="",l=4e3){le||(le=document.createElement("div"),le.className="toast-container",document.body.appendChild(le));const s={success:"checkCircle",error:"alert",warning:"alert",info:"info"},a=document.createElement("div");a.className="toast toast-enter",a.innerHTML=`
    <div class="toast-icon ${e}">${f(s[e]||"info",20)}</div>
    <div class="toast-body">
      <div class="toast-title">${t}</div>
      ${o?`<div class="toast-message">${o}</div>`:""}
    </div>
    <button class="toast-close">${f("close",16)}</button>
  `,a.querySelector(".toast-close").onclick=()=>_e(a),le.appendChild(a),setTimeout(()=>_e(a),l)}function _e(e){e.parentElement&&(e.style.animation="fadeSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",setTimeout(()=>e.remove(),300))}function D(e,t,o={}){const{width:l="540px",onClose:s}=o;z();const a=document.createElement("div");return a.className="modal-overlay",a.id="active-modal",a.innerHTML=`
    <div class="modal-container" style="max-width:${l}">
      <div class="modal-header">
        <h2>${e}</h2>
        <button class="modal-close" id="modal-close-btn">${f("close",20)}</button>
      </div>
      <div class="modal-body">${typeof t=="string"?t:""}</div>
    </div>
  `,a.addEventListener("click",c=>{c.target===a&&z()}),document.body.appendChild(a),typeof t!="string"&&t instanceof HTMLElement&&a.querySelector(".modal-body").appendChild(t),a.querySelector("#modal-close-btn").onclick=()=>{z(),s&&s()},document.body.style.overflow="hidden",a.querySelectorAll(".form-input, .form-textarea").forEach(c=>{c.hasAttribute("placeholder")||c.setAttribute("placeholder"," ")}),setTimeout(()=>{const c=a.querySelector("input, select, textarea");c&&c.focus()},100),a}function z(){const e=document.getElementById("active-modal");e&&(e.remove(),document.body.style.overflow="")}function _(e,t,o={}){const{type:l="danger",confirmText:s="Confirmar",cancelText:a="Cancelar"}=o;return new Promise(c=>{const p=document.createElement("div");p.className="modal-overlay",p.id="active-modal",p.innerHTML=`
      <div class="modal-container" style="max-width:400px">
        <div class="confirm-body">
          <div class="confirm-icon ${l}">
            ${f(l==="danger"?"alert":"info",28)}
          </div>
          <h3>${e}</h3>
          <p>${t}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel">${a}</button>
          <button class="btn btn-${l}" id="confirm-ok">${s}</button>
        </div>
      </div>
    `,document.body.appendChild(p),document.body.style.overflow="hidden",p.querySelector("#confirm-cancel").onclick=()=>{z(),c(!1)},p.querySelector("#confirm-ok").onclick=()=>{z(),c(!0)},p.addEventListener("click",d=>{d.target===p&&(z(),c(!1))})})}function V(e,t,o,l,s){const a=document.createElement("div");return a.className="empty-state card",a.innerHTML=`
    ${f(e,64)}
    <h3>${t}</h3>
    <p>${o}</p>
    ${l?`<button class="btn btn-primary" id="empty-action">${f("plus",18)} ${l}</button>`:""}
  `,l&&s&&(a.querySelector("#empty-action").onclick=s),a}function ce(e,t,o,l,s=null){return`
    <div class="stat-card">
      <div class="stat-icon ${l}">${f(o,24)}</div>
      <div class="stat-content">
        <div class="stat-label">${e}</div>
        <div class="stat-value">${t}</div>
        ${s!==null?`<div class="stat-change ${s>=0?"positive":"negative"}">${s>=0?"↑":"↓"} ${Math.abs(s)}% vs mes anterior</div>`:""}
      </div>
    </div>
  `}const Wt=Object.freeze(Object.defineProperty({__proto__:null,buildStatCard:ce,closeModal:z,confirmDialog:_,emptyState:V,openModal:D,showToast:h},Symbol.toStringTag,{value:"Module"}));function Yt(e){return m.filter("transactions",t=>t.fecha&&t.fecha.startsWith(e))}function Ie(e){const t=m.getById("accounts",e);if(!t)return 0;const o=m.filter("transactions",a=>a.cuentaId===e&&a.estado!=="hold");let l=parseFloat(t.saldoInicial)||0;return o.forEach(a=>{a.tipo==="ingreso"?l+=parseFloat(a.monto)||0:(a.tipo==="gasto"||a.tipo==="transferencia")&&(l-=parseFloat(a.monto)||0)}),m.filter("transactions",a=>a.cuentaDestinoId===e&&a.tipo==="transferencia"&&a.estado!=="hold").forEach(a=>{l+=parseFloat(a.monto)||0}),l}function Kt(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=je(),o=Yt(t);o.filter(y=>y.tipo==="ingreso").reduce((y,E)=>y+(parseFloat(E.monto)||0),0),o.filter(y=>y.tipo==="gasto").reduce((y,E)=>y+(parseFloat(E.monto)||0),0);const l=m.getAll("accounts").filter(y=>y.activa!==!1),s=m.getAll("cards").filter(y=>y.activa!==!1),a=l.reduce((y,E)=>y+Ie(E.id),0),c=m.getAll("receivables").filter(y=>y.estado!=="pagada").reduce((y,E)=>y+(parseFloat(E.saldoPendiente)||0),0),p=a+c,d=s.reduce((y,E)=>y+(parseFloat(E.saldoUsado)||0),0),r=m.getAll("debts").filter(y=>y.estado!=="pagada"&&!y.paid).reduce((y,E)=>y+(parseFloat(E.saldoPendiente)||parseFloat(E.amount)||0),0),n=m.getAll("payables").filter(y=>y.estado!=="pagada").reduce((y,E)=>y+((parseFloat(E.monto)||0)-(parseFloat(E.montoPagado)||0)),0),i=d,v=p-i,u=m.filter("subscription_charges",y=>!y.confirmado).length,g=Xe(),b=m.filter("transactions",y=>(y.aplicaDiezmo===!0||y.categoriaId==="cat_salary"||y.aplicaDiezmo===void 0&&y.tipo==="ingreso")&&y.fecha&&y.fecha.startsWith(t)).reduce((y,E)=>y+(parseFloat(E.monto)||0),0),x=b*.1,$={};m.getAll("transactions").forEach(y=>{const E=y.clienteAsociado||(y.categoriaId==="cat_clients"?y.descripcion:null);E&&($[E]||($[E]={ingresos:0,gastos:0,neto:0}),y.tipo==="ingreso"?$[E].ingresos+=parseFloat(y.monto)||0:y.tipo==="gasto"&&($[E].gastos+=parseFloat(y.monto)||0),$[E].neto=$[E].ingresos-$[E].gastos)});const A=Object.entries($).sort((y,E)=>E[1].neto-y[1].neto).slice(0,5),I={};m.getAll("receivables").filter(y=>y.estado!=="pagada").forEach(y=>{I[y.entidad]=(I[y.entidad]||0)+(parseFloat(y.saldoPendiente)||0)});const C=Object.entries(I).sort((y,E)=>E[1]-y[1]).slice(0,5),j={};o.filter(y=>y.tipo==="gasto").forEach(y=>{const E=y.categoriaId||"cat_other_expense";j[E]=(j[E]||0)+(parseFloat(y.monto)||0)});const S=Object.entries(j).sort((y,E)=>E[1]-y[1]).slice(0,5),q=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate(),k=Array(q).fill(0),L=Array(q).fill(0),T=Array.from({length:q},(y,E)=>String(E+1).padStart(2,"0"));o.forEach(y=>{if(!y.fecha)return;const E=parseInt(y.fecha.split("-")[2],10);E>=1&&E<=q&&(y.tipo==="ingreso"&&(k[E-1]+=parseFloat(y.monto)),y.tipo==="gasto"&&(L[E-1]+=parseFloat(y.monto)))});const X=m.getAll("transactions").sort((y,E)=>new Date(E.fecha||E.createdAt)-new Date(y.fecha||y.createdAt)).slice(0,5);return e.innerHTML=`
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p>${ze(t)} — Visión General</p>
      </div>
      <div style="display:flex;gap:12px">
        ${u>0?`<div class="badge badge-warning" style="cursor:pointer" onclick="location.hash='#/subscriptions'">${f("alert",14)} ${u} cobros pendientes</div>`:""}
        ${g>0?`<div class="badge badge-info" style="cursor:pointer" onclick="location.hash='#/notifications'">${f("notification",14)} ${g} alertas</div>`:""}
      </div>
    </div>

    <!-- ACCIONES RÁPIDAS -->
    <div class="grid grid-4 stagger-children" style="margin-bottom:28px">
      <button class="btn btn-primary" onclick="alert('TODO: Modal Agregar Ingreso')">${f("trendingUp",20)} Registrar Ingreso</button>
      <button class="btn" style="background:var(--color-expense); color:#fff" onclick="alert('TODO: Modal Agregar Gasto')">${f("trendingDown",20)} Registrar Gasto</button>
      <button class="btn btn-secondary" onclick="location.hash='#/transactions'">${f("list",20)} Ver Movimientos</button>
      <button class="btn btn-secondary" onclick="location.hash='#/goals'">${f("target",20)} Metas</button>
    </div>

    <!-- CABECERA RESUMEN -->
    <div class="grid grid-3 stagger-children" style="margin-bottom:28px">
      <div class="stat-card" style="background: linear-gradient(135deg, var(--bg-card), var(--color-income-bg)); border: 1px solid var(--border-color)">
        <div class="stat-content">
          <div class="stat-label">Total Activos</div>
          <div class="stat-value" id="val-activos" style="color:var(--color-income)">$0.00</div>
        </div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, var(--bg-card), var(--color-expense-bg)); border: 1px solid var(--border-color)">
        <div class="stat-content">
          <div class="stat-label">Total Pasivos</div>
          <div class="stat-value" id="val-pasivos" style="color:var(--color-expense)">$0.00</div>
        </div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover)); border: none; color:#fff">
        <div class="stat-content">
          <div class="stat-label" style="color:rgba(255,255,255,0.8)">Patrimonio Neto</div>
          <div class="stat-value" id="val-patrimonio" style="font-size:1.8rem;color:#ffffff">$0.00</div>
        </div>
      </div>
    </div>

    <!-- DETALLES DE LIQUIDEZ Y DEUDA -->
    <div class="grid grid-4 stagger-children" style="margin-bottom:28px">
      ${ce("Efectivo en Bancos",w(a),"bank","info")}
      ${ce("Consumo en Tarjetas",w(d),"creditCard","expense")}
      ${ce("Por Cobrar (Clientes)",w(c),"arrowDown","success")}
      ${ce("Deudas por Pagar",w(r+n),"arrowUp","danger")}
    </div>

    <!-- GRÁFICOS DINÁMICOS -->
    <div class="grid grid-2" style="margin-bottom:28px;gap:20px;min-height:300px">
      <div class="card" style="padding:15px">
        <h3 style="font-size:1rem;margin-bottom:15px">${f("barChart",18)} Tendencia del Mes</h3>
        <div style="position:relative;height:240px;width:100%">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
      <div class="card" style="padding:15px">
        <h3 style="font-size:1rem;margin-bottom:15px">${f("pieChart",18)} Gastos por Categoría</h3>
        <div style="position:relative;height:240px;width:100%;display:flex;justify-content:center">
          ${S.length>0?'<canvas id="categoryChart"></canvas>':'<div style="color:var(--text-muted);align-self:center">Sin gastos este mes</div>'}
        </div>
      </div>
    </div>

    <!-- TERCERA FILA: CLIENTES & 10% -->
    <div class="grid grid-3" style="margin-bottom:28px;gap:20px">
      <div class="card" style="grid-column: span 1">
        <div class="card-header"><h3>${f("tithe",18)} Cálculo del 10%</h3></div>
        <div style="padding:10px 0;text-align:center">
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:5px">Base de Ingresos</div>
          <div style="font-size:1.6rem;font-weight:600;margin-bottom:15px">${w(b)}</div>
          
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:5px">Diezmo/Ahorro Sugerido</div>
          <div style="font-size:1.6rem;font-weight:600;color:var(--color-info)">${w(x)}</div>
          
          <button class="btn btn-secondary btn-sm" style="margin-top:15px;width:100%" onclick="location.hash='#/tithe'">Ir al Módulo</button>
        </div>
      </div>

      <div class="card" style="grid-column: span 1">
        <div class="card-header"><h3>${f("receivable",18)} Deudas por Cobrar (Clientes)</h3></div>
        <div style="padding:5px 0">
          ${C.length>0?C.map(([y,E])=>`
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-color);padding:8px 0;font-size:0.9rem">
              <span>${y}</span><span style="font-weight:600;color:var(--color-success)">${w(E)}</span>
            </div>
          `).join(""):'<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;margin-top:20px">No hay cuentas por cobrar</div>'}
        </div>
      </div>
      
      <div class="card" style="grid-column: span 1">
        <div class="card-header"><h3>${f("users",18)} Rentabilidad de Clientes</h3></div>
        <div style="padding:5px 0">
          ${A.length>0?A.map(([y,E])=>`
            <div style="border-bottom:1px solid var(--border-color);padding:8px 0;">
              <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">${y}</span>
                <span class="badge ${E.neto>=0?"badge-success":"badge-danger"}">${E.neto>=0?"+":""}${w(E.neto)} (Neto)</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-secondary)">
                <span>Ingresos: <span style="color:var(--color-income)">${w(E.ingresos)}</span></span>
                <span>Costos: <span style="color:var(--color-expense)">${w(E.gastos)}</span></span>
              </div>
            </div>
          `).join(""):'<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;margin-top:20px">No hay registros de clientes</div>'}
        </div>
      </div>
      
      <div class="card" style="grid-column: span 1">
        <div class="card-header">
          <h3>${f("subscription",18)} Suscripciones</h3>
          <button class="btn btn-ghost btn-sm" onclick="location.hash='#/subscriptions'">Ver</button>
        </div>
        <div style="padding:10px 0;text-align:center;display:flex;flex-direction:column;justify-content:center;height:100%">
          <div style="font-size:2.5rem;font-weight:700;color:var(--color-warning);line-height:1">${u}</div>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:5px">Cobros pendientes por confirmar</div>
        </div>
      </div>
    </div>

    <!-- CUARTA FILA: TRANSACCIONES -->
    <div class="card">
      <div class="card-header">
        <h3>${f("transaction",18)} Ingresos y Gastos Recientes</h3>
        <button class="btn btn-ghost btn-sm" onclick="location.hash='#/transactions'">Ir a Transacciones</button>
      </div>
      ${X.length>0?`
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th class="right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${X.map(y=>{const E=ge(y.categoriaId),N=y.tipo==="ingreso",O=y.tipo==="transferencia";return`
                  <tr>
                    <td>
                      <div class="cell-with-icon">
                        <div class="cell-icon" style="background:${N?"var(--color-income-bg)":O?"var(--color-info-bg)":"var(--color-expense-bg)"};color:${N?"var(--color-income)":O?"var(--color-info)":"var(--color-expense)"}">
                          ${f(N?"arrowDown":O?"transaction":"arrowUp",16)}
                        </div>
                        <div class="cell-primary">${y.descripcion}</div>
                      </div>
                    </td>
                    <td>${E?`<span class="badge badge-neutral">${E.icono} ${E.nombre}</span>`:"-"}</td>
                    <td style="color:var(--text-secondary)">${y.fecha||"-"}</td>
                    <td class="right cell-amount ${N?"income":O?"":"expense"}">${N?"+":O?"":"-"}${w(y.monto)}</td>
                  </tr>
                `}).join("")}
            </tbody>
          </table>
        </div>
      `:'<div style="color:var(--text-muted);font-size:0.85rem;padding:30px 0;text-align:center">No hay transacciones recientes</div>'}
    </div>
  `,setTimeout(()=>{var ne,ie;if(!window.Chart)return;const y=document.documentElement.getAttribute("data-theme")==="dark",E=y?"#94a3b8":"#64748b",N=y?"#334155":"#e2e8f0",O=(ne=document.getElementById("trendChart"))==null?void 0:ne.getContext("2d");O&&new Chart(O,{type:"bar",data:{labels:T,datasets:[{label:"Ingresos",data:k,backgroundColor:"#10b981",borderRadius:4},{label:"Gastos",data:L,backgroundColor:"#ef4444",borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{labels:{color:E}}},scales:{y:{grid:{color:N},ticks:{color:E}},x:{grid:{display:!1},ticks:{color:E}}}}});const F=(ie=document.getElementById("categoryChart"))==null?void 0:ie.getContext("2d");F&&S.length>0&&new Chart(F,{type:"doughnut",data:{labels:S.map(J=>{var W;return((W=ge(J[0]))==null?void 0:W.nombre)||"Sin Categoría"}),datasets:[{data:S.map(J=>J[1]),backgroundColor:S.map(J=>{var W;return((W=ge(J[0]))==null?void 0:W.color)||"#888"}),borderWidth:2,borderColor:y?"#0f172a":"#ffffff"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{color:E,font:{size:11}}}}}})},100),setTimeout(()=>{Ve(async()=>{const{animateValue:y}=await Promise.resolve().then(()=>Ct);return{animateValue:y}},void 0).then(({animateValue:y})=>{const E=document.getElementById("val-activos"),N=document.getElementById("val-pasivos"),O=document.getElementById("val-patrimonio");E&&y(E,0,p,1200),N&&y(N,0,i,1200),O&&y(O,0,v,1400)})},150),e}const Ae=["#6c63ff","#00d4aa","#42a5f5","#ff7043","#ab47bc","#26a69a","#ec407a","#ffa726","#5c6bc0","#8d6e63"];function Qt(e=null){return`
    <form id="bank-form">
      <div class="form-group">
        <label class="form-label">Nombre del Banco <span class="required">*</span></label>
        <input type="text" class="form-input" id="bank-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Banreservas, Popular..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="bank-color-picker">
          ${Ae.map(t=>`<div class="color-option ${(e==null?void 0:e.color)===t||!e&&t===Ae[0]?"selected":""}" data-color="${t}" style="background:${t}"></div>`).join("")}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="bank-submit-btn">${f("check",18)} ${e?"Guardar":"Crear Banco"}</button>
      </div>
    </form>
  `}function Zt(e=null){return`
    <form id="account-form">
      <div class="form-group">
        <label class="form-label">Banco <span class="required">*</span></label>
        <select class="form-select" id="acc-bank" required>
          <option value="">Seleccionar banco</option>
          ${m.getAll("banks").map(o=>`<option value="${o.id}" ${(e==null?void 0:e.bancoId)===o.id?"selected":""}>${o.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de la Cuenta <span class="required">*</span></label>
        <input type="text" class="form-input" id="acc-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Nómina, Ahorros..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="acc-type">
            <option value="ahorro" ${(e==null?void 0:e.tipo)==="ahorro"?"selected":""}>Ahorro</option>
            <option value="corriente" ${(e==null?void 0:e.tipo)==="corriente"?"selected":""}>Corriente</option>
            <option value="nómina" ${(e==null?void 0:e.tipo)==="nómina"?"selected":""}>Nómina</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Saldo Inicial</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="acc-balance" value="${(e==null?void 0:e.saldoInicial)||0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="acc-submit-btn">${f("check",18)} ${e?"Guardar":"Crear Cuenta"}</button>
      </div>
    </form>
  `}function Xt(){const e=document.createElement("div");e.className="page-content animate-fade-in";let t="todos";const o=()=>{var r,n;const a=m.getAll("banks"),c=m.getAll("accounts"),p=m.getAll("cards");if(a.length===0&&c.length===0&&p.length===0){e.innerHTML="",e.appendChild(V("bank","Sin cuentas bancarias","Agrega tu primer banco para comenzar a gestionar tus finanzas","Agregar Banco",()=>l()));return}const d=t==="todos"?a:a.filter(i=>i.id===t);e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Mis Productos Financieros</h1>
          <p>Organizados por institución bancaria</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" id="add-bank-btn">${f("plus",18)} Banco</button>
          <button class="btn btn-primary" id="add-account-btn">${f("plus",18)} Cuenta</button>
        </div>
      </div>

      <!-- Bank Filter -->
      <div class="table-toolbar" style="margin-bottom: 24px;">
        <div class="table-filters" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:10px;">
          <button class="table-filter-chip ${t==="todos"?"active":""}" data-filter-bank="todos">🏦 Todos los Bancos</button>
          ${a.map(i=>`
            <button class="table-filter-chip ${t===i.id?"active":""}" data-filter-bank="${i.id}">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i.color||"#fff"};margin-right:6px"></span>${i.nombre}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Banks List -->
      <div class="stagger-children">
        ${d.map(i=>{const v=c.filter($=>$.bancoId===i.id),u=p.filter($=>$.bancoId===i.id);let g=0;v.forEach($=>{g+=Ie($.id)});let b=0;u.forEach($=>{b+=parseFloat($.saldoUsado)||0});const x=g-b;return`
            <div class="card" style="margin-bottom:24px; border: 1px solid rgba(255,255,255,0.05); overflow:hidden">
              <!-- Bank Header -->
              <div style="background: linear-gradient(90deg, ${i.color?i.color+"22":"rgba(255,255,255,0.05)"} 0%, transparent 100%); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${i.color||"var(--accent-primary)"}">
                <div>
                  <h2 style="margin:0 0 5px 0; display:flex; align-items:center; gap:10px; font-size:1.4rem">
                    ${i.nombre}
                  </h2>
                  <div style="font-size:0.85rem; color:var(--text-secondary)">
                    ${v.length} Cuenta(s) líquidas • ${u.length} Tarjeta(s) de crédito
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:0.85rem; color:var(--text-secondary)">Capital Neto en Banco</div>
                  <div style="font-size:1.5rem; font-weight:700; color:${x>=0?"var(--color-income)":"var(--color-expense)"}">${w(x)}</div>
                  <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end">
                    <button class="btn btn-ghost btn-sm" data-edit-bank="${i.id}">${f("edit",14)} Editar</button>
                    <button class="btn btn-ghost btn-sm danger" data-delete-bank="${i.id}">${f("trash",14)}</button>
                  </div>
                </div>
              </div>

              <!-- Bank Products -->
              <div style="padding: 20px;">
                <!-- Cuentas Section -->
                <div style="margin-bottom: ${u.length>0?"24px":"0"}">
                  <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; color:var(--color-info)">
                    <span>${f("bank",16)} Cuentas Bancarias</span>
                    <span style="font-size:0.9rem">${w(g)}</span>
                  </h3>
                  ${v.length>0?`
                    <div class="table-container" style="background:var(--bg-card); border-radius:var(--radius-md)">
                      <table class="data-table" style="margin:0">
                        <thead style="background:transparent">
                          <tr>
                            <th style="padding-left:16px">Nombre de Cuenta</th>
                            <th>Tipo</th>
                            <th class="right">Saldo Disponible</th>
                            <th class="right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${v.map($=>{const A=Ie($.id);return`
                              <tr>
                                <td style="padding-left:16px"><strong style="color:var(--text-primary)">${$.nombre}</strong></td>
                                <td><span class="badge badge-neutral">${$.tipo||"General"}</span></td>
                                <td class="right cell-amount ${A>=0?"income":"expense"}">${w(A)}</td>
                                <td class="cell-actions">
                                  <button class="cell-action-btn" data-edit-acc="${$.id}" title="Editar">${f("edit",16)}</button>
                                  <button class="cell-action-btn danger" data-delete-acc="${$.id}" title="Eliminar">${f("trash",16)}</button>
                                </td>
                              </tr>
                            `}).join("")}
                        </tbody>
                      </table>
                    </div>
                  `:'<div style="color:var(--text-muted);font-size:0.85rem;padding:10px 16px;background:var(--bg-body);border-radius:var(--radius-sm)">Sin cuentas monetarias registradas en esta institución.</div>'}
                </div>

                <!-- Tarjetas Section -->
                ${u.length>0?`
                  <div>
                    <h3 style="font-size:1.1rem; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; color:var(--color-expense)">
                      <span>${f("creditCard",16)} Tarjetas de Crédito</span>
                      <span style="font-size:0.9rem">Deuda: ${w(b)}</span>
                    </h3>
                    <div class="table-container" style="background:var(--bg-card); border-radius:var(--radius-md)">
                      <table class="data-table" style="margin:0">
                        <thead style="background:transparent">
                          <tr>
                            <th style="padding-left:16px">Producto</th>
                            <th>Límite</th>
                            <th class="right">Balance Consumido</th>
                            <th class="right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${u.map($=>{const A=parseFloat($.limiteCredito)||0,I=parseFloat($.saldoUsado)||0;return`
                              <tr>
                                <td style="padding-left:16px"><strong style="color:var(--text-primary)">${$.nombre}</strong></td>
                                <td style="color:var(--text-secondary)">${w(A)}</td>
                                <td class="right cell-amount expense">${w(I)}</td>
                                <td class="cell-actions">
                                  <button class="cell-action-btn summary-link" onclick="location.hash='#/cards'" title="Ir a Tarjetas">${f("eye",16)}</button>
                                </td>
                              </tr>
                            `}).join("")}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `:'<div style="display:none"></div>'}
              </div>
            </div>
          `}).join("")}
      </div>
    `,(r=e.querySelector("#add-bank-btn"))==null||r.addEventListener("click",()=>l()),(n=e.querySelector("#add-account-btn"))==null||n.addEventListener("click",()=>s()),e.querySelectorAll("[data-filter-bank]").forEach(i=>i.addEventListener("click",()=>{t=i.dataset.filterBank,o()})),e.querySelectorAll("[data-edit-bank]").forEach(i=>i.addEventListener("click",()=>{const v=m.getById("banks",i.dataset.editBank);v&&l(v)})),e.querySelectorAll("[data-delete-bank]").forEach(i=>i.addEventListener("click",async()=>{if(await _("¿Eliminar institución bancaria?","Se eliminará el banco y TODAS sus cuentas asociadas permanentemente.")){const u=i.dataset.deleteBank;m.filter("accounts",g=>g.bancoId===u).forEach(g=>m.remove("accounts",g.id)),m.filter("cards",g=>g.bancoId===u).forEach(g=>m.remove("cards",g.id)),m.remove("banks",u),h("success","Banco y productos eliminados"),t===u&&(t="todos"),o()}})),e.querySelectorAll("[data-edit-acc]").forEach(i=>i.addEventListener("click",()=>{const v=m.getById("accounts",i.dataset.editAcc);v&&s(v)})),e.querySelectorAll("[data-delete-acc]").forEach(i=>i.addEventListener("click",async()=>{await _("¿Eliminar cuenta bancaria?","Solo se borrará el registro de la cuenta, pero las transacciones asociadas quedarán huérfanas.")&&(m.remove("accounts",i.dataset.deleteAcc),h("success","Cuenta eliminada"),o())}))};function l(a=null){const c=D(a?"Editar Institución":"Nueva Institución",Qt(a));c.querySelectorAll(".color-option").forEach(r=>{r.addEventListener("click",()=>{c.querySelectorAll(".color-option").forEach(n=>n.classList.remove("selected")),r.classList.add("selected")})});const p=c.querySelector("#bank-form"),d=c.querySelector("#bank-submit-btn");p.onsubmit=r=>{r.preventDefault(),!d.disabled&&(d.disabled=!0,d.innerHTML="Guardando...",setTimeout(()=>{try{const n=c.querySelector("#bank-name").value.trim(),i=c.querySelector(".color-option.selected"),v=i?i.dataset.color:Ae[0];a?(m.update("banks",a.id,{nombre:n,color:v}),h("success","Datos guardados correctamente")):(m.add("banks",{id:P(),nombre:n,color:v,icono:""}),h("success","Institución creada")),z(),o()}catch{d.disabled=!1,d.innerHTML=f("check",18)+" "+(a?"Guardar":"Crear Banco"),h("error","Ocurrió un error al guardar")}},100))}}function s(a=null){if(m.getAll("banks").length===0)return h("warning","Primero debes registrar una institución (banco)"),l();const c=D(a?"Editar Cuenta":"Nueva Cuenta",Zt(a)),p=c.querySelector("#account-form"),d=c.querySelector("#acc-submit-btn");p.onsubmit=r=>{r.preventDefault(),!d.disabled&&(d.disabled=!0,d.innerHTML="Guardando...",setTimeout(()=>{try{const n={bancoId:c.querySelector("#acc-bank").value,nombre:c.querySelector("#acc-name").value.trim(),tipo:c.querySelector("#acc-type").value,saldoInicial:parseFloat(c.querySelector("#acc-balance").value)||0,activa:!0};a?(m.update("accounts",a.id,n),h("success","Cuenta bancaria actualizada")):(m.add("accounts",{...n,id:P()}),h("success","Cuenta bancaria creada")),z(),o()}catch{d.disabled=!1,d.innerHTML=f("check",18)+" "+(a?"Guardar":"Crear Cuenta"),h("error","Ocurrió un error al registrar la cuenta")}},100))}}return o(),e}function ea(e){const t=new Date,o=t.getDate(),l=new Date(t.getFullYear(),t.getMonth()+1,0).getDate(),s=parseFloat(e.saldoUsado)||0,a=parseFloat(e.limiteCredito)||1,c=s/a,p=parseFloat(e.tasaInteres)||0;let d=null,r=null;e.diaCorte&&(d=e.diaCorte>=o?e.diaCorte-o:l-o+parseInt(e.diaCorte,10)),e.diaPago&&(r=e.diaPago>=o?e.diaPago-o:l-o+parseInt(e.diaPago,10));const n=s*.05,i=s;let v="low",u=[];return c>.8&&(v="high",u.push("Alta utilización (uso de crédito supera el 80%). Afecta tu score.")),r!==null&&r<=3&&s>0?(v="high",u.push(`¡Peligro! Pago vence en ${r} días. Riesgo de recargos.`)):d!==null&&d<=3&&s>0&&(v==="low"&&(v="medium"),u.push(`Corte en ${d} días. Considera abonar antes para reportar menor deuda.`)),{balance:s,minPayment:n,idealPayment:i,daysToCorte:d,daysToPago:r,riskLevel:v,warnings:u,interestRate:p,priorityScore:ta(s,p,r)}}function ta(e,t,o,l){if(e<=0)return 0;let s=0;return t>0&&(s+=t*10),o!==null&&(s+=(30-o)*2),s+=Math.min(e/1e3,20),s}function ut(e,t=!1){const o=ea(e);if(o.balance<=0)return"";const l=o.riskLevel==="high"?"var(--color-danger)":o.riskLevel==="medium"?"var(--color-warning)":"var(--color-info)";return`
    <div style="background:var(--bg-secondary);border-left:3px solid ${l};padding:10px;border-radius:6px;margin:12px 0 0 0;font-size:0.85rem">
      <div style="display:flex;align-items:center;margin-bottom:6px;font-weight:600;color:var(--text-accent)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Asistente Financiero
      </div>
      ${o.warnings.length>0?`<div style="color:${l};margin-bottom:8px;font-weight:500">${o.warnings.join("<br>")}</div>`:""}
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:var(--text-secondary)">Pago Mínimo Sugerido:</span>
        <span style="font-weight:600">$${o.minPayment.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="color:var(--text-secondary)">Pago Ideal (Sin intereses):</span>
        <span style="color:var(--color-income);font-weight:600">$${o.idealPayment.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
      </div>
    </div>
  `}function aa(e=null){return`
    <form id="card-form">
      <div class="form-group">
        <label class="form-label">Banco</label>
        <select class="form-select" id="card-bank">
          <option value="">Sin banco / Otro</option>
          ${m.getAll("banks").map(o=>`<option value="${o.id}" ${(e==null?void 0:e.bancoId)===o.id?"selected":""}>${o.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre de la Tarjeta <span class="required">*</span></label>
        <input type="text" class="form-input" id="card-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Visa Gold, MasterCard..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Límite de Crédito <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-limit" value="${(e==null?void 0:e.limiteCredito)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Límite con Sobregiro</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-overdraft" value="${(e==null?void 0:e.limiteSobregiro)||""}" step="0.01" placeholder="Dejar vacío si aplica igual" />
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Saldo Usado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="card-used" value="${(e==null?void 0:e.saldoUsado)||0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Tasa Interés (%)</label>
          <input type="number" class="form-input" id="card-rate" value="${(e==null?void 0:e.tasaInteres)||""}" step="0.01" placeholder="Ej: 3.5" />
        </div>
        <div class="form-group">
          <label class="form-label">Día de Corte</label>
          <input type="number" class="form-input" id="card-cut" value="${(e==null?void 0:e.diaCorte)||""}" min="1" max="31" placeholder="1-31" />
        </div>
        <div class="form-group">
          <label class="form-label">Día de Pago</label>
          <input type="number" class="form-input" id="card-pay" value="${(e==null?void 0:e.diaPago)||""}" min="1" max="31" placeholder="1-31" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Agregar Tarjeta"}</button>
      </div>
    </form>
  `}function oa(e){const t=m.getAll("accounts").filter(o=>o.activa!==!1);return`
    <form id="pay-card-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Saldo actual de la tarjeta</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${w(e.saldoUsado)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Monto a Pagar <span class="required">*</span></label>
        <div class="input-prefix-wrapper">
          <span class="input-prefix">RD$</span>
          <input type="number" class="form-input" id="pay-amount" value="${e.saldoUsado}" step="0.01" max="${e.saldoUsado}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Desde Cuenta</label>
        <select class="form-select" id="pay-account">
          <option value="">Sin cuenta origen (solo ajustar tarjeta)</option>
          ${t.map(o=>`<option value="${o.id}">${o.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-success">${f("check",18)} Pagar</button>
      </div>
    </form>
  `}function ra(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var d;const s=m.getAll("cards");if(s.length===0){e.innerHTML="",e.appendChild(V("creditCard","Sin tarjetas de crédito","Agrega tus tarjetas para controlar tus límites y gastos","Agregar Tarjeta",()=>o()));return}const a=s.reduce((r,n)=>r+(parseFloat(n.limiteCredito)||0),0),c=s.reduce((r,n)=>r+(parseFloat(n.saldoUsado)||0),0),p=a-c;e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Tarjetas de Crédito</h1>
          <p>${s.length} tarjeta${s.length!==1?"s":""} registrada${s.length!==1?"s":""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-card-btn">${f("plus",18)} Nueva Tarjeta</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card">
          <div class="stat-icon accent">${f("creditCard",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Límite Total</div>
            <div class="stat-value">${w(a)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon expense">${f("trendingDown",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Saldo Usado</div>
            <div class="stat-value">${w(c)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon income">${f("trendingUp",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Disponible</div>
            <div class="stat-value">${w(p)}</div>
          </div>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-auto stagger-children">
        ${s.map(r=>{const n=r.bancoId?m.getById("banks",r.bancoId):null,i=parseFloat(r.saldoUsado)||0,v=parseFloat(r.limiteCredito)||1,u=Q(i,v),g=u>=90?"var(--color-expense)":u>=70?"var(--color-warning)":"var(--accent-primary)";return`
            <div class="card" style="position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${(n==null?void 0:n.color)||"var(--accent-primary)"}"></div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div>
                  <h4 style="margin-bottom:2px">${r.nombre}</h4>
                  <span style="font-size:0.75rem;color:var(--text-muted)">${(n==null?void 0:n.nombre)||"Sin banco"} ${r.diaCorte?`• Corte: ${r.diaCorte}`:""} ${r.diaPago?`• Pago: ${r.diaPago}`:""}</span>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-pay-card="${r.id}" title="Pagar">${f("dollarSign",16)}</button>
                  <button class="btn-icon" data-edit-card="${r.id}" title="Editar">${f("edit",16)}</button>
                  <button class="btn-icon" data-del-card="${r.id}" title="Eliminar">${f("trash",16)}</button>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Usado</span>
                <span style="font-weight:600">${w(i)} <span style="color:var(--text-muted);font-weight:400">/ ${w(v)}</span></span>
              </div>
              <div class="progress-bar" style="margin-bottom:12px">
                <div class="progress-fill" style="width:${u}%;background:${g}"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Disponible</span>
                <span style="color:var(--color-income);font-weight:600">${w(v-i)}</span>
              </div>
              ${r.limiteSobregiro&&r.limiteSobregiro>v?`
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-top:4px">
                <span style="color:var(--text-muted)">Con Sobregiro</span>
                <span style="color:var(--text-secondary)">${w(r.limiteSobregiro-i)}</span>
              </div>`:""}
              ${r.tasaInteres?`<div style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;margin-bottom:8px">Tasa: ${r.tasaInteres}%</div>`:""}
              
              <!-- Assistant Injection -->
              ${ut(r,!1)}
            </div>
          `}).join("")}
      </div>
    `,(d=e.querySelector("#add-card-btn"))==null||d.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit-card]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("cards",r.dataset.editCard);n&&o(n)})),e.querySelectorAll("[data-del-card]").forEach(r=>r.addEventListener("click",async()=>{await _("¿Eliminar tarjeta?","Esta acción no se puede deshacer.")&&(m.remove("cards",r.dataset.delCard),h("success","Tarjeta eliminada"),t())})),e.querySelectorAll("[data-pay-card]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("cards",r.dataset.payCard);n&&l(n)}))};function o(s=null){const a=D(s?"Editar Tarjeta":"Nueva Tarjeta",aa(s));a.querySelector("#card-form").addEventListener("submit",c=>{c.preventDefault();const p={bancoId:a.querySelector("#card-bank").value,nombre:a.querySelector("#card-name").value.trim(),limiteCredito:parseFloat(a.querySelector("#card-limit").value)||0,limiteSobregiro:parseFloat(a.querySelector("#card-overdraft").value)||parseFloat(a.querySelector("#card-limit").value)||0,saldoUsado:parseFloat(a.querySelector("#card-used").value)||0,tasaInteres:parseFloat(a.querySelector("#card-rate").value)||0,diaCorte:parseInt(a.querySelector("#card-cut").value)||null,diaPago:parseInt(a.querySelector("#card-pay").value)||null,activa:!0};s?(m.update("cards",s.id,p),h("success","Tarjeta actualizada")):(m.add("cards",{...p,id:P()}),h("success","Tarjeta agregada")),z(),t()})}function l(s){const a=D(`Pagar: ${s.nombre}`,oa(s));a.querySelector("#pay-card-form").addEventListener("submit",c=>{c.preventDefault();const p=parseFloat(a.querySelector("#pay-amount").value)||0,d=a.querySelector("#pay-account").value;if(p<=0){h("error","Monto inválido");return}const r=Math.max(0,(parseFloat(s.saldoUsado)||0)-p);m.update("cards",s.id,{saldoUsado:r}),d&&m.add("transactions",{id:P(),tipo:"gasto",monto:p,descripcion:`Pago a tarjeta: ${s.nombre}`,categoriaId:"cat_debt_payment",cuentaId:d,tarjetaId:s.id,fecha:new Date().toISOString().split("T")[0],notas:"Pago de tarjeta de crédito"}),h("success","Pago registrado",`Se abonaron ${w(p)} a ${s.nombre}`),z(),t()})}return t(),e}function Ne(e=""){const t=m.getAll("accounts").filter(l=>l.activa!==!1),o=m.getAll("banks");return t.map(l=>{const s=o.find(a=>a.id===l.bancoId);return`<option value="${l.id}" ${l.id===e?"selected":""}>${(s==null?void 0:s.nombre)||""} - ${l.nombre}</option>`}).join("")}function sa(e=""){return m.getAll("cards").filter(o=>o.activa!==!1).map(o=>`<option value="${o.id}" ${o.id===e?"selected":""}>${o.nombre}</option>`).join("")}function na(e=null){const t=(e==null?void 0:e.tipo)||"gasto";return`
    <form id="tx-form">
      <div class="tabs" id="tx-type-tabs">
        <div class="tab ${t==="ingreso"?"active":""}" data-tipo="ingreso">Ingreso</div>
        <div class="tab ${t==="gasto"?"active":""}" data-tipo="gasto">Gasto</div>
        <div class="tab ${t==="transferencia"?"active":""}" data-tipo="transferencia">Transferencia</div>
      </div>
      <input type="hidden" id="tx-tipo" value="${t}" />
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="tx-amount" value="${(e==null?void 0:e.monto)||""}" step="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha <span class="required">*</span></label>
          <input type="date" class="form-input" id="tx-date" value="${(e==null?void 0:e.fecha)||R()}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción <span class="required">*</span></label>
        <input type="text" class="form-input" id="tx-desc" value="${(e==null?void 0:e.descripcion)||""}" placeholder="¿En qué se usó o de dónde vino?" required />
      </div>
      <!-- Clasificación de Ingreso (solo visible cuando tipo=ingreso) -->
      <div class="form-group" id="tx-income-type-group" style="display:${t==="ingreso"?"block":"none"}">
        <label class="form-label" style="color:var(--accent-primary)">Tipo de Ingreso</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px" id="income-type-chips">
          ${[{val:"personal",label:"Personal",emoji:"👤"},{val:"cliente",label:"Cliente / Proyecto",emoji:"🏢"},{val:"salario",label:"Salario / Nómina",emoji:"💼"},{val:"prestamo",label:"Préstamo Recibido",emoji:"🏦"},{val:"otro",label:"Otro",emoji:"📦"}].map(o=>`
            <button type="button" class="btn btn-sm income-type-chip ${((e==null?void 0:e.tipoIngreso)||"personal")===o.val?"btn-primary":"btn-secondary"}" data-income-type="${o.val}" style="gap:4px">
              ${o.emoji} ${o.label}
            </button>
          `).join("")}
        </div>
        <input type="hidden" id="tx-income-type" value="${(e==null?void 0:e.tipoIngreso)||"personal"}" />
        <div id="income-type-hint" style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
          ${((e==null?void 0:e.tipoIngreso)||"personal")==="prestamo"?"⚠️ Los préstamos recibidos <strong>no cuentan</strong> para el cálculo del 10%.":"ℹ️ Este ingreso se sumará a la base del 10% según la opción marcada abajo."}
        </div>
      </div>
      <div class="form-group" id="tx-client-group">
        <label class="form-label" style="color:var(--text-accent)">Asociar a Cliente / Proyecto (Opcional)</label>
        <input type="text" class="form-input" id="tx-client" value="${(e==null?void 0:e.clienteAsociado)||""}" placeholder="Ej: Empresa S.A., Pedro Moreno..." list="client-list" autocomplete="off" />
        <datalist id="client-list">
          ${Array.from(new Set(m.getAll("transactions").map(o=>o.clienteAsociado).filter(Boolean))).map(o=>`<option value="${o}">`).join("")}
        </datalist>
      </div>
      <div class="form-group" id="tx-category-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="tx-category">
          <option value="">Seleccionar categoría</option>
          ${ue(t)}
        </select>
      </div>
      <div class="form-group" id="tx-account-group">
        <label class="form-label" id="tx-account-label">Cuenta Origen <span class="required">*</span></label>
        <select class="form-select" id="tx-account" required>
          <option value="">Seleccionar cuenta</option>
          ${Ne(e==null?void 0:e.cuentaId)}
        </select>
      </div>
      <div class="form-group" id="tx-card-group" style="display:${t==="gasto"?"block":"none"}">
        <label class="form-label">O usar Tarjeta de Crédito</label>
        <select class="form-select" id="tx-card">
          <option value="">No usar tarjeta</option>
          ${sa(e==null?void 0:e.tarjetaId)}
        </select>
      </div>
      <div class="form-group" id="tx-dest-group" style="display:${t==="transferencia"?"block":"none"}">
        <label class="form-label">Cuenta Destino <span class="required">*</span></label>
        <select class="form-select" id="tx-dest">
          <option value="">Seleccionar cuenta destino</option>
          ${Ne(e==null?void 0:e.cuentaDestinoId)}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="tx-notes" placeholder="Notas adicionales...">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-group" id="tx-diezmo-group" style="display:${t!=="gasto"?"block":"none"}; padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="tx-diezmo" ${e?e.aplicaDiezmo!==!1?"checked":"":t==="ingreso"?"checked":""} />
          <span style="font-weight:500;font-size:0.9rem">Sumar al cálculo del 10% (Diezmo)</span>
        </label>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;padding-left:24px">Si marcas esta opción, el monto se sumará a los ingresos del mes para el cálculo del 10%.</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Registrar"}</button>
      </div>
    </form>
  `}function ia(){const e=document.createElement("div");e.className="page-content animate-fade-in";let t="todos",o="todos",l="",s="lista";const a=()=>{var A,I,C,j;let n=m.getAll("transactions");const i=n.filter(S=>S.estado==="hold");let v=[...n].sort((S,q)=>{const k=S.fecha||S.createdAt,L=q.fecha||q.createdAt;return new Date(L)-new Date(k)});t!=="todos"&&(v=v.filter(S=>S.tipo===t)),o==="hold"&&(v=v.filter(S=>S.estado==="hold")),o==="activo"&&(v=v.filter(S=>S.estado!=="hold")),l&&(v=v.filter(S=>(S.descripcion||"").toLowerCase().includes(l)||(S.notas||"").toLowerCase().includes(l)));const u=m.getAll("accounts").filter(S=>S.activa!==!1),g=m.getAll("banks"),b=m.getAll("cards").filter(S=>S.activa!==!1),x=['<option value="">— Cuenta —</option>',...u.map(S=>{const q=g.find(k=>k.id===S.bancoId);return`<option value="acc:${S.id}">${(q==null?void 0:q.nombre)||""} - ${S.nombre}</option>`}),"<option disabled>──────</option>",...b.map(S=>`<option value="card:${S.id}">💳 ${S.nombre}</option>`)].join("");n.filter(S=>S.tipo==="ingreso"&&S.estado!=="hold").reduce((S,q)=>S+(parseFloat(q.monto)||0),0),n.filter(S=>S.tipo==="gasto"&&S.estado!=="hold").reduce((S,q)=>S+(parseFloat(q.monto)||0),0);const $=i.length>0?`
      <div style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06)); border: 1px solid rgba(245,158,11,0.4); border-radius: 14px; padding: 16px; margin-bottom: 20px">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
          <span style="font-size:1.2rem">⏳</span>
          <div>
            <div style="font-weight:700; color: #f59e0b">${i.length} Transacción${i.length>1?"es":""} pendiente${i.length>1?"s":""} de asignación</div>
            <div style="font-size:0.78rem; color:var(--text-secondary)">Registradas por FinanzBot — asigna una cuenta o tarjeta para contabilizarlas</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px">
          ${i.map(S=>`
            <div style="background:var(--bg-card); border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:12px; flex-wrap:wrap">
              <div style="flex:1; min-width:180px">
                <div style="font-weight:600; font-size:0.9rem">${S.descripcion}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">${S.tipo} • ${S.fecha}</div>
              </div>
              <div style="font-weight:700; font-size:1rem; color:${S.tipo==="ingreso"?"var(--color-income)":"var(--color-expense)"}">
                ${S.tipo==="ingreso"?"+":"-"}${w(S.monto)}
              </div>
              <select class="form-select hold-assign" data-tx-id="${S.id}" style="max-width:220px; font-size:0.82rem">
                ${x}
              </select>
              <button class="btn btn-danger" data-del-hold="${S.id}" style="padding:6px 10px; font-size:0.8rem">${f("trash",14)}</button>
            </div>
          `).join("")}
        </div>
      </div>
    `:"";e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Transacciones</h1>
          <p>${v.length} registro${v.length!==1?"s":""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-tx-btn">${f("plus",18)} Nueva Transacción</button>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-filters">
          <button class="table-filter-chip ${t==="todos"?"active":""}" data-filter="todos">Todos</button>
          <button class="table-filter-chip ${t==="ingreso"?"active":""}" data-filter="ingreso">Ingresos</button>
          <button class="table-filter-chip ${t==="gasto"?"active":""}" data-filter="gasto">Gastos</button>
          <button class="table-filter-chip ${t==="transferencia"?"active":""}" data-filter="transferencia">Transferencias</button>
          ${i.length>0?`<button class="table-filter-chip ${o==="hold"?"active":""}" data-filter-estado="hold" style="border-color:#f59e0b;color:#f59e0b">⏳ Hold (${i.length})</button>`:""}
          ${o==="hold"?'<button class="table-filter-chip active" data-filter-estado="todos" style="font-size:0.75rem">✕ Quitar filtro</button>':""}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ${s==="lista"?"btn-primary":"btn-secondary"}" id="view-lista" style="padding:6px 14px;font-size:0.82rem">≡ Lista</button>
          <button class="btn ${s==="por-banco"?"btn-primary":"btn-secondary"}" id="view-banco" style="padding:6px 14px;font-size:0.82rem">🏦 Por Banco</button>
          <div class="search-input">
            ${f("search",18)}
            <input type="text" class="form-input" id="tx-search" placeholder="Buscar..." value="${l}" />
          </div>
        </div>
      </div>

      ${$}

      ${s==="por-banco"?p(v,g,u,b):c(v,l,t)}
    `,(A=e.querySelector("#add-tx-btn"))==null||A.addEventListener("click",()=>r()),e.querySelectorAll("[data-filter]").forEach(S=>S.addEventListener("click",()=>{t=S.dataset.filter,a()})),e.querySelectorAll("[data-filter-estado]").forEach(S=>S.addEventListener("click",()=>{o=S.dataset.filterEstado,a()})),(I=e.querySelector("#tx-search"))==null||I.addEventListener("input",S=>{l=S.target.value.toLowerCase(),a()}),(C=e.querySelector("#view-lista"))==null||C.addEventListener("click",()=>{s="lista",a()}),(j=e.querySelector("#view-banco"))==null||j.addEventListener("click",()=>{s="por-banco",a()}),e.querySelectorAll("[data-edit-tx]").forEach(S=>S.addEventListener("click",()=>{const q=m.getById("transactions",S.dataset.editTx);q&&r(q)})),e.querySelectorAll("[data-del-tx]").forEach(S=>S.addEventListener("click",async()=>{const q=m.getById("transactions",S.dataset.delTx);if(!q)return;if(await _("¿Eliminar transacción?",`"${q.descripcion}" por ${w(q.monto)}`)){if(q.tarjetaId&&q.tipo==="gasto"){const L=m.getById("cards",q.tarjetaId);L&&m.update("cards",q.tarjetaId,{saldoUsado:Math.max(0,(L.saldoUsado||0)-(q.monto||0))})}m.remove("transactions",q.id),h("success","Transacción eliminada"),a()}})),e.querySelectorAll(".hold-assign").forEach(S=>{S.addEventListener("change",()=>{const q=S.dataset.txId,k=S.value;if(!k)return;const L={estado:"activo"};k.startsWith("acc:")?(L.cuentaId=k.replace("acc:",""),L.tarjetaId=null):k.startsWith("card:")&&(L.tarjetaId=k.replace("card:",""),L.cuentaId=null),m.update("transactions",q,L),h("success","✅ Transacción asignada","Ya está contabilizada en tu balance"),a()})}),e.querySelectorAll("[data-del-hold]").forEach(S=>{S.addEventListener("click",async()=>{await _("¿Eliminar transacción pendiente?","Se descartará por completo, sin afectar ningún balance.")&&(m.remove("transactions",S.dataset.delHold),h("success","Transacción descartada"),a())})})};function c(n,i,v){return n.length?`
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Fecha</th>
            <th class="right">Monto</th><th class="right">Acciones</th>
          </tr></thead>
          <tbody>${n.map(u=>d(u)).join("")}</tbody>
        </table>
      </div>`:`
      <div class="empty-state card">
        ${f("transaction",64)}
        <h3>Sin transacciones</h3>
        <p>${i||v!=="todos"?"No se encontraron resultados con los filtros actuales":"Registra tu primera transacción para comenzar"}</p>
      </div>`}function p(n,i,v,u){if(!n.length)return`
      <div class="empty-state card">
        ${f("transaction",64)}
        <h3>Sin transacciones</h3>
        <p>Registra tu primera transacción para comenzar</p>
      </div>`;const g=A=>{if(A.cuentaId){const I=v.find(C=>C.id===A.cuentaId);if(I){const C=i.find(j=>j.id===I.bancoId);return C?{id:C.id,nombre:C.nombre}:{id:"sin-banco",nombre:"Sin banco asignado"}}}if(A.tarjetaId){const I=u.find(C=>C.id===A.tarjetaId);if(I&&I.bancoId){const C=i.find(j=>j.id===I.bancoId);return C?{id:C.id,nombre:C.nombre}:{id:"sin-banco",nombre:"Sin banco asignado"}}if(I)return{id:`card-${I.id}`,nombre:`Tarjeta: ${I.nombre}`}}return{id:"sin-banco",nombre:"Sin banco asignado"}},b={};n.forEach(A=>{const I=g(A);b[I.id]||(b[I.id]={nombre:I.nombre,txs:[]}),b[I.id].txs.push(A)});const x=["#6366f1","#0ea5e9","#10b981","#f59e0b","#ec4899","#8b5cf6","#ef4444","#14b8a6"];let $=0;return Object.entries(b).map(([A,I])=>{const C=I.txs.filter(k=>k.tipo==="ingreso").reduce((k,L)=>k+(parseFloat(L.monto)||0),0),j=I.txs.filter(k=>k.tipo==="gasto").reduce((k,L)=>k+(parseFloat(L.monto)||0),0),S=C-j,q=x[$++%x.length];return`
        <div style="margin-bottom:24px; border-radius:16px; overflow:hidden; border:1px solid var(--border-color); box-shadow:var(--shadow-sm)">
          <!-- Bank Header -->
          <div style="background:linear-gradient(135deg,${q}22,${q}11); border-bottom:1px solid ${q}33; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:${q}22;border:2px solid ${q}55;display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏦</div>
              <div>
                <div style="font-weight:700;font-size:1rem;color:${q}">${I.nombre}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${I.txs.length} transacción${I.txs.length!==1?"es":""}</div>
              </div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap">
              ${C>0?`<div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Ingresos</div><div style="font-weight:700;color:var(--color-income);font-size:0.95rem">+${w(C)}</div></div>`:""}
              ${j>0?`<div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Gastos</div><div style="font-weight:700;color:var(--color-expense);font-size:0.95rem">-${w(j)}</div></div>`:""}
              <div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-muted)">Balance</div><div style="font-weight:700;color:${S>=0?"var(--color-income)":"var(--color-expense)"};font-size:0.95rem">${S>=0?"+":""}${w(Math.abs(S))}</div></div>
            </div>
          </div>
          <!-- Transactions Table -->
          <div style="background:var(--bg-card)">
            <table class="data-table" style="margin:0">
              <thead><tr>
                <th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Fecha</th>
                <th class="right">Monto</th><th class="right">Acciones</th>
              </tr></thead>
              <tbody>${I.txs.map(k=>d(k)).join("")}</tbody>
            </table>
          </div>
        </div>`}).join("")}function d(n){const i=ge(n.categoriaId),v=n.cuentaId?m.getById("accounts",n.cuentaId):null,u=n.tarjetaId?m.getById("cards",n.tarjetaId):null,g=n.tipo==="ingreso",b=n.tipo==="transferencia",x=n.estado==="hold",$={personal:"👤",cliente:"🏢",salario:"💼",prestamo:"🏦",otro:"📦"},A=g&&n.tipoIngreso&&$[n.tipoIngreso]||"";return`
      <tr style="${x?"background:rgba(245,158,11,0.05);":""}">
        <td>
          <div class="cell-with-icon">
            <div class="cell-icon" style="background:${x?"rgba(245,158,11,0.15)":g?"var(--color-income-bg)":b?"var(--color-info-bg)":"var(--color-expense-bg)"};color:${x?"#f59e0b":g?"var(--color-income)":b?"var(--color-info)":"var(--color-expense)"}">
              ${x?"⏳":f(g?"arrowDown":b?"transaction":"arrowUp",16)}
            </div>
            <div>
              <div class="cell-primary">${n.descripcion} ${A}
                ${x?'<span style="background:#f59e0b;color:#000;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:3px;margin-left:5px;letter-spacing:0.5px">HOLD</span>':""}
                ${n.source==="ai-agent"?'<span style="font-size:0.65rem;color:var(--text-muted);margin-left:4px">🤖 IA</span>':""}
              </div>
              ${x?'<div style="font-size:0.71rem;color:#f59e0b;margin-top:2px">⚠️ Sin cuenta — no afecta tu balance hasta asignar una</div>':""}
              ${n.notas&&!x?`<div class="cell-secondary">${n.notas.substring(0,40)}${n.notas.length>40?"...":""}</div>`:""}
            </div>
          </div>
        </td>
        <td>${i?`<span class="badge badge-neutral">${i.icono} ${i.nombre}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${x?'<span style="color:#f59e0b">Sin cuenta ⏳</span>':u?"💳 "+u.nombre:(v==null?void 0:v.nombre)||"—"}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary)">${B(n.fecha)}</td>
        <td class="right" style="font-weight:700;color:${x?"#f59e0b":g?"var(--color-income)":b?"inherit":"var(--color-expense)"}">
          ${x?"~":""}${g?"+":b?"":"-"}${w(n.monto)}
          ${x?'<br><span style="font-size:0.65rem;font-weight:400;opacity:0.8">pendiente</span>':""}
        </td>
        <td class="cell-actions">
          <button class="cell-action-btn" data-edit-tx="${n.id}" title="Editar">${f("edit",16)}</button>
          <button class="cell-action-btn danger" data-del-tx="${n.id}" title="Eliminar">${f("trash",16)}</button>
        </td>
      </tr>`}function r(n=null){const i=D(n?"Editar Transacción":"Nueva Transacción",na(n),{width:"560px"}),v=i.querySelectorAll("#tx-type-tabs .tab");v.forEach(b=>{b.addEventListener("click",()=>{v.forEach(C=>C.classList.remove("active")),b.classList.add("active");const x=b.dataset.tipo;i.querySelector("#tx-tipo").value=x;const $=i.querySelector("#tx-category"),A=$.value;$.innerHTML=`<option value="">Seleccionar categoría</option>${ue(x)}`,$.value=A,i.querySelector("#tx-card-group").style.display=x==="gasto"?"block":"none",i.querySelector("#tx-dest-group").style.display=x==="transferencia"?"block":"none",i.querySelector("#tx-diezmo-group").style.display=x!=="gasto"?"block":"none",i.querySelector("#tx-income-type-group").style.display=x==="ingreso"?"block":"none";const I=i.querySelector("#tx-diezmo");n||(I.checked=x==="ingreso"),i.querySelector("#tx-account-label").textContent=x==="transferencia"?"Cuenta Origen":'Cuenta Origen <span class="required">*</span>'})});const u=i.querySelector("#tx-card"),g=i.querySelector("#tx-account");u==null||u.addEventListener("change",()=>{g.required=!u.value}),i.querySelectorAll(".income-type-chip").forEach(b=>{b.addEventListener("click",()=>{var I;i.querySelectorAll(".income-type-chip").forEach(C=>{C.classList.remove("btn-primary"),C.classList.add("btn-secondary")}),b.classList.remove("btn-secondary"),b.classList.add("btn-primary");const x=b.dataset.incomeType;i.querySelector("#tx-income-type").value=x;const $=i.querySelector("#income-type-hint"),A=i.querySelector("#tx-diezmo");x==="prestamo"?($.innerHTML="⚠️ Los préstamos recibidos <strong>no cuentan</strong> para el cálculo del 10%.",A&&(A.checked=!1)):x==="cliente"?($.innerHTML='🏢 Ingreso de cliente. Se asociará al campo "Cliente" si lo rellenas.',(I=i.querySelector("#tx-client"))==null||I.focus()):($.innerHTML="ℹ️ Este ingreso se sumará a la base del 10% según la opción marcada abajo.",A&&!n&&(A.checked=!0))})}),n!=null&&n.categoriaId&&setTimeout(()=>{i.querySelector("#tx-category").value=n.categoriaId},0),i.querySelector("#tx-form").addEventListener("submit",b=>{var C,j,S,q,k;b.preventDefault();const x=i.querySelector("#tx-tipo").value,$=parseFloat(i.querySelector("#tx-amount").value)||0,A=x==="ingreso"?((C=i.querySelector("#tx-income-type"))==null?void 0:C.value)||"personal":null,I={tipo:x,monto:$,tipoIngreso:A,descripcion:i.querySelector("#tx-desc").value.trim(),clienteAsociado:((j=i.querySelector("#tx-client"))==null?void 0:j.value.trim())||null,categoriaId:i.querySelector("#tx-category").value,cuentaId:i.querySelector("#tx-account").value,tarjetaId:((S=i.querySelector("#tx-card"))==null?void 0:S.value)||"",cuentaDestinoId:((q=i.querySelector("#tx-dest"))==null?void 0:q.value)||"",fecha:i.querySelector("#tx-date").value,notas:i.querySelector("#tx-notes").value.trim(),aplicaDiezmo:A==="prestamo"?!1:((k=i.querySelector("#tx-diezmo"))==null?void 0:k.checked)||!1};if($<=0){h("error","El monto debe ser mayor a 0");return}if(!I.cuentaId&&!I.tarjetaId){h("error","Selecciona una cuenta o tarjeta");return}if(x==="transferencia"&&!I.cuentaDestinoId){h("error","Selecciona la cuenta destino");return}if(n){if(n.tarjetaId&&n.tipo==="gasto"){const L=m.getById("cards",n.tarjetaId);L&&m.update("cards",n.tarjetaId,{saldoUsado:Math.max(0,L.saldoUsado-n.monto)})}m.update("transactions",n.id,I)}else m.add("transactions",{...I,id:P()});if(I.tarjetaId&&x==="gasto"){const L=m.getById("cards",I.tarjetaId);L&&m.update("cards",I.tarjetaId,{saldoUsado:(L.saldoUsado||0)+$})}h("success",n?"Transacción actualizada":"Transacción registrada"),z(),a()})}return a(),e}function la(){const e=R(),t=m.getAll("subscriptions").filter(l=>l.estado==="activa"),o=m.getAll("subscription_charges");t.forEach(l=>{!l.proximoCobro||l.proximoCobro>e||o.some(a=>a.suscripcionId===l.id&&!a.confirmado&&a.fechaProgramada===l.proximoCobro)||m.add("subscription_charges",{id:P(),suscripcionId:l.id,fechaProgramada:l.proximoCobro,fechaConfirmada:null,confirmado:!1,monto:l.monto,cuentaId:l.cuentaId||null,tarjetaId:l.tarjetaId||null})})}function Oe(e,t){const o=m.getAll("banks");if(e){const l=m.getById("accounts",e);if(l){const s=o.find(a=>a.id===l.bancoId);return`🏦 ${s!=null&&s.nombre?s.nombre+" — ":""}${l.nombre}`}}if(t){const l=m.getById("cards",t);if(l)return`💳 ${l.nombre}`}return"⚠️ Sin cuenta asignada"}function ca(e=null){const t=m.getAll("accounts"),o=m.getAll("cards"),l=m.getAll("banks");let s="";return e!=null&&e.cuentaId?s=`account:${e.cuentaId}`:e!=null&&e.tarjetaId&&(s=`card:${e.tarjetaId}`),`
    <form id="sub-form">
      <div class="form-group">
        <label class="form-label">Nombre del Servicio <span class="required">*</span></label>
        <input type="text" class="form-input" id="sub-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Netflix, Spotify, Internet..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="sub-amount" value="${(e==null?void 0:e.monto)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Frecuencia</label>
          <select class="form-select" id="sub-freq">
            <option value="mensual" ${(e==null?void 0:e.frecuencia)==="mensual"?"selected":""}>Mensual</option>
            <option value="anual" ${(e==null?void 0:e.frecuencia)==="anual"?"selected":""}>Anual</option>
            <option value="semanal" ${(e==null?void 0:e.frecuencia)==="semanal"?"selected":""}>Semanal</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Día de Cobro</label>
          <input type="number" class="form-input" id="sub-day" value="${(e==null?void 0:e.diaCobro)||1}" min="1" max="31" />
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-select" id="sub-cat">
            <option value="cat_subscriptions">🔄 Suscripciones</option>
            ${ue("gasto")}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">💳 Cuenta / Tarjeta de cobro <span class="required">*</span></label>
        <select class="form-select" id="sub-source" required>
          <option value="">— Seleccionar —</option>
          <optgroup label="🏦 Cuentas Bancarias">
            ${t.map(a=>{const c=l.find(p=>p.id===a.bancoId);return`<option value="account:${a.id}" ${s===`account:${a.id}`?"selected":""}>${c!=null&&c.nombre?c.nombre+" — ":""}${a.nombre}</option>`}).join("")}
          </optgroup>
          <optgroup label="💳 Tarjetas de Crédito">
            ${o.map(a=>`<option value="card:${a.id}" ${s===`card:${a.id}`?"selected":""}>${a.nombre}</option>`).join("")}
          </optgroup>
        </select>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Al confirmar el cobro, se descontará de esta cuenta automáticamente.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Próximo Cobro</label>
        <input type="date" class="form-input" id="sub-next" value="${(e==null?void 0:e.proximoCobro)||""}" />
      </div>
      <div class="form-group">
        <label class="form-label">Notas / Observaciones</label>
        <textarea class="form-textarea" id="sub-notes" placeholder="Ej: Cuenta compartida con 3 amigos...">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Crear"}</button>
      </div>
    </form>
  `}function da(){const e=document.createElement("div");e.className="page-content animate-fade-in",la();const t=()=>{var d;const l=m.getAll("subscriptions"),a=m.getAll("subscription_charges").filter(r=>!r.confirmado);if(l.length===0){e.innerHTML="",e.appendChild(V("subscription","Sin suscripciones","Agrega tus servicios recurrentes como Netflix, Spotify, Internet, etc.","Agregar Suscripción",()=>o()));return}const c=l.filter(r=>r.estado==="activa"&&r.frecuencia==="mensual").reduce((r,n)=>r+(parseFloat(n.monto)||0),0),p=a.length>0?`
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.06));border:1px solid rgba(245,158,11,0.4);border-radius:16px;padding:20px;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span style="font-size:1.4rem">🔔</span>
          <div>
            <div style="font-weight:700;font-size:1rem;color:#f59e0b">${a.length} cobro${a.length>1?"s":""} pendiente${a.length>1?"s":""} de confirmación</div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">Revisa y confirma cada cobro para registrarlo en tu balance</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${a.map(r=>{const n=m.getById("subscriptions",r.suscripcionId);if(!n)return"";const i=Oe(r.cuentaId||n.cuentaId,r.tarjetaId||n.tarjetaId),v=R(),u=r.fechaProgramada<v,g=r.fechaProgramada===v;return`
              <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border:1px solid ${u?"rgba(239,68,68,0.3)":g?"rgba(245,158,11,0.3)":"var(--border-color)"}">
                <div style="width:40px;height:40px;border-radius:50%;background:${u?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)"};display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
                  ${u?"⚠️":"🔔"}
                </div>
                <div style="flex:1;min-width:160px">
                  <div style="font-weight:600;font-size:0.95rem">${n.nombre}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${i}</div>
                  <div style="font-size:0.75rem;color:${u?"var(--color-expense)":g?"#f59e0b":"var(--text-muted)"};margin-top:2px">
                    ${u?`⚠️ Vencido: ${B(r.fechaProgramada)}`:g?"📅 Vence hoy":`Fecha: ${B(r.fechaProgramada)}`}
                  </div>
                </div>
                <div style="font-weight:700;font-size:1.1rem;color:var(--color-expense);flex-shrink:0">-${w(r.monto)}</div>
                <div style="display:flex;gap:8px;flex-shrink:0">
                  <button class="btn btn-primary btn-sm" data-confirm-charge="${r.id}" style="gap:4px">
                    ${f("check",14)} Confirmar cobro
                  </button>
                  <button class="btn btn-ghost btn-sm" data-skip-charge="${r.id}" title="Omitir este cobro">
                    ${f("close",14)}
                  </button>
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    `:"";e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Suscripciones</h1>
          <p>${l.length} servicio${l.length!==1?"s":""} • Gasto mensual: ${w(c)}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-sub-btn">${f("plus",18)} Nueva Suscripción</button>
        </div>
      </div>

      ${p}

      <div class="grid grid-auto stagger-children">
        ${l.map(r=>{const n=r.estado==="activa",i=r.proximoCobro?K(r.proximoCobro):null,v=Oe(r.cuentaId,r.tarjetaId),u=a.some(g=>g.suscripcionId===r.id);return`
            <div class="card ${n?"":"opacity-60"}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                <div>
                  <h4 style="margin-bottom:4px">${r.nombre}</h4>
                  <span class="badge ${n?"badge-success":r.estado==="pausada"?"badge-warning":"badge-danger"}">${r.estado}</span>
                  ${u?'<span class="badge badge-warning" style="margin-left:4px">🔔 Cobro pendiente</span>':""}
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-edit-sub="${r.id}" title="Editar">${f("edit",16)}</button>
                  <button class="btn-icon" data-del-sub="${r.id}" title="Eliminar">${f("trash",16)}</button>
                </div>
              </div>

              <div style="font-size:1.35rem;font-weight:700;font-family:var(--font-heading);margin-bottom:8px">
                ${w(r.monto)}<span style="font-size:0.75rem;color:var(--text-muted);font-weight:400">/${r.frecuencia}</span>
              </div>

              <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">${v}</div>

              ${r.proximoCobro?`
                <div style="font-size:0.8rem;color:${i!==null&&i<=0?"var(--color-expense)":i!==null&&i<=3?"var(--color-warning)":"var(--text-secondary)"}">
                  ${i===0?"📅 Vence hoy":i!==null&&i<0?`⚠️ Vencido hace ${Math.abs(i)} días`:`Próximo cobro: ${B(r.proximoCobro)} ${i!==null?`(en ${i} días)`:""}`}
                </div>
              `:'<div style="font-size:0.8rem;color:var(--text-muted)">Sin fecha de próximo cobro</div>'}

              <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
                ${n?`<button class="btn btn-ghost btn-sm" data-pause-sub="${r.id}">Pausar</button>`:""}
                ${r.estado==="pausada"?`<button class="btn btn-ghost btn-sm" data-activate-sub="${r.id}">Activar</button>`:""}
                ${n&&!u?`<button class="btn btn-secondary btn-sm" data-generate-charge="${r.id}">${f("check",14)} Registrar cobro</button>`:""}
              </div>
            </div>
          `}).join("")}
      </div>
    `,(d=e.querySelector("#add-sub-btn"))==null||d.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit-sub]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("subscriptions",r.dataset.editSub);n&&o(n)})),e.querySelectorAll("[data-del-sub]").forEach(r=>r.addEventListener("click",async()=>{await _("¿Eliminar suscripción?","Se eliminará este servicio recurrente y sus cobros pendientes.")&&(m.getAll("subscription_charges").filter(i=>i.suscripcionId===r.dataset.delSub).forEach(i=>m.remove("subscription_charges",i.id)),m.remove("subscriptions",r.dataset.delSub),h("success","Suscripción eliminada"),t())})),e.querySelectorAll("[data-pause-sub]").forEach(r=>r.addEventListener("click",()=>{m.update("subscriptions",r.dataset.pauseSub,{estado:"pausada"}),h("info","Suscripción pausada"),t()})),e.querySelectorAll("[data-activate-sub]").forEach(r=>r.addEventListener("click",()=>{m.update("subscriptions",r.dataset.activateSub,{estado:"activa"}),h("success","Suscripción activada"),t()})),e.querySelectorAll("[data-generate-charge]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("subscriptions",r.dataset.generateCharge);if(n){if(!n.cuentaId&&!n.tarjetaId){h("error","Sin cuenta asignada","Edita la suscripción y asigna una cuenta o tarjeta primero");return}m.add("subscription_charges",{id:P(),suscripcionId:n.id,fechaProgramada:R(),fechaConfirmada:null,confirmado:!1,monto:n.monto,cuentaId:n.cuentaId||null,tarjetaId:n.tarjetaId||null}),h("info","Cobro generado",`Confirma manualmente el cobro de ${n.nombre}`),t()}})),e.querySelectorAll("[data-confirm-charge]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("subscription_charges",r.dataset.confirmCharge);if(!n)return;const i=m.getById("subscriptions",n.suscripcionId);if(!i)return;const v=n.cuentaId||i.cuentaId||null,u=n.tarjetaId||i.tarjetaId||null;if(!v&&!u){h("error","Sin cuenta asignada","Edita la suscripción y asigna una cuenta o tarjeta primero");return}if(m.update("subscription_charges",n.id,{confirmado:!0,fechaConfirmada:R()}),m.add("transactions",{id:P(),tipo:"gasto",monto:n.monto,descripcion:`Suscripción: ${i.nombre}`,categoriaId:i.categoriaId||"cat_subscriptions",cuentaId:v||"",tarjetaId:u||"",fecha:R(),notas:`Cobro confirmado de suscripción ${i.frecuencia}`,estado:"activo"}),u){const $=m.getById("cards",u);$&&m.update("cards",u,{saldoUsado:($.saldoUsado||0)+parseFloat(n.monto)})}const g=new Date(i.proximoCobro||n.fechaProgramada);i.frecuencia==="mensual"?g.setMonth(g.getMonth()+1):i.frecuencia==="anual"?g.setFullYear(g.getFullYear()+1):i.frecuencia==="semanal"&&g.setDate(g.getDate()+7);const b=g.getTimezoneOffset()*6e4,x=new Date(g.getTime()-b).toISOString().split("T")[0];m.update("subscriptions",i.id,{proximoCobro:x}),h("success","✅ Cobro confirmado",`${i.nombre} — ${w(n.monto)} descontado`),t()})),e.querySelectorAll("[data-skip-charge]").forEach(r=>r.addEventListener("click",async()=>{await _("¿Omitir este cobro?","No se registrará como transacción. La fecha del próximo cobro no avanzará.")&&(m.remove("subscription_charges",r.dataset.skipCharge),h("info","Cobro omitido"),t())}))};function o(l=null){const s=D(l?"Editar Suscripción":"Nueva Suscripción",ca(l));l!=null&&l.categoriaId&&setTimeout(()=>{s.querySelector("#sub-cat").value=l.categoriaId},0),s.querySelector("#sub-form").addEventListener("submit",a=>{a.preventDefault();const c=s.querySelector("#sub-source").value;if(!c){h("error","Selecciona una cuenta o tarjeta");return}let p="",d="";c.startsWith("account:")&&(p=c.split(":")[1]),c.startsWith("card:")&&(d=c.split(":")[1]);const r={nombre:s.querySelector("#sub-name").value.trim(),monto:parseFloat(s.querySelector("#sub-amount").value)||0,frecuencia:s.querySelector("#sub-freq").value,diaCobro:parseInt(s.querySelector("#sub-day").value)||1,categoriaId:s.querySelector("#sub-cat").value,cuentaId:p,tarjetaId:d,proximoCobro:s.querySelector("#sub-next").value,notas:s.querySelector("#sub-notes").value.trim(),activa:!0,estado:(l==null?void 0:l.estado)||"activa"};l?(m.update("subscriptions",l.id,r),h("success","Suscripción actualizada")):(m.add("subscriptions",{...r,id:P()}),h("success","Suscripción creada")),z(),t()})}return t(),e}function mt(){const e=m.getAll("accounts").filter(o=>o.activa!==!1),t=m.getAll("banks");return e.map(o=>{const l=t.find(s=>s.id===o.bancoId);return`<option value="account:${o.id}">${l!=null&&l.nombre?l.nombre+" — ":""}${o.nombre}</option>`}).join("")}function vt(){return m.getAll("cards").filter(e=>e.activa!==!1).map(e=>`<option value="card:${e.id}">💳 ${e.nombre}</option>`).join("")}function gt(){return m.getAll("external_cards").filter(e=>e.activa!==!1).map(e=>`<option value="extcard:${e.id}">🌐 ${e.nombre} (${e.banco})</option>`).join("")}function re(e){if(e.montoTotal!==void 0)return e;const t=(parseFloat(e.monto)||0)*(parseInt(e.cantidadVeces)||1),o=(parseFloat(e.monto)||0)*(parseInt(e.vecesPagadas)||0);return{...e,descripcion:e.nombre||e.descripcion||"Deuda",acreedor:e.colaborador||e.acreedor||"",montoTotal:t,saldoPendiente:Math.max(0,t-o),montoPagado:o}}function pa(e=null){const t=e?re(e):null;return`
    <form id="debt-form">
      <div class="form-group">
        <label class="form-label">Descripción / Concepto <span class="required">*</span></label>
        <input type="text" class="form-input" id="debt-desc" value="${(t==null?void 0:t.descripcion)||""}"
          placeholder="Ej: Préstamo personal, Factura pendiente..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Acreedor (a quién le debes) <span class="required">*</span></label>
        <input type="text" class="form-input" id="debt-acreedor" value="${(t==null?void 0:t.acreedor)||""}"
          placeholder="Ej: Banco Popular, Juan Pérez..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto Total <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="debt-total" value="${(t==null?void 0:t.montoTotal)||""}"
              step="0.01" min="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Vencimiento</label>
          <input type="date" class="form-input" id="debt-due" value="${(t==null?void 0:t.fechaVencimiento)||""}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cuenta preferida para pagar (opcional)</label>
        <select class="form-select" id="debt-account">
          <option value="">— Sin preferencia —</option>
          <optgroup label="🏦 Cuentas">${mt()}</optgroup>
          <optgroup label="💳 Tarjetas">${vt()}</optgroup>
          <optgroup label="🌐 Tarjetas Externas">${gt()}</optgroup>
        </select>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
          Esta cuenta se pre-seleccionará al registrar un pago.
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="debt-notes" placeholder="Condiciones, tasa de interés, etc.">${(t==null?void 0:t.notas)||""}</textarea>
      </div>
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">
        ℹ️ <strong>Esta deuda NO descontará nada de tus cuentas.</strong> Solo se registrará como un compromiso pendiente. El balance se afecta únicamente cuando realices un pago real.
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar Cambios":"Registrar Deuda"}</button>
      </div>
    </form>
  `}function ua(e){const t=re(e);return t.cuentaId?`${t.cuentaId}`:t.tarjetaId&&`${t.tarjetaId}`,`
    <form id="pay-form">
      <div style="background:var(--bg-input);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
        <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px">Saldo pendiente con ${t.acreedor}</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--color-expense);font-family:var(--font-heading)">${w(t.saldoPendiente)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">${t.descripcion}</div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto a pagar <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-amount" value="${t.saldoPendiente}"
              step="0.01" min="0.01" max="${t.saldoPendiente}" required />
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
            Pago parcial o total (máx: ${w(t.saldoPendiente)})
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha del pago</label>
          <input type="date" class="form-input" id="pay-date" value="${R()}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Descontar de <span class="required">*</span></label>
        <select class="form-select" id="pay-source" required>
          <option value="">— Selecciona cuenta —</option>
          <optgroup label="🏦 Cuentas Bancarias">${mt()}</optgroup>
          <optgroup label="💳 Tarjetas">${vt()}</optgroup>
          <optgroup label="🌐 Tarjetas Externas">${gt()}</optgroup>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        <select class="form-select" id="pay-cat">
          <option value="cat_debt_payment">💸 Pago de Deuda</option>
          ${ue("gasto")}
        </select>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-success">${f("check",18)} Registrar Pago</button>
      </div>
    </form>
  `}function ma(e=null){return`
    <form id="template-form">
      <div class="form-group">
        <label class="form-label">Nombre de la Plantilla <span class="required">*</span></label>
        <input type="text" class="form-input" id="tpl-name" value="${(e==null?void 0:e.nombre)||""}"
          placeholder="Ej: Asistencia Scarlet, Pago Editor..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Colaborador / Acreedor <span class="required">*</span></label>
        <input type="text" class="form-input" id="tpl-acreedor" value="${(e==null?void 0:e.acreedor)||(e==null?void 0:e.colaborador)||""}"
          placeholder="Ej: Scarlet, Juan Pérez..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto por pago <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="tpl-amount" value="${(e==null?void 0:e.monto)||""}"
              step="0.01" min="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Veces a pagar</label>
          <input type="number" class="form-input" id="tpl-count" value="${(e==null?void 0:e.cantidadVeces)||1}" min="1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frecuencia estimada</label>
        <select class="form-select" id="tpl-freq">
          <option value="unico" ${(e==null?void 0:e.frecuencia)==="unico"?"selected":""}>Único</option>
          <option value="semanal" ${(e==null?void 0:e.frecuencia)==="semanal"?"selected":""}>Semanal</option>
          <option value="quincenal" ${(e==null?void 0:e.frecuencia)==="quincenal"?"selected":""}>Quincenal</option>
          <option value="mensual" ${(e==null?void 0:e.frecuencia)==="mensual"?"selected":""}>Mensual</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notas / Instrucciones</label>
        <textarea class="form-textarea" id="tpl-notes" placeholder="Detalles recurrentes...">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Actualizar Plantilla":"Guardar Plantilla"}</button>
      </div>
    </form>
  `}function va(){const e=document.createElement("div");e.className="page-content animate-fade-in";let t="activas";const o=()=>{const i=m.getAll("debts").map(re),v=m.getAll("debt_templates");e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Deudas y Compromisos</h1>
          <p>Gestiona tus deudas y crea plantillas para colaboradores recurrentes.</p>
        </div>
        <div class="page-header-actions" style="display:flex; gap:10px">
          <button class="btn btn-secondary" id="add-tpl-btn">${f("plus",18)} Nueva Plantilla</button>
          <button class="btn btn-primary" id="add-debt-btn">${f("plus",18)} Registrar Deuda</button>
        </div>
      </div>

      <!-- Tabs Switcher -->
      <div class="tabs-switcher" style="margin-bottom:24px; display:flex; gap:24px; border-bottom:1px solid var(--border-color); padding-bottom:0">
        <button class="tab-btn ${t==="activas"?"active":""}" data-tab="activas" 
          style="background:none; border:none; padding:12px 4px; font-weight:600; font-size:0.9rem; color:${t==="activas"?"var(--accent-primary)":"var(--text-muted)"}; border-bottom:2px solid ${t==="activas"?"var(--accent-primary)":"transparent"}; cursor:pointer; transition:all 0.2s">
          Compromisos Activos
        </button>
        <button class="tab-btn ${t==="plantillas"?"active":""}" data-tab="plantillas" 
          style="background:none; border:none; padding:12px 4px; font-weight:600; font-size:0.9rem; color:${t==="plantillas"?"var(--accent-primary)":"var(--text-muted)"}; border-bottom:2px solid ${t==="plantillas"?"var(--accent-primary)":"transparent"}; cursor:pointer; transition:all 0.2s">
          Plantillas (Recurrentes)
        </button>
      </div>

      <div id="tab-content-root">
        ${t==="activas"?l(i):s(v)}
      </div>
    `,a()};function l(n){if(n.length===0)return V("debt","Sin compromisos pendientes","Registra préstamos, facturas o cualquier deuda.","Registrar Deuda",()=>d()).outerHTML;const i=n.filter($=>$.estado!=="pagada"),v=i.reduce(($,A)=>$+(parseFloat(A.saldoPendiente)||0),0),u=i.reduce(($,A)=>$+(parseFloat(A.montoTotal)||0),0),g=u>0?Math.round((u-v)/u*100):0,b={};n.forEach($=>{const A=$.acreedor||"Sin acreedor";b[A]||(b[A]=[]),b[A].push($)});const x=R();return`
      <!-- Summary strip -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px">
        <div class="stat-card">
          <div class="stat-icon expense">${f("debt",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Total Pendiente</div>
            <div class="stat-value" style="color:var(--color-expense)">${w(v)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon income">${f("check",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Progreso global</div>
            <div class="stat-value">${g}%</div>
            <div class="progress-bar" style="margin-top:8px"><div class="progress-fill income" style="width:${g}%"></div></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">${f("users",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Acreedores activos</div>
            <div class="stat-value">${Object.keys(b).length}</div>
          </div>
        </div>
      </div>

      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:24px;display:flex;align-items:center;gap:10px">
        ${f("info",16)}
        <span>Las deudas son <strong>informativas</strong>. Tu saldo bancario NO se ve afectado hasta que registres un pago real.</span>
      </div>

      <div class="stagger-children">
        ${Object.entries(b).map(([$,A])=>{const I=A.filter(C=>C.estado!=="pagada").reduce((C,j)=>C+(j.saldoPendiente||0),0);return`
            <div class="card" style="margin-bottom:24px;overflow:hidden;padding:0">
              <div style="background:var(--bg-input);padding:14px 20px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:0.9rem">👤</div>
                  <h3 style="margin:0;font-size:1rem">${$}</h3>
                </div>
                <div style="text-align:right">
                  <div style="font-size:0.75rem;color:var(--text-muted)">Saldo pendiente</div>
                  <div style="font-size:1.1rem;font-weight:700;color:${I>0?"var(--color-expense)":"var(--color-income)"}">
                    ${I>0?w(I):"✅ Saldado"}
                  </div>
                </div>
              </div>
              <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
                ${A.map(C=>{const j=C.estado==="pagada",S=C.montoTotal>0?Math.round(C.montoPagado/C.montoTotal*100):0,q=C.fechaVencimiento&&C.fechaVencimiento<x&&!j;return`
                    <div style="border:1px solid ${q?"rgba(239,68,68,0.35)":"var(--border-color)"};border-radius:12px;padding:14px 16px;background:${j?"var(--bg-body)":"var(--bg-card)"};opacity:${j?"0.7":"1"}">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                        <div style="flex:1">
                          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                            <span style="font-weight:600;font-size:0.95rem">${C.descripcion}${Ye(C)}</span>
                            <span class="badge ${j?"badge-success":q?"badge-danger":"badge-warning"}">
                              ${j?"✅ Pagada":q?"⚠️ Vencida":"⏳ Pendiente"}
                            </span>
                          </div>
                          ${C.fechaVencimiento?`<div style="font-size:0.75rem;color:${q?"var(--color-expense)":"var(--text-muted)"}">Vence: ${B(C.fechaVencimiento)}</div>`:""}
                          ${C.notas?`<div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;background:var(--bg-input);padding:5px 8px;border-radius:6px">${C.notas}</div>`:""}
                          <div style="margin-top:10px">
                            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">
                              <span>Pagado: ${w(C.montoPagado)}</span>
                              <span>Total: ${w(C.montoTotal)}</span>
                            </div>
                            <div class="progress-bar" style="height:6px">
                              <div class="progress-fill income" style="width:${S}%"></div>
                            </div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px">
                              Pendiente: <strong style="color:${C.saldoPendiente>0?"var(--color-expense)":"var(--color-income)"}">${w(C.saldoPendiente)}</strong>
                            </div>
                          </div>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
                          <div style="display:flex;gap:4px">
                            <button class="btn-icon" data-edit-debt="${C.id}">${f("edit",15)}</button>
                            <button class="btn-icon" data-del-debt="${C.id}">${f("trash",15)}</button>
                          </div>
                          ${j?"":`<button class="btn btn-secondary btn-sm" data-pay-debt="${C.id}">${f("check",14)} Registrar Pago</button>`}
                        </div>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            </div>
          `}).join("")}
      </div>
    `}function s(n){if(n.length===0)return V("subscription","Sin plantillas configuradas","Crea plantillas para generar deudas rápidas para asistentes o colaboradores recurrentes.","Nueva Plantilla",()=>c()).outerHTML;const i={};return n.forEach(v=>{const u=v.acreedor||v.colaborador||"General";i[u]||(i[u]=[]),i[u].push(v)}),`
      <div style="background:var(--bg-input); padding:16px; border-radius:12px; margin-bottom:24px; display:flex; gap:12px; align-items:center">
        <div style="font-size:1.4rem">📋</div>
        <div>
          <div style="font-weight:600; font-size:0.95rem">Módulo de Plantillas</div>
          <div style="font-size:0.8rem; color:var(--text-muted)">Selecciona una plantilla para generar una deuda automáticamente sin escribir todo de nuevo.</div>
        </div>
      </div>

      <div class="stagger-children">
        ${Object.entries(i).map(([v,u])=>`
          <div class="card" style="margin-bottom:24px; padding:0; overflow:hidden">
            <div style="background:rgba(99,102,241,0.06); padding:12px 20px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:10px">
              <div style="font-size:1rem">${f("users",16)}</div>
              <h3 style="margin:0; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px">${v}</h3>
            </div>
            <div style="padding:16px; display:flex; flex-direction:column; gap:12px">
              ${u.map(g=>`
                <div class="list-item" style="border:1px solid var(--border-color); border-radius:10px; padding:12px 16px; background:var(--bg-card); display:flex; justify-content:space-between; align-items:center">
                  <div>
                    <div style="font-weight:600">${g.nombre}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:12px; margin-top:4px">
                      <span>${w(g.monto)} × ${g.cantidadVeces}</span>
                      <span>🔄 ${g.frecuencia||"Único"}</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:8px">
                    <button class="btn btn-primary btn-sm" data-use-tpl="${g.id}" style="gap:4px">
                      ${f("play",14)} Usar
                    </button>
                    <button class="btn-icon" data-edit-tpl="${g.id}">${f("edit",16)}</button>
                    <button class="btn-icon" data-del-tpl="${g.id}">${f("trash",16)}</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `}function a(){var n,i;(n=e.querySelector("#add-debt-btn"))==null||n.addEventListener("click",()=>d()),(i=e.querySelector("#add-tpl-btn"))==null||i.addEventListener("click",()=>c()),e.querySelectorAll(".tab-btn").forEach(v=>v.addEventListener("click",()=>{t=v.dataset.tab,o()})),e.querySelectorAll("[data-edit-debt]").forEach(v=>v.addEventListener("click",()=>{const u=m.getById("debts",v.dataset.editDebt);u&&d(u)})),e.querySelectorAll("[data-del-debt]").forEach(v=>v.addEventListener("click",async()=>{await _("¿Eliminar deuda?","Se eliminará el registro.")&&(m.remove("debts",v.dataset.delDebt),h("success","Deuda eliminada"),o())})),e.querySelectorAll("[data-pay-debt]").forEach(v=>v.addEventListener("click",()=>{const u=m.getById("debts",v.dataset.payDebt);u&&r(re(u))})),e.querySelectorAll("[data-edit-tpl]").forEach(v=>v.addEventListener("click",()=>{const u=m.getById("debt_templates",v.dataset.editTpl);u&&c(u)})),e.querySelectorAll("[data-del-tpl]").forEach(v=>v.addEventListener("click",async()=>{await _("¿Eliminar plantilla?","Se borrará la configuración predeterminada.")&&(m.remove("debt_templates",v.dataset.delTpl),h("success","Plantilla eliminada"),o())})),e.querySelectorAll("[data-use-tpl]").forEach(v=>v.addEventListener("click",()=>{const u=m.getById("debt_templates",v.dataset.useTpl);u&&p(u)}))}function c(n=null){const i=D(n?"Editar Plantilla":"Nueva Plantilla",ma(n));i.querySelector("#template-form").addEventListener("submit",v=>{v.preventDefault();const u={nombre:i.querySelector("#tpl-name").value.trim(),acreedor:i.querySelector("#tpl-acreedor").value.trim(),monto:parseFloat(i.querySelector("#tpl-amount").value)||0,cantidadVeces:parseInt(i.querySelector("#tpl-count").value)||1,frecuencia:i.querySelector("#tpl-freq").value,notas:i.querySelector("#tpl-notes").value.trim()};n?(m.update("debt_templates",n.id,u),h("success","Plantilla actualizada")):(m.add("debt_templates",{...u,id:P()}),h("success","Plantilla guardada")),z(),o()})}function p(n){const i=(n.monto||0)*(n.cantidadVeces||1),v={id:P(),descripcion:n.nombre,nombre:n.nombre,acreedor:n.acreedor,colaborador:n.acreedor,montoTotal:i,saldoPendiente:i,montoPagado:0,fechaVencimiento:R(),notas:n.notas||`Generado desde plantilla: ${n.nombre}`,estado:"pendiente",monto:i,cantidadVeces:n.cantidadVeces||1,vecesPagadas:0,templateId:n.id};m.add("debts",v),h("success","🤖 Deuda Generada",`${n.nombre} registrada correctamente.`),t="activas",o()}function d(n=null){const i=D(n?"Editar Deuda":"Registrar Deuda",pa(n));if(n){const v=re(n),u=i.querySelector("#debt-account");u&&(v.cuentaId?u.value=`account:${v.cuentaId}`:v.tarjetaId?u.value=`card:${v.tarjetaId}`:v.tarjetaExternaId&&(u.value=`extcard:${v.tarjetaExternaId}`))}i.querySelector("#debt-form").addEventListener("submit",v=>{v.preventDefault();const u=i.querySelector("#debt-account").value;let g=null,b=null,x=null;u.startsWith("account:")?g=u.split(":")[1]:u.startsWith("card:")?b=u.split(":")[1]:u.startsWith("extcard:")&&(x=u.split(":")[1]);const $=parseFloat(i.querySelector("#debt-total").value)||0,A=n?re(n):null,I={descripcion:i.querySelector("#debt-desc").value.trim(),nombre:i.querySelector("#debt-desc").value.trim(),acreedor:i.querySelector("#debt-acreedor").value.trim(),colaborador:i.querySelector("#debt-acreedor").value.trim(),montoTotal:$,saldoPendiente:n?A.saldoPendiente:$,montoPagado:n?A.montoPagado:0,fechaVencimiento:i.querySelector("#debt-due").value,cuentaId:g,tarjetaId:b,tarjetaExternaId:x,notas:i.querySelector("#debt-notes").value.trim(),estado:"pendiente",monto:$,cantidadVeces:1,vecesPagadas:0};n?(m.update("debts",n.id,I),h("success","Deuda actualizada")):(m.add("debts",{...I,id:P()}),h("info","Deuda registrada","No se descontó nada de tus cuentas")),z(),o()})}function r(n){const i=D("Registrar Pago",ua(n)),v=i.querySelector("#pay-source");v&&(n.cuentaId?v.value=`account:${n.cuentaId}`:n.tarjetaId?v.value=`card:${n.tarjetaId}`:n.tarjetaExternaId&&(v.value=`extcard:${n.tarjetaExternaId}`)),i.querySelector("#pay-form").addEventListener("submit",u=>{u.preventDefault();const g=parseFloat(i.querySelector("#pay-amount").value)||0,b=i.querySelector("#pay-source").value,x=i.querySelector("#pay-cat").value,$=i.querySelector("#pay-date").value||R();if(g<=0){h("error","El monto debe ser mayor a 0");return}if(!b){h("error","Selecciona una cuenta");return}if(g>n.saldoPendiente+.01){h("error","El monto excede el saldo pendiente");return}let A=null,I=null,C=null;if(b.startsWith("account:")?A=b.split(":")[1]:b.startsWith("card:")?I=b.split(":")[1]:b.startsWith("extcard:")&&(C=b.split(":")[1]),m.add("transactions",{id:P(),tipo:"gasto",monto:g,descripcion:`Pago deuda: ${n.descripcion} (${n.acreedor})`,categoriaId:x,cuentaId:A||"",tarjetaId:I||"",tarjetaExternaId:C||"",fecha:$,notas:`Abono a deuda. Saldo anterior: ${w(n.saldoPendiente)}`,estado:"activo"}),I){const q=m.getById("cards",I);q&&m.update("cards",I,{saldoUsado:(q.saldoUsado||0)+g})}if(C){const q=m.getById("external_cards",C);q&&m.update("external_cards",C,{saldoUsado:(parseFloat(q.saldoUsado)||0)+g})}const j=Math.max(0,n.saldoPendiente-g),S=(n.montoPagado||0)+g;m.update("debts",n.id,{saldoPendiente:j,montoPagado:S,estado:j<=0?"pagada":"pendiente",vecesPagadas:j<=0?n.cantidadVeces||1:0}),h("success","✅ Pago registrado",j<=0?`¡Deuda con ${n.acreedor} saldada!`:`Saldo restante: ${w(j)}`),z(),o()})}return o(),e}function ga(e=null){const t=m.getAll("transactions").filter(o=>o.tipo==="gasto");return`
    <form id="recv-form">
      ${e?"":`
      <div class="form-group" style="background:var(--bg-card);padding:12px;border-radius:8px;border:1px solid var(--border-color);margin-bottom:15px">
        <label class="form-label" style="color:var(--accent-primary)">${f("link",14)} Vincular desde una transacción de Gasto (Opcional)</label>
        <select class="form-select" id="recv-link">
          <option value="">No vincular (Ingreso Manual)</option>
          ${t.slice(-15).reverse().map(o=>`<option value="${o.id}" data-monto="${o.monto}" data-fecha="${o.fecha}" data-desc="${o.descripcion}">${B(o.fecha)} - ${o.descripcion} (${w(o.monto)})</option>`).join("")}
        </select>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Si le prestaste dinero y ya lo registraste como un Gasto, vincúlalo aquí.</p>
      </div>`}
      
      <div class="form-group">
        <label class="form-label">Persona (Deudor) <span class="required">*</span></label>
        <input type="text" class="form-input" id="recv-debtor" value="${(e==null?void 0:e.deudor)||""}" placeholder="Ej: Pedro Perez" required />
      </div>
      <div class="form-group">
        <label class="form-label">Concepto / Razón <span class="required">*</span></label>
        <input type="text" class="form-input" id="recv-concept" value="${(e==null?void 0:e.concepto)||""}" placeholder="Ej: Préstamo personal" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto a Cobrar <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="recv-amount" value="${(e==null?void 0:e.monto)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha del Préstamo</label>
          <input type="date" class="form-input" id="recv-date" value="${(e==null?void 0:e.fecha)||R()}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas Opcionales</label>
        <textarea class="form-textarea" id="recv-notes" placeholder="Detalles de este acuerdo...">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar Cambios":"Crear Cuenta por Cobrar"}</button>
      </div>
    </form>
  `}function fa(e){const t=m.getAll("accounts").filter(o=>o.activa!==!1);return`
    <form id="collect-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Por recibir de ${e.deudor}</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-income);font-family:var(--font-heading)">${w(e.monto-(e.montoCobrado||0))}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Monto que te pagaron <span class="required">*</span></label>
        <div class="input-prefix-wrapper">
          <span class="input-prefix">RD$</span>
          <input type="number" class="form-input" id="collect-amount" value="${e.monto-(e.montoCobrado||0)}" step="0.01" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ingresar a la Cuenta Bancaria <span class="required">*</span></label>
        <select class="form-select" id="collect-source" required>
          <option value="">Selecciona dónde cayó el dinero</option>
          ${t.map(o=>`<option value="${o.id}">${o.nombre}</option>`).join("")}
        </select>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Creará un ingreso automático reportando el pago de esta deuda.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Categoría de Ingreso</label>
        <select class="form-select" id="collect-cat" required>
          ${ue("ingreso")}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-success">${f("check",18)} Confirmar Ingreso de Capital</button>
      </div>
    </form>
  `}function ba(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var p;const s=m.getAll("receivables");if(s.length===0){e.innerHTML="",e.appendChild(V("receivable","Sin cuentas por cobrar","Registra deudas y préstamos que oras personas te deban para tener una inyección de capital asegurada.","Registrar Cobro",()=>o()));return}const a=s.filter(d=>d.estado!=="pagada"),c=a.reduce((d,r)=>d+((parseFloat(r.monto)||0)-(parseFloat(r.montoCobrado)||0)),0);e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cuentas por Cobrar</h1>
          <p>${a.length} pendiente${a.length!==1?"s":""} • Activos exigibles</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-recv-btn">${f("plus",18)} Nueva Exigencia</button>
        </div>
      </div>

      <div class="stat-card" style="margin-bottom:28px;border-top:3px solid var(--color-income)">
        <div class="stat-icon income">${f("download",24)}</div>
        <div class="stat-content">
          <div class="stat-label">Total Neto por Recibir</div>
          <div class="stat-value" style="color:var(--color-income)">${w(c)}</div>
        </div>
      </div>

      <div class="stagger-children">
        ${s.map(d=>{const r=(parseFloat(d.monto)||0)-(parseFloat(d.montoCobrado)||0),n=Q(parseFloat(d.montoCobrado)||0,parseFloat(d.monto)||1),i={pendiente:"warning",abonada:"info",pagada:"success"},v=d.estado==="pagada";return`
            <div class="card" style="margin-bottom:12px;${v?"opacity:0.5":""}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <strong style="font-size:1.1rem">${d.deudor}</strong>
                    <span class="badge badge-${i[d.estado]||"neutral"}">${d.estado}</span>
                  </div>
                  <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:10px">${d.concepto} <span style="font-size:0.75rem;padding-left:10px;color:var(--text-muted)">(${B(d.fecha)})</span></div>
                  <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-secondary)">
                    <span>Total: <strong>${w(d.monto)}</strong></span>
                    <span>Recibido: <strong style="color:var(--color-income)">${w(d.montoCobrado||0)}</strong></span>
                    <span>Resta: <strong style="color:var(--color-expense)">${w(r)}</strong></span>
                  </div>
                  ${n>0?`<div class="progress-bar" style="margin-top:8px;height:4px"><div class="progress-fill income" style="width:${n}%"></div></div>`:""}
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;margin-left:16px">
                  <div style="display:flex;gap:4px">
                    <button class="btn-icon" data-edit="${d.id}" title="Editar">${f("edit",16)}</button>
                    <button class="btn-icon" data-del="${d.id}" title="Eliminar">${f("trash",16)}</button>
                  </div>
                  ${v?"":`
                    <button class="btn btn-secondary btn-sm" data-collect="${d.id}" style="border-color:var(--color-income);color:var(--color-income);">
                      ${f("dollarSign",14)} Aplicar Abono / Pago
                    </button>
                  `}
                </div>
              </div>
            </div>
          `}).join("")}
      </div>
    `,(p=e.querySelector("#add-recv-btn"))==null||p.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit]").forEach(d=>d.addEventListener("click",()=>{const r=m.getById("receivables",d.dataset.edit);r&&o(r)})),e.querySelectorAll("[data-del]").forEach(d=>d.addEventListener("click",async()=>{await _("¿Eliminar cuenta por cobrar?","Esto no afectará tu historial de transacciones bancarias, solo el seguimiento.")&&(m.remove("receivables",d.dataset.del),h("success","Eliminada"),t())})),e.querySelectorAll("[data-collect]").forEach(d=>d.addEventListener("click",()=>{const r=m.getById("receivables",d.dataset.collect);r&&l(r)}))};function o(s=null){const a=D(s?"Editar Cuenta por Cobrar":"Nueva Exigencia / Cuenta por Cobrar",ga(s)),c=a.querySelector("#recv-link");c&&c.addEventListener("change",p=>{const d=p.target.options[p.target.selectedIndex];d.value&&(a.querySelector("#recv-amount").value=d.dataset.monto,a.querySelector("#recv-date").value=d.dataset.fecha,a.querySelector("#recv-concept").value=d.dataset.desc,h("info","Datos vinculados","Revisa los campos autocompletados basándonos en tu gasto."))}),a.querySelector("#recv-form").addEventListener("submit",p=>{p.preventDefault();const d=parseFloat(a.querySelector("#recv-amount").value)||0,r=s&&s.montoCobrado||0,n={deudor:a.querySelector("#recv-debtor").value.trim(),concepto:a.querySelector("#recv-concept").value.trim(),monto:d,montoCobrado:r,fecha:a.querySelector("#recv-date").value,notas:a.querySelector("#recv-notes").value.trim(),estado:r>=d?"pagada":r>0?"abonada":"pendiente",transaccionVinculada:c?c.value:(s==null?void 0:s.transaccionVinculada)||null};s?(m.update("receivables",s.id,n),h("success","Actualizada")):(m.add("receivables",{...n,id:P()}),h("success","Cuenta por cobrar registrada")),z(),t()})}function l(s){const a=D(`Recepcionar Ingreso de ${s.deudor}`,fa(s));a.querySelector("#collect-form").addEventListener("submit",c=>{c.preventDefault();const p=parseFloat(a.querySelector("#collect-amount").value)||0,d=a.querySelector("#collect-source").value,r=a.querySelector("#collect-cat").value;if(p<=0||!d){h("error","Faltan datos financieros");return}m.add("transactions",{id:P(),tipo:"ingreso",monto:p,descripcion:`Abono de deuda: ${s.deudor} (${s.concepto})`,categoriaId:r,cuentaId:d,fecha:R(),notas:s.notas});const n=(parseFloat(s.montoCobrado)||0)+p,i=n>=s.monto?"pagada":"abonada";m.update("receivables",s.id,{montoCobrado:n,estado:i}),h("success",i==="pagada"?"¡Deuda cerrada y dinero en cuenta!":"Dinero ingresado exitosamente a tu cuenta",`Se añadieron ${w(p)}`),z(),t()})}return t(),e}function ya(e=null){return`
    <form id="payable-form">
      <div class="form-group">
        <label class="form-label">Beneficiario <span class="required">*</span></label>
        <input type="text" class="form-input" id="pay-beneficiary" value="${(e==null?void 0:e.beneficiario)||""}" placeholder="¿A quién le debes?" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-amount" value="${(e==null?void 0:e.monto)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Límite</label>
          <input type="date" class="form-input" id="pay-deadline" value="${(e==null?void 0:e.fechaLimite)||""}" />
        </div>
      </div>
      ${e?`
        <div class="form-group">
          <label class="form-label">Monto Pagado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-paid" value="${(e==null?void 0:e.montoPagado)||0}" step="0.01" />
          </div>
        </div>
      `:""}
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="pay-notes" placeholder="Detalles adicionales...">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Registrar"}</button>
      </div>
    </form>
  `}function ha(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var n;const s=m.getAll("payables"),a=m.filter("debts",i=>i.estado!=="pagada"),c=[...s.map(i=>({...i,tipoFuente:"payable"})),...a.map(i=>({id:i.id,beneficiario:i.acreedor||i.colaborador||"Deuda",monto:i.montoTotal||i.monto||0,montoPagado:i.montoPagado||0,fechaLimite:i.fechaVencimiento,notas:i.descripcion||i.notas||"",estado:i.estado,tipoFuente:"debt"}))];if(c.length===0){e.innerHTML="",e.appendChild(V("payable","Sin cuentas por pagar","No hay compromisos o deudas pendientes.","Registrar",()=>o()));return}const p=c.filter(i=>i.estado!=="pagada"),d=p.reduce((i,v)=>i+((parseFloat(v.monto)||0)-(parseFloat(v.montoPagado)||0)),0),r=p.filter(i=>se(i.fechaLimite));e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cuentas por Pagar</h1>
          <p>${p.length} pendiente${p.length!==1?"s":""} • Total: ${w(d)} ${r.length>0?`<span style="color:var(--color-expense)">• ${r.length} vencida${r.length!==1?"s":""}</span>`:""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-payable-btn">${f("plus",18)} Nueva Cuenta</button>
        </div>
      </div>

      <div class="stagger-children">
        ${c.map(i=>{const v=(parseFloat(i.monto)||0)-(parseFloat(i.montoPagado)||0),u=Q(parseFloat(i.montoPagado)||0,parseFloat(i.monto)||1),g=i.fechaLimite&&se(i.fechaLimite),b=i.fechaLimite?K(i.fechaLimite):null,x={pendiente:"warning",parcial:"info",pagada:"success",vencida:"danger"},$=i.estado==="pendiente"&&g?"vencida":i.estado;return`
            <div class="card" style="margin-bottom:12px;${$==="pagada"?"opacity:0.5":""}${g?";border-left:3px solid var(--color-expense)":""}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <strong style="font-size:1rem">${i.beneficiario}</strong>
                    <span class="badge badge-${x[$]||"neutral"}">${$}</span>
                    ${b!==null&&b>=0&&b<=5&&!g?`<span style="font-size:0.7rem;color:var(--color-warning)">Vence en ${b} día${b!==1?"s":""}</span>`:""}
                    ${g?`<span style="font-size:0.7rem;color:var(--color-expense)">Venció ${B(i.fechaLimite)}</span>`:""}
                  </div>
                  <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--text-secondary)">
                    <span>Total: <strong>${w(i.monto)}</strong></span>
                    <span>Pagado: <strong style="color:var(--color-income)">${w(i.montoPagado||0)}</strong></span>
                    <span>Resta: <strong style="color:var(--color-expense)">${w(v)}</strong></span>
                    ${i.fechaLimite?`<span>Límite: ${B(i.fechaLimite)}</span>`:""}
                  </div>
                  ${u>0?`<div class="progress-bar" style="margin-top:8px;height:4px"><div class="progress-fill income" style="width:${u}%"></div></div>`:""}
                </div>
                <div style="display:flex;gap:4px;margin-left:16px">
                  ${i.tipoFuente==="debt"?`
                    <button class="btn btn-secondary btn-sm" onclick="location.hash='#/debts'">${f("externalLink",14)} Ver en Deudas</button>
                  `:`
                    ${$!=="pagada"?`<button class="btn btn-success btn-sm" data-pay-item="${i.id}">${f("dollarSign",14)} Pagar</button>`:""}
                    <button class="btn-icon" data-edit="${i.id}">${f("edit",16)}</button>
                    <button class="btn-icon" data-del="${i.id}">${f("trash",16)}</button>
                  `}
                </div>
              </div>
            </div>
          `}).join("")}
      </div>
    `,(n=e.querySelector("#add-payable-btn"))==null||n.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const v=m.getById("payables",i.dataset.edit);v&&o(v)})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{await _("¿Eliminar?","Se eliminará esta cuenta por pagar.")&&(m.remove("payables",i.dataset.del),h("success","Eliminada"),t())})),e.querySelectorAll("[data-pay-item]").forEach(i=>i.addEventListener("click",()=>{const v=m.getById("payables",i.dataset.payItem);v&&l(v)}))};function o(s=null){const a=D(s?"Editar Cuenta por Pagar":"Nueva Cuenta por Pagar",ya(s));a.querySelector("#payable-form").addEventListener("submit",c=>{var n;c.preventDefault();const p=parseFloat(a.querySelector("#pay-amount").value)||0,d=s&&parseFloat((n=a.querySelector("#pay-paid"))==null?void 0:n.value)||0,r={beneficiario:a.querySelector("#pay-beneficiary").value.trim(),monto:p,montoPagado:d,fechaLimite:a.querySelector("#pay-deadline").value,notas:a.querySelector("#pay-notes").value.trim(),estado:d>=p?"pagada":d>0?"parcial":"pendiente"};s?(m.update("payables",s.id,r),h("success","Actualizada")):(m.add("payables",{...r,id:P()}),h("success","Registrada")),z(),t()})}function l(s){const a=(parseFloat(s.monto)||0)-(parseFloat(s.montoPagado)||0),c=D(`Pagar: ${s.beneficiario}`,`
      <form id="pay-item-form">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:0.85rem;color:var(--text-secondary)">Pendiente</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${w(a)}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto a Pagar <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="pay-now" value="${a}" step="0.01" required />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-success">${f("check",18)} Pagar</button>
        </div>
      </form>
    `);c.querySelector("#pay-item-form").addEventListener("submit",p=>{p.preventDefault();const d=parseFloat(c.querySelector("#pay-now").value)||0;if(d<=0){h("error","Monto inválido");return}const r=(parseFloat(s.montoPagado)||0)+d,n=r>=s.monto?"pagada":"parcial";m.update("payables",s.id,{montoPagado:r,estado:n}),h("success",n==="pagada"?"¡Pago completo!":"Pago parcial registrado"),z(),t()})}return t(),e}const xa=["#6c63ff","#00d4aa","#42a5f5","#ff7043","#ab47bc","#ec407a","#ffa726","#26a69a"],$a=["🎯","🏠","✈️","🚗","💻","📱","🎓","💍","🏋️","🎮","👶","🏖️"];function wa(e=null){return`
    <form id="goal-form">
      <div class="form-group">
        <label class="form-label">Nombre de la Meta <span class="required">*</span></label>
        <input type="text" class="form-input" id="goal-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Fondo de emergencia, Vacaciones..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto Objetivo <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="goal-target" value="${(e==null?void 0:e.montoObjetivo)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto Actual</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="goal-current" value="${(e==null?void 0:e.montoActual)||0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha Límite</label>
        <input type="date" class="form-input" id="goal-deadline" value="${(e==null?void 0:e.fechaLimite)||""}" />
      </div>
      <div class="form-group">
        <label class="form-label">Icono</label>
        <div class="color-picker-group" id="goal-icon-picker" style="gap:6px">
          ${$a.map(t=>`<div class="color-option ${(e==null?void 0:e.icono)===t?"selected":""}" data-icon="${t}" style="background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.2rem;border-radius:8px">${t}</div>`).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="goal-color-picker">
          ${xa.map(t=>`<div class="color-option ${(e==null?void 0:e.color)===t?"selected":""}" data-color="${t}" style="background:${t}"></div>`).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notas</label>
        <textarea class="form-textarea" id="goal-notes" placeholder="¿Para qué es esta meta?">${(e==null?void 0:e.notas)||""}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Crear Meta"}</button>
      </div>
    </form>
  `}function Sa(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var r;const s=m.getAll("goals");if(s.length===0){e.innerHTML="",e.appendChild(V("goal","Sin metas financieras","Establece objetivos de ahorro para motivarte a alcanzarlos","Crear Meta",()=>o()));return}const a=s.filter(n=>n.estado==="activa"),c=s.filter(n=>n.estado==="completada"),p=a.reduce((n,i)=>n+(parseFloat(i.montoObjetivo)||0),0),d=a.reduce((n,i)=>n+(parseFloat(i.montoActual)||0),0);e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Metas Financieras</h1>
          <p>${a.length} activa${a.length!==1?"s":""} • ${c.length} completada${c.length!==1?"s":""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-goal-btn">${f("plus",18)} Nueva Meta</button>
        </div>
      </div>

      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card">
          <div class="stat-icon accent">${f("goal",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Objetivo Total</div>
            <div class="stat-value">${w(p)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon income">${f("trendingUp",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Total Ahorrado</div>
            <div class="stat-value">${w(d)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">${f("barChart",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Progreso Global</div>
            <div class="stat-value">${Q(d,p)}%</div>
          </div>
        </div>
      </div>

      <div class="grid grid-auto stagger-children">
        ${s.map(n=>{const i=Q(parseFloat(n.montoActual)||0,parseFloat(n.montoObjetivo)||1),v=(parseFloat(n.montoObjetivo)||0)-(parseFloat(n.montoActual)||0),u=n.estado==="completada",g=n.color||"#6c63ff",b=n.fechaLimite?K(n.fechaLimite):null;return`
            <div class="card " style="position:relative;overflow:hidden;${u?"opacity:0.6":""}">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${g}"></div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div>
                  <h4 style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:1.3rem">${n.icono||"🎯"}</span>
                    ${n.nombre}
                  </h4>
                  ${u?'<span class="badge badge-success">✓ Completada</span>':""}
                </div>
                <div style="display:flex;gap:4px">
                  ${u?"":`<button class="btn btn-success btn-sm" data-contribute="${n.id}">${f("plus",14)} Aportar</button>`}
                  <button class="btn-icon" data-edit="${n.id}">${f("edit",16)}</button>
                  <button class="btn-icon" data-del="${n.id}">${f("trash",16)}</button>
                </div>
              </div>
              <div style="text-align:center;margin-bottom:16px">
                <div style="font-size:2rem;font-weight:800;font-family:var(--font-heading);color:${g}">${i}%</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">${w(n.montoActual||0)} de ${w(n.montoObjetivo)}</div>
              </div>
              <div class="progress-bar" style="margin-bottom:12px;height:10px">
                <div class="progress-fill" style="width:${Math.min(i,100)}%;background:${g}"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary)">
                <span>Faltan ${w(Math.max(0,v))}</span>
                ${b!==null?`<span>${b>=0?`${b} días restantes`:"Plazo vencido"}</span>`:""}
              </div>
            </div>
          `}).join("")}
      </div>
    `,(r=e.querySelector("#add-goal-btn"))==null||r.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const i=m.getById("goals",n.dataset.edit);i&&o(i)})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{await _("¿Eliminar meta?","Se eliminará esta meta y su historial de aportes.")&&(m.filter("goal_contributions",v=>v.metaId===n.dataset.del).forEach(v=>m.remove("goal_contributions",v.id)),m.remove("goals",n.dataset.del),h("success","Meta eliminada"),t())})),e.querySelectorAll("[data-contribute]").forEach(n=>n.addEventListener("click",()=>{const i=m.getById("goals",n.dataset.contribute);i&&l(i)}))};function o(s=null){const a=D(s?"Editar Meta":"Nueva Meta",wa(s));a.querySelectorAll("#goal-icon-picker .color-option").forEach(c=>{c.addEventListener("click",()=>{a.querySelectorAll("#goal-icon-picker .color-option").forEach(p=>p.classList.remove("selected")),c.classList.add("selected")})}),a.querySelectorAll("#goal-color-picker .color-option").forEach(c=>{c.addEventListener("click",()=>{a.querySelectorAll("#goal-color-picker .color-option").forEach(p=>p.classList.remove("selected")),c.classList.add("selected")})}),a.querySelector("#goal-form").addEventListener("submit",c=>{c.preventDefault();const p=parseFloat(a.querySelector("#goal-target").value)||0,d=parseFloat(a.querySelector("#goal-current").value)||0,r=a.querySelector("#goal-icon-picker .selected"),n=a.querySelector("#goal-color-picker .selected"),i={nombre:a.querySelector("#goal-name").value.trim(),montoObjetivo:p,montoActual:d,fechaLimite:a.querySelector("#goal-deadline").value,icono:(r==null?void 0:r.dataset.icon)||"🎯",color:(n==null?void 0:n.dataset.color)||"#6c63ff",notas:a.querySelector("#goal-notes").value.trim(),estado:d>=p?"completada":"activa"};s?(m.update("goals",s.id,i),h("success","Meta actualizada")):(m.add("goals",{...i,id:P()}),h("success","Meta creada")),z(),t()})}function l(s){const a=(parseFloat(s.montoObjetivo)||0)-(parseFloat(s.montoActual)||0),c=D(`Aportar a: ${s.nombre}`,`
      <form id="contribute-form">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:2rem">${s.icono||"🎯"}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">Faltan</div>
          <div style="font-size:1.5rem;font-weight:700;color:${s.color||"var(--accent-primary)"};font-family:var(--font-heading)">${w(a)}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Monto del Aporte <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="contrib-amount" step="0.01" required placeholder="0.00" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-success">${f("check",18)} Aportar</button>
        </div>
      </form>
    `);c.querySelector("#contribute-form").addEventListener("submit",p=>{p.preventDefault();const d=parseFloat(c.querySelector("#contrib-amount").value)||0;if(d<=0){h("error","Monto inválido");return}m.add("goal_contributions",{id:P(),metaId:s.id,monto:d,fecha:R()});const r=(parseFloat(s.montoActual)||0)+d,n=r>=s.montoObjetivo?"completada":"activa";m.update("goals",s.id,{montoActual:r,estado:n}),n==="completada"?h("success","🎉 ¡Meta alcanzada!",`${s.nombre} ha sido completada`):h("success","Aporte registrado"),z(),t()})}return t(),e}function ka(e){return m.filter("transactions",t=>t.tipo==="ingreso"&&(t.aplicaDiezmo===!0||t.categoriaId==="cat_salary"||t.aplicaDiezmo===void 0)&&t.fecha&&t.fecha.startsWith(e))}function Ea(e){return m.filter("tithe_deductions",t=>t.periodo===e)}function Ca(e){return m.find("tithe",t=>t.periodo===e)}function Ia(){const e=[],t=new Date;for(let o=0;o<6;o++){const l=new Date(t.getFullYear(),t.getMonth()-o);e.push(`${l.getFullYear()}-${String(l.getMonth()+1).padStart(2,"0")}`)}return e}function Aa(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var v,u;const o=je();Ia();const l=ka(o),s=l.reduce((g,b)=>g+(parseFloat(b.monto)||0),0),a=Ea(o),c=a.reduce((g,b)=>g+(parseFloat(b.monto)||0),0),p=Math.max(0,s-c),d=p*.1,r=Ca(o),n=r&&parseFloat(r.montoPagado)||0,i=d>0?Q(n,d):0;e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Cálculo del 10% (Base Neta)</h1>
          <p>Supervisa tus ingresos, aplica excepciones y calcula tu separación</p>
        </div>
      </div>

      <!-- Current month Header -->
      <div class="card" style="margin-bottom:24px;border-top:3px solid var(--accent-primary)">
        <div class="card-header">
          <h3 style="display:flex;align-items:center;gap:8px">📅 ${ze(o)} <span class="badge ${i>=100?"badge-success":i>0?"badge-warning":"badge-neutral"}">${i>=100?"Completo":i>0?"Parcial":"Pendiente"}</span></h3>
        </div>
        
        <!-- Metrics -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border-color)">
          <div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">Ingresos Sujetos (Bruto)</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--color-income)">${w(s)}</div>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">Descuentos/Excepciones</div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--color-expense)">- ${w(c)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:6px;border-left:2px solid var(--accent-primary)">
            <div style="font-size:0.8rem;color:var(--accent-primary);margin-bottom:4px">Base Neta para 10%</div>
            <div style="font-size:1.4rem;font-weight:700;color:var(--text-primary)">${w(p)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">10% Calculado</div>
            <div style="font-size:1.5rem;font-weight:700;font-family:var(--font-heading);color:var(--accent-primary)">${w(d)}</div>
          </div>
        </div>

        <!-- Progress Box -->
        <div style="background:var(--bg-input);padding:16px;border-radius:var(--radius-md)">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
            <div>
              <span style="font-size:0.9rem;color:var(--text-secondary)">Aporte Separado: </span>
              <strong style="font-size:1.2rem;color:${i>=100?"var(--color-income)":"var(--color-warning)"}">${w(n)}</strong>
            </div>
            <span style="font-weight:600;font-size:0.9rem">${i}%</span>
          </div>
          
          <div class="progress-bar" style="height:10px;margin-bottom:16px">
            <div class="progress-fill" style="width:${Math.min(i,100)}%;background:${i>=100?"var(--color-income)":"var(--accent-primary)"}"></div>
          </div>
          
          ${i<100?`
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.85rem;color:var(--text-secondary)">Resta separar: <strong>${w(Math.max(0,d-n))}</strong></span>
              <button class="btn btn-primary btn-sm" id="register-tithe-btn">${f("plus",16)} Registrar Aporte</button>
            </div>
          `:'<div style="text-align:center;color:var(--color-income);font-weight:600">✓ Meta del 10% completada para este mes</div>'}
        </div>
      </div>

      <!-- Detail Panels -->
      <div class="grid grid-2" style="gap:24px;margin-bottom:28px;align-items:start">
        
        <!-- Ingresos List -->
        <div class="card">
          <div class="card-header">
            <h3>${f("trendingUp",16)} Ingresos que aplican este mes</h3>
          </div>
          <div style="padding:10px 0">
            ${l.length===0?'<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:10px 0">No hay ingresos aplicables este mes</div>':""}
            ${l.map(g=>`
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);font-size:0.85rem">
                <div>
                  <div style="font-weight:500;margin-bottom:2px">${g.descripcion}</div>
                  <div style="color:var(--text-secondary);font-size:0.75rem">${B(g.fecha)} ${g.categoriaId==="cat_salary"?"• (Salario)":""}</div>
                </div>
                <div style="font-weight:600;color:var(--color-income)">${w(g.monto)}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Deductions List -->
        <div class="card">
          <div class="card-header">
            <h3>${f("minus",16)} Descuentos Manuales</h3>
            <button class="btn btn-secondary btn-sm" id="add-deduct-btn">Agregar</button>
          </div>
          <div style="padding:10px 0">
            ${a.length===0?'<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:10px 0">No hay descuentos aplicados en la base de este mes</div>':""}
            ${a.map(g=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color);font-size:0.85rem">
                <div>
                  <div style="font-weight:500;margin-bottom:2px">${g.descripcion}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-weight:600;color:var(--color-expense)">- ${w(g.monto)}</span>
                  <button class="btn-icon" data-del-deduct="${g.id}">${f("trash",14)}</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

      </div>
    `,(v=e.querySelector("#add-deduct-btn"))==null||v.addEventListener("click",()=>{const g=D("Descontar de la Base",`
        <form id="deduct-form">
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px">Registra montos (ej. Itbis, Gastos operativos directos, Devoluciones) que no deben formar parte de tu cálculo de ganancias netas.</p>
          <div class="form-group">
            <label class="form-label">Razón del descuento <span class="required">*</span></label>
            <input type="text" class="form-input" id="deduct-desc" placeholder="Ej: Pago de impuestos..." required />
          </div>
          <div class="form-group">
            <label class="form-label">Monto a descontar <span class="required">*</span></label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="deduct-amount" step="0.01" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
            <button type="submit" class="btn btn-primary">${f("check",18)} Aplicar Descuento</button>
          </div>
        </form>
      `);g.querySelector("#deduct-form").addEventListener("submit",b=>{b.preventDefault();const x=parseFloat(g.querySelector("#deduct-amount").value)||0,$=g.querySelector("#deduct-desc").value.trim();x>0&&(m.add("tithe_deductions",{id:P(),periodo:o,descripcion:$,monto:x}),h("success","Descuento aplicado a la base neta"),z(),t())})}),e.querySelectorAll("[data-del-deduct]").forEach(g=>g.addEventListener("click",async()=>{await _("¿Eliminar descuento?","Ese monto volverá a sumarse a la base neta de tus ingresos.")&&(m.remove("tithe_deductions",g.dataset.delDeduct),h("info","Descuento eliminado"),t())})),(u=e.querySelector("#register-tithe-btn"))==null||u.addEventListener("click",()=>{const g=Math.max(0,d-n),b=D("Registrar Aporte del 10%",`
        <form id="tithe-form">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:0.85rem;color:var(--text-secondary)">Pendiente neto a separar</div>
            <div style="font-size:1.5rem;font-weight:700;color:var(--accent-primary);font-family:var(--font-heading)">${w(g)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Monto (Abonable) <span class="required">*</span></label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">RD$</span>
              <input type="number" class="form-input" id="tithe-amount" value="${g}" step="0.01" required />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
            <button type="submit" class="btn btn-primary">${f("check",18)} Registrar</button>
          </div>
        </form>
      `);b.querySelector("#tithe-form").addEventListener("submit",x=>{x.preventDefault();const $=parseFloat(b.querySelector("#tithe-amount").value)||0;if($<=0){h("error","Monto inválido");return}if(r){const A=(parseFloat(r.montoPagado)||0)+$;m.update("tithe",r.id,{montoPagado:A,totalIngresos:s,baseNeta:p,montoDiezmo:d,estado:A>=d?"completo":"parcial"})}else m.add("tithe",{id:P(),periodo:o,totalIngresos:s,baseNeta:p,montoDiezmo:d,montoPagado:$,estado:$>=d?"completo":"parcial"});h("success","Aporte registrado exitosamente"),z(),t()})})};return t(),e}function qa(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var s,a;const o=Ze(),l=o.filter(c=>!c.leida).length;e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Notificaciones</h1>
          <p>${l} sin leer de ${o.length} total</p>
        </div>
        <div class="page-header-actions">
          ${l>0?`<button class="btn btn-secondary" id="mark-all-read">${f("check",18)} Marcar todo como leído</button>`:""}
          ${o.length>0?`<button class="btn btn-ghost" id="clear-all">${f("trash",18)} Limpiar</button>`:""}
        </div>
      </div>

      ${o.length>0?`
        <div class="stagger-children">
          ${o.map(c=>{const p={alerta:"alert",advertencia:"alert",info:"info",exito:"checkCircle"},d={alerta:"expense",advertencia:"warning",info:"info",exito:"income"};return`
              <div class="card" style="margin-bottom:8px;${c.leida?"opacity:0.6":"border-left:3px solid var(--accent-primary)"}">
                <div style="display:flex;align-items:flex-start;gap:14px">
                  <div class="stat-icon ${d[c.tipo]||"info"}" style="width:40px;height:40px;flex-shrink:0">
                    ${f(p[c.tipo]||"info",20)}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                      <div>
                        <div style="font-weight:600;font-size:0.9rem;margin-bottom:2px">${c.titulo}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary)">${c.mensaje}</div>
                      </div>
                      <div style="display:flex;gap:4px;flex-shrink:0;margin-left:12px">
                        ${c.leida?"":`<button class="btn-icon" data-read="${c.id}" title="Marcar como leída">${f("check",16)}</button>`}
                        <button class="btn-icon" data-del-notif="${c.id}" title="Eliminar">${f("close",16)}</button>
                      </div>
                    </div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">${We(c.createdAt)}</div>
                    ${c.moduloOrigen?`
                      <div style="margin-top:8px">
                        <button class="btn btn-secondary btn-sm" onclick="location.hash='#/${c.moduloOrigen}'">${f("externalLink",14)} Revisar evento</button>
                      </div>
                    `:""}
                  </div>
                </div>
              </div>
            `}).join("")}
        </div>
      `:`
        <div class="empty-state card">
          ${f("notification",64)}
          <h3>Sin notificaciones</h3>
          <p>Las alertas de pagos, vencimientos y metas aparecerán aquí</p>
        </div>
      `}
    `,(s=e.querySelector("#mark-all-read"))==null||s.addEventListener("click",()=>{jt(),h("info","Todas marcadas como leídas"),t(),de()}),(a=e.querySelector("#clear-all"))==null||a.addEventListener("click",async()=>{await _("¿Limpiar todas?","Se eliminarán todas las notificaciones.")&&(Tt(),h("info","Notificaciones limpiadas"),t(),de())}),e.querySelectorAll("[data-read]").forEach(c=>c.addEventListener("click",()=>{Lt(c.dataset.read),t(),de()})),e.querySelectorAll("[data-del-notif]").forEach(c=>c.addEventListener("click",()=>{zt(c.dataset.delNotif),t(),de()}))};return t(),e}function de(){const e=document.getElementById("notif-badge"),t=Ze(!0).length;e&&(e.textContent=t,e.style.display=t>0?"flex":"none")}const La=["#ff7043","#42a5f5","#66bb6a","#ab47bc","#ffa726","#ec407a","#26a69a","#5c6bc0","#8d6e63","#78909c","#ef5350","#00bcd4"],ja=["💰","💳","🍔","🚗","🏠","🏥","📚","🎮","👕","📱","🔄","📦","💻","✈️","🎁","🧴","📋","❤️","⚡","🎬","🛒","☕","🍕","🎵"];function za(e=null){return`
    <form id="cat-form">
      <div class="form-group">
        <label class="form-label">Nombre <span class="required">*</span></label>
        <input type="text" class="form-input" id="cat-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Nombre de la categoría" required />
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-select" id="cat-type">
          <option value="gasto" ${(e==null?void 0:e.tipo)==="gasto"?"selected":""}>Gasto</option>
          <option value="ingreso" ${(e==null?void 0:e.tipo)==="ingreso"?"selected":""}>Ingreso</option>
          <option value="ambos" ${(e==null?void 0:e.tipo)==="ambos"?"selected":""}>Ambos</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Icono</label>
        <div class="color-picker-group" id="cat-emoji-picker" style="gap:4px">
          ${ja.map(t=>`<div class="color-option ${(e==null?void 0:e.icono)===t?"selected":""}" data-emoji="${t}" style="background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.1rem;border-radius:6px;width:36px;height:36px">${t}</div>`).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker-group" id="cat-color-picker">
          ${La.map(t=>`<div class="color-option ${(e==null?void 0:e.color)===t?"selected":""}" data-color="${t}" style="background:${t}"></div>`).join("")}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Crear"}</button>
      </div>
    </form>
  `}function Ta(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{const s=Qe(),a=s.filter(d=>d.tipo==="ingreso"),c=s.filter(d=>d.tipo==="gasto"),p=s.filter(d=>d.tipo==="ambos");e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Categorías</h1>
          <p>${s.length} categorías (${s.filter(d=>d.esSistema).length} del sistema, ${s.filter(d=>!d.esSistema).length} personalizadas)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-cat-btn">${f("plus",18)} Nueva Categoría</button>
        </div>
      </div>

      ${o("Ingresos",a)}
      ${o("Gastos",c)}
      ${o("Ambos",p)}
    `,e.querySelector("#add-cat-btn").addEventListener("click",()=>l()),e.querySelectorAll("[data-edit-cat]").forEach(d=>d.addEventListener("click",()=>{const r=m.getById("categories",d.dataset.editCat);r&&l(r)})),e.querySelectorAll("[data-del-cat]").forEach(d=>d.addEventListener("click",async()=>{const r=m.getById("categories",d.dataset.delCat);if(r!=null&&r.esSistema){h("warning","No se puede eliminar","Las categorías del sistema no pueden ser eliminadas");return}await _("¿Eliminar categoría?",`"${r==null?void 0:r.nombre}" será eliminada.`)&&(qt(d.dataset.delCat),h("success","Categoría eliminada"),t())}))};function o(s,a){return a.length===0?"":`
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>${s}</h3></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${a.map(c=>`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg-input);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
              <span style="font-size:1.2rem">${c.icono}</span>
              <span style="font-size:0.85rem;font-weight:500">${c.nombre}</span>
              <span style="width:10px;height:10px;border-radius:50%;background:${c.color}"></span>
              ${c.esSistema?'<span class="badge badge-neutral" style="font-size:0.6rem">Sistema</span>':`
                <button class="btn-icon" data-edit-cat="${c.id}" style="width:24px;height:24px">${f("edit",12)}</button>
                <button class="btn-icon" data-del-cat="${c.id}" style="width:24px;height:24px">${f("trash",12)}</button>
              `}
            </div>
          `).join("")}
        </div>
      </div>
    `}function l(s=null){if(s!=null&&s.esSistema){h("warning","Las categorías del sistema no pueden ser editadas");return}const a=D(s?"Editar Categoría":"Nueva Categoría",za(s));a.querySelectorAll("#cat-emoji-picker .color-option").forEach(c=>{c.addEventListener("click",()=>{a.querySelectorAll("#cat-emoji-picker .color-option").forEach(p=>p.classList.remove("selected")),c.classList.add("selected")})}),a.querySelectorAll("#cat-color-picker .color-option").forEach(c=>{c.addEventListener("click",()=>{a.querySelectorAll("#cat-color-picker .color-option").forEach(p=>p.classList.remove("selected")),c.classList.add("selected")})}),a.querySelector("#cat-form").addEventListener("submit",c=>{c.preventDefault();const p=a.querySelector("#cat-emoji-picker .selected"),d=a.querySelector("#cat-color-picker .selected"),r={nombre:a.querySelector("#cat-name").value.trim(),tipo:a.querySelector("#cat-type").value,icono:(p==null?void 0:p.dataset.emoji)||"📦",color:(d==null?void 0:d.dataset.color)||"#bdbdbd"};s?(At(s.id,r),h("success","Categoría actualizada")):(It(r),h("success","Categoría creada")),z(),t()})}return t(),e}const ft=["finanzapp_settings"];function Pa(e){const t={metadata:{version:"1.0",timestamp:new Date().toISOString(),workspaceId:e,model:"FinanzApp_Premium_Backup"},data:{}},o=`finanzapp_${e}_`;for(let d=0;d<localStorage.length;d++){const r=localStorage.key(d);if(r.startsWith(o)){const n=r.replace(o,"");try{t.data[n]=JSON.parse(localStorage.getItem(r))}catch{t.data[n]=localStorage.getItem(r)}}}ft.forEach(d=>{const r=localStorage.getItem(d);if(r)try{t.data[d]=JSON.parse(r)}catch{t.data[d]=r}});const l=JSON.stringify(t,null,2),s=new Blob([l],{type:"application/json"}),a=URL.createObjectURL(s),c=new Date().toISOString().split("T")[0],p=document.createElement("a");return p.href=a,p.download=`finanzapp_backup_${c}.json`,document.body.appendChild(p),p.click(),document.body.removeChild(p),URL.revokeObjectURL(a),!0}async function Da(e){return new Promise((t,o)=>{const l=new FileReader;l.onload=s=>{try{const a=JSON.parse(s.target.result);if(!a.metadata||a.metadata.model!=="FinanzApp_Premium_Backup")return o(new Error("El archivo no es un formato válido de FinanzApp Backup v1.0"));if(!a.data)return o(new Error("El archivo parece estar vacío o corrupto."));const c={};let p=0;for(const[d,r]of Object.entries(a.data))Array.isArray(r)?(c[d]=r.length,p+=r.length):typeof r=="object"&&r!==null?c[d]=Object.keys(r).length:c[d]=1;t({payload:a,summary:c,totalItems:p})}catch{o(new Error("Fallo al interpretar el archivo. Asegúrate de que no esté corrupto."))}},l.onerror=()=>o(new Error("Problema de lectura en el navegador.")),l.readAsText(e)})}function Ma(e,t){if(!t||!t.data)throw new Error("Payload inválido");const o=`finanzapp_${e}_`,l=[];for(let s=0;s<localStorage.length;s++){const a=localStorage.key(s);a.startsWith(o)&&l.push(a)}l.forEach(s=>localStorage.removeItem(s));for(const[s,a]of Object.entries(t.data)){if(ft.includes(s)){localStorage.setItem(s,typeof a=="string"?a:JSON.stringify(a));continue}if(s.includes("users")||s.includes("session")||s.includes("workspaces"))continue;const c=`${o}${s}`;localStorage.setItem(c,typeof a=="string"?a:JSON.stringify(a))}window.location.reload()}const qe="/api/openai/v1/chat/completions",Le="gpt-4o-mini";function Ba(){const e=m.getAll("accounts"),t=m.getAll("banks"),o=m.getAll("cards"),l=m.getAll("external_cards"),s=m.getAll("debts").filter(u=>u.estado!=="pagada"&&!u.paid);m.getAll("payables").filter(u=>u.estado!=="pagada"),m.getAll("subscriptions"),m.getAll("transactions").slice(-15),m.getAll("goals");const c=m.getSettings().currency||"DOP",p=new Date().toISOString().split("T")[0],d=u=>{const g=t.find(b=>b.id===u.bancoId);return(g==null?void 0:g.nombre)||u.banco||u.bank||"Sin banco"},r=u=>{const g=e.find(x=>x.id===u);if(!g)return 0;let b=parseFloat(g.saldoInicial)||0;return m.filter("transactions",x=>x.cuentaId===u&&x.estado!=="hold").forEach(x=>{x.tipo==="ingreso"?b+=parseFloat(x.monto)||0:(x.tipo==="gasto"||x.tipo==="transferencia")&&(b-=parseFloat(x.monto)||0)}),b},n=e.length?e.map(u=>`  • [ID:${u.id}] ${u.nombre} (${d(u)}): ${r(u.id).toFixed(2)} ${c}`).join(`
`):"  Sin cuentas registradas",i=[...o,...l].length?[...o,...l].map(u=>`  • [ID:${u.id}] ${u.nombre}: límite ${u.limite||u.limiteCredito||0}, usado ${u.saldoUsado||0}`).join(`
`):"  Sin tarjetas",v=s.length?s.map(u=>`  • [ID:${u.id}] ${u.descripcion||u.acreedor}: ${u.saldoPendiente||0} ${c} pend.`).join(`
`):"  Sin deudas activas";return`Eres FinanzBot, el asistente financiero omnipotente de FinanzApp. 
Hoy es: ${p}. Moneda del usuario: ${c}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITUACIÓN FINANCIERA ACTUAL (Muestra selecta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 CUENTAS BANCARIAS:
${n}

💳 TARJETAS PERSONALES Y EXTERNAS:
${i}

🔴 DEUDAS:
${v}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PODER OPERATIVO (ESTRICTAMENTE CONFIDENCIAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tienes acceso TOTAL a modificar CUALQUIER base de datos de la app usando la herramienta "execute_app_action".
Puedes leer, crear, actualizar o borrar información en las colecciones de la app: 'accounts', 'banks', 'cards', 'external_cards', 'transactions', 'debts', 'payables', 'receivables', 'subscriptions', 'goals', 'clients', 'categories', 'notes'.

ESQUEMAS BÁSICOS (Guía para payload):
- transactions: {tipo: 'gasto'|'ingreso', monto: num, descripcion: string, fecha: 'YYYY-MM-DD', cuentaId: str|null, tarjetaId: str|null, tarjetaExternaId: str|null, estado: 'activo'|'hold', categoriaId: str}
- debts / payables / receivables: {descripcion: str, acreedor: str, montoTotal: num, saldoPendiente: num, estado: 'pendiente'|'pagada', cuentaId: str|null}
- subscriptions: {nombre: str, monto: num, frecuencia: 'mes'|'ano', proxCobro: 'YYYY-MM-DD', cuentaId: str}
- accounts: {nombre: str, bancoId: str, saldoInicial: num}
- external_cards: {nombre: str, titular: str, banco: str, limiteCredito: num, saldoUsado: num}

INSTRUCCIONES DIRECTAS:
1. Si el usuario quiere registrar una transacción pero NO provee o no existe una cuenta o banco, DEBES usar obligatoriamente execute_app_action con collection='transactions', action='create' y enviar en el payload {"estado": "hold", "cuentaId": null}. Hazlo INCLUSO SI NO TIENE CUENTAS REGISTRADAS EN LA BASE DE DATOS. Explícale que está guardada en "HOLD".
2. Si pide pagar/crear deuda con una Tarjeta Externa, envía en el payload {"tarjetaExternaId": "id_de_la_tarjeta"}.
3. Para ACCIONES DESTRUCTIVAS O SENSIBLES (eliminar registros grandes, pagar totalmente deudas sin fuente, etc) DEBES usar primero la herramienta "ask_confirmation" y esperar a que el usuario te responda afirmativamente antes de aplicar el execute_app_action. Para crear o editar, hazlo directo y confirma.
4. Cuando devuelvas mensaje hablado, DEBES confirmar explícitamente lo que mutaste.
`}const Fe=[{type:"function",function:{name:"execute_app_action",description:"Ejecuta una operación CRUD directa en cualquier módulo de la aplicación.",parameters:{type:"object",properties:{collection:{type:"string",description:"Nombre de la colección a leer/modificar (ej. transactions, debts, accounts, external_cards, subscriptions)"},action:{type:"string",enum:["create","update","delete","read"],description:"La operación a realizar. Read buscará registros en la colección que contengan text match."},targetId:{type:"string",description:"ID del documento (requerido para update o delete)"},payload:{type:"string",description:'JSON string de los campos a mutar o crear. Para read, el texto de búsqueda. Ej: "{"monto": 500, "estado": "activo"}"'}},required:["collection","action"]}}},{type:"function",function:{name:"ask_confirmation",description:"Detiene el proceso y pide autorización explícita al usuario antes de proceder a una acción sensible o confusa.",parameters:{type:"object",properties:{reason:{type:"string",description:"Explicación conversacional de qué harás y la pregunta de confirmación"}},required:["reason"]}}}];function _a(e){if(!e)return{success:!1};const t=sessionStorage.getItem("finanzapp_session")||"{}",o=JSON.parse(t).userId||"system";if(e.type==="ask_confirmation")return{success:!0,message:e.data.reason,askedConfirmation:!0};if(e.type==="execute_app_action"){const{collection:l,action:s,targetId:a,payload:c}=e.data;if(s==="read"){const d=m.getAll(l);let r=d;return c&&(r=d.filter(n=>JSON.stringify(n).toLowerCase().includes(c.toLowerCase()))),{success:!0,isQuery:!0,data:r.slice(0,5),message:"Búsqueda exitosa, revisa el contexto."}}let p={};try{p=c?JSON.parse(c):{}}catch{}p._aiModified=!0,p._aiModifiedAt=new Date().toISOString();try{if(s==="create"){const d=`${l.substring(0,2)}_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,r={id:d,...p};return m.add(l,r),U(o,"SYSTEM",`[IA] Creación en ${l}`,JSON.stringify(r)),{success:!0,isMutation:!0,id:d,message:`✅ He creado el registro id:${d} en ${l}.`}}else{if(s==="update"&&a)return m.update(l,a,p),U(o,"SYSTEM",`[IA] Refactor (${a}) en ${l}`,JSON.stringify(p)),{success:!0,isMutation:!0,message:`✅ He actualizado el registro en ${l}.`};if(s==="delete"&&a)return m.remove(l,a),U(o,"SYSTEM",`[IA] Borrado (${a}) en ${l}`,""),{success:!0,isMutation:!0,message:`✅ He borrado el registro en ${l}.`}}}catch(d){return{success:!1,error:d.message}}}return{success:!1,error:"Acción no reconocida"}}async function Na(e,t){var n,i;const o=m.getSetting("openaiKey","");if(!o)throw new Error("No hay API Key configurada. Ve a Configuración → FinanzBot para agregarla.");const l=e.slice(-16),s=[{role:"system",content:Ba()},...l,{role:"user",content:t}];let a=await fetch(qe,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:Le,messages:s,tools:Fe,tool_choice:"auto",max_tokens:600,temperature:.65})});if(!a.ok){const v=await a.json().catch(()=>({}));throw new Error(((n=v.error)==null?void 0:n.message)||`Error HTTP ${a.status}`)}let c=await a.json(),p=c.choices[0],d="",r=null;if(p.finish_reason==="tool_calls"&&((i=p.message.tool_calls)==null?void 0:i.length)>0){const v=p.message.tool_calls[0].id,u=p.message.tool_calls[0];try{const g=JSON.parse(u.function.arguments),b={type:u.function.name,data:g},x=_a(b);x.success&&x.isQuery?(s.push({role:"assistant",tool_calls:[p.message.tool_calls[0]]}),s.push({role:"tool",tool_call_id:v,content:JSON.stringify(x.data)}),a=await fetch(qe,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({model:Le,messages:s,tools:Fe,max_tokens:600,temperature:.65})}),c=await a.json(),p=c.choices[0],d=p.message.content||"✅ Consulta procesada exitosamente."):x.askedConfirmation?d=x.message:x.isMutation?d=p.message.content||x.message:d="Acción procesada con éxito.",r=b,r.result=x}catch(g){console.error(g),d="Detecté una acción o búsqueda pero falló la redención de datos internamente."}}else d=p.message.content||"De acuerdo.";return{message:d,action:r}}async function Oa(e){var t;if(!e)return{success:!1,error:"API Key vacía"};try{const o=await fetch(qe,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({model:Le,messages:[{role:"user",content:"hi"}],max_tokens:1})});return o.ok?{success:!0}:{success:!1,error:((t=(await o.json().catch(()=>({}))).error)==null?void 0:t.message)||`Error HTTP ${o.status}`}}catch{return{success:!1,error:"Error de red o CORS"}}}function Fa(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=m.getSettings(),o=Je(),l=t.theme||"dark",s=t.currency||"DOP",a=t.themePalette,c=typeof a=="string"?a:"azul-fintech",p=typeof a=="string"&&a.startsWith("#"),d=typeof a=="object"&&a!==null&&a.isCustom,r=t.notifications||{global:!0,anticipationDays:3,types:{}};e.innerHTML=`
    <div class="page-header">
      <div class="page-header-left">
        <h1>Configuración</h1>
        <p>Control maestro y personalización premium</p>
      </div>
    </div>

    <div class="grid grid-2 stagger-children">
      <!-- COLUMNA IZQUIERDA -->
      <div>
        
        <!-- Apariencia y Sistema de Theming -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><h3>${f("moon",18)} Estilo Visual y Temas</h3></div>
          
          <div style="padding:12px 0 20px 0; border-bottom:1px solid var(--border-color)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="font-weight:600">Esquema de iluminación</div>
                <div style="font-size:0.8rem;color:var(--text-secondary)">Ajusta el fondo de la plataforma</div>
              </div>
            </div>
            <div class="tabs" style="margin:0; width:100%">
              <div class="tab ${l==="dark"?"active":""}" data-theme="dark" style="flex:1;text-align:center">${f("moon",14)} Oscuro</div>
              <div class="tab ${l==="light"?"active":""}" data-theme="light" style="flex:1;text-align:center">${f("sun",14)} Claro</div>
            </div>
          </div>

          <div style="padding-top:20px">
            <div style="font-weight:600;margin-bottom:16px">Paleta Premium (Live Theming)</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px" id="palette-container">
              ${Object.entries(fe).map(([k,L])=>`
                <div class="color-option ${k===c?"selected":""}" 
                     data-palette="${k}"
                     title="${L.name}"
                     style="background: ${L.primary}; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; border: 3px solid ${k===c?"var(--text-primary)":"transparent"}; box-shadow: 0 4px 10px ${L.glow}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                </div>
              `).join("")}
              <div class="color-picker-wrapper color-option ${p?"selected":""}" data-custom="true" title="Color Personalizado" style="position:relative; width: 38px; height: 38px; border-radius: 50%; background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red); cursor: pointer; display: flex; align-items: center; justify-content: center; border: 3px solid ${p?"var(--text-primary)":"transparent"}">
                <div style="background:var(--bg-card); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; pointer-events:none">
                  ${f("edit",12)}
                </div>
                <input type="color" id="custom-color-picker" value="${p?a:"#4f46e5"}" style="opacity:0; position:absolute; inset:0; width:100%; height:100%; cursor:pointer">
              </div>
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:12px">El cambio es instantáneo y se aplica a toda la aplicación.</div>
          </div>

          <!-- MODO ARQUITECTO LIBRE -->
          <div style="padding-top:20px; border-top: 1px solid var(--border-color); margin-top:20px">
            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer" id="toggle-architect">
              <div>
                <div style="font-weight:600; color:var(--accent-secondary)">${f("edit",14)} Modo Arquitecto</div>
                <div style="font-size:0.75rem; color:var(--text-secondary)">Modifica las capas profundas de CSS</div>
              </div>
              <div style="color:var(--text-secondary)" id="architect-chevron">${f("chevronDown",16)}</div>
            </div>
            
            <div id="architect-panel" style="display:none; padding-top:16px; flex-direction:column; gap:12px">
              
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--bg-primary</span>
                <input type="color" class="arch-picker" data-var="bgPrimary" value="#000000" style="cursor:pointer">
              </div>
              
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--bg-card</span>
                <input type="color" class="arch-picker" data-var="bgCard" value="#111114" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--text-primary</span>
                <input type="color" class="arch-picker" data-var="textPrimary" value="#fafafa" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--accent-primary</span>
                <input type="color" class="arch-picker" data-var="accentPrimary" value="#4f46e5" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--color-income</span>
                <input type="color" class="arch-picker" data-var="colorIncome" value="#10b981" style="cursor:pointer">
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-family:monospace">--color-expense</span>
                <input type="color" class="arch-picker" data-var="colorExpense" value="#f43f5e" style="cursor:pointer">
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top:12px; margin-top:4px">
                <button class="btn btn-secondary btn-block" id="reset-architect" style="width:100%; font-size:0.8rem">
                  ${f("refresh",14)} Restablecer tema predeterminado
                </button>
              </div>

            </div>
          </div>
        </div>

        <!-- Moneda -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><h3>${f("dollarSign",18)} Regional</h3></div>
          <div style="padding:12px 0">
            <div style="font-weight:600;margin-bottom:8px">Moneda base</div>
            <select class="form-select" id="currency-select" style="max-width:100%">
              ${Object.entries(o).map(([k,L])=>`<option value="${k}" ${k===s?"selected":""}>${L.symbol} — ${L.name} (${k})</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Mantenimiento -->
        <div class="card">
          <div class="card-header"><h3>${f("download",18)} Base de Datos & Privacidad</h3></div>
          <div style="display:flex;flex-direction:column;gap:16px;padding:12px 0">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600">Exportar (Backup)</div><div style="font-size:0.8rem;color:var(--text-secondary)">Descargar JSON encriptado</div></div>
              <button class="btn btn-secondary" id="export-btn">${f("download",18)}</button>
            </div>
            <div class="divider"></div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600">Importar</div><div style="font-size:0.8rem;color:var(--text-secondary)">Restaurar backup</div></div>
              <div>
                <input type="file" id="import-input" accept=".json" style="display:none" />
                <button class="btn btn-secondary" id="import-btn">${f("upload",18)}</button>
              </div>
            <div class="divider"></div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div><div style="font-weight:600;color:var(--color-expense)">Borrar todos los datos</div><div style="font-size:0.8rem;color:var(--text-secondary)">Eliminar permanentemente</div></div>
              <button class="btn btn-danger" id="clear-btn">${f("trash",18)} Borrar Todo</button>
            </div>
          </div>
        </div>

      </div>

      <!-- COLUMNA DERECHA -->
      <div>
        
        <!-- Notificaciones Avanzadas -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <h3>${f("notification",18)} Centro de Alertas</h3>
            <label class="toggle-switch" title="Activar/Desactivar todas">
              <input type="checkbox" id="global-notif" ${r.global?"checked":""}>
              <div class="toggle-slider"></div>
            </label>
          </div>
          
          <div style="padding:12px 0; opacity: ${r.global?"1":"0.5"}; pointer-events: ${r.global?"auto":"none"}; transition: opacity var(--transition-fast)" id="notif-details">
            
            <div style="margin-bottom:24px">
              <div style="font-weight:600;margin-bottom:8px">Anticipación de Alertas</div>
              <select class="form-select" id="notif-anticipation" style="max-width:100%">
                <option value="1" ${r.anticipationDays==1?"selected":""}>Avisar 1 día antes</option>
                <option value="3" ${r.anticipationDays==3?"selected":""}>Avisar 3 días antes</option>
                <option value="7" ${r.anticipationDays==7?"selected":""}>Avisar 1 semana antes</option>
              </select>
            </div>

            <div class="divider" style="margin:20px 0"></div>

            <div style="display:flex;flex-direction:column;gap:16px">
              
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--accent-primary)">${f("creditCard",22)}</div>
                  <div><div style="font-weight:600">Pagos de Tarjetas</div><div style="font-size:0.8rem;color:var(--text-secondary)">Cortes y límites</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="cc_payments" ${r.types.cc_payments!==!1?"checked":""}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-warning)">${f("subscription",22)}</div>
                  <div><div style="font-weight:600">Suscripciones Próximas</div><div style="font-size:0.8rem;color:var(--text-secondary)">Netflix, Gym, AWS</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="subs" ${r.types.subs!==!1?"checked":""}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-expense)">${f("alert",22)}</div>
                  <div><div style="font-weight:600">Deudas Pendientes</div><div style="font-size:0.8rem;color:var(--text-secondary)">Obligaciones atrasadas</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="debts" ${r.types.debts!==!1?"checked":""}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-income)">${f("receivable",22)}</div>
                  <div><div style="font-weight:600">Cuentas por Cobrar</div><div style="font-size:0.8rem;color:var(--text-secondary)">Dinero que te deben</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="receivables" ${r.types.receivables!==!1?"checked":""}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="color:var(--color-info)">${f("brain",22)}</div>
                  <div><div style="font-weight:600">Asistente Inteligente</div><div style="font-size:0.8rem;color:var(--text-secondary)">Consejos y estrategias de pago</div></div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" class="notif-type" data-type="smart" ${r.types.smart!==!1?"checked":""}>
                  <div class="toggle-slider"></div>
                </label>
              </div>

            </div>
          </div>
        </div>

        <button class="btn btn-danger btn-block" id="logout-btn" style="margin-top:12px">${f("logout",18)} Cerrar Sesión Segura</button>

        <!-- FinanzBot API Key -->
        <div class="card" id="ai-card" style="margin-top:24px; border-color: var(--accent-primary); border-width:1.5px">
          <div class="card-header" style="background: linear-gradient(135deg, var(--accent-primary)15, transparent)">
            <h3 style="display:flex;align-items:center;gap:8px">🤖 FinanzBot — Asistente IA</h3>
            <div id="api-status-badge">
               ${m.getSetting("openaiKey")?'<span class="badge badge-success" style="font-size:0.6rem">CONFIGURADO</span>':'<span class="badge badge-warning" style="font-size:0.6rem">PENDIENTE</span>'}
            </div>
          </div>
          <div style="padding:12px 0">
            <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">
              Conecta FinanzBot con <strong>tu propia API Key</strong> de OpenAI. Esta configuración es privada para este espacio de trabajo.
            </div>
            <div style="font-weight:600;margin-bottom:8px">OpenAI API Key</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;gap:8px">
                <input type="password" id="openai-key-input" class="form-select" 
                  placeholder="sk-proj-..." 
                  value="${m.getSetting("openaiKey","")}"
                  style="flex:1;font-family:monospace;font-size:0.8rem">
                <button class="btn btn-secondary" id="test-api-key" title="Probar Conexión">${f("refresh",16)}</button>
                <button class="btn btn-primary" id="save-api-key" title="Guardar cambios">${f("checkCircle",16)}</button>
              </div>
              <div id="api-validation-msg" style="font-size:0.75rem; min-height:18px"></div>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">
              🔒 <strong>Privacidad:</strong> Tu llave se guarda cifrada localmente y solo se usa para las peticiones de este workspace.
            </div>
          </div>
        </div>

      </div>
    </div>
  `;const n=()=>{m.setSetting("notifications",r),h("success","Preferencias actualizadas")},i=e.querySelector("#global-notif"),v=e.querySelector("#notif-details");i.addEventListener("change",k=>{r.global=k.target.checked,v.style.opacity=r.global?"1":"0.5",v.style.pointerEvents=r.global?"auto":"none",n()}),e.querySelector("#notif-anticipation").addEventListener("change",k=>{r.anticipationDays=parseInt(k.target.value,10),n()}),e.querySelectorAll(".notif-type").forEach(k=>{k.addEventListener("change",L=>{r.types[L.target.dataset.type]=L.target.checked,n()})}),e.querySelectorAll("[data-theme]").forEach(k=>{k.addEventListener("click",()=>{const L=k.dataset.theme;document.documentElement.setAttribute("data-theme",L),m.setSetting("theme",L),e.querySelectorAll(".tabs .tab").forEach(T=>T.classList.remove("active")),k.classList.add("active")})}),e.querySelectorAll('.color-option:not([data-custom="true"])').forEach(k=>{k.addEventListener("click",()=>{const L=k.dataset.palette;e.querySelectorAll(".color-option").forEach(T=>{T.style.border="3px solid transparent",T.classList.remove("selected")}),k.style.border="3px solid var(--text-primary)",k.classList.add("selected"),m.setSetting("themePalette",L),oe(L)})});const u=e.querySelector("#custom-color-picker"),g=u.closest(".color-picker-wrapper");u.addEventListener("input",k=>{const L=k.target.value;e.querySelectorAll(".color-option").forEach(T=>{T.style.border="3px solid transparent",T.classList.remove("selected")}),g.style.border="3px solid var(--text-primary)",g.classList.add("selected"),m.setSetting("themePalette",L),oe(L)});const b=e.querySelector("#toggle-architect"),x=e.querySelector("#architect-panel");b.addEventListener("click",()=>{const k=x.style.display==="none";x.style.display=k?"flex":"none",k&&d&&e.querySelectorAll(".arch-picker").forEach(L=>{const T=L.dataset.var;a[T]&&(L.value=a[T])})}),e.querySelectorAll(".arch-picker").forEach(k=>{k.addEventListener("input",()=>{const L={isCustom:!0};e.querySelectorAll(".arch-picker").forEach(T=>{L[T.dataset.var]=T.value}),e.querySelectorAll(".color-option").forEach(T=>{T.style.border="3px solid transparent",T.classList.remove("selected")}),m.setSetting("themePalette",L),oe(L)})}),e.querySelector("#reset-architect").addEventListener("click",()=>{const k="azul-fintech";m.setSetting("themePalette",k),oe(k),e.querySelectorAll(".color-option").forEach(T=>{T.style.border="3px solid transparent",T.classList.remove("selected")});const L=e.querySelector(`[data-palette="${k}"]`);L&&(L.style.border="3px solid var(--text-primary)"),h("success","Tema restablecido","Volviste al estilo Azul Fintech por defecto")}),e.querySelector("#currency-select").addEventListener("change",k=>{m.setSetting("currency",k.target.value),h("success","Moneda cambiada")}),e.querySelector("#export-btn").addEventListener("click",()=>{const k=pe();Pa(k)&&(h("success","Datos exportados","Archivo de respaldo asegurado"),U(k,k,"Exportación de Backup Local"))}),e.querySelector("#import-btn").addEventListener("click",()=>e.querySelector("#import-input").click()),e.querySelector("#import-input").addEventListener("change",async k=>{const L=k.target.files[0];if(L){try{const{payload:T,summary:X,totalItems:y}=await Da(L),E=`
        <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:16px;">
          Se detectaron <strong>${y}</strong> registros empaquetados en este archivo:
        </div>
        <div style="background:var(--bg-primary); padding:12px; border-radius:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; max-height:200px; overflow-y:auto">
          ${Object.entries(X).map(([F,ne])=>`<div style="display:flex;justify-content:space-between;"><span>${F}:</span> <strong style="color:var(--accent-primary)">${ne}</strong></div>`).join("")}
        </div>
        <div style="margin-top:16px; font-size:0.85rem; padding:10px; background:rgba(244, 63, 94, 0.1); color:#f43f5e; border-radius:6px; border:1px solid #f43f5e">
          <strong>⚠️ Atención:</strong> Esta acción reemplazará al 100% tu base de datos actual con la de este archivo.
        </div>
      `,N="import-preview-modal",O=document.createElement("div");O.innerHTML=`
        <div class="modal fade" id="${N}">
          <div class="modal-content" style="max-width:500px">
            <div class="modal-header">
              <h3>Resumen de Importación</h3>
              <button class="btn btn-icon js-close-modal">✕</button>
            </div>
            <div class="modal-body">
              ${E}
            </div>
            <div class="modal-footer" style="margin-top:20px; display:flex; gap:12px; justify-content:flex-end">
              <button class="btn btn-secondary js-close-modal">Cancelar</button>
              <button class="btn btn-danger" id="confirm-${N}">💥 Reemplazar todo</button>
            </div>
          </div>
        </div>
      `,document.body.appendChild(O.firstElementChild),D(N),document.getElementById(`confirm-${N}`).addEventListener("click",()=>{z(N);try{const F=pe();Ma(F,T),U(F,F,"Inyección Destructiva de Backup"),h("success","Entorno Restaurado","Reiniciando el sistema...")}catch(F){h("error","Error crítico",F.message)}})}catch(T){h("error","Rechazado",T.message)}k.target.value=""}}),e.querySelector("#clear-btn").addEventListener("click",async()=>{await _("⚠️ ¿Borrar todos los datos?","Esta acción es IRREVERSIBLE. Se eliminarán todas las cuentas, transacciones, deudas y configuraciones.",{type:"danger",confirmText:"Sí, borrar todo"})&&(m.clearAll(),h("success","Todos los datos eliminados"),setTimeout(()=>location.reload(),1e3))}),e.querySelector("#logout-btn").addEventListener("click",()=>{m.setSession(!1),location.reload()});const $=e.querySelector("#openai-key-input"),A=e.querySelector("#test-api-key"),I=e.querySelector("#save-api-key"),C=e.querySelector("#api-validation-msg"),j=e.querySelector("#api-status-badge"),S=pe(),q=k=>{k==="valid"?j.innerHTML='<span class="badge badge-success" style="font-size:0.6rem">VÁLIDA ✓</span>':k==="error"?j.innerHTML='<span class="badge badge-danger" style="font-size:0.6rem">ERROR ✕</span>':j.innerHTML='<span class="badge badge-warning" style="font-size:0.6rem">PENDIENTE</span>'};return A.addEventListener("click",async()=>{const k=$.value.trim();if(!k)return h("error","Ingresa una API Key");A.disabled=!0,C.innerHTML='<span style="color:var(--accent-primary)">⌛ Validando conexión...</span>';const L=await Oa(k);A.disabled=!1,L.success?(C.innerHTML='<span style="color:var(--color-income)">✅ Conexión exitosa con OpenAI</span>',q("valid"),U(S,S,"CREDENTIAL_TEST_SUCCESS","Validación de OpenAI Key exitosa")):(C.innerHTML=`<span style="color:var(--color-expense)">❌ Error: ${L.error}</span>`,q("error"),U(S,S,"CREDENTIAL_TEST_FAIL",L.error))}),I.addEventListener("click",()=>{const k=$.value.trim();if(!k){h("error","API Key vacía");return}if(!k.startsWith("sk-")){h("error","API Key inválida","Debe comenzar con sk-");return}m.setSetting("openaiKey",k),h("success","🤖 Configuración Guardada","FinanzBot actualizado en este workspace"),q("valid"),U(S,S,"CREDENTIAL_CHANGE","API Key actualizada y guardada")}),e}const be=["#334155","#7f1d1d","#78350f","#064e3b","#1e3a8a","#4c1d95","#701a75"];function Ra(e=null){return`
    <form id="note-form">
      <div class="form-group">
        <label class="form-label">Título</label>
        <input type="text" class="form-input" id="note-title" value="${(e==null?void 0:e.titulo)||""}" placeholder="Ej: Ideas de inversión, Compras pendientes..." required />
      </div>
      <div class="form-group">
        <label class="form-label">Contenido</label>
        <textarea class="form-textarea" id="note-content" rows="6" placeholder="Escribe tu nota aquí..." required>${(e==null?void 0:e.contenido)||""}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Color de fondo</label>
        <div class="color-picker-group" id="note-color-picker">
          ${be.map(t=>`
            <div class="color-option ${(e==null?void 0:e.color)===t||!e&&t===be[0]?"selected":""}" 
                 data-color="${t}" style="background:${t}"></div>
          `).join("")}
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="note-pinned" ${e!=null&&e.fijada?"checked":""} />
        <label for="note-pinned" style="font-size:0.9rem;cursor:pointer">Fijar al principio</label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Crear"}</button>
      </div>
    </form>
  `}function Ha(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var s;let l=m.getAll("notes");if(l.length===0){e.innerHTML="",e.appendChild(V("fileText","Sin notas","Usa este espacio para apuntar recordatorios, ideas de inversión o pendientes.","Crear Nota",()=>o()));return}l.sort((a,c)=>a.fijada&&!c.fijada?-1:!a.fijada&&c.fijada?1:new Date(c.createdAt||0)-new Date(a.createdAt||0)),e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Notas</h1>
          <p>${l.length} nota${l.length!==1?"s":""} guardada${l.length!==1?"s":""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-note-btn">${f("plus",18)} Nueva Nota</button>
        </div>
      </div>

      <div class="grid grid-auto stagger-children" style="align-items:start">
        ${l.map(a=>`
          <div class="card" style="background:${a.color||be[0]}; posición:relative; border: 1px solid rgba(255,255,255,0.1)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <h3 style="margin:0;font-size:1.1rem;display:flex;align-items:center;gap:6px">
                ${a.fijada?f("star",16):""}
                ${a.titulo}
              </h3>
              <div style="display:flex;gap:4px">
                <button class="btn-icon" data-edit-note="${a.id}" style="color:rgba(255,255,255,0.7);width:28px;height:28px">${f("edit",14)}</button>
                <button class="btn-icon" data-del-note="${a.id}" style="color:rgba(255,255,255,0.7);width:28px;height:28px">${f("trash",14)}</button>
              </div>
            </div>
            <div style="font-size:0.9rem;line-height:1.5;white-space:pre-wrap;color:rgba(255,255,255,0.9);margin-bottom:16px">${a.contenido}</div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.5)">Actualizado: ${B(a.updatedAt||a.createdAt)}</div>
          </div>
        `).join("")}
      </div>
    `,(s=e.querySelector("#add-note-btn"))==null||s.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit-note]").forEach(a=>a.addEventListener("click",()=>{const c=m.getById("notes",a.dataset.editNote);c&&o(c)})),e.querySelectorAll("[data-del-note]").forEach(a=>a.addEventListener("click",async()=>{await _("¿Eliminar nota?","Esta acción no se puede deshacer.")&&(m.remove("notes",a.dataset.delNote),h("success","Nota eliminada"),t())}))};function o(l=null){const s=D(l?"Editar Nota":"Nueva Nota",Ra(l));s.querySelectorAll("#note-color-picker .color-option").forEach(a=>{a.addEventListener("click",()=>{s.querySelectorAll("#note-color-picker .color-option").forEach(c=>c.classList.remove("selected")),a.classList.add("selected")})}),s.querySelector("#note-form").addEventListener("submit",a=>{var d;a.preventDefault();const c=((d=s.querySelector("#note-color-picker .selected"))==null?void 0:d.dataset.color)||be[0],p={titulo:s.querySelector("#note-title").value.trim(),contenido:s.querySelector("#note-content").value.trim(),color:c,fijada:s.querySelector("#note-pinned").checked,updatedAt:new Date().toISOString()};l?(m.update("notes",l.id,p),h("success","Nota actualizada")):(m.add("notes",{...p,id:P(),createdAt:new Date().toISOString()}),h("success","Nota guardada")),z(),t()})}return t(),e}function Ua(e=null){return`
    <form id="ext-card-form">
      <div class="form-group">
        <label class="form-label">Nombre o Alias de Tarjeta <span class="required">*</span></label>
        <input type="text" class="form-input" id="ecc-name" value="${(e==null?void 0:e.nombre)||""}" placeholder="Ej: Visa Azul, Amex..." required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Titular / Propietario <span class="required">*</span></label>
          <input type="text" class="form-input" id="ecc-owner" value="${(e==null?void 0:e.titular)||""}" placeholder="Ej: Esposa, Pedro..." required />
        </div>
        <div class="form-group">
          <label class="form-label">Banco <span class="required">*</span></label>
          <input type="text" class="form-input" id="ecc-bank" value="${(e==null?void 0:e.banco)||""}" placeholder="Ej: BHD, Popular..." required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Límite de Crédito <span class="required">*</span></label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="ecc-limit" value="${(e==null?void 0:e.limiteCredito)||""}" step="0.01" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Balance Actual Usado</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">RD$</span>
            <input type="number" class="form-input" id="ecc-used" value="${(e==null?void 0:e.saldoUsado)||0}" step="0.01" />
          </div>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Tasa Interés (%)</label>
          <input type="number" class="form-input" id="ecc-rate" value="${(e==null?void 0:e.tasaInteres)||""}" step="0.01" placeholder="Ej: 3.5" />
        </div>
        <div class="form-group">
          <label class="form-label">Día Corte</label>
          <input type="number" class="form-input" id="ecc-cut" value="${(e==null?void 0:e.diaCorte)||""}" min="1" max="31" placeholder="1-31" />
        </div>
        <div class="form-group">
          <label class="form-label">Día Pago</label>
          <input type="number" class="form-input" id="ecc-pay" value="${(e==null?void 0:e.diaPago)||""}" min="1" max="31" placeholder="1-31" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} ${e?"Guardar":"Agregar Tarjeta"}</button>
      </div>
    </form>
  `}function Va(e){const t=m.getAll("accounts").filter(o=>o.activa!==!1);return`
    <form id="ext-tx-form">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:0.85rem;color:var(--text-secondary)">Balance actual de la tarjeta</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--color-expense);font-family:var(--font-heading)">${w(e.saldoUsado)}</div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de Movimiento</label>
          <select class="form-select" id="ext-tx-type" required>
            <option value="consumo">Consumo (Sube la deuda)</option>
            <option value="pago" selected>Pago (Baja la deuda)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Monto (RD$) <span class="required">*</span></label>
          <input type="number" class="form-input" id="ext-tx-amount" step="0.01" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Concepto</label>
        <input type="text" class="form-input" id="ext-tx-desc" placeholder="Ej: Pago de cuota, Compra súper..." required />
      </div>

      <div class="form-group" id="bank-link-group">
        <label class="form-label">¿De dónde salió el dinero?</label>
        <select class="form-select" id="ext-tx-account">
          <option value="">Fue dinero externo / No tocar mis cuentas</option>
          ${t.map(o=>`<option value="${o.id}">${o.nombre}</option>`).join("")}
        </select>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Si seleccionas una de tus cuentas, se registrará el retiro en tu historial personal.</div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
        <button type="submit" class="btn btn-primary">${f("check",18)} Registrar Movimiento</button>
      </div>
    </form>
  `}function Ga(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var d;const a=m.getAll("external_cards");if(a.length===0){e.innerHTML="",e.appendChild(V("creditCard","Sin Tarjetas Externas","Lleva el control de plásticos de formato corporativo, cónyuge o familiares sin afectar tu propio patrimonio.","Agregar Tarjeta Externa",()=>o()));return}const c=a.reduce((r,n)=>r+(parseFloat(n.limiteCredito)||0),0),p=a.reduce((r,n)=>r+(parseFloat(n.saldoUsado)||0),0);e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Tarjetas Externas</h1>
          <p>Plásticos gestionados por terceros (No afectan net worth)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-ext-btn">${f("plus",18)} Nueva Tarjeta</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="grid grid-3" style="margin-bottom:28px">
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon info">${f("creditCard",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Límite Ajenos</div>
            <div class="stat-value">${w(c)}</div>
          </div>
        </div>
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon expense">${f("trendingDown",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Deuda Externa Total</div>
            <div class="stat-value">${w(p)}</div>
          </div>
        </div>
        <div class="stat-card" style="background:var(--bg-secondary); border: 1px dashed var(--border-color)">
          <div class="stat-icon warning">${f("info",24)}</div>
          <div class="stat-content">
            <div class="stat-label">Total Tarjetas</div>
            <div class="stat-value">${a.length}</div>
          </div>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid grid-auto stagger-children">
        ${a.map(r=>{const n=parseFloat(r.saldoUsado)||0,i=parseFloat(r.limiteCredito)||1,v=Q(n,i),u=v>=90?"var(--color-expense)":v>=70?"var(--color-warning)":"var(--accent-primary)";return`
            <div class="card" style="position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--color-warning)"></div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div>
                  <h4 style="margin-bottom:2px">${r.nombre}</h4>
                  <span style="font-size:0.75rem;color:var(--text-muted)">Banco: ${r.banco} • Titular: <strong>${r.titular}</strong></span>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-tx-ext="${r.id}" title="Movimiento">${f("dollarSign",16)}</button>
                  <button class="btn-icon" data-hist-ext="${r.id}" title="Historial">${f("fileText",16)}</button>
                  <button class="btn-icon" data-edit-ext="${r.id}" title="Editar">${f("edit",16)}</button>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.8rem">
                <span style="color:var(--text-secondary)">Deuda:</span>
                <span style="font-weight:600;color:var(--color-expense)">${w(n)} <span style="color:var(--text-muted);font-weight:400">/ ${w(i)}</span></span>
              </div>
              <div class="progress-bar" style="margin-bottom:12px">
                <div class="progress-fill" style="width:${v}%;background:${u}"></div>
              </div>
              
              <!-- Assistant Injection -->
              ${ut(r,!0)}

            </div>
          `}).join("")}
      </div>
    `,(d=e.querySelector("#add-ext-btn"))==null||d.addEventListener("click",()=>o()),e.querySelectorAll("[data-edit-ext]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("external_cards",r.dataset.editExt);n&&o(n)})),e.querySelectorAll("[data-tx-ext]").forEach(r=>r.addEventListener("click",()=>{const n=m.getById("external_cards",r.dataset.txExt);n&&l(n)})),e.querySelectorAll("[data-hist-ext]").forEach(r=>r.addEventListener("click",()=>{s(r.dataset.histExt)}))};function o(a=null){const c=D(a?"Editar Tarjeta Externa":"Nueva Tarjeta Externa",Ua(a));c.querySelector("#ext-card-form").addEventListener("submit",p=>{p.preventDefault();const d={nombre:c.querySelector("#ecc-name").value.trim(),titular:c.querySelector("#ecc-owner").value.trim(),banco:c.querySelector("#ecc-bank").value.trim(),limiteCredito:parseFloat(c.querySelector("#ecc-limit").value)||0,saldoUsado:parseFloat(c.querySelector("#ecc-used").value)||0,tasaInteres:parseFloat(c.querySelector("#ecc-rate").value)||null,diaCorte:parseInt(c.querySelector("#ecc-cut").value)||null,diaPago:parseInt(c.querySelector("#ecc-pay").value)||null};a?(m.update("external_cards",a.id,d),h("success","Tarjeta externa actualizada")):(m.add("external_cards",{...d,id:P()}),h("success","Tarjeta externa creada")),z(),t()})}function l(a){const c=D("Registrar Movimiento Externo",Va(a)),p=c.querySelector("#ext-tx-type"),d=c.querySelector("#bank-link-group");p.addEventListener("change",()=>{p.value==="pago"?d.style.display="block":(d.style.display="none",c.querySelector("#ext-tx-account").value="")}),c.querySelector("#ext-tx-form").addEventListener("submit",r=>{r.preventDefault();const n=p.value,i=parseFloat(c.querySelector("#ext-tx-amount").value),v=c.querySelector("#ext-tx-desc").value.trim(),u=c.querySelector("#ext-tx-account").value;if(!i||i<=0){h("error","El monto debe ser mayor a cero");return}let g=parseFloat(a.saldoUsado)||0;n==="consumo"?g+=i:(g-=i,g<0&&(g=0)),m.update("external_cards",a.id,{saldoUsado:g}),m.add("external_transactions",{id:P(),tarjetaId:a.id,tipo:n,monto:i,descripcion:v,fecha:new Date().toISOString()}),n==="pago"&&u&&m.add("transactions",{id:P(),tipo:"gasto",cuentaId:u,monto:i,descripcion:`Pago a Tarjeta: ${a.nombre} (${a.titular})`,fecha:new Date().toISOString().split("T")[0],categoriaId:"cat_ext_card",aplicaDiezmo:!1}),h("success","Movimiento registrado correctamente"),z(),t()})}function s(a){const c=m.getById("external_cards",a);let p=m.getAll("external_transactions").filter(r=>r.tarjetaId===a);p.sort((r,n)=>new Date(n.fecha)-new Date(r.fecha));let d="";p.length===0?d='<div style="text-align:center;padding:20px;color:var(--text-muted)">No hay registros.</div>':d=`
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha / Concepto</th>
                <th class="right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${p.map(r=>{const n=r.tipo==="pago"?"var(--color-income)":"var(--color-expense)",i=r.tipo==="pago"?"-":"+";return`
                  <tr>
                    <td>
                      <div style="font-weight:500">${r.descripcion}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${B(r.fecha)} • ${r.tipo.toUpperCase()}</div>
                    </td>
                    <td class="right" style="color:${n};font-weight:600">${i}${w(r.monto)}</td>
                  </tr>
                `}).join("")}
            </tbody>
          </table>
        </div>
      `,d+=`<button class="btn btn-secondary btn-block" style="margin-top:15px" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cerrar</button>`,D(`Historial - ${c.nombre}`,d)}return t(),m.on("external_cards",t),e}const Re={admin:"badge-danger",editor:"badge-success",supervisor:"badge-warning",viewer:"badge-neutral"};function Ja(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{var c;const l=pe(),s=$e(),a=it(l);e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Usuarios del Workspace</h1>
          <p>${a.length} miembro${a.length!==1?"s":""}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-user-btn">${f("plus",18)} Agregar Miembro</button>
        </div>
      </div>

      <!-- Roles legend -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:28px">
        ${Object.entries(te).map(([p,d])=>`
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:12px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span class="badge ${Re[p]}">${d}</span>
            </div>
            <div style="font-size:0.75rem;color:var(--text-muted)">
              ${{admin:"Acceso total. Puede gestionar usuarios y configuración.",editor:"Puede crear y editar transacciones y registros.",supervisor:"Solo lectura. Ve todo sin poder modificar.",viewer:"Vista básica de dashboard y transacciones."}[p]}
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Members list -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px 20px;background:var(--bg-input);border-bottom:1px solid var(--border-color);font-weight:600;font-size:0.85rem;color:var(--text-secondary)">
          MIEMBROS ACTIVOS
        </div>
        <div style="display:flex;flex-direction:column">
          ${a.map(p=>{var r,n;const d=p.id===(s==null?void 0:s.id);return`
              <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border-color)">
                <div style="width:42px;height:42px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:white;flex-shrink:0">
                  ${p.avatar||((n=(r=p.nombre)==null?void 0:r.charAt(0))==null?void 0:n.toUpperCase())||"?"}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:0.95rem">
                    ${p.nombre} ${d?'<span style="font-size:0.73rem;color:var(--text-muted)">(tú)</span>':""}
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${p.email}</div>
                </div>
                <span class="badge ${Re[p.role]||"badge-neutral"}" style="flex-shrink:0">
                  ${te[p.role]||p.role}
                </span>
                ${d?"":`
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <select class="form-select" data-change-role="${p.id}" style="font-size:0.8rem;padding:4px 8px;width:auto">
                      ${Object.entries(te).map(([i,v])=>`<option value="${i}" ${p.role===i?"selected":""}>${v}</option>`).join("")}
                    </select>
                    <button class="btn-icon" data-remove-member="${p.id}" title="Eliminar del workspace" style="color:var(--color-expense)">
                      ${f("trash",15)}
                    </button>
                  </div>
                `}
              </div>
            `}).join("")}
        </div>
      </div>
    `,(c=e.querySelector("#add-user-btn"))==null||c.addEventListener("click",o),e.querySelectorAll("[data-change-role]").forEach(p=>{p.addEventListener("change",()=>{try{Nt(l,p.dataset.changeRole,p.value),h("success","Rol actualizado"),t()}catch(d){h("error",d.message),t()}})}),e.querySelectorAll("[data-remove-member]").forEach(p=>{p.addEventListener("click",async()=>{const d=a.find(n=>n.id===p.dataset.removeMember);if(await _("¿Eliminar del workspace?",`${d==null?void 0:d.nombre} perderá acceso a este workspace.`))try{Ot(l,p.dataset.removeMember),h("success","Miembro eliminado del workspace"),t()}catch(n){h("error",n.message)}})})};function o(){const l=D("Agregar Miembro",`
      <form id="add-user-form">
        <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px;font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">
          ℹ️ Si el correo ya tiene cuenta en FinanzApp, se le dará acceso a este workspace con el rol seleccionado.
          Si no tiene, se creará una cuenta nueva.
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-input" id="au-name" placeholder="Nombre del usuario" required />
          </div>
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-select" id="au-role" required>
              ${Object.entries(te).map(([s,a])=>`<option value="${s}">${a}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correo electrónico *</label>
          <input type="email" class="form-input" id="au-email" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña inicial *</label>
          <input type="password" class="form-input" id="au-pass" placeholder="Mín. 6 caracteres" required minlength="6" />
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">El usuario puede cambiarla desde Configuración.</div>
        </div>
        <div id="au-error" style="color:var(--color-expense);font-size:0.82rem;display:none;margin-bottom:8px"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal')?.remove();document.body.style.overflow=''">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="au-submit">${f("check",18)} Agregar Miembro</button>
        </div>
      </form>
    `);l.querySelector("#add-user-form").addEventListener("submit",async s=>{s.preventDefault();const a=l.querySelector("#au-error"),c=l.querySelector("#au-submit");a.style.display="none",c.disabled=!0,c.textContent="Agregando...";try{await _t({workspaceId:pe(),nombre:l.querySelector("#au-name").value,email:l.querySelector("#au-email").value,password:l.querySelector("#au-pass").value,role:l.querySelector("#au-role").value}),h("success","Miembro agregado al workspace"),z(),t()}catch(p){a.textContent=p.message,a.style.display="block",c.disabled=!1,c.textContent="Agregar Miembro"}})}return t(),e}const Wa={activo:"badge-success",suspendido:"badge-danger",inactivo:"badge-warning"};function Ya(){const e=document.createElement("div");e.className="page-content animate-fade-in";let t="users";const o=()=>{try{const c=Rt(),p=pt().sort((d,r)=>new Date(r.timestamp)-new Date(d.timestamp));e.innerHTML=`
        <div class="page-header">
          <div class="page-header-left">
            <h1>Panel de Administrador Global</h1>
            <p>Control de acceso total y herramientas de auditoría</p>
          </div>
        </div>

        <div class="tabs" style="margin-bottom:20px;border-bottom:1px solid var(--border-color);display:flex;gap:20px">
          <button class="btn btn-ghost ${t==="users"?"active-tab":""}" style="${t==="users"?"border-bottom:2px solid var(--accent-primary);border-radius:0":""}" data-tab="users">${f("users",18)} Usuarios (${c.length})</button>
          <button class="btn btn-ghost ${t==="audit"?"active-tab":""}" style="${t==="audit"?"border-bottom:2px solid var(--accent-primary);border-radius:0":""}" data-tab="audit">${f("fileText",18)} Auditoría</button>
        </div>

        ${t==="users"?l(c):s(p,c)}
      `,e.querySelectorAll("[data-tab]").forEach(d=>{d.addEventListener("click",()=>{t=d.dataset.tab,o()})}),t==="users"&&a()}catch(c){e.innerHTML=`<div class="empty-state card"><h3>No Autorizado</h3><p>${c.message||"Contenido restringido."}</p></div>`}},l=c=>`
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:15px;background:var(--bg-input);border-bottom:1px solid var(--border-color);display:flex;gap:12px;align-items:center">
        ${f("search",16)}
        <input type="text" id="admin-search" placeholder="Buscar por nombre o correo..." class="form-input" style="flex:1;border:none;background:transparent;box-shadow:none" />
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Workspaces</th>
              <th>Creado el</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="admin-users-list">
            ${c.map(p=>{var r;const d=p.estado||(p.activo?"activo":"inactivo");return`
              <tr class="sa-user-row" data-search="${(p.nombre+p.email).toLowerCase()}">
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0">
                      ${p.avatar||((r=p.nombre)==null?void 0:r.charAt(0))}
                    </div>
                    <div>
                      <div style="font-weight:600">${p.nombre} ${p.isSuperAdmin?'<span style="color:var(--color-warning);font-size:0.7rem">👑 SuperAdmin</span>':""}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted)">${p.email}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge ${Wa[d]||"badge-neutral"}">${d.toUpperCase()}</span></td>
                <td>${(p.workspaces||[]).length} ${(p.workspaces||[]).length===1?"espacio":"espacios"}</td>
                <td style="color:var(--text-secondary);font-size:0.85rem">${B(p.createdAt)}</td>
                <td style="color:var(--text-secondary);font-size:0.85rem">${p.lastLogin?B(p.lastLogin):"Nunca"}</td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn-icon sa-action-status" data-id="${p.id}" data-status="${d}" title="Cambiar Estado">
                      ${f(d==="activo"?"lock":"check",16)}
                    </button>
                    ${p.isSuperAdmin?`<button class="btn-icon" disabled style="opacity:0.3" title="No puedes resetear a un SuperAdmin">${f("key",16)}</button>`:`<button class="btn-icon sa-action-pass" data-id="${p.id}" data-name="${p.nombre}" title="Restablecer Contraseña" style="color:var(--color-warning)">
                      ${f("key",16)}
                    </button>`}
                  </div>
                </td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `,s=(c,p)=>`
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Acción Realizada</th>
              <th>Administrador</th>
              <th>Afectado</th>
              <th>Detalles Extras</th>
            </tr>
          </thead>
          <tbody>
            ${c.length>0?c.map(d=>{var i,v;const r=((i=p.find(u=>u.id===d.adminId))==null?void 0:i.nombre)||d.adminId,n=((v=p.find(u=>u.id===d.targetUserId))==null?void 0:v.nombre)||d.targetUserId;return`
              <tr>
                <td style="font-size:0.8rem;color:var(--text-secondary)">${B(d.timestamp)} ${new Date(d.timestamp).toLocaleTimeString()}</td>
                <td style="font-weight:600">${d.action}</td>
                <td style="color:var(--accent-primary)">${r}</td>
                <td>${n}</td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${d.details||"-"}</td>
              </tr>
            `}).join(""):'<tr><td colspan="5" class="center muted" style="padding:40px">No hay registros de auditoría aún.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `,a=()=>{const c=e.querySelector("#admin-search");c==null||c.addEventListener("input",p=>{const d=p.target.value.toLowerCase();e.querySelectorAll(".sa-user-row").forEach(r=>{r.style.display=r.dataset.search.includes(d)?"":"none"})}),e.querySelectorAll(".sa-action-status").forEach(p=>{p.addEventListener("click",async()=>{const d=p.dataset.id,r=p.dataset.status,n=["activo","suspendido","inactivo"].filter(v=>v!==r),i=D("Cambiar Estado del Usuario",`
          <p>Selecciona el nuevo estado para esta cuenta (Actual: <strong>${r}</strong>):</p>
          <div style="display:flex;gap:10px;margin-bottom:20px;margin-top:10px">
            ${n.map(v=>`<button class="btn ${v==="activo"?"btn-success":v==="suspendido"?"btn-danger":"btn-warning"}" id="st-${v}" style="flex:1">${v.toUpperCase()}</button>`).join("")}
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted)">Los usuarios suspendidos o inactivos no podrán iniciar sesión.</p>
        `);n.forEach(v=>{i.querySelector(`#st-${v}`).addEventListener("click",()=>{try{Ht(d,v),h("success",`Estado cambiado a ${v}`),z(),v==="suspendido"&&Gt(d),o()}catch(u){h("error",u.message)}})})})}),e.querySelectorAll(".sa-action-pass").forEach(p=>{p.addEventListener("click",()=>{const d=p.dataset.id,r=p.dataset.name,n=D("Restablecer Contraseña",`
          <form id="sa-reset-form">
            <p style="margin-bottom:15px;font-size:0.9rem">Establecerás una nueva clave temporal para <strong>${r}</strong>.</p>
            <div class="form-group">
              <label class="form-label">Nueva Contraseña</label>
              <input type="text" class="form-input" id="sa-new-pass" required minlength="6" autocomplete="off" />
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="sa-force-change" checked style="width:18px;height:18px;accent-color:var(--accent-primary)" />
              <label for="sa-force-change" style="font-size:0.85rem;color:var(--text-secondary)">Forzar al usuario a cambiarla en su próximo acceso</label>
            </div>
            <div class="form-actions" style="margin-top:20px">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('active-modal').remove()">Cancelar</button>
              <button type="submit" class="btn btn-primary" style="background:var(--color-warning);border-color:var(--color-warning)">${f("check",16)} Actualizar</button>
            </div>
          </form>
        `);n.querySelector("#sa-reset-form").addEventListener("submit",async i=>{i.preventDefault();const v=n.querySelector("#sa-new-pass").value,u=n.querySelector("#sa-force-change").checked,g=n.querySelector("button[type=submit]");g.disabled=!0;try{await Ut(d,v,u),h("success","Contraseña restablecida con éxito"),z(),o()}catch(b){h("error",b.message),g.disabled=!1}})})})};return o(),e}async function He(e,t){const l=new TextEncoder().encode(e+t),s=await crypto.subtle.digest("SHA-256",l);return Array.from(new Uint8Array(s)).map(a=>a.toString(16).padStart(2,"0")).join("")}async function Ka(e,t,o){const l=localStorage.getItem("finanzapp_users");if(!l)throw new Error("No se encontró la base de usuarios.");const s=JSON.parse(l),a=s.findIndex(n=>n.id===e);if(a===-1)throw new Error("Usuario no encontrado.");const c=s[a];if(await He(t,c.salt)!==c.passwordHash)throw new Error("La contraseña actual es incorrecta.");const d=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(n=>n.toString(16).padStart(2,"0")).join(""),r=await He(o,d);s[a]={...c,passwordHash:r,salt:d},localStorage.setItem("finanzapp_users",JSON.stringify(s))}async function Ue(e,t){const o=localStorage.getItem("finanzapp_users");if(!o)return;const l=JSON.parse(o),s=l.findIndex(a=>a.id===e);s!==-1&&(l[s]={...l[s],...t},localStorage.setItem("finanzapp_users",JSON.stringify(l)))}const Qa=["😊","🦁","🐼","🦊","🐸","🤖","🧑‍💻","👩‍💼","🧙","🦄","💎","🚀","🎯","💡","🔥"];function Za(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=$e(),o=G(),l=rt(),s=l?it(l.id):[];if(!t||!o)return e.innerHTML='<div class="empty-state card"><h3>No autenticado</h3><p>Por favor inicia sesión.</p></div>',e;const a=te[o.role]||o.role||"Usuario",c={admin:"var(--color-income)",editor:"var(--accent-primary)",supervisor:"var(--color-warning)",viewer:"var(--text-muted)"}[o.role]||"var(--text-muted)",p=()=>{var n,i;e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>Mi Perfil</h1>
          <p>Gestiona tu cuenta, seguridad y preferencias</p>
        </div>
      </div>

      <div class="grid grid-2" style="gap:20px;align-items:start">

        <!-- ── Perfil del Usuario ── -->
        <div class="card" style="padding:28px">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px">
            <div id="avatar-display" style="width:72px;height:72px;border-radius:50%;background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:2.4rem;cursor:pointer;border:2px solid var(--accent-primary);flex-shrink:0" title="Cambiar avatar">
              ${t.avatar||"😊"}
            </div>
            <div>
              <div style="font-size:1.4rem;font-weight:700">${t.nombre}</div>
              <div style="font-size:0.85rem;color:var(--text-muted)">${t.email}</div>
              <div style="margin-top:6px"><span class="badge" style="background:${c}22;color:${c};border:1px solid ${c}44">${a}</span></div>
            </div>
          </div>

          <!-- Avatar picker (hidden) -->
          <div id="avatar-picker" style="display:none;flex-wrap:wrap;gap:8px;margin-bottom:20px;padding:12px;background:var(--bg-input);border-radius:10px">
            ${Qa.map(v=>`<button class="avatar-opt" style="width:36px;height:36px;border-radius:50%;background:var(--bg-card);border:2px solid transparent;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s" data-avatar="${v}">${v}</button>`).join("")}
            <button id="close-avatar" class="btn btn-ghost btn-sm" style="width:100%">Cerrar</button>
          </div>

          <!-- Edit name -->
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <div style="display:flex;gap:8px">
              <input type="text" class="form-input" id="profile-name" value="${t.nombre}" placeholder="Tu nombre" />
              <button class="btn btn-primary" id="save-name-btn" style="white-space:nowrap">${f("check",16)} Guardar</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Correo electrónico</label>
            <input type="text" class="form-input" value="${t.email}" disabled style="opacity:0.6" />
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">El correo no se puede cambiar (es tu identificador de acceso).</div>
          </div>

          <hr style="border:none;border-top:1px solid var(--border-color);margin:20px 0" />
          <h4 style="margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary)">🔐 Cambiar Contraseña</h4>

          <form id="change-pass-form">
            <div class="form-group">
              <label class="form-label">Contraseña Actual</label>
              <input type="password" class="form-input" id="old-pass" placeholder="Tu contraseña actual" autocomplete="current-password" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nueva Contraseña</label>
                <input type="password" class="form-input" id="new-pass" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required />
              </div>
              <div class="form-group">
                <label class="form-label">Confirmar Nueva</label>
                <input type="password" class="form-input" id="confirm-pass" placeholder="Repetir contraseña" autocomplete="new-password" required />
              </div>
            </div>
            <div id="pass-error" style="color:var(--color-expense);font-size:0.82rem;display:none;margin-bottom:10px"></div>
            <button type="submit" class="btn btn-primary" style="width:100%">${f("lock",16)} Cambiar Contraseña</button>
          </form>
        </div>

        <!-- ── Workspace Info ── -->
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="card" style="padding:24px">
            <h3 style="font-size:1rem;margin-bottom:16px;display:flex;align-items:center;gap:8px">${f("bank",18)} Workspace Activo</h3>
            <div style="padding:14px;background:var(--bg-input);border-radius:10px;margin-bottom:16px">
              <div style="font-size:1.1rem;font-weight:700">${(l==null?void 0:l.nombre)||"Workspace"}</div>
              <div style="font-size:0.76rem;color:var(--text-muted);margin-top:4px">ID: ${(l==null?void 0:l.id)||""}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px">Creado: ${l!=null&&l.createdAt?new Date(l.createdAt).toLocaleDateString("es-DO"):"—"}</div>
            </div>

            <h4 style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">${f("users",14)} Miembros (${s.length})</h4>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${s.map(v=>{var u;return`
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-input);border-radius:8px">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">${v.avatar||((u=v.nombre)==null?void 0:u.charAt(0))||"?"}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.nombre} ${v.id===o.userId?'<span style="font-size:0.7rem;color:var(--accent-primary)">(tú)</span>':""}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted)">${v.email}</div>
                  </div>
                  <span class="badge badge-neutral" style="font-size:0.7rem">${te[v.role]||v.role}</span>
                </div>
              `}).join("")}
            </div>
          </div>

          <!-- Session / Security info -->
          <div class="card" style="padding:24px">
            <h3 style="font-size:1rem;margin-bottom:16px;display:flex;align-items:center;gap:8px">${f("settings",18)} Sesión y Seguridad</h3>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:0.85rem">
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Sesión activa</span>
                <span style="color:var(--color-income)">● Conectado</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Rol en workspace</span>
                <span style="color:${c};font-weight:600">${a}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--text-muted)">Cuenta creada</span>
                <span>${t.createdAt?new Date(t.createdAt).toLocaleDateString("es-DO"):"—"}</span>
              </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0" />
            <button id="logout-profile-btn" class="btn btn-secondary" style="width:100%;color:var(--color-expense);border-color:var(--color-expense)">${f("logout",16)} Cerrar Sesión</button>
          </div>
        </div>
      </div>
    `;const d=e.querySelector("#avatar-display"),r=e.querySelector("#avatar-picker");d.addEventListener("click",()=>{r.style.display=r.style.display==="none"?"flex":"none"}),(n=e.querySelector("#close-avatar"))==null||n.addEventListener("click",()=>{r.style.display="none"}),e.querySelectorAll(".avatar-opt").forEach(v=>{v.addEventListener("click",async()=>{const u=v.dataset.avatar;await Ue(o.userId,{avatar:u});const g=sessionStorage.getItem("finanzapp_session");if(g){const b=JSON.parse(g);b.avatar=u,sessionStorage.setItem("finanzapp_session",JSON.stringify(b))}h("success","Avatar actualizado"),p()})}),e.querySelector("#save-name-btn").addEventListener("click",async()=>{const v=e.querySelector("#profile-name").value.trim();if(!v){h("error","El nombre no puede estar vacío");return}await Ue(o.userId,{nombre:v}),h("success","✅ Nombre actualizado"),p()}),e.querySelector("#change-pass-form").addEventListener("submit",async v=>{v.preventDefault();const u=e.querySelector("#pass-error"),g=e.querySelector("#old-pass").value,b=e.querySelector("#new-pass").value,x=e.querySelector("#confirm-pass").value;if(u.style.display="none",b.length<6){u.textContent="La nueva contraseña debe tener al menos 6 caracteres.",u.style.display="block";return}if(b!==x){u.textContent="Las contraseñas nuevas no coinciden.",u.style.display="block";return}const $=v.target.querySelector("[type=submit]");$.disabled=!0,$.textContent="Cambiando...";try{await Ka(o.userId,g,b),h("success","🔐 Contraseña cambiada correctamente"),v.target.reset()}catch(A){u.textContent=A.message,u.style.display="block"}finally{$.disabled=!1,$.innerHTML=`${f("lock",16)} Cambiar Contraseña`}}),(i=e.querySelector("#logout-profile-btn"))==null||i.addEventListener("click",async()=>{await _("Cerrar Sesión","¿Deseas cerrar tu sesión actual?")&&(nt(),location.reload())})};return p(),e}function Xa(){const e=document.createElement("div");e.className="page-content animate-fade-in";const t=()=>{const o=m.filter("transactions",u=>u.estado==="hold"),l=m.filter("subscription_charges",u=>!u.confirmado),s=m.filter("receivables",u=>u.estado!=="pagada"&&u.estado!=="cobrada"),a=m.filter("payables",u=>u.estado!=="pagada"),c=m.filter("debts",u=>u.estado!=="pagada"&&!u.paid),p=m.getAll("accounts"),d=m.getAll("subscriptions"),r=o.reduce((u,g)=>u+(parseFloat(g.monto)||0),0),n=s.reduce((u,g)=>u+(parseFloat(g.saldoPendiente)||0),0),i=a.reduce((u,g)=>u+((parseFloat(g.monto)||0)-(parseFloat(g.montoPagado)||0)),0)+c.reduce((u,g)=>u+(parseFloat(g.saldoPendiente)||parseFloat(g.amount)||0),0),v=o.length+l.length+s.length+a.length+c.length;e.innerHTML=`
      <div class="page-header">
        <div class="page-header-left">
          <h1>⏳ Centro de Pendientes</h1>
          <p>${v} item${v!==1?"s":""} requieren tu atención</p>
        </div>
      </div>

      <!-- Resumen rápido -->
      <div class="grid grid-3" style="gap:16px;margin-bottom:24px">
        <div class="stat-card" style="border-left:3px solid #f59e0b">
          <div class="stat-content">
            <div class="stat-label">Transacciones en HOLD</div>
            <div class="stat-value" style="color:#f59e0b;font-size:1.6rem">${o.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">~${w(r)} sin asignar</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--color-income)">
          <div class="stat-content">
            <div class="stat-label">Por Cobrar</div>
            <div class="stat-value" style="color:var(--color-income);font-size:1.6rem">${s.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${w(n)} pendientes</div>
          </div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--color-expense)">
          <div class="stat-content">
            <div class="stat-label">Por Pagar</div>
            <div class="stat-value" style="color:var(--color-expense);font-size:1.6rem">${a.length+c.length}</div>
            <div style="font-size:0.78rem;color:var(--text-muted)">${w(i)} pendientes</div>
          </div>
        </div>
      </div>

      <!-- Sección HOLD -->
      ${o.length>0?`
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:#f59e0b">${f("clock",18)} Transacciones en HOLD — Sin cuenta asignada</h3>
          <span class="badge" style="background:#f59e0b22;color:#f59e0b">${o.length}</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Descripción</th><th>Tipo</th><th>Origen</th><th>Fecha</th><th class="right">Monto</th><th>Asignar Cuenta</th></tr></thead>
            <tbody id="hold-tbody">
              ${o.map(u=>`
                <tr style="background:rgba(245,158,11,0.04)">
                  <td><div class="cell-primary">${u.descripcion} ${u.source==="ai-agent"?'<span style="font-size:0.65rem;color:var(--text-muted)">🤖 IA</span>':""}</div></td>
                  <td><span class="badge badge-${u.tipo==="ingreso"?"success":"danger"}">${u.tipo}</span></td>
                  <td style="font-size:0.8rem;color:var(--text-muted)">${u.source==="ai-agent"?"FinanzBot":"Manual"}</td>
                  <td style="font-size:0.8rem;color:var(--text-secondary)">${B(u.fecha)}</td>
                  <td class="right" style="color:#f59e0b;font-weight:700">~${w(u.monto)}</td>
                  <td>
                    <select class="form-select assign-acc" data-tx-id="${u.id}" style="font-size:0.8rem;max-width:200px">
                      <option value="">— Seleccionar —</option>
                      ${p.map(g=>`<option value="acc:${g.id}">${g.nombre}</option>`).join("")}
                    </select>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>`:""}

      <!-- Sección Suscripciones pendientes de confirmar -->
      ${l.length>0?`
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-warning)">${f("subscription",18)} Cobros de Suscripción Sin Confirmar</h3>
          <span class="badge badge-warning">${l.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${l.map(u=>{const g=d.find(b=>b.id===u.subscriptionId);return`
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px">
                <div style="flex:1">
                  <div style="font-weight:600">${(g==null?void 0:g.nombre)||u.subscriptionId}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary)">${B(u.fechaCobro)} • ${w(u.monto||(g==null?void 0:g.monto)||0)}</div>
                </div>
                <button class="btn btn-success btn-sm confirm-sub" data-charge-id="${u.id}" data-amount="${u.monto||(g==null?void 0:g.monto)||0}" data-sub-name="${(g==null?void 0:g.nombre)||""}">
                  ${f("check",14)} Confirmar
                </button>
              </div>`}).join("")}
        </div>
      </div>`:""}

      <!-- Sección Por Cobrar -->
      ${s.length>0?`
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-income)">${f("arrowDown",18)} Cuentas por Cobrar Pendientes</h3>
          <button class="btn btn-ghost btn-sm" onclick="location.hash='#/receivables'">Ver módulo →</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${s.slice(0,5).map(u=>{const g=se(u.fechaVencimiento);return`
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px;${g?"border-left:3px solid var(--color-expense)":""}">
                <div style="flex:1">
                  <div style="font-weight:600">${u.entidad||u.descripcion}</div>
                  <div style="font-size:0.78rem;color:${g?"var(--color-expense)":"var(--text-secondary)"}">
                    ${g?"⚠️ Vencido — ":""}${u.fechaVencimiento?B(u.fechaVencimiento):"Sin fecha"}
                  </div>
                </div>
                <div style="font-weight:700;color:var(--color-income)">${w(u.saldoPendiente||u.monto||0)}</div>
              </div>`}).join("")}
          ${s.length>5?`<div style="text-align:center;font-size:0.8rem;color:var(--text-muted);padding:8px">+${s.length-5} más en el módulo</div>`:""}
        </div>
      </div>`:""}

      <!-- Sección Por Pagar (Deudas + Payables) -->
      ${a.length+c.length>0?`
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3 style="color:var(--color-expense)">${f("arrowUp",18)} Cuentas por Pagar Pendientes</h3>
          <button class="btn btn-ghost btn-sm" onclick="location.hash='#/payables'">Ver módulo →</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          ${[...a.map(u=>({nombre:u.beneficiario,monto:(parseFloat(u.monto)||0)-(parseFloat(u.montoPagado)||0),fecha:u.fechaLimite,tipo:"payable",ov:se(u.fechaLimite)})),...c.map(u=>({nombre:u.acreedor||u.descripcion||"Deuda",monto:parseFloat(u.saldoPendiente)||parseFloat(u.amount)||0,fecha:u.fechaVencimiento||u.dueDate,tipo:"debt",ov:se(u.fechaVencimiento||u.dueDate)}))].slice(0,6).map(u=>`
              <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-input);border-radius:8px;${u.ov?"border-left:3px solid var(--color-expense)":""}">
                <div style="flex:1">
                  <div style="font-weight:600">${u.nombre}</div>
                  <div style="font-size:0.78rem;color:${u.ov?"var(--color-expense)":"var(--text-secondary)"}">
                    ${u.ov?"⚠️ Vencido — ":""}${u.fecha?B(u.fecha):"Sin fecha"}
                    <span class="badge badge-neutral" style="font-size:0.65rem;margin-left:6px">${u.tipo==="debt"?"Deuda":"Pagar"}</span>
                  </div>
                </div>
                <div style="font-weight:700;color:var(--color-expense)">${w(u.monto)}</div>
              </div>`).join("")}
        </div>
      </div>`:""}

      ${v===0?`
        <div class="empty-state card">
          <div style="font-size:3rem;margin-bottom:12px">✅</div>
          <h3>¡Todo al día!</h3>
          <p>No tienes transacciones en hold, cobros pendientes, ni pagos atrasados.</p>
        </div>`:""}
    `,e.querySelectorAll(".assign-acc").forEach(u=>{u.addEventListener("change",()=>{const g=u.dataset.txId,b=u.value;if(!b)return;const[x,$]=b.split(":");m.update("transactions",g,{cuentaId:x==="acc"?$:null,tarjetaId:x==="card"?$:null,estado:"activo"}),h("success","✅ Transacción confirmada y asignada"),t()})}),e.querySelectorAll(".confirm-sub").forEach(u=>{u.addEventListener("click",()=>{const g=u.dataset.chargeId,b=parseFloat(u.dataset.amount)||0,x=u.dataset.subName;m.update("subscription_charges",g,{confirmado:!0,fechaConfirmacion:new Date().toISOString()}),h("success",`✅ Cobro de "${x}" confirmado — ${w(b)}`),t()})})};return t(),e}const eo=["💰 Gasté RD$500 en comida hoy","📊 ¿Cuál es mi balance total?","📄 ¿Qué tengo pendiente?","💡 Dame una estrategia de ahorro","🤖 Registra un ingreso de cliente"];function to(){if(!document.querySelector("link[data-chat-css]")){const b=document.createElement("link");b.rel="stylesheet",b.href="/styles/chat.css",b.dataset.chatCss="1",document.head.appendChild(b)}let e=[],t=!1;const o=document.createElement("button");o.className="ai-fab",o.id="ai-fab",o.title="FinanzBot — Asistente IA",o.innerHTML='<div class="ai-fab-pulse"></div><span style="font-size:1.4rem">🤖</span>',document.body.appendChild(o);const l=document.createElement("div");l.className="chat-drawer",l.id="chat-drawer",l.innerHTML=`
    <div class="chat-header">
      <div class="chat-header-avatar">🤖</div>
      <div class="chat-header-info">
        <strong>FinanzBot</strong>
        <span>● En línea — GPT-4o Mini</span>
      </div>
      <button class="chat-close" id="chat-close" title="Ocultar chat">${f("close",18)}</button>
    </div>

    <div class="chat-messages" id="chat-messages">
    <div class="chat-bubble bot">
        ¡Hola! Soy <strong>FinanzBot</strong>, tu asistente financiero. 💼<br><br>
        Puedo <strong>registrar transacciones</strong> con solo describirlas, darte estrategias para pagar deudas, analizar tu situación financiera y mucho más.<br><br>
        Si no especificas banco o cuenta, guardaré la transacción en <strong>HOLD</strong> (visible en Transacciones con badge amarillo) y te preguntaré dónde cargarla.<br><br>
        ¿En qué te ayudo hoy?
      </div>
    </div>

    <div class="chat-suggestions" id="chat-suggestions">
      ${eo.map(b=>`<button class="chat-suggestion">${b}</button>`).join("")}
    </div>

    <div class="chat-input-area">
      <textarea class="chat-input" id="chat-input" rows="1" placeholder="Escribe aquí... ej: Gasté $1,500 en gasolina"></textarea>
      <button class="chat-send" id="chat-send">${f("send",16)}</button>
    </div>
  `,document.body.appendChild(l);const s=l.querySelector("#chat-messages"),a=l.querySelector("#chat-input"),c=l.querySelector("#chat-send"),p=l.querySelector("#chat-close"),d=l.querySelector("#chat-suggestions");function r(){l.classList.add("open"),o.style.display="none",a.focus()}function n(){l.classList.remove("open"),o.style.display="flex"}o.addEventListener("click",r),p.addEventListener("click",n),d.addEventListener("click",b=>{const x=b.target.closest(".chat-suggestion");if(!x)return;const $=x.textContent.replace(/^[\u{1F000}-\u{1FFFF}]\s*/u,"").trim();a.value=$,g()}),a.addEventListener("input",()=>{a.style.height="auto",a.style.height=Math.min(a.scrollHeight,100)+"px"}),a.addEventListener("keydown",b=>{b.key==="Enter"&&!b.shiftKey&&(b.preventDefault(),g())}),c.addEventListener("click",g);function i(b,x,$=""){const A=document.createElement("div");return A.className=`chat-bubble ${b} ${$}`,A.innerHTML=x,s.appendChild(A),s.scrollTop=s.scrollHeight,A}function v(){const b=document.createElement("div");b.className="chat-bubble bot typing",b.id="typing-indicator",b.innerHTML='<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>',s.appendChild(b),s.scrollTop=s.scrollHeight}function u(){var b;(b=document.getElementById("typing-indicator"))==null||b.remove()}async function g(){var $,A;const b=a.value.trim();if(!b||t)return;if(!m.getSetting("openaiKey","")){i("bot","⚠️ No has configurado tu API Key de OpenAI. Ve a <strong>Configuración → FinanzBot</strong> para agregarla y activarme.");return}i("user",b),a.value="",a.style.height="auto",d.style.display="none",t=!0,c.disabled=!0,v();try{const{message:I,action:C}=await Na(e,b);if(e.push({role:"user",content:b}),I&&e.push({role:"assistant",content:I}),u(),I&&i("bot",I.replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")),C){const j=C.data||{},S=(($=m.getSettings())==null?void 0:$.currency)||"DOP",q=C.result||{},k=C.type==="execute_app_action"&&j.collection==="transactions",L=j.payload&&j.payload.includes('"estado":"hold"');if(k&&j.action==="create")if(L){const T=m.getAll("accounts").filter(y=>y.activa!==!1),X=m.getAll("cards").filter(y=>y.activa!==!1);if(T.length>0||X.length>0){const y=document.createElement("div");y.className="chat-bubble bot",y.style.cssText="padding:10px 14px",y.innerHTML=`
                <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">Asigna una cuenta para confirmar:</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${T.map(E=>`<button class="btn btn-secondary btn-sm hold-acc-btn" style="font-size:0.78rem" data-acc-id="${E.id}" data-tx-id="${q.id}">🏦 ${E.nombre}</button>`).join("")}
                  ${X.map(E=>`<button class="btn btn-secondary btn-sm hold-acc-btn" style="font-size:0.78rem" data-card-id="${E.id}" data-tx-id="${q.id}">💳 ${E.nombre}</button>`).join("")}
                  <button class="btn btn-ghost btn-sm" id="skip-hold-btn" style="font-size:0.78rem">⏳ Dejar en Hold por ahora</button>
                </div>
              `,s.appendChild(y),s.scrollTop=s.scrollHeight,y.querySelectorAll(".hold-acc-btn").forEach(E=>{E.addEventListener("click",()=>{var ie,J;const N=E.dataset.txId,O=E.dataset.accId||null,F=E.dataset.cardId||null;if(m.getById("transactions",N)){m.update("transactions",N,{cuentaId:O,tarjetaId:F,estado:"activo"});const W=O?((ie=m.getById("accounts",O))==null?void 0:ie.nombre)||O:((J=m.getById("cards",F))==null?void 0:J.nombre)||F;y.remove(),i("bot",`✅ Confirmado en <strong>${W}</strong>.`),h("success","✅ Confirmado",`Cargado a ${W}`)}else i("bot","❌ No pude asignar esa cuenta. Inténtalo desde Transacciones.")})}),(A=y.querySelector("#skip-hold-btn"))==null||A.addEventListener("click",()=>{y.remove(),i("bot","⏳ La transacción queda en <strong>HOLD</strong> en tu lista de Transacciones. Puedes asignarla cuando quieras.")})}h("info","⏳ En Hold","Asigna una cuenta desde el chat o desde Transacciones")}else h("success","✅ Registrado","Transacción aplicada con éxito.");else C.type==="complete_hold_transaction"?q.success&&h("success","✅ Transacción confirmada","Saldo actualizado"):C.type==="update_transaction"&&q.success&&h("success","✅ Actualizado","Transacción modificada")}}catch(I){u(),i("bot",`❌ <strong>Error:</strong> ${I.message}`)}finally{t=!1,c.disabled=!1,a.focus()}}}function ao(){try{const e=m.getSetting("theme","dark");if(document.documentElement.setAttribute("data-theme",e),!st()){bt();return}const t=G();Ge(t.workspaceId),m.invalidate(),Ke();try{et()}catch(o){console.warn("Alert generation error:",o)}yt()}catch(e){console.error("Init error:",e),document.getElementById("app").innerHTML=`<div style="padding:40px;color:#ff5252;font-family:monospace"><h2>Error de Inicialización</h2><pre>${e.message}
${e.stack}</pre></div>`}}function bt(){try{const e=document.getElementById("app");e.innerHTML="",e.appendChild(Jt(t=>{try{const o=G();Ge(o.workspaceId),m.invalidate(),Ke();try{et()}catch(l){console.warn("Alert generation error:",l)}yt(),t>0&&setTimeout(()=>{Ve(async()=>{const{showToast:l}=await Promise.resolve().then(()=>Wt);return{showToast:l}},void 0).then(({showToast:l})=>{l("success","✅ Datos migrados correctamente",`Tus ${t} colecciones de datos anteriores ya están en tu nuevo workspace.`)})},800)}catch(o){console.error("Post-login error:",o),document.getElementById("app").innerHTML=`<div style="padding:40px;color:#ff5252;font-family:monospace"><h2>Error Post-Login</h2><pre>${o.message}
${o.stack}</pre></div>`}}))}catch(e){console.error("Login screen error:",e)}}function yt(){var d,r,n,i,v,u;const e=document.getElementById("app"),t=Xe(),o=m.getSettings(),l=o.theme||"dark",s=o.themePalette||"azul-fintech",a=$e(),c=rt(),p=G();oe(s),(d=document.getElementById("ai-fab"))==null||d.remove(),(r=document.getElementById("chat-drawer"))==null||r.remove(),e.innerHTML=`
    <div class="app-shell" id="app-shell">
      <!-- Mobile overlay -->
      <div class="mobile-overlay" id="mobile-overlay"></div>

      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">${f("wallet",20)}</div>
          <span class="sidebar-logo-text">FinanzApp</span>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Principal</div>
            <button class="nav-item" data-route="/dashboard">
              ${f("dashboard",20)}
              <span class="nav-item-label">Dashboard</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Finanzas</div>
            <button class="nav-item" data-route="/accounts">
              ${f("bank",20)}
              <span class="nav-item-label">Cuentas Bancarias</span>
            </button>
            <button class="nav-item" data-route="/cards">
              ${f("creditCard",20)}
              <span class="nav-item-label">Tarjetas de Crédito</span>
            </button>
            <button class="nav-item" data-route="/transactions">
              ${f("transaction",20)}
              <span class="nav-item-label">Transacciones</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Gestión</div>
            <button class="nav-item" data-route="/subscriptions">
              ${f("subscription",20)}
              <span class="nav-item-label">Suscripciones</span>
            </button>
            <button class="nav-item" data-route="/debts">
              ${f("handCoins",20)}
              <span class="nav-item-label">Deudas</span>
            </button>
            <button class="nav-item" data-route="/receivables">
              ${f("arrowDown",20)}
              <span class="nav-item-label">Cuentas por Cobrar</span>
            </button>
            <button class="nav-item" data-route="/payables">
              ${f("arrowUp",20)}
              <span class="nav-item-label">Cuentas por Pagar</span>
            </button>
            <button class="nav-item" data-route="/pending" style="${m.filter("transactions",g=>g.estado==="hold").length>0?"color:#f59e0b":""}">
              ${f("clock",20)}
              <span class="nav-item-label">Pendientes ${m.filter("transactions",g=>g.estado==="hold").length>0?`<span style="background:#f59e0b;color:#000;font-size:0.6rem;padding:1px 5px;border-radius:10px;margin-left:4px">${m.filter("transactions",g=>g.estado==="hold").length}</span>`:""}</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Terceros</div>
            <button class="nav-item" data-route="/external_cards">
              ${f("creditCard",20)}
              <span class="nav-item-label">Tarjetas Externas</span>
            </button>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Avanzado</div>
            <button class="nav-item" data-route="/goals">
              ${f("goal",20)}
              <span class="nav-item-label">Metas Financieras</span>
            </button>
            <button class="nav-item" data-route="/tithe">
              ${f("tithe",20)}
              <span class="nav-item-label">Cálculo del 10%</span>
            </button>
            <button class="nav-item" data-route="/notes">
              ${f("fileText",20)}
              <span class="nav-item-label">Notas</span>
            </button>
            ${Se("manageUsers")?`
            <button class="nav-item" data-route="/users">
              ${f("users",20)}
              <span class="nav-item-label">Usuarios</span>
            </button>`:""}

            ${a!=null&&a.isSuperAdmin?`
            <div class="sidebar-section-title" style="margin-top:10px;color:var(--color-warning)">Administración Global</div>
            <button class="nav-item" data-route="/superadmin" style="color:var(--color-warning)">
              ${f("lock",20)}
              <span class="nav-item-label">Super Administrador</span>
            </button>`:""}
          </div>
        </nav>
        <div class="sidebar-footer">
          <!-- User info (click → profile) -->
          <div id="sidebar-user" style="padding:10px 12px;border-top:1px solid var(--border-color);margin-bottom:4px;display:flex;align-items:center;gap:10px;cursor:pointer;border-radius:8px;transition:background 0.2s" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-primary);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
              ${(a==null?void 0:a.avatar)||((i=(n=p==null?void 0:p.nombre)==null?void 0:n.charAt(0))==null?void 0:i.toUpperCase())||"?"}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(a==null?void 0:a.nombre)||"Usuario"}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(c==null?void 0:c.nombre)||"Workspace"}</div>
            </div>
            <span style="font-size:0.65rem;color:var(--text-muted)">${f("settings",12)}</span>
          </div>
          <button class="nav-item" data-route="/categories">
            ${f("category",20)}
            <span class="nav-item-label">Categorías</span>
          </button>
          <button class="nav-item" data-route="/settings">
            ${f("settings",20)}
            <span class="nav-item-label">Configuración</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="app-main">
        <header class="header">
          <div class="header-left">
            <button class="header-toggle" id="sidebar-toggle" title="Toggle sidebar">
              ${f("panelLeft",20)}
            </button>
            <div>
              <div class="header-title" id="header-title">Dashboard</div>
              <div class="header-subtitle" id="header-subtitle">Resumen financiero</div>
            </div>
          </div>
          <div class="header-right">
            <button class="header-action" id="theme-toggle" title="Cambiar tema">
              ${f(l==="dark"?"sun":"moon",20)}
            </button>
            <button class="header-action" data-route="/notifications" title="Notificaciones" style="position:relative">
              ${f("notification",20)}
              <span class="notif-badge" id="notif-badge" style="display:${t>0?"flex":"none"}">${t}</span>
            </button>
            <button class="header-action" id="logout-btn" title="Cerrar sesión">
              ${f("logout",20)}
            </button>
          </div>
        </header>
        <div id="page-content"></div>
      </main>

      <!-- Bottom Navigation for Mobile -->
      <nav class="bottom-nav">
        <button class="bottom-nav-item active" data-route="/dashboard">
          ${f("dashboard",24)}
          <span>Inicio</span>
        </button>
        <button class="bottom-nav-item" data-route="/transactions">
          ${f("transaction",24)}
          <span>Flujo</span>
        </button>
        <button class="bottom-nav-item" data-route="/cards">
          ${f("creditCard",24)}
          <span>Tarjetas</span>
        </button>
        <button class="bottom-nav-item" data-route="/debts">
          ${f("handCoins",24)}
          <span>Deudas</span>
        </button>
        <button class="bottom-nav-item" data-route="/settings">
          ${f("settings",24)}
          <span>Menú</span>
        </button>
      </nav>
    </div>
  `,document.querySelectorAll(".nav-item[data-route], .header-action[data-route], .bottom-nav-item[data-route]").forEach(g=>{g.addEventListener("click",()=>{var b,x;g.classList.contains("bottom-nav-item")&&(document.querySelectorAll(".bottom-nav-item").forEach($=>$.classList.remove("active")),g.classList.add("active")),M.navigate(g.dataset.route),(b=document.getElementById("sidebar"))==null||b.classList.remove("mobile-open"),(x=document.getElementById("mobile-overlay"))==null||x.classList.remove("show")})}),document.getElementById("sidebar-toggle").addEventListener("click",()=>{const g=document.getElementById("app-shell"),b=document.getElementById("sidebar");window.innerWidth<=768?(b.classList.toggle("mobile-open"),document.getElementById("mobile-overlay").classList.toggle("show")):(g.classList.toggle("sidebar-collapsed"),m.setSetting("sidebarCollapsed",g.classList.contains("sidebar-collapsed")))}),document.getElementById("mobile-overlay").addEventListener("click",()=>{document.getElementById("sidebar").classList.remove("mobile-open"),document.getElementById("mobile-overlay").classList.remove("show")}),m.getSetting("sidebarCollapsed")&&((v=document.getElementById("app-shell"))==null||v.classList.add("sidebar-collapsed")),document.getElementById("theme-toggle").addEventListener("click",()=>{const b=(document.documentElement.getAttribute("data-theme")||"dark")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",b),m.setSetting("theme",b),document.getElementById("theme-toggle").innerHTML=f(b==="dark"?"sun":"moon",20)}),document.getElementById("logout-btn").addEventListener("click",()=>{nt(),location.reload()}),M.register("/dashboard",Kt),M.register("/accounts",Xt),M.register("/cards",ra),M.register("/transactions",ia),M.register("/subscriptions",da),M.register("/debts",va),M.register("/receivables",ba),M.register("/payables",ha),M.register("/goals",Sa),M.register("/tithe",Aa),M.register("/notifications",qa),M.register("/categories",Ta),M.register("/settings",Se("viewSettings")?Fa:()=>{const g=document.createElement("div");return g.className="page-content",g.innerHTML='<div class="empty-state card"><h3>Acceso restringido</h3><p>No tienes permisos para ver la configuración.</p></div>',g}),M.register("/notes",Ha),M.register("/external_cards",Ga),M.register("/users",Se("manageUsers")?Ja:()=>{const g=document.createElement("div");return g.className="page-content",g.innerHTML='<div class="empty-state card"><h3>Acceso restringido</h3><p>Solo el administrador puede gestionar usuarios.</p></div>',g}),M.register("/superadmin",a!=null&&a.isSuperAdmin?Ya:()=>{const g=document.createElement("div");return g.className="page-content",g.innerHTML='<div class="empty-state card"><h3>Acceso denegado</h3><p>Requiere privilegios de Super Administrador.</p></div>',g}),M.register("/profile",Za),M.register("/pending",Xa),(u=document.getElementById("sidebar-user"))==null||u.addEventListener("click",()=>{M.navigate("/profile")}),M.beforeEach=g=>st()?!0:(bt(),!1),M.init("page-content"),to(),setInterval(()=>{de()},6e4)}document.addEventListener("DOMContentLoaded",ao);
