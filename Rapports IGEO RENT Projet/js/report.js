/* =================================================================
   report.js — v10
   · PDF via window.print() — pages A4 CSS parfaites, zéro débordement
   · Rapport : 6 pages denses et significatives
   · Présentation : plein écran réel, slides animés, navigation clavier
   ================================================================= */


var APP = {
  data:        null,
  dataByMonth: [],
  filterClient: '',   /* '' = tous */
  filterFrom:   '',   /* period key, '' = premier */
  filterTo:     '',   /* period key, '' = dernier */
  charts:      {},
  presCharts:  {},
  logoSize:    40,
  logo:        null,
  presSlide:   0,
  presSlides:  [],
  presActive:  false,
  activeTab:   0          /* 0 = rapport, 1 = tableaux */
};

/* ── Partage de PIE_COLORS défini dans data.js ── */

/* =================================================================
   BOOT
   ================================================================= */
window.addEventListener('DOMContentLoaded', function() {
  if (window.ChartDataLabels) Chart.register(ChartDataLabels);
  buildPageNav();
  initDragDrop();
  APP.data = MOCK;

  /* ── Logo embarqué : utiliser IGEO_LOGO_B64 directement ── */
  if (typeof IGEO_LOGO_B64 !== 'undefined' && IGEO_LOGO_B64) {
    APP.logo = IGEO_LOGO_B64;
    var svgEl = document.getElementById('tb-logo-svg');
    var imgEl = document.getElementById('tb-logo-img');
    var txtEl = document.getElementById('tb-logo-text');
    if (svgEl) svgEl.style.display = 'none';
    if (imgEl) { imgEl.src = APP.logo; imgEl.style.display = 'inline-block'; }
    if (txtEl) txtEl.style.display = 'none';
    var badge = document.getElementById('logo-badge');
    var badgeName = document.getElementById('logo-badge-name');
    if (badge) badge.style.display = 'flex';
    if (badgeName) badgeName.textContent = 'iGeo';
  }

  renderReport();

  /* ── Expose toutes les fonctions appelées depuis les attributs HTML ── */
  window.handleFileInput     = handleFileInput;
  window.handleLogoUpload    = handleLogoUpload;
  window.setLogoSize         = setLogoSize;
  window.resetToMock         = resetToMock;
  window.resetLogo           = resetLogo;
  window.generateDataContext = generateDataContext;
  window.exportPDF           = exportPDF;
  window.applyFilters        = applyFilters;
  window.updateFilterUI      = updateFilterUI;
  window.switchTab           = switchTab;
  window.togglePDFView       = togglePDFView;
  window.startPresentation   = startPresentation;
  window.stopPresentation    = stopPresentation;
  window.presNav             = presNav;
  window.presGo              = presGo;
  window.syncReco            = syncReco;
  window.generateAIAnalysis  = generateAIAnalysis;
  window.initPieChart          = initPieChart;
  window.handleMultiFileInput  = handleMultiFileInput;
  window.buildMaintenanceRecs  = buildMaintenanceRecs;
  window.parcPageNav           = parcPageNav;
  window.initLeafletMap      = initLeafletMap;
  window.syncMaint           = syncMaint;
  window.generateAIMaintenance = generateMaintenancePrompt;
});

/* =================================================================
   PAGE NAV
   ================================================================= */
var NAV_LABELS = ['Couverture','Statistiques','Dashboard','Analyses','Risques','Résumé'];
function buildPageNav() {
  var nav = document.getElementById('page-nav');
  NAV_LABELS.forEach(function(lbl, i) {
    var b = document.createElement('button');
    b.className = 'nav-pill'; b.textContent = i + 1; b.title = lbl;
    b.onclick = function() {
      var pages = document.querySelectorAll('.rp');
      if (pages[i]) pages[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    nav.appendChild(b);
  });
  document.getElementById('doc-scroll').addEventListener('scroll', function() {
    var pills = document.querySelectorAll('.nav-pill');
    var pages = document.querySelectorAll('.rp');
    var st = this.scrollTop, active = 0;
    pages.forEach(function(p, i) { if (p.offsetTop - 120 <= st) active = i; });
    pills.forEach(function(p, i) { p.classList.toggle('active', i === active); });
  });
}

/* =================================================================
   ORIENTATION / LOGO / HELPERS
   ================================================================= */
/* orientation removed — PDF is screen width */
function setLogoSize(sz) {
  APP.logoSize = sz;
  document.getElementById('logo-sz-val').textContent = sz;
  renderReport();
}
function handleLogoUpload(file) {
  if (!file) return;
  var r = new FileReader();
  r.onload = function(e) {
    APP.logo = e.target.result;
    document.getElementById('tb-logo-svg').style.display = 'none';
    var img = document.getElementById('tb-logo-img');
    img.src = APP.logo; img.style.display = 'inline-block';
    document.getElementById('tb-logo-text').style.display = 'none';
    document.getElementById('logo-badge').style.display = 'flex';
    document.getElementById('logo-badge-name').textContent = file.name;
    showToast('Logo chargé', 'ok'); renderReport();
  };
  r.readAsDataURL(file);
}
function resetLogo() {
  APP.logo = null;
  document.getElementById('tb-logo-svg').style.display = '';
  var img = document.getElementById('tb-logo-img');
  img.style.display = 'none'; img.src = '';
  document.getElementById('tb-logo-text').style.display = '';
  document.getElementById('logo-badge').style.display = 'none';
  document.getElementById('logo-input').value = '';
  showToast('Logo réinitialisé', 'ok'); renderReport();
}
function logoHTML(sz) {
  sz = sz || 32;
  if (APP.logo)
    return '<img src="' + APP.logo + '" style="height:' + sz + 'px;width:auto;object-fit:contain;display:inline-block;vertical-align:middle;" alt="logo">';
  return logoSVG(sz);
}
function logoSVG(sz) {
  return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 40 40" fill="none">' +
    '<circle cx="20" cy="20" r="20" fill="#3B82F6"/>' +
    '<circle cx="20" cy="15" r="6" fill="white"/>' +
    '<path d="M9 33 Q20 21 31 33" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="20" cy="9" r="2.5" fill="#EF4444"/></svg>';
}
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast toast-' + (type || 'ok') + ' show';
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}
function fmtN(n) { return Math.round(n).toLocaleString('fr'); }
function fmtDate(d) { return d ? d.split('-').reverse().join('/') : '?'; }
function fmtV(v) {
  v = Math.round(v || 0);
  if (v === 0) return '0';
  return v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 10000 ? Math.round(v/1000)+'k' : v.toLocaleString('fr');
}
function scoreCls(s) { return s >= 8 ? 'n-hi' : s >= 6 ? 'n-mid' : s >= 4 ? 'n-warn' : 'n-lo'; }
function statusOf(r) {
  if (!r.km) return ['Inactif','s-off'];
  if (r.score < 4 || r.spdKmInfr > 1500) return ['Critique','s-danger'];
  if (r.score < 6 || r.spdKmInfr > 500)  return ['À surveiller','s-warn'];
  return ['Actif','s-ok'];
}
function waveSVG() {
  return '<svg viewBox="0 0 900 400" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M0 0 Q250 120 500 60 Q750 0 900 80 L900 0 Z" fill="#EBF4FF" opacity=".8"/>' +
    '<path d="M0 0 Q200 80 450 40 Q700 0 900 60 L900 0 Z" fill="#DBEAFE" opacity=".5"/></svg>';
}
function displayN(n) {
  n = Math.round(n || 0);
  if (!n) return '0';
  var b = parseInt(fmtBracket(n), 10);
  return b.toLocaleString('fr') + (b !== n ? '*' : '');
}

/* ── Grilles Chart.js ── */
var GL = { display: true, color: 'rgba(148,163,184,0.2)', lineWidth: 0.8, drawBorder: false };
var GN = { display: false };
var TIP = {
  backgroundColor: '#1E293B', titleColor: '#F1F5F9', bodyColor: '#94A3B8',
  borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, padding: 10, cornerRadius: 8
};

/* ── Stack total label plugin ── */
Chart.register({
  id: 'stackLabel',
  afterDraw: function(chart) {
    if (!chart.config.options._stackLabels) return;
    var ctx = chart.ctx, unit = chart.config.options._unit || '';
    chart.data.labels.forEach(function(lbl, i) {
      var total = chart.data.datasets.reduce(function(s, ds) { return s + (Number(ds.data[i]) || 0); }, 0);
      if (!total) return;
      var refBar = null;
      for (var d = chart.data.datasets.length - 1; d >= 0; d--) {
        if (Number(chart.data.datasets[d].data[i]) > 0) {
          var m = chart.getDatasetMeta(d);
          if (m && m.data[i]) { refBar = m.data[i]; break; }
        }
      }
      if (!refBar) return;
      var txt = fmtV(total) + (unit && unit !== '/10' ? ' ' + unit : '');
      ctx.save();
      ctx.font = '700 10px Sora, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(txt, refBar.x, refBar.y - 5);
      ctx.restore();
    });
  }
});

/* =================================================================
   DRAG & DROP + EXCEL LOAD
   ================================================================= */
function initDragDrop() {
  var ov = document.getElementById('drop-overlay');
  ['dragenter','dragover'].forEach(function(e) {
    document.body.addEventListener(e, function(ev) { ev.preventDefault(); ov.classList.add('active'); });
  });
  ['dragleave','dragend'].forEach(function(e) {
    document.body.addEventListener(e, function(ev) {
      if (!ev.relatedTarget || !document.body.contains(ev.relatedTarget)) ov.classList.remove('active');
    });
  });
  document.body.addEventListener('drop', function(ev) {
    ev.preventDefault(); ov.classList.remove('active');
    var f = ev.dataTransfer.files[0];
    var validFiles = Array.from(e.dataTransfer.files).filter(function(f){ return /\.xlsx?$/i.test(f.name); });
    if (validFiles.length) handleMultiFileInput(validFiles);
    else if (f) showToast('Format .xlsx requis', 'err');
  });
}
function handleFileInput(f) { if (f) loadExcel(f); }
function handleMultiFileInput(files) {
  if (!files || !files.length) return;
  if (files.length === 1) { loadExcel(files[0]); return; }
  /* Multiple files: load all, keep current month as APP.data */
  var total = files.length, loaded = 0, results = [];
  Array.from(files).forEach(function(file) {
    var r = new FileReader();
    r.onload = function(e) {
      try {
        var wb = XLSX.read(e.target.result, { type:'array', raw:true, cellDates:false });
        var sRes = findSheet(wb,['resum','resume']) || wb.Sheets[wb.SheetNames[1]];
        var sEco = findSheet(wb,['co-cond','conduite','eco']) || wb.Sheets[wb.SheetNames[2]];
        var sSpd = findSheet(wb,['vitesse','vites','exces','xces']) || wb.Sheets[wb.SheetNames[3]];
        var sZon = findSheet(wb,['zone']) || wb.Sheets[wb.SheetNames[4]];
        if (!sRes) return;
        var raw = { resume:parseResume(sRes), eco:sEco?parseEco(sEco):[], ecoFull:sEco?parseEcoFull(sEco):[], speed:sSpd?parseSpeed(sSpd):[], zones:sZon?parseZones(sZon):[] };
        var agg = aggregateExcel(raw, file.name);
        results.push(agg);
      } catch(err) { showToast('Erreur '+file.name+': '+err.message,'err'); }
      loaded++;
      if (loaded === total) {
        /* Sort by dateFrom */
        results.sort(function(a,b){ return (a.dateFrom||'').localeCompare(b.dateFrom||''); });
        APP.dataByMonth = results;
        /* Most recent = current */
        APP.data = results[results.length-1];
        /* Compute trends */
        APP.data.trends = buildTrends(results);
        /* Recompute maintenance with cumulative km from all months */
        APP.data.maintenanceRecs = buildMaintenanceRecs(APP.data.tableRows, results);
        /* Update UI */
        updateMultiFileBadge();
        document.getElementById('upload-banner').style.display = 'none';
        showToast(results.length + ' fichiers chargés — ' + results.map(function(d){return d.period;}).join(', '), 'ok');
        renderReport();
      }
    };
    r.readAsArrayBuffer(file);
  });
}
function updateMultiFileBadge() {
  var badge = document.getElementById('file-badge');
  var name  = document.getElementById('file-name');
  var src   = document.getElementById('tb-source');
  if (APP.dataByMonth.length > 1) {
    badge.style.display = 'flex';
    name.textContent = APP.dataByMonth.length + ' fichiers · ' + APP.data.period;
    src.textContent  = APP.dataByMonth.length + ' fichiers chargés';
  } else if (APP.data) {
    badge.style.display = 'flex';
    name.textContent = APP.data.filename || APP.data.period;
    src.textContent  = APP.data.filename || APP.data.period;
  }
}
function loadExcel(file) {
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, { type:'array', raw:true, cellDates:false });
      var sRes = findSheet(wb,['resum','resume']) || wb.Sheets[wb.SheetNames[1]];
      var sEco = findSheet(wb,['co-cond','conduite','eco']) || wb.Sheets[wb.SheetNames[2]];
      var sSpd = findSheet(wb,['vitesse','vites','exces','xces']) || wb.Sheets[wb.SheetNames[3]];
      var sZon = findSheet(wb,['zone']) || wb.Sheets[wb.SheetNames[4]];
      if (!sRes) { showToast('Feuille Résumé introuvable','err'); return; }
      var raw = { resume:parseResume(sRes), eco:sEco?parseEco(sEco):[], ecoFull:sEco?parseEcoFull(sEco):[], speed:sSpd?parseSpeed(sSpd):[], zones:sZon?parseZones(sZon):[] };
      if (!raw.resume.length) { showToast('Aucun véhicule trouvé','err'); return; }
      APP.data = aggregateExcel(raw, file.name);
      document.getElementById('file-badge').style.display = 'flex';
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('upload-banner').style.display = 'none';
      document.getElementById('tb-source').textContent = file.name;
      showToast(raw.resume.length + ' enregistrements · ' + APP.data.tableRows.length + ' véhicules', 'ok');
      renderReport();
    } catch(err) { showToast('Erreur : ' + err.message, 'err'); }
  };
  r.readAsArrayBuffer(file);
}
function resetToMock() {
  APP.data = MOCK;
  document.getElementById('file-badge').style.display = 'none';
  document.getElementById('upload-banner').style.display = '';
  document.getElementById('tb-source').textContent = "Rapport d'activité flotte";
  showToast('Données de démonstration','ok'); renderReport();
}

/* ── Contexte IA ── */
function generateDataContext() {
  var d = APP.data;
  var sin = d.sinistralite || {};

  /* Résumé par client */
  var clientSummary = {};
  d.tableRows.forEach(function(r) {
    var c = r.client;
    if (!clientSummary[c]) clientSummary[c] = { score:0, n:0, infr:0, inactive:0, km:0 };
    clientSummary[c].km    += r.km;
    clientSummary[c].infr  += r.spdKmInfr + r.ecoKmInfr;
    clientSummary[c].n     += 1;
    clientSummary[c].score += r.score;
    if (r.km === 0) clientSummary[c].inactive++;
  });
  var clientLines = Object.keys(clientSummary).map(function(c) {
    var s = clientSummary[c];
    return c+': scoreM='+(s.score/s.n).toFixed(1)+' km='+s.km+' infr='+s.infr+' veh='+s.n+(s.inactive?' inactifs='+s.inactive:'');
  });
  var vLines = [];
  d.tableRows.forEach(function(r) {
    vLines.push('['+r.client+'] '+r.label
      +' score:'+r.score.toFixed(2)
      +' km:'+r.km+' vMax:'+r.vitMax
      +' infrVit:'+r.spdKmInfr+' infrEco:'+r.ecoKmInfr
      +(r.km===0?' INACTIF':'')
      +(r.nonImmat?' SANS_IMMAT(VIN:'+r.vin+')':''));
  });
  /* Non-immat vehicles section */
  var nonImmatVeh = d.tableRows.filter(function(r){ return r.nonImmat; });

  var prompt = 'Tu es expert en gestion de flotte pour le compte de la BOA (Banque Of Africa) Bénin, dans un contexte de leasing de véhicules.\n'    + 'L\'objectif de ce rapport est la PRÉSERVATION DE LA VALEUR DES ACTIFS (les véhicules en leasing) et la PRÉVENTION DES RISQUES SINISTRES.\n'    + 'Tes recommandations sont adressées à la BOA, pas aux conducteurs. Il n\'y a AUCUNE dimension disciplinaire.\n'    + 'Chaque "client" est un preneur de leasing responsable de la bonne utilisation des actifs BOA.\n'    + 'Tes alertes concernent la protection des véhicules, l\'usure anormale, et les risques d\'accident matériel.\n'    + 'À partir de ces données, génère UNIQUEMENT un objet JSON valide (sans aucun texte avant ou après, sans balises markdown) avec cette structure exacte :\n'
    + '{\n'
    + '  "recommandations": [\n'
    + '    { "client": "NOM_CLIENT", "statut": "alerte|attention|bon|excellent", "actions": ["action 1", "action 2"] }\n'
    + '  ],\n'
    + '  "actions_prioritaires": ["action globale 1", "action globale 2", "action globale 3"]\n'
    + '}\n\n'
    + 'Règles strictes :\n'    + '- statut "alerte"    = risque élevé pour l\'actif BOA (score < 5, excès vitesse graves, usure anormale)\n'    + '- statut "attention" = vigilance requise (score 5–7.5, sous-utilisation, infractions récurrentes)\n'    + '- statut "bon"       = actif bien préservé (score 7.5–9)\n'    + '- statut "excellent" = actif en excellente condition (score >= 9, aucune infraction)\n'    + '- Actions orientées PROTECTION DE L\'ACTIF : réduction usure, prévention sinistres, maintenance préventive\n'    + '- 1 à 3 actions par preneur, formulées du point de vue de la BOA (gestionnaire d\'actifs)\n'    + '- 3 actions prioritaires globales max (perspective portefeuille BOA)\n'    + '- Ton professionnel et factuel, pas d\'emoji dans les textes\n'    + '- Chaque preneur de leasing une seule fois\n\n'
    + 'RAPPORT '+d.reportTitle+' — '+d.period+'\n'
    + 'KM TOTAL: '+d.totalKm+' | SCORE MOY: '+d.avgScore+'/10 | ACTIFS: '+d.activeCount+'/'+d.totalVehicles+'\n'
    + 'RISQUE: '+sin.riskScore+'% (critiques:'+(sin.nCritiques||0)+' | à surveiller:'+(sin.nARisque||0)+')\n'
    + 'TAUX VIT: '+sin.tauxSpdExp+'% | TAUX ECO: '+sin.tauxEcoExp+'%\n\n'
    + 'RÉSUMÉ PAR CLIENT:\n'+clientLines.join('\n')
    + '\n\nDÉTAIL VÉHICULES:\n'+vLines.join('\n')
    + (nonImmatVeh && nonImmatVeh.length
        ? '\n\nVÉHICULES SANS IMMATRICULATION (identifier avec badge dans les recommandations) :\n'
          + nonImmatVeh.map(function(r){ return '['+r.client+'] '+r.label+' VIN:'+r.vin+' score:'+r.score.toFixed(2); }).join('\n')
        : '');

  function _doCopy(text, cb) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(cb).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        cb();
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      cb();
    }
  }
  _doCopy(prompt, function() {
    window.open('https://chatgpt.com', '_blank');
    showToast('Prompt copié — colle avec Ctrl+V dans ChatGPT ✓', 'ok');
  });
}

/* =================================================================
   EXPORT PDF — html2canvas bandes verticales, assemblage jsPDF
   Pas de découpage : on capture par tranches de 6000px et on les
   empile dans un seul document PDF continu pleine largeur
   ================================================================= */

/* ── Génère un SVG statique de la carte Bénin pour le PDF ── */
function buildStaticMapSVG() {
  var d = APP.data;
  var zones = d && d.zoneStats ? d.zoneStats : [];
  var maxKm = Math.max.apply(null, zones.map(function(z){return z.km;})) || 1;
  var deptData = {};
  zones.forEach(function(z){ deptData[z.dept] = z; });

  function deptCol(dept) {
    var z = deptData[dept];
    if (!z || z.km === 0) return '#DBEAFE';
    var i = z.km / maxKm;
    if (i > 0.8) return '#1E40AF';
    if (i > 0.6) return '#2563EB';
    if (i > 0.4) return '#3B82F6';
    if (i > 0.2) return '#60A5FA';
    return '#93C5FD';
  }

  var SVG_PATHS = {
    'Alibori':   'M75,10 L220,10 L232,28 L228,78 L195,98 L165,88 L138,98 L110,88 L72,98 L62,68 Z',
    'Atacora':   'M18,48 L75,10 L62,68 L72,98 L58,138 L36,148 L16,128 L13,88 Z',
    'Borgou':    'M72,98 L110,88 L138,98 L165,88 L195,98 L228,78 L232,28 L238,118 L218,168 L178,178 L148,172 L118,178 L88,163 L68,138 Z',
    'Donga':     'M16,128 L36,148 L58,138 L68,138 L88,163 L78,178 L48,195 L18,170 L13,140 Z',
    'Collines':  'M88,163 L118,178 L148,172 L178,178 L188,218 L172,248 L142,253 L112,248 L88,232 L78,198 Z',
    'Zou':       'M88,232 L112,248 L142,253 L172,248 L183,288 L162,313 L133,318 L103,313 L86,288 Z',
    'Plateau':   'M178,178 L218,168 L238,198 L233,238 L208,258 L183,263 L183,288 L172,248 L188,218 Z',
    'Mono':      'M52,328 L86,288 L103,313 L98,348 L78,368 L52,363 L43,343 Z',
    'Kouffo':    'M86,288 L103,313 L133,318 L128,353 L106,368 L88,363 L78,368 L98,348 Z',
    'Atlantique':'M98,348 L128,353 L158,348 L162,313 L133,318 L103,313 Z M78,368 L106,368 L128,353 L158,348 L168,378 L153,398 L118,403 L83,393 L63,378 Z',
    'Ouémé':     'M183,263 L208,258 L233,268 L238,318 L218,343 L193,353 L168,378 L162,313 L183,288 Z',
    'Littoral':  'M153,398 L168,378 L183,388 L193,403 L178,413 L158,413 Z'
  };
  var LABELS = {
    'Alibori':[152,55],'Atacora':[42,95],'Borgou':[155,138],
    'Donga':[42,162],'Collines':[133,215],'Zou':[133,283],
    'Plateau':[208,223],'Mono':[72,338],'Kouffo':[105,343],
    'Atlantique':[118,383],'Ouémé':[210,318],'Littoral':[172,405]
  };

  var paths = Object.keys(SVG_PATHS).map(function(dept) {
    return '<path d="'+SVG_PATHS[dept]+'" fill="'+deptCol(dept)+'" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>';
  }).join('');
  var labels = Object.keys(LABELS).map(function(dept) {
    var p = LABELS[dept];
    var z = deptData[dept];
    var bright = z && z.km/maxKm > 0.4;
    return '<text x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle" font-size="8" font-weight="700" font-family="Sora,sans-serif" fill="'+(bright?'white':'#334155')+'" pointer-events="none">'+dept+'</text>';
  }).join('');

  var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 260 430');
  svg.setAttribute('id','pdf-static-map');
  svg.style.cssText = 'width:100%;height:100%;display:block;background:#F8FAFC;border-radius:8px';
  svg.innerHTML = paths + labels;
  return svg;
}


/* =================================================================
   TOGGLE VUE PDF — masque tout sauf le rapport
   ================================================================= */
var _pdfViewActive = false;
var _pdfViewSaved  = [];

function togglePDFView() {
  var btn = document.getElementById('btn-pdf-view');
  var docScroll = document.getElementById('doc-scroll');

  if (!_pdfViewActive) {
    /* ── Passer en mode vue PDF ── */
    _pdfViewActive = true;

    /* Éléments à masquer — dédupliqués */
    var _raw = [
      document.getElementById('toolbar'),
      document.getElementById('upload-banner'),
      document.getElementById('tab-bar'),
      document.querySelector('.pres-overlay'),
      document.getElementById('laser-dot')
    ].concat(Array.from(document.querySelectorAll(
      '.rz-actions, .ai-status, .rz-input, .btn-ai, .anom-box'
    )));
    var _s = [];
    var toHide = _raw.filter(function(el){
      if (!el || _s.indexOf(el) >= 0) return false;
      _s.push(el); return true;
    });

    _pdfViewSaved = toHide.map(function(el) {
      var p = el.style.display;
      el.style.display = 'none';
      return { el: el, display: p };
    });

    /* Swap Leaflet → SVG statique */
    var leafletEl = document.getElementById('benin-leaflet-map');
    if (leafletEl) {
      leafletEl._savedHTML = leafletEl.innerHTML;
      leafletEl.innerHTML  = getStaticMapSVG();
      leafletEl.style.background       = '#F8FAFC';
      leafletEl.style.display          = 'flex';
      leafletEl.style.alignItems       = 'center';
      leafletEl.style.justifyContent   = 'center';
    }

    /* doc-scroll : fond neutre, pas de marges, pleine largeur */
    docScroll._savedStyle = {
      background:  docScroll.style.background,
      padding:     docScroll.style.padding,
      margin:      docScroll.style.margin,
    };
    docScroll.style.background = '#CDD5E0';
    docScroll.style.padding    = '20px 12px';
    docScroll.style.margin     = '0';

    /* Bouton flottant pour revenir */
    /* ── Barre de statut PDF View ── */
    var statusBar = document.createElement('div');
    statusBar.id = 'pdf-view-exit';
    var tabName = APP.activeTab === 1 ? '📋 Tableaux résumé clients' : '📊 Rapport analytique';
    statusBar.innerHTML =
      '<div style="display:flex;align-items:center;gap:14px;flex:1">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:#4ADE80;' +
          'box-shadow:0 0 8px #4ADE80;display:inline-block;animation:pdf-pulse 1.5s infinite"></span>' +
        '<span style="font-weight:700;color:white;font-size:13px">Vue PDF active</span>' +
        '<span style="color:#94A3B8;font-size:12px">— ' + tabName + '</span>' +
        '<span style="color:#64748B;font-size:11px">Lancez votre extension de capture</span>' +
      '</div>' +
      '<button onclick="togglePDFView()" style="padding:7px 16px;background:#EF4444;color:white;' +
        'border:none;border-radius:7px;font-family:Sora,sans-serif;font-size:12px;font-weight:700;' +
        'cursor:pointer;white-space:nowrap">✕ Quitter</button>';
    statusBar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
      'padding:12px 24px;background:rgba(15,23,42,.92);backdrop-filter:blur(8px);' +
      'border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;' +
      'font-family:Sora,sans-serif;gap:16px';
    document.body.appendChild(statusBar);

    /* Pulse animation */
    if (!document.getElementById('pdf-pulse-style')) {
      var styleEl = document.createElement('style');
      styleEl.id = 'pdf-pulse-style';
      styleEl.textContent = '@keyframes pdf-pulse{0%,100%{opacity:1}50%{opacity:.4}}';
      document.head.appendChild(styleEl);
    }

    window.scrollTo(0, 0);

  } else {
    /* ── Restaurer l'interface ── */
    _pdfViewActive = false;

    _pdfViewSaved.forEach(function(s){ s.el.style.display = s.display; });
    _pdfViewSaved = [];

    /* Restore doc-scroll */
    if (docScroll._savedStyle) {
      docScroll.style.background = docScroll._savedStyle.background;
      docScroll.style.padding    = docScroll._savedStyle.padding;
      docScroll.style.margin     = docScroll._savedStyle.margin;
      delete docScroll._savedStyle;
    }

    /* Restore Leaflet */
    var leafletEl = document.getElementById('benin-leaflet-map');
    if (leafletEl && leafletEl._savedHTML !== undefined) {
      leafletEl.innerHTML           = leafletEl._savedHTML;
      leafletEl.style.background    = '';
      leafletEl.style.display       = '';
      leafletEl.style.alignItems    = '';
      leafletEl.style.justifyContent = '';
      delete leafletEl._savedHTML;
      setTimeout(function(){ initLeafletMap(); }, 100);
    }

    /* Remove exit button */
    var exitBtn = document.getElementById('pdf-view-exit');
    if (exitBtn) exitBtn.remove();
  }
}


function exportPDF() {
  var jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { showToast('jsPDF non disponible — connexion requise', 'err'); return; }

  /* ── Masquer toolbar, bannière, toast, tab-bar, éléments no-print ── */
  /* Dédupliquer toHide pour éviter qu'un élément soit restauré à 'none'
     (ex: toolbar est dans la liste ET dans .no-print) */
  var _toHideRaw = [
    document.getElementById('toolbar'),
    document.getElementById('upload-banner'),
    document.getElementById('tab-bar'),
    document.querySelector('.pres-overlay'),
    document.getElementById('laser-dot'),
    document.getElementById('toast')
  ].concat(Array.from(document.querySelectorAll(
    '.rz-actions, .ai-status, .rz-input, .btn-ai, .anom-box'
  )));
  /* Déduplication par référence d'élément */
  var _seen = [];
  var toHide = _toHideRaw.filter(function(el) {
    if (!el || _seen.indexOf(el) >= 0) return false;
    _seen.push(el);
    return true;
  });
  var savedDisplay = toHide.map(function(el){ var p = el.style.display; el.style.display = 'none'; return p; });

  /* ── Swap Leaflet → SVG statique (onglet rapport seulement) ── */
  /* ── Resize charts ── */
  Object.keys(APP.charts).forEach(function(id){ if (APP.charts[id]) APP.charts[id].resize(); });

  /* ── Re-centre la carte Leaflet avant capture ── */
  if (APP._leafletInstance && APP.activeTab === 0) {
    APP._leafletInstance.invalidateSize({ animate: false });
    if (APP._leafletBounds) {
      APP._leafletInstance.fitBounds(APP._leafletBounds, { animate: false, padding: [10,10] });
    }
  }

  function restore() {
    toHide.forEach(function(el, i){ el.style.display = savedDisplay[i]; });
  }

  /* ── Expand doc-scroll + marges correctes ── */
  var docScroll = document.getElementById('doc-scroll');
  var savedH   = docScroll.style.height;
  var savedOF  = docScroll.style.overflow;
  var savedPad = docScroll.style.padding;
  var savedBg  = docScroll.style.background;
  docScroll.style.height     = 'auto';
  docScroll.style.overflow   = 'visible';
  docScroll.style.padding    = '20px 12px 30px';
  docScroll.style.background = '#CDD5E0';

  /* ── S'assurer que seul le bon onglet est visible ── */
  var reportRoot = document.getElementById('report-root');
  var tableRoot  = document.getElementById('table-root');
  var savedRR = reportRoot.style.display;
  var savedTR = tableRoot ? tableRoot.style.display : null;

  if (APP.activeTab === 1) {
    reportRoot.style.display = 'none';
    if (tableRoot) tableRoot.style.display = '';
  } else {
    reportRoot.style.display = '';
    if (tableRoot) tableRoot.style.display = 'none';
  }

  function restoreScroll() {
    docScroll.style.height     = savedH;
    docScroll.style.overflow   = savedOF;
    docScroll.style.padding    = savedPad;
    docScroll.style.background = savedBg;
    reportRoot.style.display   = savedRR;
    if (tableRoot) tableRoot.style.display = savedTR;
  }

  /* Extra delay for Leaflet to finish re-rendering (1.2s) */
  setTimeout(function() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;

    var SCALE    = 2;
    var BAND_H   = 3000;
    var totalW   = docScroll.clientWidth || 1100;
    var totalH   = docScroll.scrollHeight;
    var numBands = Math.ceil(totalH / BAND_H);
    var tabSuffix = APP.activeTab === 1 ? '_Tableaux' : '';
    var period    = (APP.data && APP.data.period) ? APP.data.period.replace(/\s+/g, '_') : 'rapport';

    var doc = new jsPDF({
      orientation: 'portrait',
      unit:        'px',
      format:      [totalW, totalH],
      hotfixes:    ['px_scaling']
    });

    var capturedBands = 0;
    var bandImages    = new Array(numBands);

    function captureBand(bi) {
      var yStart   = bi * BAND_H;
      var bandCssH = Math.min(BAND_H, totalH - yStart);

      html2canvas(docScroll, {
        scale:           SCALE,
        useCORS:         true,
        allowTaint:      true,
        backgroundColor: '#CDD5E0',
        scrollX:         0,
        scrollY:         0,
        x:               0,
        y:               yStart,
        width:           totalW,
        height:          bandCssH,
        windowWidth:     totalW,
        windowHeight:    totalH,
        logging:         false,
        foreignObjectRendering: false,  /* keep false — more compatible */
        imageTimeout:    15000,
        onclone: function(clonedDoc) {
          var cs = clonedDoc.getElementById('doc-scroll');
          if (cs) { cs.style.height = 'auto'; cs.style.overflow = 'visible'; }
          var ct = clonedDoc.getElementById('toast');
          if (ct) ct.style.display = 'none';
          var tb = clonedDoc.getElementById('tab-bar');
          if (tb) tb.style.display = 'none';
        }
      }).then(function(canvas) {
        bandImages[bi] = {
          data:   canvas.toDataURL('image/jpeg', 0.98),
          yStart: yStart,
          h:      bandCssH
        };
        capturedBands++;

        if (capturedBands === numBands) {
          /* ── Assembler et sauvegarder ── */
          try {
            for (var i = 0; i < bandImages.length; i++) {
              var b = bandImages[i];
              doc.addImage(b.data, 'PNG', 0, b.yStart, totalW, b.h);
            }
            doc.save('iGeo_Fleet_' + period + tabSuffix + '.pdf');
          } catch(e) {
            showToast('Erreur assemblage : ' + e.message, 'err');
          }
          /* ── Restaurer dans tous les cas, avec délai pour laisser
                 doc.save() déclencher le téléchargement avant le repaint ── */
          setTimeout(function() {
            restoreScroll();
            restore();
            showToast('PDF téléchargé ✓', 'ok');
          }, 100);
        } else {
          captureBand(capturedBands);
        }
      }).catch(function(err) {
        restoreScroll();
        restore();
        showToast('Erreur : ' + err.message, 'err');
      });
    }

    captureBand(0);

  }, 1200);
}








/* ── Format age en mois/années ── */
function formatAge(ageYears) {
  if (ageYears === null || ageYears === undefined) return '—';
  var totalMonths = Math.round(ageYears * 12);
  if (totalMonths <= 0) return '< 1 mois';
  if (totalMonths < 12) return totalMonths + ' mois';
  var years = Math.floor(totalMonths / 12);
  var months = totalMonths % 12;
  var yStr = years + (years > 1 ? ' ans' : ' an');
  if (months === 0) return yStr;
  return yStr + ' ' + months + ' mois';
}

/* =================================================================
   RENDER PIPELINE
   ================================================================= */
/* =================================================================
   ONGLETS — rapport analytique / tableaux résumé
   ================================================================= */
function switchTab(idx) {
  APP.activeTab = idx;

  var reportRoot = document.getElementById('report-root');
  var tableRoot  = document.getElementById('table-root');

  /* Show/hide roots */
  reportRoot.style.display = idx === 0 ? '' : 'none';
  tableRoot.style.display  = idx === 1 ? '' : 'none';

  /* Update tab buttons */
  [0, 1].forEach(function(i) {
    var btn = document.getElementById('tab-btn-' + i);
    if (btn) {
      btn.classList.toggle('tab-active', i === idx);
    }
  });

  /* Update PDF button label */
  var pdfBtn = document.getElementById('btn-export-pdf');
  if (pdfBtn) {
    pdfBtn.title = idx === 0
      ? 'Télécharger le rapport analytique en PDF'
      : 'Télécharger les tableaux résumé clients en PDF';
  }

  /* Resize charts if switching back to analytics tab */
  if (idx === 0) {
    setTimeout(function() {
      Object.keys(APP.charts).forEach(function(id){ if(APP.charts[id]) APP.charts[id].resize(); });
    }, 100);
  }

  window.scrollTo(0, 0);
}


function renderReport() {
  destroyCharts();
  var root  = document.getElementById('report-root');
  var troot = document.getElementById('table-root');
  var d = APP.data;
  root.innerHTML  = '';
  if (troot) troot.innerHTML = '';

  var pages = [
    buildPage1(d),    /* Couverture */
    buildPage2(d),    /* Statistiques */
    buildPagePie(d),  /* Pie hiérarchique flotte */
    buildPageDash(d), /* Dashboard KPIs */
    buildPageCharts(d),  /* Analyses graphiques */
    buildPageEco(d),     /* Éco-conduite par type */
    buildPageParc(d),    /* Croissance du parc */
    d.trends ? buildPageTrends(d) : null, /* Trends multi-mois */
    buildPageDaily(d),   /* Courbe km journalier */
    buildPageMap(d),     /* Carte Bénin + zones */
    buildPageReco(d), /* Sinistralité + Recommandations */
    buildPageMaintenance(d), /* Maintenance préventive */
    buildTablePages(d), /* Tableau résumé (multi si besoin) */
  ];

  pages.forEach(function(p) {
    if (!p) return;
    if (Array.isArray(p)) {
      p.forEach(function(pp) {
        if (!pp) return;
        /* Table pages go to table-root, everything else to report-root */
        var dest = (pp.classList && pp.classList.contains('rp-table') && troot) ? troot : root;
        dest.appendChild(pp);
      });
    } else {
      var dest = (p.classList && p.classList.contains('rp-table') && troot) ? troot : root;
      dest.appendChild(p);
    }
  });

  setTimeout(function() {
    initCharts(d);
    buildPresSlides(d);
    initPieChart();
    initLeafletMap();
    switchTab(APP.activeTab || 0);
    updateFilterUI();
  }, 200);
}

/* ── Shared helpers ── */
function mkEl(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function pageHeader(icon, title, subtitle, color) {
  color = color || '#3B82F6';
  var sz = Math.max(20, Math.min(APP.logoSize - 10, 36));
  return '<div class="ph">' +
    '<div class="ph-left">' +
      '<div class="ph-icon" style="background:' + color + '20;color:' + color + '">' + icon + '</div>' +
      '<div class="ph-txt"><div class="ph-title">' + title + '</div><div class="ph-sub">' + subtitle + '</div></div>' +
    '</div>' +
    '<div class="ph-logo">' + logoHTML(sz) + (!APP.logo ? '<span class="brand-text" style="font-size:13px">igeo</span>' : '') + '</div>' +
  '</div><div class="ph-rule" style="background:linear-gradient(90deg,' + color + ',' + color + '40 60%,transparent)"></div>';
}
function pageFooter(period) {
  return '<div class="pf"><span class="pf-p">' + period + '</span><span class="pf-b">iGeo Fleet</span></div>';
}
function scoreLegend() {
  return '<div class="score-leg">' +
    '<span class="sl-it n-hi">≥ 8 Excellent</span>' +
    '<span class="sl-it n-mid">6–7 Bon</span>' +
    '<span class="sl-it n-warn">4–5 Moyen</span>' +
    '<span class="sl-it n-lo">< 4 Insuffisant</span>' +
    '</div>';
}

/* =================================================================
   PAGE 1 — COUVERTURE
   ================================================================= */
function buildPage1(d) {
  var p = mkEl('div', 'rp rp-cover');
  var sz = APP.logoSize;

  /* Couverture horizontale — pleine largeur écran */
  p.innerHTML =
    '<div class="cov-land">' +
      '<div class="cov-land-l">' +
        '<div class="cov-waves">' + waveSVG() + '</div>' +
        '<div class="cov-logo">' + logoHTML(sz) +
          (!APP.logo ? '<span class="brand-text" style="font-size:' + Math.round(sz * 0.6) + 'px">igeo</span>' : '') +
        '</div>' +
        '<div class="cov-body">' +
          '<div class="cov-tag">RAPPORT D\'ACTIVIT\u00c9</div>' +
          '<h1 class="cov-title">' + d.reportTitle.replace('RAPPORT ACTIVITE ', '') + '</h1>' +
          '<p class="cov-client">' + d.clientName + '</p>' +
          '<div class="cov-line"></div>' +
          '<p class="cov-period">' + d.period + '</p>' +
          '<p class="cov-dates">' + fmtDate(d.dateFrom) + ' \u2014 ' + fmtDate(d.dateTo) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="cov-land-r">' +
        '<p class="cov-section-lbl">Aper\u00e7u de la p\u00e9riode</p>' +
        '<div class="cov-kpi-grid">' +
          covKpi(fmtN(d.totalKm), 'km parcourus', '\ud83d\uddfa') +
          covKpi(d.totalVehicles, 'v\u00e9hicules', '\ud83d\ude97') +
          covKpi(d.activeCount, 'actifs', '\u2705') +
          covKpi(d.avgScore.toFixed(1) + '/10', 'score moyen', '\ud83d\udcca') +
          covKpi(fmtN(d.totalSpd) + ' km', 'km en infraction', '\u26a0\ufe0f') +
          covKpi(d.maxSpeed + ' km/h', 'vitesse max', '\ud83c\udfce') +
        '</div>' +
      '</div>' +
    '</div>';

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}
function covKpi(val, lbl, icon) {
  return '<div class="cov-kpi"><div class="cov-kpi-icon">' + icon + '</div>' +
    '<div class="cov-kpi-val">' + val + '</div>' +
    '<div class="cov-kpi-lbl">' + lbl + '</div></div>';
}

/* =================================================================
   PAGE 2 — STATISTIQUES + TYPES + M\u00c9THODE SCORE
   ================================================================= */
function buildPage2(d) {
  var p = mkEl('div', 'rp rp-stats');

  var ageStr = formatAge(d.avgAge);
  var kpis = '<div class="kpi-strip">' +
    kpiCard(fmtN(d.totalKm) + ' km', 'Kilom\u00e9trage', '#3B82F6') +
    kpiCard(d.totalVehicles,          'V\u00e9hicules',   '#0EA5E9') +
    kpiCard(d.activeCount,            'Actifs',      '#10B981') +
    kpiCard(d.avgScore.toFixed(1) + '/10', 'Score moy.', '#F59E0B') +
    kpiCard(fmtN(d.totalSpd) + ' km', 'Km infr. vit.', '#EF4444') +
    kpiCard(ageStr, '\u00c2ge moy. flotte', '#8B5CF6') +
  '</div>';

  var typeBar =
    '<div class="section-card">' +
      '<div class="sc-ttl">Types de v\u00e9hicules</div>' +
      '<div class="hbar-wrap" id="hbar-wrap"><canvas id="hbar-types"></canvas></div>' +
    '</div>';

  var method =
    '<div class="section-card method-card">' +
      '<div class="sc-ttl">M\u00e9thode \u2014 Score composite /10</div>' +
      '<div class="method-grid">' +
        mItem('40%', '\u00c9co-conduite',  'Note feuille \u00c9co-conduite', '#3B82F6') +
        mItem('25%', 'Infr. vitesse', 'Km d\u00e9passement / km total', '#EF4444') +
        mItem('20%', 'P\u00e9nalit\u00e9s \u00e9co', 'Km infr. \u00e9co / km total', '#F59E0B') +
        mItem('10%', 'Vit. max',      'Malus >100/120/140/160 km/h', '#8B5CF6') +
        mItem('5%',  'Activit\u00e9',      'Bonus km relatif au parc', '#10B981') +
      '</div>' +
    '</div>';

  p.innerHTML = pageHeader('\ud83d\udcca', 'Statistiques globales',
    'R\u00e9partition de la flotte \u2014 ' + d.period, '#3B82F6') +
    '<div class="stats-port">' + kpis + typeBar + '</div>';

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}
function kpiCard(val, lbl, color) {
  return '<div class="kpc" style="border-top:3px solid ' + color + '">' +
    '<div class="kpc-v" style="color:' + color + '">' + val + '</div>' +
    '<div class="kpc-l">' + lbl + '</div></div>';
}
function mItem(pct, name, desc, color) {
  return '<div class="mi">' +
    '<div class="mi-pct" style="color:' + color + ';border-color:' + color + '30;background:' + color + '0d">' + pct + '</div>' +
    '<div class="mi-body"><div class="mi-name">' + name + '</div><div class="mi-desc">' + desc + '</div></div>' +
  '</div>';
}

/* =================================================================
   PAGE 3 — DASHBOARD
   ================================================================= */
function buildPageDash(d) {
  var p = mkEl('div', 'rp rp-dash');
  var dash = d.dashboard || {};
  var kpis = dash.kpis || {};

  /* Top 3 panels — use real previous month if available */
  var prevD = (APP.dataByMonth && APP.dataByMonth.length >= 2)
    ? APP.dataByMonth[APP.dataByMonth.length - 2]
    : null;
  var kmRef      = prevD ? prevD.totalKm      : Math.round(d.totalKm * 0.87);
  var scoreRef   = prevD ? prevD.avgScore     : 7.5;
  var scoreSub   = prevD ? 'vs ' + prevD.period : 'vs cible 7.5/10';
  var kmSub      = prevD ? 'vs ' + prevD.period : 'vs période préc.';
  var tauxActCur = d.activeCount && d.totalVehicles ? Math.round(d.activeCount / d.totalVehicles * 100) : (kpis.tauxAct || 0);
  var tauxActRef = prevD && prevD.totalVehicles ? Math.round(prevD.activeCount / prevD.totalVehicles * 100) : null;
  var tauxActSub = tauxActRef !== null
    ? 'vs ' + tauxActRef + '% (' + prevD.period + ')'
    : (kpis.inactifCount||0) + ' inactif(s)';

  var panels = '<div class="dash-panels">' +
    dashPanel('KM MENSUELS', kmSub,
      '<span class="dp-big">' + fmtN(d.totalKm) + ' km</span>' + deltaChip(d.totalKm, kmRef, 'km'),
      '<canvas id="dash-km" style="height:70px"></canvas>') +
    dashPanel('SCORE ÉCO', scoreSub,
      '<span class="dp-big">' + d.avgScore.toFixed(2) + '/10</span>' + deltaChip(d.avgScore, scoreRef, ''),
      '<canvas id="dash-eco" style="height:70px"></canvas>') +
    dashPanel('TAUX D\'ACTIVITÉ', tauxActSub,
      '<span class="dp-big">' + tauxActCur + '%</span>',
      '') +
  '</div>';

  /* KPI gauges */
  function gauge(label, val, target, pct, color, sub) {
    pct = Math.max(0, Math.min(100, pct));
    var sweep = Math.PI * pct / 100;
    var r = 36, cx = 50, cy = 50;
    var ex = cx + r * Math.cos(Math.PI + sweep), ey = cy + r * Math.sin(Math.PI + sweep);
    var pathBg = 'M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy;
    var pathFg = 'M '+(cx-r)+' '+cy+' A '+r+' '+r+' 0 '+(sweep>=Math.PI?1:0)+' 1 '+ex+' '+ey;
    return '<div class="gauge-card">' +
      '<svg viewBox="0 0 100 58" style="width:80px;height:46px">' +
        '<path d="'+pathBg+'" fill="none" stroke="#E2E8F0" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="'+pathFg+'" fill="none" stroke="'+color+'" stroke-width="8" stroke-linecap="round"/>' +
        '<text x="50" y="45" text-anchor="middle" style="font-size:8.5px;font-family:JetBrains Mono;font-weight:700;fill:'+color+'">'+val+'</text>' +
      '</svg>' +
      '<div class="gc-lbl">' + label + '</div>' +
      '<div class="gc-ref">Réf: ' + target + '</div>' +
      '<div class="gc-sub">' + sub + '</div>' +
    '</div>';
  }
  var gauges = '<div class="gauge-row">' +
    gauge('KM MOY/VÉH.',       fmtN(kpis.avgKm||0)+' km', fmtN(Math.round((kpis.avgKm||0)*1.1))+' km',
      Math.min(100,Math.round((kpis.avgKm||0)/Math.max(1,(kpis.avgKm||0)*1.1)*100)), '#3B82F6', 'Objectif +10%') +
    gauge('H. MOTEUR MOY.',    (kpis.avgH||0)+' h', Math.round((kpis.avgH||0)*1.15)+' h',
      Math.min(100,Math.round((kpis.avgH||0)/Math.max(1,(kpis.avgH||0)*1.15)*100)), '#0EA5E9', 'Temps conduite actif') +
    gauge('SCORE ÉCO MOY.',    (kpis.avgEcoScore||0).toFixed(1)+'/10', '7.5/10',
      Math.min(100,Math.round((kpis.avgEcoScore||0)/10*100)), '#10B981', 'Note éco-conduite') +
    gauge('KM INFR. VIT.',     displayN(kpis.totalSpdKm||0)+' km', '0 idéal',
      Math.max(0,100-Math.min(100,Math.round((kpis.totalSpdKm||0)/(d.totalKm||1)*300))), '#EF4444', 'Distance dépassement') +
    gauge('KM INFR. ÉCO',     displayN(kpis.totalEcoKm||0)+' km', '0 idéal',
      Math.max(0,100-Math.min(100,Math.round((kpis.totalEcoKm||0)/(d.totalKm||1)*200))), '#F59E0B', 'Conduite brusque') +
    gauge('DURÉE MOY. ARRÊT',  (kpis.avgArrets||0)+' h', 'Suivi', 60, '#64748B', 'Immobilisation moy./véh.') +
  '</div>';

  p.innerHTML = pageHeader('📈', 'Dashboard analytique', 'Indicateurs de performance — ' + d.period, '#6366F1') +
    panels + gauges;
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}
function dashPanel(title, sub, hero, chartHtml) {
  return '<div class="dp-card"><div class="dp-head"><div class="dp-title">' + title + '</div>' +
    (sub ? '<div class="dp-sub">' + sub + '</div>' : '') + '</div>' +
    '<div class="dp-hero">' + hero + '</div>' +
    (chartHtml ? '<div class="dp-chart-wrap">' + chartHtml + '</div>' : '') +
  '</div>';
}
function deltaChip(val, ref, unit) {
  var diff = val - ref, up = diff >= 0;
  var pct = ref ? Math.abs(diff/ref*100).toFixed(1) : '0';
  return '<span class="delta ' + (up?'delta-up':'delta-dn') + '">' + (up?'▲':'▼') +
    ' ' + (up?'+':'') + (typeof val === 'number' && val < 20 ? diff.toFixed(2) : fmtN(Math.abs(Math.round(diff)))) +
    (unit ? ' '+unit : '') + ' (' + pct + '%) vs préc.</span>';
}

/* =================================================================
   PAGE 4 — ANALYSES GRAPHIQUES (km + infractions en stacked)
   ================================================================= */
var CHART_CFGS = [
  { id:'cf-km',   key:'km',   title:'Kilométrage par client/véhicule', unit:'km',  yLbl:'Km',       color:'#3B82F6' },
  { id:'cf-infr', key:'infr', title:'Km en infraction vitesse',        unit:'km',  yLbl:'Km infr.',  color:'#EF4444' },
];

function buildPageCharts(d) {
  var p = mkEl('div', 'rp rp-charts');
  var cards = CHART_CFGS.map(function(cfg) {
    return '<div class="chart-card">' +
      '<div class="chart-card-ttl" style="color:' + cfg.color + '">' + cfg.title + '</div>' +
      '<div class="chart-card-wrap"><canvas id="' + cfg.id + '"></canvas></div>' +
    '</div>';
  }).join('');
  p.innerHTML = pageHeader('📉', 'Analyse graphique', 'Performance de la flotte — ' + d.period, '#0EA5E9') +
    '<div class="charts-grid">' + cards + '</div>';
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}




/* =================================================================
   PAGE MAINTENANCE PRÉVENTIVE
   ================================================================= */
function buildPageMaintenance(d) {
  var p    = mkEl('div', 'rp rp-maint');
  var recs = d.maintenanceRecs || [];

  /* Re-compute with multi-month data if available */
  if (APP.dataByMonth && APP.dataByMonth.length > 1 && d.tableRows) {
    recs = buildMaintenanceRecs(d.tableRows, APP.dataByMonth);
  }

  var URGENCY = {
    'danger':  { icon:'🔴', lbl:'Urgent',    cls:'maint-danger'  },
    'warning': { icon:'🟡', lbl:'Planifier', cls:'maint-warning' },
    'info':    { icon:'🔵', lbl:'À surveiller', cls:'maint-info' },
    'ok':      { icon:'🟢', lbl:'OK',        cls:'maint-ok'      }
  };

  /* Stats chips */
  var nDanger  = recs.filter(function(r){return r.urgency==='danger';}).length;
  var nWarning = recs.filter(function(r){return r.urgency==='warning';}).length;
  var nInfo    = recs.filter(function(r){return r.urgency==='info';}).length;
  var nOk      = recs.filter(function(r){return r.urgency==='ok';}).length;
  var isEst    = recs.some(function(r){return r.cumKmEst;});

  var FREQ_LEGEND = [
    { dot:'🔴', lbl:'Mensuel–2 mois' },
    { dot:'🟠', lbl:'3–4 mois'       },
    { dot:'🟡', lbl:'5–6 mois'        },
    { dot:'🟢', lbl:'Annuel'          },
    { dot:'🟣', lbl:'2 ans+'          }
  ];

  var chips =
    '<div class="maint-header-row">' +
      '<div class="maint-alert-counts">' +
        '<div class="maint-count-chip"><span class="maint-count-n" style="color:#EF4444">'+nDanger+'</span><span class="maint-count-lbl">Urgent</span></div>' +
        '<div class="maint-count-chip"><span class="maint-count-n" style="color:#F59E0B">'+nWarning+'</span><span class="maint-count-lbl">À planifier</span></div>' +
        '<div class="maint-count-chip"><span class="maint-count-n" style="color:#3B82F6">'+nInfo+'</span><span class="maint-count-lbl">À surveiller</span></div>' +
        '<div class="maint-count-chip"><span class="maint-count-n" style="color:#10B981">'+nOk+'</span><span class="maint-count-lbl">OK</span></div>' +
      '</div>' +
      '<div class="maint-freq-legend">' +
        '<div class="mfl-title">Fréquence entretien</div>' +
        '<div class="mfl-badges">' +
          FREQ_LEGEND.map(function(f){ return '<span class="mfl-item"><span class="mfl-dot">'+f.dot+'</span><span class="mfl-lbl">'+f.lbl+'</span></span>'; }).join('') +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="maint-method">' +
      '<div class="maint-method-col">' +
        '<div class="maint-method-ttl">Fréquence entretien</div>' +
        '<div class="maint-method-txt">Basée sur l\'age du véhicule : moins d\'1 an → tous les 6 mois · 1–2 ans → 1 fois par an · plus de 2 ans → tous les 2 ans. Réduite pour usage intensif (&gt;3 000 km/mois) et véhicules lourds.</div>' +
      '</div>' +
      '<div class="maint-method-col">' +
        '<div class="maint-method-ttl">Alertes actives</div>' +
        '<div class="maint-method-txt">Basées sur les km cumulés estimés. Seuils calibrés routes africaines par type : Moto 2 500 km · Léger 5 000 km · Camion 4 000 km · Poids-Lourds 3 500 km.</div>' +
      '</div>' +
    '</div>';

  /* Sort: danger first, then warning, then info, then ok */
  var ORDER = {danger:0,warning:1,info:2,ok:3};
  var sorted = recs.slice().sort(function(a,b){ return ORDER[a.urgency]-ORDER[b.urgency]; });

  var rows = sorted.map(function(r, i) {
    var u = URGENCY[r.urgency] || URGENCY['ok'];
    var ageStr = formatAge(r.age);
    var cumStr = r.cumKm >= 1000
      ? Math.round(r.cumKm/1000).toLocaleString('fr')+'k km'+(r.cumKmEst?' *':'')
      : r.cumKm+' km'+(r.cumKmEst?' *':'');
    var alertList = r.alerts.map(function(a){
      return '<span class="maint-alert-tag maint-'+a.urgency+'">'+a.label+'</span>';
    }).join(' ');
    var noAlertMsg = '<span style="color:var(--subtle);font-size:11px">Aucune maintenance préventive requise</span>';
    var immatBadge = r.nonImmat ? ' <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:3px;font-size:8px;padding:1px 4px">⏳</span>' : '';

    /* Freq cell — emoji dot + label */
    var freqCell = r.freq
      ? '<span class="maint-freq-inline"><span class="mfl-dot">'+r.freq.dot+'</span><span class="mfl-lbl">'+r.freq.lbl+'</span></span>'
      : '<span style="color:var(--subtle);font-size:11px">Inactif ce mois</span>';

    return '<tr class="'+(i%2?'tr-o':'tr-e')+'">' +
      '<td class="td-l">'+r.label+immatBadge+'</td>' +
      '<td>'+r.client+'</td>' +
      '<td style="font-size:11px">'+r.type+'</td>' +
      '<td class="td-m" style="color:#7C3AED;font-weight:600">'+ageStr+'</td>' +
      '<td class="td-m">'+r.kmMon.toLocaleString('fr')+' km</td>' +
      '<td class="td-m" style="color:var(--muted)">'+cumStr+'</td>' +
      '<td class="maint-td-freq">'+freqCell+'</td>' +
      '<td class="maint-td-alerts">'+(r.alerts.length ? alertList : '<span style="color:var(--subtle);font-size:11px">—</span>')+'</td>' +
    '</tr>';
  }).join('');

  var disclaimer = isEst
    ? '<div class="maint-disclaimer">* Km cumulés estimés basés sur le kilométrage mensuel × mois depuis la date d\'ajout. Ces recommandations sont indicatives et ne remplacent pas un carnet de maintenance réel.</div>'
    : '';

  p.innerHTML = pageHeader('🔧', 'Maintenance préventive',
    'Alertes basées sur l\'âge et le kilométrage estimé — ' + d.period, '#F59E0B') +
    '<div class="maint-wrap">' +
      chips +
      '<div class="tbl-wrap" style="padding:0 32px">' +
        '<table class="st">' +
          '<thead><tr>' +
            '<th>Véhicule</th><th>Client</th><th>Type</th>' +
            '<th>Âge</th><th>Km/mois</th><th>Km cumulés</th>' +
            '<th>Fréquence entretien</th><th>Alertes actives</th>' +
          '</tr></thead>' +
          '<tbody>'+rows+'</tbody>' +
        '</table>' +
      '</div>' +
      disclaimer +
    '</div>' +
    '<div class="reco-zone" style="margin-top:24px">' +
      '<div id="maint-table-container" class="reco-table-container"></div>' +
      '<textarea class="rz-input no-print" id="maint-textarea" rows="4" oninput="syncMaint(this)" placeholder="Copiez le prompt via « Prompt maintenance » dans la barre, collez-le dans votre outil, puis collez le résultat JSON ici…" style="margin-top:8px;font-size:11px;color:var(--subtle)"></textarea>' +
      '<div class="rz-print print-only" id="maint-print"></div>' +
    '</div>';

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}

/* =================================================================
   PAGE ÉCO-CONDUITE PAR TYPE D'INFRACTION
   ================================================================= */
function buildPageEco(d) {
  var p = mkEl('div', 'rp rp-eco');
  var types = d.ecoByType || [];
  var maxKm = Math.max.apply(null, types.map(function(t){return t.km;})) || 1;
  var totalKm = types.reduce(function(s,t){return s+t.km;},0) || 1;

  /* Previous month eco data for trend */
  var prevEco = {};
  if (APP.dataByMonth && APP.dataByMonth.length >= 2) {
    var prevD = APP.dataByMonth[APP.dataByMonth.length - 2];
    (prevD.ecoByType || []).forEach(function(t){ prevEco[t.type] = t; });
  }
  var hasTrend = Object.keys(prevEco).length > 0;

  var TYPE_COLORS = ['#EF4444','#F59E0B','#8B5CF6','#3B82F6','#10B981','#EC4899'];

  var bars = types.length ? types.map(function(t, i) {
    var pct      = (t.km / maxKm * 100).toFixed(1);
    var share    = (t.km / totalKm * 100).toFixed(1);
    var col      = TYPE_COLORS[i % TYPE_COLORS.length];
    var shortType = t.type.length > 28 ? t.type.slice(0,28)+'…' : t.type;

    /* Trend badge */
    var trendBadge = '';
    if (hasTrend) {
      var prev = prevEco[t.type];
      if (prev) {
        var delta = t.km - prev.km;
        var pctDelta = Math.abs(Math.round(delta / (prev.km||1) * 100));
        if (delta > 0) {
          trendBadge = '<span class="eco-trend eco-trend-up">↑ +'+pctDelta+'%</span>';
        } else if (delta < 0) {
          trendBadge = '<span class="eco-trend eco-trend-down">↓ -'+pctDelta+'%</span>';
        } else {
          trendBadge = '<span class="eco-trend eco-trend-flat">→ stable</span>';
        }
      } else {
        trendBadge = '<span class="eco-trend eco-trend-new">nouveau</span>';
      }
    }

    return '<div class="eco-bar-row">' +
      '<div class="eco-type-name" title="'+t.type+'">'+shortType+'</div>' +
      '<div class="eco-bar-bg"><div class="eco-bar-fill" style="width:'+pct+'%;background:'+col+'"></div></div>' +
      '<div class="eco-bar-meta">' +
        '<span class="eco-km">'+t.km.toLocaleString('fr')+' km</span>' +
        '<span class="eco-pct">'+share+'%</span>' +
        trendBadge +
        '<span class="eco-ev">'+t.compte+' év.</span>' +
        '<span class="eco-units">'+t.unites+' veh.</span>' +
      '</div>' +
    '</div>';
  }).join('') : '<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px">Aucune donnée éco-conduite disponible pour cette période.</div>';

  /* Summary chips */
  var totalEv    = types.reduce(function(s,t){return s+t.compte;},0);
  var totalUnits = types.length ? Math.max.apply(null,types.map(function(t){return t.unites;})) : 0;
  var chips =
    '<div class="eco-chips">' +
      '<div class="eco-chip"><span class="ec-val" style="color:#EF4444">'+totalKm.toLocaleString('fr')+'<small> km</small></span><span class="ec-lbl">Total km infraction</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#F59E0B">'+totalEv+'<small> év.</small></span><span class="ec-lbl">Événements total</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#8B5CF6">'+types.length+'</span><span class="ec-lbl">Types infraction</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#3B82F6">'+totalUnits+'</span><span class="ec-lbl">Véhicules concernés</span></div>' +
    '</div>';

  p.innerHTML = pageHeader('🌿', 'Éco-conduite — Infractions par type',
    'Kilométrage en infraction par catégorie — ' + d.period, '#10B981') +
    '<div class="eco-wrap">' + chips + '<div class="eco-bars">' + bars + '</div>' + '</div>';

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}

/* =================================================================
   PAGE COURBE KM JOURNALIER
   ================================================================= */
function buildPageDaily(d) {
  var p = mkEl('div', 'rp rp-daily');
  var daily = d.dailyKm || [];

  /* Stats highlights */
  var avgKms    = daily.map(function(x){return x.avgKm;});
  var ecoKms    = daily.map(function(x){return x.ecoKm;});
  var maxAvgKm  = Math.max.apply(null, avgKms) || 0;
  var maxEcoKm  = Math.max.apply(null, ecoKms) || 0;
  var maxDayAvg = daily[avgKms.indexOf(maxAvgKm)] || {};
  var maxDayEco = daily[ecoKms.indexOf(maxEcoKm)] || {};
  var avgOfAvg  = avgKms.length ? Math.round(avgKms.reduce(function(s,v){return s+v;},0)/avgKms.length) : 0;
  var avgOfEco  = ecoKms.length ? Math.round(ecoKms.reduce(function(s,v){return s+v;},0)/ecoKms.length) : 0;

  var chips =
    '<div class="eco-chips">' +
      '<div class="eco-chip"><span class="ec-val" style="color:#3B82F6">'+avgOfAvg+'<small> km/veh</small></span><span class="ec-lbl">Moy. journalière</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#3B82F6">'+maxAvgKm+'<small> km</small></span><span class="ec-lbl">Pic activité — '+(maxDayAvg.date||'').slice(8)+'/'+(maxDayAvg.date||'').slice(5,7)+'</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#EF4444">'+avgOfEco+'<small> km/j</small></span><span class="ec-lbl">Moy. infraction éco</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#EF4444">'+maxEcoKm+'<small> km</small></span><span class="ec-lbl">Pic infraction — '+(maxDayEco.date||'').slice(8)+'/'+(maxDayEco.date||'').slice(5,7)+'</span></div>' +
    '</div>';

  p.innerHTML = pageHeader('📅', 'Activité journalière — Février 2026',
    'Km moyen/véhicule actif · Km infraction éco total flotte — ' + d.period, '#3B82F6') +
    '<div class="daily-wrap">' +
      chips +
      '<div class="daily-chart-wrap"><canvas id="daily-line-cv"></canvas></div>' +
    '</div>';

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}


/* =================================================================
   PAGE CROISSANCE DU PARC
   ================================================================= */
function buildPageParc(d) {
  var p = mkEl('div', 'rp rp-parc');
  var parc = d.parcEvolution || { months:[], totals:[], byClient:{}, clients:[] };
  var lastIdx = parc.months.length - 1;

  /* KPI chips */
  var firstTotal = parc.totals[0] || 0;
  var lastTotal  = parc.totals[lastIdx] || 0;
  var addedTotal = lastTotal - firstTotal;
  var chips =
    '<div class="eco-chips">' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--blue)">'+lastTotal+'<small> veh.</small></span><span class="ec-lbl">Parc actuel</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--green)">+'+addedTotal+'<small> veh.</small></span><span class="ec-lbl">Ajoutés depuis début</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--muted)">'+parc.months.length+'<small> mois</small></span><span class="ec-lbl">Période couverte</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:#8B5CF6">'+(parc.clients||[]).length+'</span><span class="ec-lbl">Clients actifs</span></div>' +
    '</div>';

  p.innerHTML = pageHeader('\uD83D\uDE97', 'Croissance du parc',
    '\u00C9volution du nombre de v\u00E9hicules par date d\u2019ajout — ' + d.period, '#8B5CF6') +
    '<div class="parc-wrap">' +
      chips +
      '<div class="parc-layout">' +
        '<div class="parc-chart-wrap"><canvas id="parc-area-cv"></canvas></div>' +
        '<div class="parc-table-wrap">' +
          '<div class="parc-table-ttl" id="parc-table-ttl">Répartition — <span id="parc-month-label">' + (parc.months[lastIdx]||'') + '</span></div>' +
          '<table class="parc-tbl" id="parc-detail-tbl">' +
            '<thead><tr><th>Client</th><th>Veh.</th><th>Δ mois</th></tr></thead>' +
            '<tbody id="parc-tbl-body"></tbody>' +
          '</table>' +
          '<div id="parc-pager" class="parc-pager" style="display:none"></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  /* Store parc data for chart init */
  APP._parcData = parc;
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}

/* =================================================================
   PAGE TRENDS MULTI-MOIS
   ================================================================= */
function buildPageTrends(d) {
  var p = mkEl('div', 'rp rp-trends');
  var t = d.trends;
  if (!t) return null;

  var chips =
    '<div class="eco-chips">' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--blue)">'+t.months.length+'<small> mois</small></span><span class="ec-lbl">Période analysée</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--blue)">'+t.km[t.km.length-1].toLocaleString('fr')+'<small> km</small></span><span class="ec-lbl">Km dernier mois</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--green)">'+(t.score[t.score.length-1]||0).toFixed(1)+'<small>/10</small></span><span class="ec-lbl">Score éco dernier mois</span></div>' +
      '<div class="eco-chip"><span class="ec-val" style="color:var(--red)">'+t.infrVit[t.infrVit.length-1].toLocaleString('fr')+'<small> km</small></span><span class="ec-lbl">Infr. vit. dernier mois</span></div>' +
    '</div>';

  p.innerHTML = pageHeader('\uD83D\uDCC8', 'Tendances — \u00C9volution mensuelle',
    t.months[0] + ' \u2192 ' + t.months[t.months.length-1] + ' · ' + t.months.length + ' mois', '#6366F1') +
    '<div class="trends-wrap">' +
      chips +
      '<div class="trends-grid">' +
        '<div class="trend-card"><div class="trend-card-ttl" style="color:var(--blue)">\uD83D\uDEE3 Kilom\u00E9trage mensuel</div><div class="trend-cv-wrap"><canvas id="trend-km-cv"></canvas></div></div>' +
        '<div class="trend-card"><div class="trend-card-ttl" style="color:var(--green)">\uD83C\uDF3F Score \u00E9co moyen</div><div class="trend-cv-wrap"><canvas id="trend-score-cv"></canvas></div></div>' +
        '<div class="trend-card"><div class="trend-card-ttl" style="color:var(--red)">\u26A1 Km infraction vitesse</div><div class="trend-cv-wrap"><canvas id="trend-infr-cv"></canvas></div></div>' +
        '<div class="trend-card"><div class="trend-card-ttl" style="color:#F59E0B">\uD83C\uDF31 Km infraction \u00E9co</div><div class="trend-cv-wrap"><canvas id="trend-eco-cv"></canvas></div></div>' +
      '</div>' +
    '</div>';

  APP._trendsData = t;
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}

/* =================================================================
   PAGE CARTE — BÉNIN ZONES
   ================================================================= */
function buildPageMap(d) {
  var p = mkEl('div', 'rp rp-map');
  var zones         = d.zoneStats || [];
  var maxKm         = Math.max.apply(null, zones.map(function(z){return z.km;})) || 1;
  var totalKmZones  = zones.reduce(function(s,z){return s+z.km;},0) || 1;

  /* Index zones by dept name */
  var deptData = {};
  zones.forEach(function(z){ deptData[z.dept] = z; });

  /* ── Same blue palette as before ── */
  function deptColor(deptName) {
    var z = deptData[deptName];
    if (!z || z.km === 0) return '#DBEAFE';
    var i = z.km / maxKm;
    if (i > 0.8) return '#1E40AF';
    if (i > 0.6) return '#2563EB';
    if (i > 0.4) return '#3B82F6';
    if (i > 0.2) return '#60A5FA';
    if (i > 0.05) return '#93C5FD';
    return '#DBEAFE';
  }

  /* Zone stats bars (right column) */
  var zoneBars = zones.map(function(z) {
    var pct      = (z.km / maxKm * 100).toFixed(1);
    var sharePct = (z.km / totalKmZones * 100).toFixed(1);
    var col      = deptColor(z.dept);
    return '<div class="zb-row">' +
      '<div class="zb-name">'+z.dept+'</div>' +
      '<div class="zb-bar-bg"><div class="zb-bar" style="width:'+pct+'%;background:'+col+'"></div></div>' +
      '<div class="zb-km">'+z.km.toLocaleString('fr')+' km</div>' +
      '<div class="zb-pct">'+sharePct+'%</div>' +
      '<div class="zb-vis">'+z.visites+' vis.</div>' +
    '</div>';
  }).join('');

  /* Legend */
  var legend =
    '<div class="map-legend">' +
      '<div class="ml-item"><span class="ml-sq" style="background:#1E40AF"></span>Très actif</div>' +
      '<div class="ml-item"><span class="ml-sq" style="background:#3B82F6"></span>Actif</div>' +
      '<div class="ml-item"><span class="ml-sq" style="background:#93C5FD"></span>Peu actif</div>' +
      '<div class="ml-item"><span class="ml-sq" style="background:#DBEAFE;border:1px solid #CBD5E1"></span>Inactif</div>' +
    '</div>';

  p.innerHTML = pageHeader('\uD83D\uDDFA', 'Cartographie Bénin',
    'Zones d\u2019activité par département — ' + d.period, '#10B981') +
    '<div class="map-layout">' +
      '<div class="map-leaflet-col">' +
        legend +
        '<div id="benin-leaflet-map" class="benin-leaflet-map"></div>' +
      '</div>' +
      '<div class="map-stats-col">' +
        '<div class="map-stats-ttl">Kilométrage par département</div>' +
        '<div class="map-zone-bars">' + zoneBars + '</div>' +
      '</div>' +
    '</div>';

  /* Store data for initLeafletMap */
  APP._mapDeptData  = deptData;
  APP._mapDeptColor = deptColor;

  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}


/* ── Génère le SVG statique de la carte (pour le PDF) ── */
function getStaticMapSVG() {
  var deptData  = APP._mapDeptData  || {};
  var deptColor = APP._mapDeptColor || function(){ return '#DBEAFE'; };

  var svgPaths = {
    'Alibori':   'M75,10 L220,10 L232,28 L228,78 L195,98 L165,88 L138,98 L110,88 L72,98 L62,68 Z',
    'Atacora':   'M18,48 L75,10 L62,68 L72,98 L58,138 L36,148 L16,128 L13,88 Z',
    'Borgou':    'M72,98 L110,88 L138,98 L165,88 L195,98 L228,78 L232,28 L238,118 L218,168 L178,178 L148,172 L118,178 L88,163 L68,138 Z',
    'Donga':     'M16,128 L36,148 L58,138 L68,138 L88,163 L78,178 L48,195 L18,170 L13,140 Z',
    'Collines':  'M88,163 L118,178 L148,172 L178,178 L188,218 L172,248 L142,253 L112,248 L88,232 L78,198 Z',
    'Zou':       'M88,232 L112,248 L142,253 L172,248 L183,288 L162,313 L133,318 L103,313 L86,288 Z',
    'Plateau':   'M178,178 L218,168 L238,198 L233,238 L208,258 L183,263 L183,288 L172,248 L188,218 Z',
    'Mono':      'M52,328 L86,288 L103,313 L98,348 L78,368 L52,363 L43,343 Z',
    'Kouffo':    'M86,288 L103,313 L133,318 L128,353 L106,368 L88,363 L78,368 L98,348 Z',
    'Atlantique':'M98,348 L128,353 L158,348 L162,313 L133,318 L103,313 Z M78,368 L106,368 L128,353 L158,348 L168,378 L153,398 L118,403 L83,393 L63,378 Z',
    'Ouémé':     'M183,263 L208,258 L233,268 L238,318 L218,343 L193,353 L168,378 L162,313 L183,288 Z',
    'Littoral':  'M153,398 L168,378 L183,388 L193,403 L178,413 L158,413 Z'
  };
  var labelPos = {
    'Alibori':[152,55],'Atacora':[42,95],'Borgou':[155,138],
    'Donga':[42,162],'Collines':[133,215],'Zou':[133,283],
    'Plateau':[208,223],'Mono':[72,338],'Kouffo':[105,343],
    'Atlantique':[118,383],'Ouémé':[210,318],'Littoral':[172,405]
  };

  var paths = Object.keys(svgPaths).map(function(dept) {
    var col = deptColor(dept);
    return '<path d="'+svgPaths[dept]+'" fill="'+col+'" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>';
  }).join('');

  var labels = Object.keys(labelPos).map(function(dept) {
    var p   = labelPos[dept];
    var z   = deptData[dept];
    var maxKm = Object.values(deptData).reduce(function(m,zz){return Math.max(m,zz.km||0);},1);
    var bright = z && z.km/maxKm > 0.4;
    return '<text x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle" font-size="8" font-weight="700" font-family="Sora,sans-serif" fill="'+(bright?'white':'#334155')+'" pointer-events="none">'+dept+'</text>';
  }).join('');

  return '<svg viewBox="0 0 260 430" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%">'
    + paths + labels + '</svg>';
}

/* ── Init Leaflet map (called from renderReport setTimeout) ── */
function initLeafletMap() {
  var mapEl = document.getElementById('benin-leaflet-map');
  if (!mapEl || !window.L) return;

  /* Destroy previous instance if re-rendering */
  if (APP._leafletInstance) {
    APP._leafletInstance.remove();
    APP._leafletInstance = null;
  }

  var deptData  = APP._mapDeptData  || {};
  var deptColor = APP._mapDeptColor || function(){ return '#DBEAFE'; };

  /* Map matching: GeoJSON shapeName → our dept key */
  var NAME_MAP = {
    /* exact matches */
    'Alibori':'Alibori','Borgou':'Borgou','Donga':'Donga',
    'Collines':'Collines','Zou':'Zou','Plateau':'Plateau',
    'Mono':'Mono','Kouffo':'Kouffo','Littoral':'Littoral',
    /* geoBoundaries spelling variants */
    'Atacora':'Atacora','Atakora':'Atacora',
    'Atlantique':'Atlantique','Atlanique':'Atlantique',
    'Ouémé':'Ouémé','Oueme':'Ouémé','Ouéme':'Ouémé'
  };

  var map = L.map('benin-leaflet-map', {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false,
    dragging: true,
    doubleClickZoom: true
  });
  APP._leafletInstance = map;

  /* Use embedded GeoJSON — works offline, no CDN needed */
  (function(geojson) {
      var layer = L.geoJSON(geojson, {
        style: function(feature) {
          var raw  = feature.properties.shapeName || feature.properties.NAME_1 || '';
          var dept = NAME_MAP[raw] || raw;
          var z    = deptData[dept];
          var col  = deptColor(dept);
          return {
            fillColor:   col,
            fillOpacity: (z && z.km > 0) ? 0.85 : 0.25,
            color:       'white',
            weight:      1.8,
            opacity:     1
          };
        },
        onEachFeature: function(feature, lyr) {
          var raw  = feature.properties.shapeName || feature.properties.NAME_1 || '';
          var dept = NAME_MAP[raw] || raw;
          var z    = deptData[dept];
          var tip  = z
            ? '<strong>'+dept+'</strong><br>'+z.km.toLocaleString('fr')+' km<br>'+z.visites+' visites · '+z.unites+' veh.'
            : '<strong>'+dept+'</strong><br>Aucune donnée';
          lyr.bindTooltip(tip, { sticky: true, className: 'map-tip' });
          lyr.on('mouseover', function(){ lyr.setStyle({ weight:3, color:'#1E293B' }); });
          lyr.on('mouseout',  function(){ layer.resetStyle(lyr); });
        }
      }).addTo(map);

      /* Fit to Bénin bounds */
      var b = layer.getBounds();
      APP._leafletBounds = b;  /* store for PDF export */
      map.fitBounds(b, { padding: [10, 10] });
  })(typeof BENIN_GEOJSON !== 'undefined' ? BENIN_GEOJSON : null);
  if (typeof BENIN_GEOJSON === 'undefined') {
    mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:13px">GeoJSON manquant</div>';
  }
}

/* =================================================================
   PAGE 5 — SINISTRALITÉ + RECOMMANDATIONS IA
   ================================================================= */
function buildPageReco(d) {
  var p = mkEl('div', 'rp rp-reco');
  var sin = d.sinistralite || {};
  var riskColor = sin.riskScore >= 60 ? '#EF4444' : sin.riskScore >= 35 ? '#F59E0B' : '#10B981';
  var riskLabel = sin.riskScore >= 60 ? 'Élevé' : sin.riskScore >= 35 ? 'Modéré' : 'Faible';

  var sinKpis = '<div class="sin-kpis">' +
    sinChip(sin.nCritiques||0, 'Critiques', 'score<4', '#EF4444') +
    sinChip(sin.nARisque||0,   'À surveiller', '4-5', '#F59E0B') +
    sinChip(sin.nHautVit||0,   'Vit. élevée', '>140km/h', '#8B5CF6') +
    sinChip(sin.nInactifs||0,  'Inactifs', '0 km', '#64748B') +
    '<div class="sin-chip risk-chip" style="border-color:' + riskColor + '40">' +
      '<div class="sc-val" style="color:' + riskColor + '">' + sin.riskScore + '%</div>' +
      '<div class="sc-lbl">Indice de risque</div>' +
      '<div class="sc-sub" style="color:' + riskColor + ';font-weight:700">' + riskLabel + '</div>' +
    '</div>' +
    sinChip((sin.tauxSpdExp||0)+'%', 'Expo vit.', 'km infr/total', '#EF4444') +
    sinChip((sin.tauxEcoExp||0)+'%', 'Expo éco', 'km éco/total', '#F59E0B') +
  '</div>';

  var critRows = (sin.critiques||[]).map(function(v, i) {
    return '<tr class="'+(i%2?'tr-o':'tr-e')+'">' +
      '<td class="td-l">' + v.label + (v.nonImmat ? ' <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:4px;font-size:8px;font-weight:700;padding:1px 4px">⏳</span>' : '') + '</td><td>' + v.client + '</td>' +
      '<td><span class="nb n-lo">' + v.score.toFixed(2) + '/10</span></td>' +
      '<td>' + (v.vitMax||'—') + ' km/h</td>' +
      '<td class="td-m">' + (v.spdKmInfr > 0 ? displayN(v.spdKmInfr)+' km' : '—') + '</td>' +
    '</tr>';
  }).join('');

  var anomBlock = (d.anomalies && d.anomalies.length)
    ? '<div class="anom-box no-print"><div class="anom-ttl">⚠️ ' + d.anomalies.length + ' anomalie(s) détectée(s)</div>' +
      d.anomalies.map(function(a){ return '<div class="anom-row">' + a + '</div>'; }).join('') + '</div>'
    : '';

  p.innerHTML = pageHeader('⚠️', 'Sinistralité & Recommandations', 'Analyse des risques — ' + d.period, '#EF4444') +
    sinKpis +
    (critRows ? '<div class="sin-tbl-wrap"><div class="sin-tbl-lbl">Véhicules à risque critique</div>' +
      '<table class="st"><thead><tr><th>Véhicule</th><th>Client</th><th>Score</th><th>Vit. max</th><th>Km infr. vit.</th></tr></thead>' +
      '<tbody>' + critRows + '</tbody></table></div>' : '') +
    anomBlock +
    '<div class="reco-zone">' +

      '<div id="reco-table-container" class="reco-table-container"></div>' +
      '<textarea class="rz-input no-print" id="reco-textarea" rows="4" oninput="syncReco(this)" placeholder="Copiez le prompt via «Prompt analyse» dans la barre, collez-le dans votre outil, puis collez le résultat JSON ici…" style="margin-top:8px;font-size:11px;color:var(--subtle)"></textarea>' +
      '<div class="rz-print print-only" id="reco-print"></div>' +
    '</div>' +
    '<div class="reco-footer"><div class="rf-meta">Généré le ' + new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}) + ' · iGeo Fleet</div></div>';
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}
function sinChip(val, lbl, sub, color) {
  return '<div class="sin-chip"><div class="sc-val" style="color:' + color + '">' + val + '</div>' +
    '<div class="sc-lbl">' + lbl + '</div><div class="sc-sub">' + sub + '</div></div>';
}



/* ─── Slide Parc ─────────────────────────────────────────── */
function buildPressParc(d) {
  var parc = d.parcEvolution || { months:[], totals:[], clients:[] };
  var last = parc.totals[parc.totals.length-1] || 0;
  return '<div class="ps ps-parc">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:rgba(139,92,246,.15);color:#7C3AED">0' + (APP.presSlide+1) + '</div>' +
      '<div>' +
        '<div class="ps-chip" style="margin-bottom:6px;background:rgba(139,92,246,.12);color:#7C3AED">\uD83D\uDE97 CROISSANCE DU PARC</div>' +
        '<div class="ps-h-title">Évolution des véhicules par mois</div>' +
        '<div class="ps-h-sub">' + d.period + ' · ' + last + ' véhicules au total</div>' +
      '</div>' +
    '</div>' +
    '<div class="pa pa-fade-up" style="flex:1;position:relative;min-height:0">' +
      '<canvas id="pres-parc-cv"></canvas>' +
    '</div>' +
  '</div>';
}

function initPresParc(d) {
  var cv = document.getElementById('pres-parc-cv');
  if (!cv || !d.parcEvolution) return;
  var parc = d.parcEvolution;
  var COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#EC4899','#84CC16','#A855F7'];
  var datasets = parc.clients.map(function(c,i){
    return { label:c, data:parc.byClient[c], backgroundColor:COLORS[i%COLORS.length]+'55', borderColor:COLORS[i%COLORS.length], borderWidth:2, tension:0.4, fill:true, pointRadius:2 };
  });
  datasets.push({ label:'Total', data:parc.totals, borderColor:'#1E293B', borderWidth:2.5, tension:0.4, fill:false, pointRadius:3, borderDash:[5,3], backgroundColor:'transparent' });
  APP.presCharts['pres-parc'] = new Chart(cv, {
    type:'line', data:{ labels:parc.months, datasets:datasets },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:700},
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, padding:8, usePointStyle:true, color:'#475569' } }, tooltip:{ backgroundColor:'#1E293B' } },
      scales:{ x:{ ticks:{font:{size:9,family:'JetBrains Mono'},color:'#64748B'}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} }, y:{ ticks:{font:{size:9},color:'#94A3B8',stepSize:1}, beginAtZero:true, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} } }
    }
  });
}

/* ─── Slide Trends ─────────────────────────────────────────── */
function buildPressTrends(d) {
  if (!d.trends) return buildPressKPIs(d); /* fallback */
  var t = d.trends;
  return '<div class="ps ps-trends">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:rgba(99,102,241,.15);color:#4F46E5">0' + (APP.presSlide+1) + '</div>' +
      '<div>' +
        '<div class="ps-chip" style="margin-bottom:6px;background:rgba(99,102,241,.12);color:#4F46E5">\uD83D\uDCC8 TENDANCES</div>' +
        '<div class="ps-h-title">Évolution mensuelle des performances</div>' +
        '<div class="ps-h-sub">' + t.months[0] + ' \u2192 ' + t.months[t.months.length-1] + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ps-trends-grid pa pa-fade-up">' +
      '<div class="ps-trend-card"><div class="ps-trend-ttl" style="color:#3B82F6">\uD83D\uDEE3 Km mensuel</div><div style="flex:1;position:relative;min-height:0"><canvas id="pres-t-km"></canvas></div></div>' +
      '<div class="ps-trend-card"><div class="ps-trend-ttl" style="color:#10B981">\uD83C\uDF3F Score éco</div><div style="flex:1;position:relative;min-height:0"><canvas id="pres-t-score"></canvas></div></div>' +
      '<div class="ps-trend-card"><div class="ps-trend-ttl" style="color:#EF4444">\u26A1 Km infr. vit.</div><div style="flex:1;position:relative;min-height:0"><canvas id="pres-t-infr"></canvas></div></div>' +
      '<div class="ps-trend-card"><div class="ps-trend-ttl" style="color:#F59E0B">\uD83C\uDF31 Km infr. éco</div><div style="flex:1;position:relative;min-height:0"><canvas id="pres-t-eco"></canvas></div></div>' +
    '</div>' +
  '</div>';
}

function initPressTrends(d) {
  if (!d.trends) return;
  var t = d.trends;
  var defs = [
    { id:'pres-t-km',    data:t.km,      color:'#3B82F6', fill:true },
    { id:'pres-t-score', data:t.score,   color:'#10B981', fill:false },
    { id:'pres-t-infr',  data:t.infrVit, color:'#EF4444', fill:true },
    { id:'pres-t-eco',   data:t.ecoKm,   color:'#F59E0B', fill:true }
  ];
  defs.forEach(function(def) {
    var cv = document.getElementById(def.id);
    if (!cv) return;
    APP.presCharts[def.id] = new Chart(cv, {
      type:'line', data:{ labels:t.months, datasets:[{ data:def.data, borderColor:def.color, backgroundColor:def.fill?def.color+'22':'transparent', borderWidth:2.5, tension:0.4, fill:def.fill, pointRadius:3 }] },
      options:{ responsive:true, maintainAspectRatio:false, animation:{duration:600}, plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1E293B' } },
        scales:{ x:{ ticks:{font:{size:8,family:'JetBrains Mono'},color:'#64748B',maxRotation:30}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} }, y:{ ticks:{font:{size:8},color:'#94A3B8',maxTicksLimit:4}, beginAtZero:false, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} } }
      }
    });
  });
}

/* ─── Slide Map ─────────────────────────────────────────── */
function buildPressMap(d) {
  var zones = d.zoneStats || [];
  var maxKm = Math.max.apply(null, zones.map(function(z){return z.km;})) || 1;

  var svgPaths = {
    'Alibori':   'M75,10 L220,10 L232,28 L228,78 L195,98 L165,88 L138,98 L110,88 L72,98 L62,68 Z',
    'Atacora':   'M18,48 L75,10 L62,68 L72,98 L58,138 L36,148 L16,128 L13,88 Z',
    'Borgou':    'M72,98 L110,88 L138,98 L165,88 L195,98 L228,78 L232,28 L238,118 L218,168 L178,178 L148,172 L118,178 L88,163 L68,138 Z',
    'Donga':     'M16,128 L36,148 L58,138 L68,138 L88,163 L78,178 L48,195 L18,170 L13,140 Z',
    'Collines':  'M88,163 L118,178 L148,172 L178,178 L188,218 L172,248 L142,253 L112,248 L88,232 L78,198 Z',
    'Zou':       'M88,232 L112,248 L142,253 L172,248 L183,288 L162,313 L133,318 L103,313 L86,288 Z',
    'Plateau':   'M178,178 L218,168 L238,198 L233,238 L208,258 L183,263 L183,288 L172,248 L188,218 Z',
    'Mono':      'M52,328 L86,288 L103,313 L98,348 L78,368 L52,363 L43,343 Z',
    'Kouffo':    'M86,288 L103,313 L133,318 L128,353 L106,368 L88,363 L78,368 L98,348 Z',
    'Atlantique':'M98,348 L128,353 L158,348 L162,313 L133,318 L103,313 Z M78,368 L106,368 L128,353 L158,348 L168,378 L153,398 L118,403 L83,393 L63,378 Z',
    'Ouémé':     'M183,263 L208,258 L233,268 L238,318 L218,343 L193,353 L168,378 L162,313 L183,288 Z',
    'Littoral':  'M153,398 L168,378 L183,388 L193,403 L178,413 L158,413 Z'
  };
  var labelPos = {
    'Alibori':[152,55],'Atacora':[42,95],'Borgou':[155,138],
    'Donga':[42,162],'Collines':[133,215],'Zou':[133,283],
    'Plateau':[208,223],'Mono':[72,338],'Kouffo':[105,343],
    'Atlantique':[118,383],'Ouémé':[210,318],'Littoral':[172,405]
  };

  function deptColor(dept) {
    var z = zones.filter(function(zz){return zz.dept===dept;})[0];
    if (!z || z.km === 0) return '#E2E8F0';
    var i = z.km / maxKm;
    if (i > 0.8) return '#1E40AF';
    if (i > 0.6) return '#2563EB';
    if (i > 0.4) return '#3B82F6';
    if (i > 0.2) return '#60A5FA';
    return '#BFDBFE';
  }

  var deptOrder = Object.keys(svgPaths);
  var svgParts = deptOrder.map(function(dept) {
    return '<path d="'+svgPaths[dept]+'" fill="'+deptColor(dept)+'" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>';
  }).join('');
  var svgLabels = Object.keys(labelPos).map(function(dept) {
    var p = labelPos[dept];
    var z2=zones.filter(function(zz){return zz.dept===dept;})[0]; var bright2=z2&&z2.km/maxKm>0.5; return '<text x="'+p[0]+'" y="'+p[1]+'" text-anchor="middle" font-size="7" font-weight="700" font-family="Sora,sans-serif" fill="'+(bright2?'white':'#334155')+'" pointer-events="none">'+dept+'</text>';
  }).join('');

  var bars = zones.map(function(z) {
    var pct = (z.km / maxKm * 100).toFixed(1);
    var col = deptColor(z.dept);
    var kmStr = z.km >= 1000 ? Math.round(z.km/1000)+'k km' : z.km+' km';
    return '<div class="ps-zb-row pa pa-fade-up">' +
      '<div class="ps-zb-name">'+z.dept+'</div>' +
      '<div class="ps-zb-bg"><div class="ps-zb-fill" style="width:'+pct+'%;background:'+col+'"></div></div>' +
      '<div class="ps-zb-km">'+kmStr+'</div>' +
    '</div>';
  }).join('');

  return '<div class="ps ps-map">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:rgba(16,185,129,.15);color:#059669">05</div>' +
      '<div>' +
        '<div class="ps-chip" style="margin-bottom:6px;background:rgba(16,185,129,.12);color:#059669">🗺 CARTOGRAPHIE</div>' +
        '<div class="ps-h-title">Activité par département — Bénin</div>' +
        '<div class="ps-h-sub">' + d.period + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ps-map-layout">' +
      '<div class="pa pa-scale" style="display:flex;flex-direction:column;align-items:center">' +
        '<svg id="pres-map-svg" viewBox="0 0 260 430" width="200" height="330" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 12px rgba(0,0,0,.12))">' +
          svgParts + svgLabels +
        '</svg>' +
      '</div>' +
      '<div class="ps-map-bars">' + bars + '</div>' +
    '</div>' +
    (zones.length ? '<div class="pa pa-fade-up ps-context" style="margin-top:10px">L\'<strong>' + (zones[0]&&zones[0].dept) + '</strong> concentre la majorite de l\'activite (' + (zones[0] ? Math.round(zones[0].km/(zones.reduce(function(s,z){return s+z.km;},0)||1)*100) : 0) + '%). ' + zones.length + ' departement(s) couverts ce mois.</div>' : '') +
  '</div>';
}

/* ── Rendu du tableau de recommandations ── */
function renderRecoTable(data) {
  var container = document.getElementById('reco-table-container');
  if (!container) return;

  var STATUS = {
    'alerte':    { icon: '⚠️', cls: 'reco-alerte',    lbl: 'Alerte'      },
    'attention': { icon: '🔶', cls: 'reco-attention',  lbl: 'Attention'   },
    'bon':       { icon: '✅', cls: 'reco-bon',        lbl: 'Bon'         },
    'excellent': { icon: '⭐', cls: 'reco-excellent',  lbl: 'Excellent'   }
  };

  /* Table */
  var rows = (data.recommandations || []).map(function(r) {
    var s = STATUS[r.statut] || STATUS['attention'];
    var actions = (r.actions || []).map(function(a) {
      return '<li>'+a+'</li>';
    }).join('');
    return '<tr>' +
      '<td class="reco-td-client">'+r.client+'</td>' +
      '<td class="reco-td-statut"><span class="reco-badge '+s.cls+'">'+s.icon+' '+s.lbl+'</span></td>' +
      '<td class="reco-td-actions"><ul class="reco-actions-list">'+actions+'</ul></td>' +
    '</tr>';
  }).join('');

  /* Priority actions */
  var prios = (data.actions_prioritaires || []).map(function(a, i) {
    return '<li><strong>'+(i+1)+'.</strong> '+a+'</li>';
  }).join('');

  container.innerHTML =
    '<div class="reco-table-wrap">' +
      '<div class="reco-section-ttl">RECOMMANDATIONS DÉTAILLÉES PAR CLIENT</div>' +
      '<table class="reco-tbl">' +
        '<thead><tr>' +
          '<th class="reco-th">CLIENT</th>' +
          '<th class="reco-th">STATUT</th>' +
          '<th class="reco-th">RECOMMANDATIONS ET ACTIONS</th>' +
        '</tr></thead>' +
        '<tbody>'+rows+'</tbody>' +
      '</table>' +
      (prios ?
        '<div class="reco-section-ttl" style="margin-top:18px">ACTIONS PRIORITAIRES PROPOSÉES</div>' +
        '<ul class="reco-prio-list">'+prios+'</ul>'
      : '') +
      '<div class="reco-legend">' +
        '<span class="reco-legend-item"><span class="reco-badge reco-excellent">⭐ Excellent</span></span>' +
        '<span class="reco-legend-item"><span class="reco-badge reco-bon">✅ Bon</span></span>' +
        '<span class="reco-legend-item"><span class="reco-badge reco-attention">🔶 Attention</span></span>' +
        '<span class="reco-legend-item"><span class="reco-badge reco-alerte">⚠️ Alerte</span></span>' +
      '</div>' +
    '</div>';
}

function syncRecoFromParsed(data) {
  var pa = document.getElementById('reco-print');
  if (!pa) return;
  /* Print version: same table but compact */
  var STATUS = { 'alerte':'⚠️ Alerte','attention':'🔶 Attention','bon':'✅ Bon','excellent':'⭐ Excellent' };
  var rows = (data.recommandations || []).map(function(r) {
    return '<tr><td class="reco-td-client">'+r.client+'</td>' +
      '<td class="reco-td-statut">'+( STATUS[r.statut]||r.statut)+'</td>' +
      '<td class="reco-td-actions"><ul class="reco-actions-list">'+(r.actions||[]).map(function(a){return '<li>'+a+'</li>';}).join('')+'</ul></td></tr>';
  }).join('');
  var prios = (data.actions_prioritaires||[]).map(function(a,i){return '<li><strong>'+(i+1)+'.</strong> '+a+'</li>';}).join('');
  pa.innerHTML = '<div class="reco-table-wrap"><table class="reco-tbl"><thead><tr><th>CLIENT</th><th>STATUT</th><th>RECOMMANDATIONS</th></tr></thead><tbody>'+rows+'</tbody></table>'+(prios?'<ul class="reco-prio-list">'+prios+'</ul>':'')+'</div>';
}

/* ── Recommandations ── */
function syncReco(ta) {
  /* Try to parse as JSON and render table */
  var val = ta.value.trim();
  if (val) {
    try {
      var clean = val.replace(/```json|```/g,'').trim();
      var parsed = JSON.parse(clean);
      if (parsed && parsed.recommandations) {
        renderRecoTable(parsed);
        syncRecoFromParsed(parsed);
        return;
      }
    } catch(e) { /* not JSON — fall through to plain text */ }
  }
  /* Plain text fallback */
  var p = document.getElementById('reco-print');
  if (p) p.innerHTML = val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
function generateAIAnalysis() {
  var d = APP.data, btn = document.getElementById('btn-ai-gen'), st = document.getElementById('ai-status'), ta = document.getElementById('reco-textarea');
  if (!btn || !ta) return;
  btn.disabled = true; btn.innerHTML = '<span class="ai-spin"></span> Génération en cours…';
  if (st) { st.textContent = 'Connexion…'; st.className = 'ai-status ai-loading'; }
  var sin = d.sinistralite || {};
  /* Build vehicle data for prompt */
  var vLines = [];
  d.tableRows.forEach(function(r) {
    vLines.push('['+r.client+'] '+r.label
      +' score:'+r.score.toFixed(2)
      +' km:'+r.km
      +' vMax:'+r.vitMax
      +' infrVit:'+r.spdKmInfr
      +' infrEco:'+r.ecoKmInfr
      +(r.km===0?' INACTIF':'')
      +(r.nonImmat?' SANS_IMMAT(VIN:'+r.vin+')':''));
  });
  var nonImmatVeh = d.tableRows.filter(function(r){ return r.nonImmat; });

  /* Group by client for summary */
  var clientSummary = {};
  d.tableRows.forEach(function(r) {
    var c = r.client;
    if (!clientSummary[c]) clientSummary[c] = { score:0, n:0, infr:0, inactive:0, km:0 };
    clientSummary[c].km    += r.km;
    clientSummary[c].infr  += r.spdKmInfr + r.ecoKmInfr;
    clientSummary[c].n     += 1;
    clientSummary[c].score += r.score;
    if (r.km === 0) clientSummary[c].inactive++;
  });
  var clientLines = Object.keys(clientSummary).map(function(c) {
    var s = clientSummary[c];
    return c+': scoreM='+(s.score/s.n).toFixed(1)+' km='+s.km+' infr='+s.infr+' veh='+s.n+(s.inactive?' inactifs='+s.inactive:'');
  });

  var context = [
    'RAPPORT '+d.reportTitle+' — '+d.period,
    'KM TOTAL: '+d.totalKm+' | SCORE MOY: '+d.avgScore+'/10 | ACTIFS: '+d.activeCount+'/'+d.totalVehicles,
    'RISQUE: '+sin.riskScore+'% (critiques:'+( sin.nCritiques||0)+' | à surveiller:'+(sin.nARisque||0)+')',
    'TAUX VIT EXP: '+sin.tauxSpdExp+'% | TAUX ECO EXP: '+sin.tauxEcoExp+'%',
    '',
    'RÉSUMÉ PAR CLIENT:',
  ].concat(clientLines).concat(['', 'DÉTAIL VÉHICULES:']).concat(vLines);

  var prompt = 'Tu es expert en gestion de flotte pour le compte de la BOA (Banque Of Africa) Bénin, dans un contexte de leasing de véhicules.\n'    + 'L\'objectif de ce rapport est la PRÉSERVATION DE LA VALEUR DES ACTIFS (les véhicules en leasing) et la PRÉVENTION DES RISQUES SINISTRES.\n'    + 'Tes recommandations sont adressées à la BOA, pas aux conducteurs. Il n\'y a AUCUNE dimension disciplinaire.\n'    + 'Chaque "client" est un preneur de leasing responsable de la bonne utilisation des actifs BOA.\n'    + 'Tes alertes concernent la protection des véhicules, l\'usure anormale, et les risques d\'accident matériel.\n'    + 'À partir de ces données, génère UNIQUEMENT un objet JSON valide (sans aucun texte avant ou après, sans balises markdown) avec cette structure exacte :\n'
    + '{\n'
    + '  "recommandations": [\n'
    + '    { "client": "NOM_CLIENT", "statut": "alerte|attention|bon|excellent", "actions": ["action 1", "action 2"] }\n'
    + '  ],\n'
    + '  "actions_prioritaires": ["action globale 1", "action globale 2", "action globale 3"]\n'
    + '}\n\n'
    + 'Règles strictes:\n'    + '- statut "alerte" = risque élevé pour l\'actif BOA (score < 5, excès vitesse graves)\n'    + '- statut "attention" = vigilance requise (score 5-7.5, sous-utilisation, infractions récurrentes)\n'    + '- statut "bon" = actif bien préservé (score 7.5-9)\n'    + '- statut "excellent" = actif en excellente condition (score >= 9, aucune infraction)\n'    + '- Actions orientées PROTECTION DE L\'ACTIF : réduction usure, prévention sinistres\n'    + '- 1 à 3 actions par preneur de leasing, formulées du point de vue de la BOA\n'    + '- 3 actions prioritaires globales max (perspective gestionnaire de parc BOA)\n'    + '- Ton professionnel et factuel, pas d\'emoji dans les textes\n'    + '- Chaque preneur de leasing doit apparaître une seule fois\n\n'
    + context.join('\n');
  fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})})
  .then(function(r){return r.json();})
  .then(function(data){
    var raw = data.content ? data.content.map(function(b){return b.text||'';}).join('') : null;
    var parsed = null;
    if (raw) {
      try {
        var clean = raw.replace(/```json|```/g,'').trim();
        parsed = JSON.parse(clean);
      } catch(e) { parsed = null; }
    }
    if (parsed && parsed.recommandations) {
      renderRecoTable(parsed);
      ta.value = raw; /* keep raw for print */
      syncRecoFromParsed(parsed);
    } else {
      var errMsg = (data.error && data.error.message) ? data.error.message : (raw || 'Erreur inconnue');
      ta.value = errMsg;
      syncReco(ta);
    }
    btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Regénérer';
    if (st) { st.textContent = 'Analyse générée ✓'; st.className = 'ai-status ai-ok'; }
    showToast('Analyse générée', 'ok');
  }).catch(function(err){
    ta.value = 'Erreur de connexion: '+err.message+'\n\nCollez votre analyse ici.';
    btn.disabled = false; btn.textContent = 'Réessayer';
    if (st) { st.textContent = 'Erreur réseau'; st.className = 'ai-status ai-err'; }
  });
}

/* =================================================================
   MAINTENANCE — GÉNÉRATION PAR PROMPT (similaire à syncReco/generateAIAnalysis)
   ================================================================= */
function renderMaintTable(data) {
  var container = document.getElementById('maint-table-container');
  if (!container) return;

  /* Build table rows from JSON data */
  var rows = (data.maintenance || []).map(function(r) {
    var urgClass = r.urgency === 'danger' ? 'maint-danger' : r.urgency === 'warning' ? 'maint-warning' : r.urgency === 'info' ? 'maint-info' : 'maint-ok';
    var urgLabel = r.urgency === 'danger' ? '🔴 Urgent' : r.urgency === 'warning' ? '🟡 Planifier' : r.urgency === 'info' ? '🔵 À surveiller' : '🟢 OK';
    var actions = (r.actions || []).map(function(a) { return '<li>'+a+'</li>'; }).join('');
    return '<tr>' +
      '<td class="reco-td-client">'+r.vehicle+'</td>' +
      '<td class="reco-td-client">'+r.client+'</td>' +
      '<td class="reco-td-statut"><span class="reco-badge '+urgClass+'">'+urgLabel+'</span></td>' +
      '<td class="reco-td-actions"><ul class="reco-actions-list">'+actions+'</ul></td>' +
    '</tr>';
  }).join('');

  var summary = (data.summary || []);
  var summaryHtml = summary.length ? '<div class="reco-section-ttl" style="margin-top:18px">RÉSUMÉ MAINTENANCE</div>' +
    '<ul class="reco-prio-list">' + summary.map(function(s){ return '<li>'+s+'</li>'; }).join('') + '</ul>' : '';

  container.innerHTML =
    '<div class="reco-table-wrap">' +
      '<div class="reco-section-ttl">MAINTENANCE DÉTAILLÉE PAR VÉHICULE</div>' +
      '<table class="reco-tbl">' +
        '<thead><tr>' +
          '<th class="reco-th">VÉHICULE</th>' +
          '<th class="reco-th">CLIENT</th>' +
          '<th class="reco-th">STATUT</th>' +
          '<th class="reco-th">ACTIONS RECOMMANDÉES</th>' +
        '</tr></thead>' +
        '<tbody>'+rows+'</tbody>' +
      '</table>' +
      summaryHtml +
    '</div>';
}

function syncMaintFromParsed(data) {
  var pa = document.getElementById('maint-print');
  if (!pa) return;
  var rows = (data.maintenance || []).map(function(r) {
    var urgLabel = r.urgency === 'danger' ? '🔴 Urgent' : r.urgency === 'warning' ? '🟡 Planifier' : r.urgency === 'info' ? '🔵 À surveiller' : '🟢 OK';
    return '<tr><td class="reco-td-client">'+r.vehicle+'</td>' +
      '<td class="reco-td-client">'+r.client+'</td>' +
      '<td class="reco-td-statut">'+urgLabel+'</td>' +
      '<td class="reco-td-actions"><ul class="reco-actions-list">'+(r.actions||[]).map(function(a){return '<li>'+a+'</li>';}).join('')+'</ul></td></tr>';
  }).join('');
  var summary = (data.summary||[]).map(function(s){return '<li>'+s+'</li>';}).join('');
  pa.innerHTML = '<div class="reco-table-wrap"><table class="reco-tbl"><thead><tr><th>VÉHICULE</th><th>CLIENT</th><th>STATUT</th><th>ACTIONS</th></tr></thead><tbody>'+rows+'</tbody></table>'+(summary?'<ul class="reco-prio-list">'+summary+'</ul>':'')+'</div>';
}

function syncMaint(ta) {
  var val = ta.value.trim();
  if (val) {
    try {
      var clean = val.replace(/```json|```/g,'').trim();
      var parsed = JSON.parse(clean);
      if (parsed && parsed.maintenance) {
        renderMaintTable(parsed);
        syncMaintFromParsed(parsed);
        return;
      }
    } catch(e) { /* not JSON — fall through */ }
  }
  var p = document.getElementById('maint-print');
  if (p) p.innerHTML = val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function generateMaintenancePrompt() {
  var d = APP.data;
  
  /* Build vehicle data with maintenance-specific metrics */
  var vLines = [];
  d.tableRows.forEach(function(r) {
    /* Calculate daily average km */
    var daysInPeriod = 30; /* default */
    if (d.period && d.period.includes(' ')) {
      var parts = d.period.split(' ');
      if (parts.length >= 2) {
        var monthYear = parts[parts.length-1];
        var m = monthYear.substring(0,3).toLowerCase();
        var y = parseInt(monthYear.substring(4));
        if (!isNaN(y)) {
          var monthIdx = {'jan':0,'fév':1,'fev':1,'mar':2,'avr':3,'avril':3,'mai':4,'jun':5,'jui':6,'jul':6,'aoû':7,'aou':7,'sep':8,'oct':9,'nov':10,'dec':11}[m];
          if (monthIdx !== undefined) {
            daysInPeriod = new Date(y, monthIdx+1, 0).getDate();
          }
        }
      }
    }
    var kmPerDay = r.km > 0 ? (r.km / daysInPeriod).toFixed(1) : '0';
    
    vLines.push('['+r.client+'] '+r.label
      +' type:'+r.type
      +' age:'+formatAge(r.age)
      +' km_mois:'+r.km
      +' km_jour_moy:'+kmPerDay
      +' score:'+r.score.toFixed(2)
      +' vMax:'+r.vitMax
      +' infrVit:'+r.spdKmInfr
      +' infrEco:'+r.ecoKmInfr
      +(r.km===0?' INACTIF':'')
      +(r.nonImmat?' SANS_IMMAT(VIN:'+r.vin+')':''));
  });
  var nonImmatVeh = d.tableRows.filter(function(r){ return r.nonImmat; });

  /* Group by client for summary */
  var clientSummary = {};
  d.tableRows.forEach(function(r) {
    var c = r.client;
    if (!clientSummary[c]) clientSummary[c] = { score:0, n:0, infr:0, inactive:0, km:0, kmPerDay:0 };
    clientSummary[c].km    += r.km;
    clientSummary[c].infr  += r.spdKmInfr + r.ecoKmInfr;
    clientSummary[c].n     += 1;
    clientSummary[c].score += r.score;
    if (r.km === 0) clientSummary[c].inactive++;
  });
  var clientLines = Object.keys(clientSummary).map(function(c) {
    var s = clientSummary[c];
    var avgKmPerDay = (s.km / 30).toFixed(1);
    return c+': scoreM='+(s.score/s.n).toFixed(1)+' km_mois='+s.km+' km_jour_moy='+avgKmPerDay+' infr='+s.infr+' veh='+s.n+(s.inactive?' inactifs='+s.inactive:'');
  });

  /* List vehicles without immatriculation */
  var nonImmatLines = nonImmatVeh.map(function(r) {
    return '['+r.client+'] '+r.label+' VIN:'+r.vin+' type:'+r.type+' age:'+formatAge(r.age)+' score:'+r.score.toFixed(2);
  });

  var context = [
    'RAPPORT '+d.reportTitle+' — '+d.period,
    'KM TOTAL: '+d.totalKm+' | SCORE MOY: '+d.avgScore+'/10 | ACTIFS: '+d.activeCount+'/'+d.totalVehicles,
    '',
    'RÉSUMÉ PAR CLIENT:',
  ].concat(clientLines).concat(['', 'DÉTAIL VÉHICULES:']).concat(vLines);

  if (nonImmatVeh.length > 0) {
    context = context.concat(['', 'VÉHICULES SANS IMMATRICULATION (identifier avec badge dans les recommandations) :']).concat(nonImmatLines);
  }

  var prompt = 'Tu es expert en gestion de flotte pour le compte de la BOA (Banque Of Africa) Bénin, dans un contexte de leasing de véhicules.\n' +
    'L\'objectif de ce rapport est la PRÉSERVATION DE LA VALEUR DES ACTIFS (les véhicules en leasing) et la PRÉVENTION DES RISQUES SINISTRES.\n' +
    'Tes recommandations sont adressées à la BOA, pas aux conducteurs. Il n\'y a AUCUNE dimension disciplinaire.\n' +
    'Chaque "client" est un preneur de leasing responsable de la bonne utilisation des actifs BOA.\n' +
    'Tes alertes concernent la protection des véhicules, l\'usure anormale, et les risques d\'accident matériel.\n' +
    'À partir de ces données, génère UNIQUEMENT un objet JSON valide (sans aucun texte avant ou après, sans balises markdown) avec cette structure exacte :\n' +
    '{\n' +
    '  "maintenance": [\n' +
    '    { "vehicle": "IMMATRICULATION", "client": "NOM_CLIENT", "urgency": "danger|warning|info|ok", "actions": ["action 1", "action 2"] }\n' +
    '  ],\n' +
    '  "summary": ["résumé 1", "résumé 2", "résumé 3"]\n' +
    '}\n\n' +
    'Règles strictes :\n' +
    '- urgency "danger" = maintenance urgente requise (âge > 3 ans OU km_cumulés > 80000 OU km/jour > 150km)\n' +
    '- urgency "warning" = maintenance à planifier (âge 2-3 ans OU km_cumulés 50000-80000 OU km/jour 100-150km)\n' +
    '- urgency "info" = à surveiller (âge 1-2 ans OU km_cumulés 30000-50000)\n' +
    '- urgency "ok" = véhicule en bon état (âge < 1 an ET km_cumulés < 30000)\n' +
    '- Actions orientées MAINTENANCE PRÉVENTIVE : vidange, freins, pneus, suspension, courroies, filtres\n' +
    '- Adapter les actions au TYPE de véhicule (Moto/Léger/Camion/Poids-Lourds) et à son USAGE (km/jour)\n' +
    '- 1 à 3 actions par véhicule, formulées du point de vue de la BOA (gestionnaire d\'actifs)\n' +
    '- 3 actions prioritaires globales max (perspective portefeuille BOA)\n' +
    '- Ton professionnel et factuel, pas d\'emoji dans les textes\n' +
    '- Chaque véhicule doit apparaître une seule fois\n' +
    '- Identifier les véhicules sans immatriculation avec un badge spécial\n\n' +
    context.join('\n');

  function _doCopy(text, cb) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(cb).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        cb();
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      cb();
    }
  }
  _doCopy(prompt, function() {
    window.open('https://chatgpt.com', '_blank');
    showToast('Prompt maintenance copié — colle avec Ctrl+V dans ChatGPT ✓', 'ok');
  });
}

/* =================================================================
   PAGE 6 — TABLEAU RÉSUMÉ (1 client/page)
   ================================================================= */
function buildTablePages(d) {
  var groups = d.vehiclesByClient || [];
  if (!groups.length) return [buildTableFallback(d)];
  return groups.map(function(g, idx) {
    var p = mkEl('div', 'rp rp-table');
    p.dataset.client = g.client || '';
    var rows = g.vehicles.map(function(r, i) {
      var st = statusOf(r), sc = scoreCls(r.score);
      var ageDisp = formatAge(r.age);
      /* label + immat badge */
      var immatBadge = r.nonImmat
        ? '<span style="display:inline-block;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:4px;font-size:8.5px;font-weight:700;padding:1px 5px;margin-left:4px;vertical-align:middle;white-space:nowrap">⏳ immat. N/A</span>'
        : '';
      var labelCell = r.nonImmat
        ? '<span title="VIN: '+r.vin+'">'+r.label+'</span>'+immatBadge
        : r.label;
      return '<tr class="'+(i%2?'tr-o':'tr-e')+'"><td class="td-l">'+labelCell+'</td>' +
        '<td class="td-m" style="color:#8B5CF6;font-weight:600">'+ageDisp+'</td>' +
        '<td class="td-m">'+displayN(r.km)+' km</td>' +
        '<td class="td-m">'+(r.vitMax||'—')+' km/h</td>' +
        '<td class="td-m">'+(r.heures>0?r.heures.toFixed(1)+' h':'—')+'</td>' +
        '<td class="td-m">'+(r.spdKmInfr>0?displayN(r.spdKmInfr)+' km':'—')+'</td>' +
        '<td class="td-m">'+(r.ecoKmInfr>0?displayN(r.ecoKmInfr)+' km':'—')+'</td>' +
        '<td class="tc"><span class="nb '+sc+'">'+r.score.toFixed(2)+'/10</span></td>' +
        '<td class="tc"><span class="st-badge '+st[1]+'">'+st[0]+'</span></td></tr>';
    }).join('');
    var tot = '<tr class="tr-tot"><td class="td-l">Total ('+g.vehicles.length+' veh.)</td>' +
      '<td class="td-m">—</td>' +
      '<td class="td-m">'+displayN(g.totalKm)+' km</td><td class="td-m">'+g.maxSpeed+' km/h</td><td class="td-m">—</td>' +
      '<td class="td-m">'+displayN(g.totalSpd)+' km</td><td class="td-m">—</td>' +
      '<td class="tc"><span class="nb '+scoreCls(g.avgScore)+'">'+g.avgScore.toFixed(2)+'/10</span></td><td class="tc">—</td></tr>';
    p.innerHTML = pageHeader('📋', 'Résumé — '+g.client,
      g.vehicles.length+' véhicule(s) · '+fmtN(g.totalKm)+' km · Score moy. '+g.avgScore.toFixed(2)+'/10', '#6366F1') +
      '<div class="tbl-wrap"><table class="st"><thead><tr>' +
        '<th>Véhicule</th><th>Âge</th><th>Kilométrage</th><th>Vit. max</th><th>H. moteur</th><th>Km infr. vit.</th><th>Km infr. éco</th><th>Score</th><th>Statut</th>' +
      '</tr></thead><tbody>'+rows+'</tbody><tfoot>'+tot+'</tfoot></table></div>' + scoreLegend();
    p.appendChild(mkEl('div', '', pageFooter(d.period)));
    return p;
  });
}
function buildTableFallback(d) {
  var p = mkEl('div', 'rp rp-table');
  var rows = d.tableRows.map(function(r, i) {
    var st = statusOf(r), sc = scoreCls(r.score);
    var fbBadge = r.nonImmat ? ' <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;border-radius:4px;font-size:8.5px;font-weight:700;padding:1px 5px;white-space:nowrap">⏳ immat. N/A</span>' : '';
    return '<tr class="'+(i%2?'tr-o':'tr-e')+'"><td class="td-l">'+r.label+fbBadge+'</td><td>'+r.client+'</td>' +
      '<td class="td-m">'+displayN(r.km)+' km</td><td class="td-m">'+(r.vitMax||'—')+' km/h</td>' +
      '<td class="td-m">'+displayN(r.spdKmInfr)+' km</td>' +
      '<td class="tc"><span class="nb '+sc+'">'+r.score.toFixed(2)+'/10</span></td>' +
      '<td class="tc"><span class="st-badge '+st[1]+'">'+st[0]+'</span></td></tr>';
  }).join('');
  p.innerHTML = pageHeader('📋','Tableau de résumé','Vue complète — '+d.period,'#6366F1') +
    '<div class="tbl-wrap"><table class="st"><thead><tr><th>Véhicule</th><th>Client</th><th>Km</th><th>Vit. max</th><th>Km infr. vit.</th><th>Score</th><th>Statut</th></tr></thead><tbody>'+rows+'</tbody></table></div>' + scoreLegend();
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}


/* =================================================================
   PAGE PIE — VUE HIÉRARCHIQUE FLOTTE (Zoom Caméra + Physique)
   ================================================================= */
function buildPagePie(d) {
  var p = mkEl('div', 'rp rp-pie');
  var totalVeh = d.totalVehicles || 0;
  var clientCount = d.fleetTree ? d.fleetTree.children.length : 0;
  p.innerHTML = pageHeader('🥧', 'Vue hiérarchique — Flotte',
    clientCount + ' clients · ' + totalVeh + ' véhicules · Client → Type → Immatriculation — ' + d.period, '#6366F1') +
    '<div class="pie-wrap">' +
      '<div id="pie-canvasWrap" style="position:relative">' +
        '<canvas id="pie-cv"></canvas>' +
      '</div>' +
      '<div class="pie-bar">' +
        '<button class="pie-btn" id="pie-back" disabled>← Retour</button>' +
        '<button class="pie-btn" id="pie-reset">⌂ Tout</button>' +
        '<div class="pie-bc" id="pie-bc"><strong>Flotte</strong></div>' +
        '<span class="pie-zi" id="pie-zi">×1.00</span>' +
      '</div>' +
    '</div>';

  /* Store tree for initPieChart */
  APP._fleetTree = d.fleetTree || { label:'Flotte', children:[] };
  p.appendChild(mkEl('div', '', pageFooter(d.period)));
  return p;
}

function initPieChart() {
  var FLEET = APP._fleetTree;
  if (!FLEET) return;
  var cv = document.getElementById('pie-cv');
  if (!cv) return;

  /* ── Dimensions ── */
  /* Walk up to the .rp section to get true available width */
  var rpEl = cv.closest ? cv.closest('.rp') : null;
  var availW = rpEl ? (rpEl.offsetWidth - 64) : (cv.parentElement.offsetWidth || 860);
  availW = Math.max(600, Math.min(availW, 1060));
  var W = availW;
  var H = Math.round(W * 0.54);
  H = Math.max(460, Math.min(H, 600));
  /* R leaves room for external labels on both sides */
  var R = Math.round(Math.min(W * 0.30, H * 0.38));
  var CX = W/2, CY = H/2;
  var START = -Math.PI/2;
  var dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  cv.style.maxWidth = '100%';
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);

  var HOVER_OFFSET = 13;

  /* ── State ── */
  var cam={x:CX,y:CY,s:1}, tgt={x:CX,y:CY,s:1};
  var zoomPath=[], hist=[], physStack=[];
  var hovNode=null, animRAF=null;
  var hovOff=0, hovOffTgt=0;
  var DAMP=0.96, ATTRACT=0.003, REPULSE=1.8, JITTER=0.008;
  var drag={active:false,circle:null,lastX:0,lastY:0,vx:0,vy:0};
  var pan={active:false,startX:0,startY:0,camX0:0,camY0:0,moved:false};

  /* ── Helpers ── */
  function countLeaves(n){ if(!n.children||!n.children.length)return 1; return n.children.reduce(function(s,c){return s+countLeaves(c);},0); }
  function deriveColor(parentHex,idx,total){ var n=parseInt(parentHex.replace('#',''),16); var r=(n>>16)&255,g=(n>>8)&255,b=n&255; var mix=0.28+(idx/Math.max(total-1,1))*0.28; return '#'+[r,g,b].map(function(c){return Math.min(255,Math.round(c+(255-c)*mix)).toString(16).padStart(2,'0');}).join(''); }
  function lighten(hex,amt){ var n=parseInt(hex.replace('#',''),16); return '#'+[(n>>16),((n>>8)&255),(n&255)].map(function(c){return Math.min(255,c+amt).toString(16).padStart(2,'0');}).join(''); }
  function activeChildren(){ if(!zoomPath.length)return FLEET.children; return zoomPath[zoomPath.length-1].children||[]; }
  function getPos(e){ var rect=cv.getBoundingClientRect(); return {x:(e.clientX-rect.left)*(W/rect.width),y:(e.clientY-rect.top)*(H/rect.height)}; }
  function screenToWorld(sx,sy){ return {x:(sx-W/2)/cam.s+cam.x,y:(sy-H/2)/cam.s+cam.y}; }

  /* ── Arc helpers ── */
  function getArcForPath(path){ var a1=START,a2=START+Math.PI*2,children=FLEET.children; for(var i=0;i<path.length;i++){ var tot=children.reduce(function(s,c){return s+countLeaves(c);},0),acc=a1; for(var j=0;j<children.length;j++){ var frac=countLeaves(children[j])/tot,ca2=acc+frac*(a2-a1); if(children[j]===path[i]){a1=acc;a2=ca2;children=children[j].children||[];break;} acc=ca2; } } return {a1:a1,a2:a2}; }
  function getChildArcs(path){ var arc=getArcForPath(path),ch=path.length?path[path.length-1].children:FLEET.children; if(!ch||!ch.length)return []; var tot=ch.reduce(function(s,c){return s+countLeaves(c);},0),acc=arc.a1,result=[]; ch.forEach(function(child){ var frac=countLeaves(child)/tot,ca1=acc,ca2=acc+frac*(arc.a2-arc.a1); result.push({node:child,a1:ca1,a2:ca2}); acc=ca2; }); return result; }

  /* ── Physics ── */
  function makeCircles(children,parentColor,container){ var n=children.length||1,leaves=children.map(function(c){return countLeaves(c);}),maxL=Math.max.apply(null,leaves)||1; var effR=container.type==='arc'?(function(){var h=(container.a2-container.a1)/2;return 2*R*Math.sin(h)*0.45;})():container.cr; var baseR=Math.max(4,Math.min(effR*0.35,effR/(Math.sqrt(n)*3))); var cx,cy; if(container.type==='arc'){var mid=(container.a1+container.a2)/2,h2=(container.a2-container.a1)/2,cr2=h2>0.001?(2/3)*R*Math.sin(h2)/h2:R*0.5;cx=CX+cr2*Math.cos(mid);cy=CY+cr2*Math.sin(mid);}else{cx=container.cx;cy=container.cy;} return children.map(function(child,i){var lf=countLeaves(child),r=Math.max(4,Math.min(effR*0.35,baseR*Math.sqrt(lf/maxL)*1.6)),ang=i*(Math.PI*2/n),spread=effR*0.30; return {node:child,x:cx+spread*Math.cos(ang)+(Math.random()-0.5)*2,y:cy+spread*Math.sin(ang)+(Math.random()-0.5)*2,vx:(Math.random()-0.5)*0.4,vy:(Math.random()-0.5)*0.4,r:r,color:deriveColor(parentColor,i,children.length),dragging:false};}); }
  function spawnLevel(children,parentColor,container,childArcs){ children.forEach(function(child,i){if(childArcs&&childArcs[i]){child._a1=childArcs[i].a1;child._a2=childArcs[i].a2;}}); var circles=makeCircles(children,parentColor,container); physStack.push({container:container,circles:circles,frozen:false,settled:false}); }
  function initPhysics(){ physStack=[]; if(!zoomPath.length)return; var ch=activeChildren(); if(!ch||!ch.length)return; var arc=getArcForPath(zoomPath),container={type:'arc',a1:arc.a1,a2:arc.a2},childArcs=getChildArcs(zoomPath),parentColor=zoomPath[zoomPath.length-1].color||'#2563a8'; spawnLevel(ch,parentColor,container,childArcs); }
  function freezeTopLevel(){ if(physStack.length)physStack[physStack.length-1].frozen=true; }
  function constrainSector(c,a1,a2,Ri,Ro){ var dx=c.x-CX,dy=c.y-CY,d=Math.sqrt(dx*dx+dy*dy)||0.001,ang=Math.atan2(dy,dx); while(ang<a1)ang+=Math.PI*2; while(ang>a1+Math.PI*2)ang-=Math.PI*2; var am=Math.asin(Math.min(1,c.r/Math.max(d,c.r+0.1)))*1.2,aLo=a1+am,aHi=a2-am; if(aLo>aHi)aLo=aHi=(a1+a2)*0.5; var rLo=Ri+c.r*1.08,rHi=Ro-c.r*1.08; if(rLo>rHi)rLo=rHi=(Ri+Ro)*0.5; var na=Math.max(aLo,Math.min(aHi,ang)),nd=Math.max(rLo,Math.min(rHi,d)); if(Math.abs(na-ang)>0.001||Math.abs(nd-d)>0.05){var nx=CX+nd*Math.cos(na),ny=CY+nd*Math.sin(na);c.vx+=(nx-c.x)*0.42;c.vy+=(ny-c.y)*0.42;c.x=nx;c.y=ny;} }
  function constrainCircle(c,pcx,pcy,pr){ var dx=c.x-pcx,dy=c.y-pcy,d=Math.sqrt(dx*dx+dy*dy)||0.001,maxD=Math.max(0,pr-c.r*1.08); if(d>maxD){var nx=pcx+(dx/d)*maxD,ny=pcy+(dy/d)*maxD;c.vx+=(nx-c.x)*0.44;c.vy+=(ny-c.y)*0.44;c.x=nx;c.y=ny;} }
  function updatePhysics(){ physStack.forEach(function(lvl){ if(lvl.frozen||lvl.settled)return; var cont=lvl.container,centX,centY; if(cont.type==='arc'){var mid=(cont.a1+cont.a2)/2,half=(cont.a2-cont.a1)/2,cr=(2/3)*R*Math.sin(half)/half;centX=CX+cr*Math.cos(mid);centY=CY+cr*Math.sin(mid);}else{centX=cont.cx;centY=cont.cy;} lvl.circles.forEach(function(c){if(c.dragging)return;c.vx+=(Math.random()-0.5)*JITTER+(centX-c.x)*ATTRACT;c.vy+=(Math.random()-0.5)*JITTER+(centY-c.y)*ATTRACT;c.x+=c.vx;c.y+=c.vy;c.vx*=DAMP;c.vy*=DAMP;}); for(var i=0;i<lvl.circles.length;i++){for(var j=i+1;j<lvl.circles.length;j++){var a=lvl.circles[i],b=lvl.circles[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||0.001,mn=a.r+b.r+3;if(d<mn){var f=(mn-d)/d*REPULSE*0.5;a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f;}}} lvl.circles.forEach(function(c){if(cont.type==='arc')constrainSector(c,cont.a1,cont.a2,R*0.05,R);else constrainCircle(c,cont.cx,cont.cy,cont.cr);}); var maxV=lvl.circles.reduce(function(m,c){return Math.max(m,Math.abs(c.vx),Math.abs(c.vy));},0);if(maxV<0.05)lvl.settled=true;}); }
  function physNeedsUpdate(){ return physStack.some(function(l){return !l.frozen&&!l.settled;}); }

  /* ── Draw ── */
  function drawSliceFill(ca1,ca2,color,dimmed,isHov){ var mid=(ca1+ca2)/2,off=isHov?hovOff/cam.s:0,ox=Math.cos(mid)*off,oy=Math.sin(mid)*off; ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.moveTo(CX,CY);ctx.arc(CX,CY,R,ca1,ca2);ctx.closePath(); if(dimmed){ctx.fillStyle=color;ctx.fill();ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fill();}else{ctx.fillStyle=color;ctx.fill();} ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(0.5,2.5/cam.s);ctx.stroke();ctx.restore(); }
  function drawLevel(children,a1,a2,depth,parentColor,isActiveBranch){ var tot=children.reduce(function(s,c){return s+countLeaves(c);},0),acc=a1,slices=[]; children.forEach(function(child,i){var frac=countLeaves(child)/tot,ca1=acc,ca2=acc+frac*(a2-a1);acc=ca2;var color=(depth===0&&child.color)?child.color:deriveColor(parentColor,i,children.length);var nodeIsOnPath=depth<zoomPath.length&&zoomPath[depth]===child;var dimmed=zoomPath.length>0&&!nodeIsOnPath&&!(depth===zoomPath.length&&isActiveBranch);var isHov=hovNode===child&&!dimmed;slices.push({child:child,ca1:ca1,ca2:ca2,color:color,nodeIsOnPath:nodeIsOnPath,isLastOnPath:nodeIsOnPath&&depth===zoomPath.length-1,dimmed:dimmed,isHov:isHov});}); slices.forEach(function(s){if(!s.isHov)drawSliceFill(s.ca1,s.ca2,s.color,s.dimmed,false);}); slices.forEach(function(s){if(s.isHov)drawSliceFill(s.ca1,s.ca2,s.color,s.dimmed,true);}); if(physStack.length>0)return; slices.forEach(function(s){if(s.child.children&&s.child.children.length&&s.nodeIsOnPath&&!s.isLastOnPath)drawLevel(s.child.children,s.ca1,s.ca2,depth+1,s.color,true);}); }
  function drawPhysicsCircles(){ physStack.forEach(function(lvl){ if(lvl.container.type==='circle'){var cont=lvl.container;ctx.beginPath();ctx.arc(cont.cx,cont.cy,cont.cr,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=Math.max(1,2/cam.s);ctx.stroke();} [false,true].forEach(function(wantHov){ lvl.circles.forEach(function(c){ var isHov=hovNode===c.node&&!lvl.frozen;if(isHov!==wantHov)return; var off=isHov?hovOff/cam.s:0,ddx=c.x-CX,ddy=c.y-CY,dd=Math.sqrt(ddx*ddx+ddy*ddy)||1,wx=c.x+(ddx/dd)*off,wy=c.y+(ddy/dd)*off; ctx.save();ctx.translate(wx,wy);ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2); var alpha=lvl.frozen?0.55:1.0; ctx.fillStyle=isHov?lighten(c.color,22):c.color;ctx.globalAlpha=alpha;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,0.80)';ctx.lineWidth=Math.max(1,2.5/cam.s);ctx.stroke(); var diam=c.r*2*cam.s; if(diam>18){ctx.scale(1/cam.s,1/cam.s);ctx.textAlign='center';ctx.textBaseline='middle'; var node=c.node,hasKids=!!(node.children&&node.children.length),count=countLeaves(node); var lines=[{text:node.label,bold:true}]; var allLeaves=hasKids&&node.children.every(function(ch){return !ch.children||!ch.children.length;}); if(allLeaves){node.children.forEach(function(ch){lines.push({text:ch.label,bold:false,plate:true});});}else if(hasKids){lines.push({text:count+' veh.',bold:false});} var fs=Math.max(7,Math.min(11,diam*0.16)),lh=fs+3,totalH=lines.length*lh,pw=0; lines.forEach(function(l){ctx.font=(l.bold?'700 ':'')+fs+'px sans-serif';pw=Math.max(pw,ctx.measureText(l.text).width);});pw+=10; ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-pw/2,-totalH/2,pw,totalH,4);else ctx.rect(-pw/2,-totalH/2,pw,totalH);ctx.globalAlpha=alpha*0.88;ctx.fillStyle='rgba(255,255,255,0.90)';ctx.fill();ctx.globalAlpha=1; lines.forEach(function(l,li){var ty=-totalH/2+lh*li+lh/2;ctx.fillStyle=l.plate?'#6366f1':l.bold?'#1e293b':'#64748b';ctx.font=(l.bold?'700 ':'')+fs+'px sans-serif';ctx.fillText(l.text,0,ty);});}ctx.restore();}); }); }); }

  /* ── Labels externes ── */
  var MIN_LABEL_ARC=6,LABEL_GAP=26,LABEL_H=30,LABEL_MARGIN=6;
  function collectLabels(children,a1,a2,out){ if(zoomPath.length>0)return; var tot=children.reduce(function(s,c){return s+countLeaves(c);},0),acc=a1; children.forEach(function(child,i){var frac=countLeaves(child)/tot,ca1=acc,ca2=acc+frac*(a2-a1);acc=ca2;var color=child.color||deriveColor('#888',i,children.length),arcPx=(ca2-ca1)*R*cam.s,isHov=hovNode===child; if(arcPx<MIN_LABEL_ARC)return; var mid=(ca1+ca2)/2,scx=(CX-cam.x)*cam.s+W/2,scy=(CY-cam.y)*cam.s+H/2,sr=R*cam.s,hoff=isHov?hovOff:0; var onRight=Math.cos(mid)>=0; var rawLx=scx+(sr+hoff+LABEL_GAP)*Math.cos(mid); var cLx=onRight?Math.min(rawLx,W-115):Math.max(rawLx,115); out.push({node:child,mid:mid,ex:scx+(sr+hoff)*Math.cos(mid),ey:scy+(sr+hoff)*Math.sin(mid),lx:cLx,ly:scy+(sr+hoff+LABEL_GAP)*Math.sin(mid),onRight:onRight,isHov:isHov,color:color,count:countLeaves(child),arcPx:arcPx,hasKids:!!(child.children&&child.children.length)});}); }
  function resolveCollisions(labels){ ['left','right'].forEach(function(side){ var g=labels.filter(function(l){return (side==='right')==l.onRight;}); g.sort(function(a,b){return a.ly-b.ly;}); for(var iter=0;iter<20;iter++){var mv=false;for(var i=0;i<g.length-1;i++){var a=g[i],b=g[i+1],ov=LABEL_H-(b.ly-a.ly);if(ov>0){a.ly-=ov/2;b.ly+=ov/2;mv=true;}}if(!mv)break;} var mn=LABEL_MARGIN+LABEL_H/2,mx=H-LABEL_MARGIN-LABEL_H/2; g.forEach(function(l){l.ly=Math.max(mn,Math.min(mx,l.ly));}); }); }
  function drawExternalLabels(labels){ var FS=11; ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr); labels.forEach(function(l){var onRight=l.onRight;ctx.beginPath();ctx.moveTo(l.ex,l.ey);ctx.lineTo(onRight?l.lx+6:l.lx-6,l.ly);ctx.lineTo(l.lx,l.ly);ctx.strokeStyle=l.isHov?'rgba(30,41,59,0.9)':'rgba(100,116,139,0.55)';ctx.lineWidth=l.isHov?1.4:0.85;ctx.stroke();ctx.beginPath();ctx.arc(l.ex,l.ey,l.isHov?3:1.8,0,Math.PI*2);ctx.fillStyle=l.isHov?'#1e293b':'rgba(100,116,139,0.65)';ctx.fill(); ctx.font='700 '+FS+'px sans-serif';var nw=ctx.measureText(l.node.label).width; ctx.font=(FS-1)+'px sans-serif';var sub=l.hasKids&&l.arcPx>28?l.count+' veh.':null,sw=sub?ctx.measureText(sub).width:0,pw=Math.max(nw,sw)+14,ph=sub?28:16,px=onRight?l.lx:l.lx-pw,py=l.ly-ph/2; ctx.beginPath();if(ctx.roundRect)ctx.roundRect(px,py,pw,ph,5);else ctx.rect(px,py,pw,ph);ctx.fillStyle=l.isHov?'rgba(255,255,255,0.97)':'rgba(255,255,255,0.92)';ctx.fill();ctx.strokeStyle=l.isHov?'rgba(30,41,59,0.25)':'rgba(100,116,139,0.18)';ctx.lineWidth=0.8;ctx.stroke(); var tx=px+pw/2;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+FS+'px sans-serif';ctx.fillStyle='#1e293b';ctx.fillText(l.node.label,tx,sub?py+9:py+ph/2);if(sub){ctx.font=(FS-1)+'px sans-serif';ctx.fillStyle='#64748b';ctx.fillText(sub,tx,py+20);} }); ctx.restore(); }

  /* ── Render ── */
  function render() {
    /* ── Clear using identity transform → couvre exactement les pixels physiques ── */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);

    /* ── Draw world (DPR + camera) ── */
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(W/2, H/2);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    ctx.beginPath();
    ctx.arc(CX, CY, R+16, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,.04)';
    ctx.fill();
    drawLevel(FLEET.children, START, START+Math.PI*2, 0, '#888', true);
    drawPhysicsCircles();
    ctx.restore();

    /* ── Labels (screen space, DPR handled inside) ── */
    var lc = [];
    collectLabels(FLEET.children, START, START+Math.PI*2, lc);
    resolveCollisions(lc);
    drawExternalLabels(lc);

    var el = document.getElementById('pie-zi');
    if (el) el.textContent = '×' + cam.s.toFixed(2);
  }

  /* ── Loop ── */
  function loop(){ var k=0.10;cam.x+=(tgt.x-cam.x)*k;cam.y+=(tgt.y-cam.y)*k;cam.s+=(tgt.s-cam.s)*k;hovOff+=(hovOffTgt-hovOff)*0.18; if(physNeedsUpdate())updatePhysics();render(); var camDone=Math.abs(cam.x-tgt.x)<.06&&Math.abs(cam.y-tgt.y)<.06&&Math.abs(cam.s-tgt.s)<.002,hovDone=Math.abs(hovOff-hovOffTgt)<0.12; if(camDone){cam.x=tgt.x;cam.y=tgt.y;cam.s=tgt.s;}if(hovDone)hovOff=hovOffTgt; if(!camDone||!hovDone||physNeedsUpdate())animRAF=requestAnimationFrame(loop);else{animRAF=null;render();} }
  function startAnim(){ if(!animRAF)animRAF=requestAnimationFrame(loop); }

  /* ── Navigation ── */
  function hitTestPhysics(wx,wy){ var lvl=physStack.length?physStack[physStack.length-1]:null;if(!lvl||lvl.frozen)return null;for(var i=lvl.circles.length-1;i>=0;i--){var c=lvl.circles[i],dx=wx-c.x,dy=wy-c.y;if(Math.sqrt(dx*dx+dy*dy)<=c.r)return c;}return null; }
  function hitTestPie(children,a1,a2,depth,wx,wy){ var dx=wx-CX,dy=wy-CY,d=Math.hypot(dx,dy);if(d>R)return null;var ang=Math.atan2(dy,dx),end=a1+Math.PI*2;while(ang<a1)ang+=Math.PI*2;while(ang>end)ang-=Math.PI*2;var tot=children.reduce(function(s,c){return s+countLeaves(c);},0),acc=a1;for(var i=0;i<children.length;i++){var child=children[i],frac=countLeaves(child)/tot,ca1=acc,ca2=acc+frac*(a2-a1);acc=ca2;if(ang<ca1||ang>=ca2)continue;return {node:child,a1:ca1,a2:ca2};}return null; }
  function updateUI(){ document.getElementById('pie-back').disabled=!hist.length;var parts=['Flotte'].concat(zoomPath.map(function(n){return n.label;}));document.getElementById('pie-bc').innerHTML=parts.map(function(p,i){return i===parts.length-1?'<strong>'+p+'</strong>':p+' <span style="opacity:.4">›</span> ';}).join(''); }
  function zoomToArc(a1,a2,node){ hist.push({x:tgt.x,y:tgt.y,s:tgt.s,path:zoomPath.slice()});zoomPath.push(node);var half=(a2-a1)/2,mid=(a1+a2)/2,chord=2*R*Math.sin(half),ts=Math.min((W*0.90)/chord,70),cr=half>0.001?(2/3)*R*Math.sin(half)/half:R*0.5;tgt.x=CX+cr*Math.cos(mid);tgt.y=CY+cr*Math.sin(mid);tgt.s=ts;initPhysics();updateUI();startAnim(); }
  function zoomToCircle(ball){ var node=ball.node;var allLeaves=node.children&&node.children.length>0&&node.children.every(function(ch){return !ch.children||!ch.children.length;});if(allLeaves||!node.children||!node.children.length)return;freezeTopLevel();hist.push({x:tgt.x,y:tgt.y,s:tgt.s,path:zoomPath.slice(),stackLen:physStack.length});zoomPath.push(node);tgt.x=ball.x;tgt.y=ball.y;tgt.s=Math.min((W*0.82)/(ball.r*2),80);var ch=node.children,childArcs=getChildArcs(zoomPath),container={type:'circle',cx:ball.x,cy:ball.y,cr:ball.r*0.90};spawnLevel(ch,ball.color,container,childArcs);updateUI();startAnim(); }
  function back(){ if(!hist.length)return;var p=hist.pop();tgt.x=p.x;tgt.y=p.y;tgt.s=p.s;zoomPath=p.path;if(p.stackLen!==undefined){physStack=physStack.slice(0,p.stackLen);if(physStack.length)physStack[physStack.length-1].frozen=false;}else{initPhysics();}updateUI();startAnim(); }
  function reset(){ hist=[];zoomPath=[];hovNode=null;physStack=[];tgt.x=CX;tgt.y=CY;tgt.s=1;updateUI();startAnim(); }

  /* ── Events ── */
  cv.addEventListener('wheel',function(e){e.preventDefault();var sp=getPos(e),wp=screenToWorld(sp.x,sp.y),factor=e.deltaY<0?1.12:0.89,newS=Math.max(0.5,Math.min(120,tgt.s*factor));tgt.x=wp.x-(sp.x-W/2)/newS;tgt.y=wp.y-(sp.y-H/2)/newS;tgt.s=newS;cam.x=tgt.x;cam.y=tgt.y;cam.s=tgt.s;if(!animRAF)render();},{passive:false});
  cv.addEventListener('dblclick',function(e){var sp=getPos(e),wp=screenToWorld(sp.x,sp.y);if(drag.active&&drag.circle){drag.circle.dragging=false;drag.active=false;drag.circle=null;}var phit=hitTestPhysics(wp.x,wp.y);if(phit&&phit.node.children&&phit.node.children.length){zoomToCircle(phit);return;}var hit=hitTestPie(FLEET.children,START,START+Math.PI*2,0,wp.x,wp.y);if(hit&&hit.node.children&&hit.node.children.length){var active=activeChildren();if(active.indexOf(hit.node)>=0)zoomToArc(hit.a1,hit.a2,hit.node);}});
  cv.addEventListener('mousedown',function(e){if(e.button!==0)return;var sp=getPos(e),wp=screenToWorld(sp.x,sp.y);var phit=hitTestPhysics(wp.x,wp.y);if(phit){drag.active=true;drag.circle=phit;drag.lastX=wp.x;drag.lastY=wp.y;drag.vx=0;drag.vy=0;phit.dragging=true;phit.vx=0;phit.vy=0;cv.style.cursor='grabbing';startAnim();return;}pan={active:true,startX:sp.x,startY:sp.y,camX0:cam.x,camY0:cam.y,moved:false};});
  cv.addEventListener('mousemove',function(e){var sp=getPos(e);if(drag.active&&drag.circle){var wp2=screenToWorld(sp.x,sp.y);drag.vx=wp2.x-drag.lastX;drag.vy=wp2.y-drag.lastY;drag.circle.x=wp2.x;drag.circle.y=wp2.y;drag.lastX=wp2.x;drag.lastY=wp2.y;var lvl=physStack[physStack.length-1];if(lvl){var cont=lvl.container;if(cont.type==='arc')constrainSector(drag.circle,cont.a1,cont.a2,R*0.05,R);else constrainCircle(drag.circle,cont.cx,cont.cy,cont.cr);}if(!animRAF)render();return;}if(pan.active){var dx=sp.x-pan.startX,dy=sp.y-pan.startY;if(Math.hypot(dx,dy)>3){pan.moved=true;tgt.x=pan.camX0-dx/cam.s;tgt.y=pan.camY0-dy/cam.s;cam.x=tgt.x;cam.y=tgt.y;if(!animRAF)render();}return;}var wp=screenToWorld(sp.x,sp.y);var phit=hitTestPhysics(wp.x,wp.y);var hit=phit?{node:phit.node,a1:phit.nodeA1||0,a2:phit.nodeA2||0}:hitTestPie(FLEET.children,START,START+Math.PI*2,0,wp.x,wp.y);var newHov=hit?hit.node:null;if(newHov!==hovNode){hovNode=newHov;hovOff=0;hovOffTgt=newHov?HOVER_OFFSET:0;physStack.forEach(function(l){if(!l.frozen)l.settled=false;});startAnim();}var isLeaf=hit&&(!hit.node.children||!hit.node.children.length);cv.style.cursor=(phit&&physStack.length&&!physStack[physStack.length-1].frozen)?'grab':isLeaf?'pointer':hit?'zoom-in':'default';if(!animRAF)render();});
  cv.addEventListener('mouseup',function(e){if(e.button!==0){pan.active=false;return;}if(drag.active&&drag.circle){drag.circle.dragging=false;drag.circle.vx=drag.vx*1.8;drag.circle.vy=drag.vy*1.8;drag.active=false;drag.circle=null;physStack.forEach(function(l){l.settled=false;});startAnim();return;}if(pan.moved){pan.active=false;return;}pan.active=false;var sp=getPos(e),wp=screenToWorld(sp.x,sp.y);var phit=hitTestPhysics(wp.x,wp.y);if(phit)return;if(Math.hypot(wp.x-CX,wp.y-CY)>R){if(zoomPath.length>0)back();return;}var hit=hitTestPie(FLEET.children,START,START+Math.PI*2,0,wp.x,wp.y);if(!hit){if(zoomPath.length>0)back();return;}var active=activeChildren();if(active.indexOf(hit.node)>=0){if(hit.node.children&&hit.node.children.length)zoomToArc(hit.a1,hit.a2,hit.node);}else{if(zoomPath.length>0)back();}});
  cv.addEventListener('mouseleave',function(){pan.active=false;if(drag.active&&drag.circle){drag.circle.dragging=false;drag.circle.vx=drag.vx;drag.circle.vy=drag.vy;drag.active=false;drag.circle=null;}hovNode=null;hovOffTgt=0;startAnim();if(!animRAF)render();});
  cv.addEventListener('contextmenu',function(e){e.preventDefault();if(zoomPath.length>0)back();});

  document.getElementById('pie-back').onclick = back;
  document.getElementById('pie-reset').onclick = reset;

  render();
}

/* ── Update parc detail table on click ── */
var _parcPage = 0;
var _parcMonthIdx = 0;
var PAGE_SIZE = 10;

function updateParcTable(monthIdx) {
  _parcMonthIdx = monthIdx;
  _parcPage = 0;
  renderParcTable();
}

function renderParcTable() {
  var parc = APP._parcData;
  if (!parc || !parc.months) return;
  var tbody = document.getElementById('parc-tbl-body');
  var lbl   = document.getElementById('parc-month-label');
  var pager = document.getElementById('parc-pager');
  if (!tbody) return;

  if (lbl) lbl.textContent = parc.months[_parcMonthIdx] || '';

  var PARC_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#EC4899','#84CC16','#A855F7','#14B8A6','#F43F5E'];

  /* Build entries with count + delta, filter zero-count */
  var entries = parc.clients.map(function(c, i) {
    var count = (parc.byClient[c] || [])[_parcMonthIdx] || 0;
    var delta = (parc.monthlyAdds[c] || [])[_parcMonthIdx] || 0;
    return { client: c, count: count, delta: delta, color: PARC_COLORS[i % PARC_COLORS.length] };
  }).filter(function(e) { return e.count > 0; });

  /* Sort: largest abs(delta) first, then by count desc */
  entries.sort(function(a, b) {
    var da = Math.abs(b.delta) - Math.abs(a.delta);
    return da !== 0 ? da : b.count - a.count;
  });

  /* Pagination */
  var totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  _parcPage = Math.max(0, Math.min(_parcPage, totalPages - 1));
  var pageEntries = entries.slice(_parcPage * PAGE_SIZE, (_parcPage + 1) * PAGE_SIZE);

  /* Render rows */
  tbody.innerHTML = pageEntries.map(function(e) {
    var deltaBadge = e.delta > 0
      ? '<span style="color:var(--green);font-weight:700;font-size:10.5px;background:#ECFDF5;padding:1px 6px;border-radius:4px">+'+e.delta+'</span>'
      : e.delta < 0
        ? '<span style="color:var(--red);font-weight:700;font-size:10.5px;background:#FEF2F2;padding:1px 6px;border-radius:4px">'+e.delta+'</span>'
        : '<span style="color:var(--subtle);font-size:10px">—</span>';
    return '<tr>' +
      '<td style="display:flex;align-items:center;gap:6px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:'+e.color+';display:inline-block;flex-shrink:0"></span>' +
        e.client +
      '</td>' +
      '<td style="font-weight:700;font-family:JetBrains Mono,monospace;text-align:center">'+e.count+'</td>' +
      '<td style="text-align:center">'+deltaBadge+'</td>' +
    '</tr>';
  }).join('');

  /* Pager */
  if (pager) {
    if (totalPages <= 1) {
      pager.style.display = 'none';
    } else {
      pager.style.display = 'flex';
      pager.innerHTML =
        '<button class="parc-pager-btn" onclick="parcPageNav(-1)" '+((_parcPage===0)?'disabled':'')+'>←</button>' +
        '<span style="font-size:10px;color:var(--muted)">' + (_parcPage+1) + ' / ' + totalPages + '</span>' +
        '<button class="parc-pager-btn" onclick="parcPageNav(1)" '+((_parcPage>=totalPages-1)?'disabled':'')+'>→</button>';
    }
  }
}

function parcPageNav(dir) {
  _parcPage += dir;
  renderParcTable();
}

/* =================================================================
   CHARTS
   ================================================================= */
function destroyCharts() {
  Object.keys(APP.charts).forEach(function(id){ if(APP.charts[id]) APP.charts[id].destroy(); });
  APP.charts = {};
  Object.keys(APP.presCharts).forEach(function(id){ if(APP.presCharts[id]) APP.presCharts[id].destroy(); });
  APP.presCharts = {};
}

function initCharts(d) {
  /* ── Parc evolution area chart ── */
  var parcCv = document.getElementById('parc-area-cv');
  if (parcCv && APP._parcData && APP._parcData.months.length) {
    var parc = APP._parcData;
    /* Total line only */
    var parcDatasets = [{
      label: 'Total flotte',
      data: parc.totals,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.10)',
      borderWidth: 2.5, tension: 0.4, fill: true,
      pointRadius: 5, pointHoverRadius: 9,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: 'white', pointBorderWidth: 2
    }];

    var parcChart = new Chart(parcCv, {
      type: 'line',
      data: { labels: parc.months, datasets: parcDatasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        onClick: function(evt, elements) {
          if (!elements.length) return;
          var idx = elements[0].index;
          updateParcTable(idx);
        },
        plugins: {
          legend: { position:'bottom', labels:{ font:{size:10}, padding:10, usePointStyle:true, pointStyleWidth:8 } },
          tooltip: {
            backgroundColor:'#1E293B', titleColor:'#F1F5F9', bodyColor:'#94A3B8', padding:10,
            callbacks:{ label:function(ctx){ return ' '+ctx.dataset.label+' : '+ctx.parsed.y+' veh.'; } }
          }
        },
        scales: {
          x:{ ticks:{font:{size:10,family:'JetBrains Mono'},color:'#64748B'}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} },
          y:{ ticks:{font:{size:10},color:'#94A3B8',stepSize:1}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false}, beginAtZero:true }
        }
      }
    });
    APP.charts['parc-area'] = parcChart;
    /* Init table with last month */
    updateParcTable(parc.months.length - 1);
  }

  /* ── Trends charts ── */
  if (APP._trendsData) {
    var t = APP._trendsData;
    var trendDefs = [
      { id:'trend-km-cv',    data:t.km,      color:'#3B82F6', label:'Km total', unit:'km', fill:true },
      { id:'trend-score-cv', data:t.score,   color:'#10B981', label:'Score éco /10', unit:'/10', fill:false },
      { id:'trend-infr-cv',  data:t.infrVit, color:'#EF4444', label:'Km infr. vitesse', unit:'km', fill:true },
      { id:'trend-eco-cv',   data:t.ecoKm,   color:'#F59E0B', label:'Km infr. éco', unit:'km', fill:true }
    ];
    trendDefs.forEach(function(def) {
      var cv = document.getElementById(def.id);
      if (!cv) return;
      var ch = new Chart(cv, {
        type: 'line',
        data: {
          labels: t.months,
          datasets: [{
            label: def.label, data: def.data,
            borderColor: def.color,
            backgroundColor: def.fill ? def.color+'22' : 'transparent',
            borderWidth: 2.5, tension: 0.4, fill: def.fill,
            pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: def.color
          }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1E293B',titleColor:'#F1F5F9',bodyColor:'#94A3B8',callbacks:{ label:function(ctx){return ' '+ctx.parsed.y+' '+def.unit;} } } },
          scales:{
            x:{ ticks:{font:{size:9,family:'JetBrains Mono'},color:'#64748B',maxRotation:30}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false} },
            y:{ ticks:{font:{size:9},color:'#94A3B8',maxTicksLimit:5}, grid:{color:'rgba(226,232,240,.5)'}, border:{display:false}, beginAtZero:false }
          }
        }
      });
      APP.charts[def.id] = ch;
    });
  }

  /* ── Daily line chart ── */
  var dailyCv = document.getElementById('daily-line-cv');
  if (dailyCv && d.dailyKm && d.dailyKm.length) {
    var daily = d.dailyKm;
    var labels = daily.map(function(x){ return x.date.slice(8)+'/'+x.date.slice(5,7); });
    var avgData = daily.map(function(x){ return x.avgKm; });
    var ecoData = daily.map(function(x){ return x.ecoKm; });
    var dchart = new Chart(dailyCv, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Km moy./veh. actif',
            data: avgData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.10)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3B82F6'
          },
          {
            label: 'Km infraction éco (total flotte)',
            data: ecoData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#EF4444',
            borderDash: [5,3]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: {
            position:'top',
            labels:{
              font:{size:11,family:'Sora,sans-serif'},
              padding:16,
              usePointStyle:true,
              pointStyleWidth:10
            }
          },
          tooltip: {
            backgroundColor:'#1E293B',
            titleColor:'#F1F5F9',
            bodyColor:'#94A3B8',
            padding:10,
            callbacks:{
              label:function(ctx){
                return ' '+ctx.dataset.label+' : '+ctx.parsed.y+' km';
              }
            }
          }
        },
        scales: {
          x:{
            ticks:{font:{size:10,family:'JetBrains Mono,monospace'},color:'#64748B',maxRotation:0},
            grid:{color:'rgba(226,232,240,0.6)'},
            border:{display:false}
          },
          y:{
            ticks:{font:{size:10},color:'#94A3B8',callback:function(v){return v+' km';}},
            grid:{color:'rgba(226,232,240,0.6)'},
            border:{display:false},
            beginAtZero:true
          }
        }
      }
    });
    APP.charts['daily-line'] = dchart;
  }


  /* ── Histogramme horizontal types ── */
  var hEl = document.getElementById('hbar-types');
  if (hEl) {
    var types = d.vehicleTypes || [], counts = d.typeDistrib || [];
    /* Let CSS flex:1 on hbar-wrap control height — just mark canvas as responsive */
    var wEl = document.getElementById('hbar-wrap');
    if (wEl) {
      /* Compute ideal height based on number of types */
      var idealH = Math.max(160, Math.min(types.length * 44 + 40, 340));
      wEl.style.minHeight = idealH + 'px';
    }
    APP.charts['hbar'] = new Chart(hEl, {
      type: 'bar',
      data: { labels: types, datasets: [{ data: counts, backgroundColor: PIE_COLORS.slice(0, types.length), borderRadius: 5, borderSkipped: false, maxBarThickness: 28 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        layout: { padding: { right: 44, top: 4, bottom: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, TIP, { callbacks: { label: function(c){ return ' '+c.formattedValue+' veh.'; } } }),
          datalabels: window.ChartDataLabels ? {
            display: true, anchor: 'end', align: 'right',
            color: '#334155', font: { weight: '700', size: 11, family: 'JetBrains Mono' },
            formatter: function(v){ return v > 0 ? v : null; }, padding: { left: 5 }
          } : { display: false }
        },
        scales: {
          x: { min: 0, grid: GL, border: { display: false }, ticks: { color: '#64748B', font: { size: 10 }, maxTicksLimit: 6 } },
          y: { grid: GN, border: { display: false }, ticks: { color: '#1E293B', font: { size: 11, weight: '600' }, padding: 4 } }
        }
      }
    });
  }

  /* ── Bar stacked charts (page 4) ── */
  CHART_CFGS.forEach(function(cfg) {
    var canvas = document.getElementById(cfg.id);
    if (!canvas) return;
    var sk = d.stackedAll && d.stackedAll[cfg.key];
    if (!sk || !sk.clients.length) return;
    var wrap = canvas.parentElement;
    /* CSS chart-card-wrap height:420px handles sizing */
    APP.charts[cfg.id] = new Chart(canvas, {
      type: 'bar',
      data: { labels: sk.clients, datasets: sk.datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        layout: { padding: { top: 22, right: 8, bottom: 4 } },
        _stackLabels: true, _unit: cfg.unit,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 7, font: { size: 9, family: 'JetBrains Mono' }, color: '#475569', usePointStyle: true, pointStyle: 'rect' } },
          tooltip: Object.assign({}, TIP, {
            mode: 'index', intersect: false,
            callbacks: {
              title: function(items){ return items[0] ? items[0].label : ''; },
              label: function(ctx){ if(!ctx.raw||ctx.raw===0)return null; return ' '+ctx.dataset.label+' : '+Math.round(ctx.raw).toLocaleString('fr')+' '+cfg.unit; },
              footer: function(items){ var t=items.reduce(function(s,i){return s+(i.raw||0);},0); return 'Total : '+Math.round(t).toLocaleString('fr')+' '+cfg.unit; }
            }
          }),
          datalabels: { display: false }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#334155', font: { size: 10, weight: '600' }, maxRotation: 28 }, grid: GN, border: { display: false } },
          y: { stacked: true, ticks: { color: '#64748B', font: { size: 9 }, maxTicksLimit: 6, callback: function(v){ return fmtV(v)||'0'; } }, grid: GL, border: { display: false } }
        }
      }
    });
  });

  /* ── Dashboard charts ── */
  var dash = d.dashboard || {};
  var dKm = document.getElementById('dash-km');
  if (dKm && dash.monthlyKm && dash.monthlyKm.length) {
    APP.charts['dash-km'] = new Chart(dKm, {
      type: 'bar',
      data: { labels: dash.monthlyKm.map(function(r){return r.month;}), datasets: [
        { label: String(dash.yrPrev||'N-1'), data: dash.monthlyKm.map(function(r){return r.kmPrev;}), backgroundColor: '#CBD5E1', borderRadius: 3, borderSkipped: false, maxBarThickness: 18 },
        { label: String(dash.yrCur||'N'),   data: dash.monthlyKm.map(function(r){return r.km;}),     backgroundColor: '#3B82F6', borderRadius: 3, borderSkipped: false, maxBarThickness: 18 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, TIP, { callbacks: { label: function(c){return ' '+c.dataset.label+' : '+Math.round(c.raw).toLocaleString('fr')+' km';} } }), datalabels: { display: false } },
        scales: { x: { ticks: { color:'#64748B', font:{size:8} }, grid:GN, border:{display:false} }, y: { ticks: { color:'#94A3B8', font:{size:8}, maxTicksLimit:4, callback:function(v){return v>=1000?Math.round(v/1000)+'k':v;} }, grid:GL, border:{display:false} } }
      }
    });
  }
  var dEco = document.getElementById('dash-eco');
  if (dEco && dash.ecoTrend && dash.ecoTrend.length) {
    APP.charts['dash-eco'] = new Chart(dEco, {
      type: 'line',
      data: { labels: dash.ecoTrend.map(function(r){return r.month;}), datasets: [
        { label:'Score', data: dash.ecoTrend.map(function(r){return r.score;}), borderColor:'#3B82F6', backgroundColor:'rgba(59,130,246,.1)', borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#3B82F6', fill:true, tension:.35 },
        { label:'Cible', data: dash.ecoTrend.map(function(r){return r.target;}), borderColor:'#EF4444', backgroundColor:'transparent', borderWidth:1.5, borderDash:[5,4], pointRadius:0, fill:false, tension:0 }
      ]},
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, TIP, { callbacks: { label: function(c){return ' '+c.dataset.label+' : '+c.formattedValue+'/10';} } }), datalabels: { display: false } },
        scales: { x: { ticks:{color:'#64748B',font:{size:8}}, grid:GN, border:{display:false} }, y: { min:0, max:10, ticks:{color:'#94A3B8',font:{size:8},maxTicksLimit:5}, grid:GL, border:{display:false} } }
      }
    });
  }
}

/* =================================================================
   PRÉSENTATION PLEIN ÉCRAN — vraie expérience type Powerpoint
   ================================================================= */
var PRES_DEFS = [
  { type:'cover',  key:'cover' },
  { type:'kpis',   key:'kpis'  },
  { type:'chart',  key:'km',   title:'Kilometrage par client et vehicule', color:'#3B82F6', unit:'km' },
  { type:'chart',  key:'infr', title:'Infractions de vitesse', color:'#EF4444', unit:'km' },
  { type:'parc',   key:'parc'  },
  { type:'trends', key:'trends'},
  { type:'map',    key:'map'   },
  { type:'risk',   key:'risk'  },
  { type:'maint',  key:'maint' },
  { type:'reco',   key:'reco'  },
];

function buildPresSlides(d) {
  APP.presSlides = PRES_DEFS;
  /* Build dots */
  var dots = document.getElementById('pres-dots');
  if (!dots) return;
  dots.innerHTML = PRES_DEFS.map(function(_, i) {
    return '<span class="pdot" onclick="presGo(' + i + ')"></span>';
  }).join('');
}

function startPresentation() {
  var overlay = document.getElementById('pres-overlay');
  overlay.style.display = 'flex';
  APP.presActive = true;
  APP.presSlide = 0;

  /* ── Laser cursor setup ── */
  (function() {
    /* Remove old instances */
    var old = document.getElementById('laser-dot');
    if (old) old.remove();
    document.querySelectorAll('.laser-trail').forEach(function(el){ el.remove(); });

    var dot = document.createElement('div');
    dot.id = 'laser-dot';
    document.body.appendChild(dot);

    var onMove = function(e) {
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
    };

    var presOverlay = document.getElementById('pres-overlay');
    presOverlay.addEventListener('mousemove', onMove);

    /* Clean up on exit */
    APP._laserCleanup = function() {
      presOverlay.removeEventListener('mousemove', onMove);
      dot.remove();
    };
  })();

  /* Progress bar */
  var progEl = document.getElementById('pres-progress');
  if (!progEl) {
    progEl = document.createElement('div');
    progEl.id = 'pres-progress';
    progEl.className = 'pres-progress';
    document.getElementById('pres-overlay').appendChild(progEl);
  }
  /* Keyboard hint */
  var hintEl = document.getElementById('pres-hint');
  if (!hintEl) {
    hintEl = document.createElement('div');
    hintEl.className = 'pres-hint';
    hintEl.textContent = '← → ESPACE · ÉCHAP pour quitter';
    document.getElementById('pres-overlay').appendChild(hintEl);
  }

  /* Try fullscreen */
  var el = document.documentElement;
  var requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (requestFS) requestFS.call(el).catch(function(){});

  /* Keyboard nav */
  document.addEventListener('keydown', presKeyHandler);

  presGo(0);
  document.getElementById('btn-present').classList.add('active');
}

function stopPresentation() {
  APP.presActive = false;
  if (APP._laserCleanup) { APP._laserCleanup(); APP._laserCleanup = null; }
  document.getElementById('pres-overlay').style.display = 'none';

  /* Exit fullscreen */
  var exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement)) exitFS.call(document).catch(function(){});

  document.removeEventListener('keydown', presKeyHandler);
  document.getElementById('btn-present').classList.remove('active');

  /* Destroy presentation charts */
  Object.keys(APP.presCharts).forEach(function(id){ if(APP.presCharts[id]) APP.presCharts[id].destroy(); });
  APP.presCharts = {};
}

function presKeyHandler(e) {
  if (!APP.presActive) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); presNav(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); presNav(-1); }
  else if (e.key === 'Escape') stopPresentation();
}

function presNav(dir) {
  var next = APP.presSlide + dir;
  if (next < 0 || next >= APP.presSlides.length) return;
  presGo(next);
}

function presGo(idx) {
  APP.presSlide = idx;
  var d = APP.data;
  var slides = APP.presSlides;

  /* Counter */
  document.getElementById('pres-counter').textContent = (idx + 1) + ' / ' + slides.length;

  /* Progress bar */
  var prog = document.getElementById('pres-progress');
  if (prog) prog.style.width = ((idx + 1) / slides.length * 100) + '%';

  /* Dots */
  document.querySelectorAll('.pdot').forEach(function(dot, i) {
    dot.classList.toggle('pdot-active', i === idx);
  });

  /* Render slide */
  var stage = document.getElementById('pres-stage');
  var def = slides[idx];

  /* Animate out */
  stage.classList.remove('slide-in-right', 'slide-in-left', 'slide-in');
  stage.classList.add('slide-out');

  setTimeout(function() {
    stage.classList.remove('slide-out');
    var html = '';
    if (def.type === 'cover') html = buildPressCover(d);
    else if (def.type === 'kpis') html = buildPressKPIs(d);
    else if (def.type === 'chart') html = buildPressChart(d, def);
    else if (def.type === 'parc') html = buildPressParc(d);
    else if (def.type === 'trends') html = buildPressTrends(d);
    else if (def.type === 'map') html = buildPressMap(d);
    else if (def.type === 'risk')  html = buildPressRisk(d);
    else if (def.type === 'maint') html = buildPressMaint(d);
    else if (def.type === 'reco')  html = buildPressReco(d);
    stage.innerHTML = html;
    stage.classList.add('slide-in');

    /* Séquence d'animations des éléments */
    var animEls = stage.querySelectorAll('.pa');
    animEls.forEach(function(el, i) {
      el.style.animationDelay = (i * 120) + 'ms';
    });

    /* Init chart si besoin */
    if (def.type === 'chart') {
      setTimeout(function() { initPresChart(d, def); }, 80);
    } else if (def.type === 'parc') {
      setTimeout(function() { initPresParc(d); }, 80);
    } else if (def.type === 'trends') {
      setTimeout(function() { initPressTrends(d); }, 80);
    }
  }, 280);
}

/* ─── Slide 1 : Couverture ─────────────────────────────────── */
function buildPressCover(d) {
  return '<div class="ps ps-cover">' +
    '<div class="ps-bg-grad"></div>' +
    '<div class="ps-cover-body">' +
      '<div class="pa pa-fade-up" style="display:flex;align-items:center;gap:16px;margin-bottom:32px">' +
        logoHTML(56) + (!APP.logo ? '<span style="font-size:32px;font-weight:800;color:#3B82F6">igeo</span>' : '') +
      '</div>' +
      '<div class="pa pa-fade-up ps-chip" style="background:rgba(59,130,246,.1);color:#2563EB">📊 RAPPORT D\'ACTIVITÉ</div>' +
      '<h1 class="pa pa-fade-up" style="font-size:clamp(36px,5vw,72px);font-weight:800;color:#1E293B;letter-spacing:-2px;line-height:1;margin-bottom:16px">' + d.reportTitle.replace('RAPPORT ACTIVITE ','') + '</h1>' +
      '<p class="pa pa-fade-up" style="font-size:18px;color:#64748B;margin-bottom:8px">' + d.clientName + '</p>' +
      '<p class="pa pa-fade-up" style="font-size:28px;font-weight:600;color:#3B82F6;margin-bottom:40px">' + d.period + '</p>' +
      '<div class="pa pa-fade-up ps-cover-stats">' +
        pStat(fmtN(d.totalKm), 'km parcourus') +
        pStat(d.totalVehicles, 'véhicules') +
        pStat(d.activeCount, 'actifs') +
        pStat(d.avgScore.toFixed(1)+'/10', 'score moyen') +
      '</div>' +
    '</div>' +
  '</div>';
}
function pStat(val, lbl) {
  return '<div class="ps-stat"><div class="ps-stat-v">' + val + '</div><div class="ps-stat-l">' + lbl + '</div></div>';
}

/* ─── Slide 2 : KPIs ───────────────────────────────────────── */
function buildPressKPIs(d) {
  var dash = d.dashboard || {}, kpis = dash.kpis || {};
  var metrics = [
    { val: fmtN(d.totalKm)+' km',          lbl: 'Kilométrage total',      color: '#3B82F6', icon: '🗺' },
    { val: d.activeCount+'/'+d.totalVehicles, lbl: 'Véhicules actifs',    color: '#10B981', icon: '✅' },
    { val: d.avgScore.toFixed(1)+'/10',     lbl: 'Score éco moyen',        color: '#F59E0B', icon: '📊' },
    { val: fmtN(d.totalSpd)+' km',         lbl: 'Km en infraction vit.',  color: '#EF4444', icon: '⚡' },
    { val: fmtN(d.totalPen)+' pts',        lbl: 'Pénalités éco cumulées', color: '#8B5CF6', icon: '📋' },
    { val: d.maxSpeed+' km/h',             lbl: 'Vitesse maximale',        color: '#F97316', icon: '🏎' },
  ];
  return '<div class="ps ps-kpis">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:rgba(59,130,246,.12);color:#2563EB">02</div>' +
      '<div><div class="ps-chip" style="margin-bottom:6px;background:rgba(59,130,246,.1);color:#2563EB">⚡ INDICATEURS DE PERFORMANCE</div>' +
      '<div class="ps-h-title">Tableau de bord flotte</div>' +
      '<div class="ps-h-sub">' + d.period + ' — ' + d.clientName + '</div></div>' +
    '</div>' +
    '<div class="ps-kpi-grid">' +
      metrics.map(function(m, i) {
        return '<div class="pa pa-fade-up ps-kpi-card" style="border-top:4px solid '+m.color+'">' +
          '<div class="ps-kpi-icon">' + m.icon + '</div>' +
          '<div class="ps-kpi-val" style="color:'+m.color+'">' + m.val + '</div>' +
          '<div class="ps-kpi-lbl">' + m.lbl + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="pa pa-fade-up ps-context">' +
      (d.activeCount < d.totalVehicles ? '<strong>' + (d.totalVehicles - d.activeCount) + ' vehicule(s) inactif(s)</strong> ce mois. ' : 'Toute la flotte a ete active ce mois. ') +
      'Score eco moyen <strong>' + d.avgScore.toFixed(1) + '/10</strong> \u2014 ' +
      (d.avgScore >= 8 ? 'comportement general <strong>maitrise</strong>.' : d.avgScore >= 6 ? 'comportement <strong>acceptable</strong>.' : 'comportement <strong>a corriger</strong>.') +
    '</div>' +
  '</div>';
}

/* ─── Slide 3-5 : Graphique ────────────────────────────────── */
function buildPressChart(d, def) {
  return '<div class="ps ps-chart">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:'+def.color+'18;color:'+def.color+'">0' + (APP.presSlide+1) + '</div>' +
      '<div>' +
        '<div class="ps-chip" style="margin-bottom:6px;background:'+def.color+'18;color:'+def.color+'">📉 ANALYSE GRAPHIQUE</div>' +
        '<div class="ps-h-title">' + def.title + '</div>' +
        '<div class="ps-h-sub">' + d.period + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="pa pa-fade-up ps-context" style="margin-bottom:8px">' +
      (def.key === 'km' ? 'Repartition du kilometrage par client. Le client le plus actif concentre une part significative des deplacements.' : 'Distance en infraction de vitesse par client. Ces exces representent un risque pour la preservation des actifs en leasing BOA.') +
    '</div>' +
    '<div class="pa pa-fade-up ps-chart-wrap">' +
      '<canvas id="pres-chart-' + def.key + '"></canvas>' +
    '</div>' +
  '</div>';
}
function initPresChart(d, def) {
  var canvasId = 'pres-chart-' + def.key;
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  var sk = d.stackedAll && d.stackedAll[def.key];
  if (!sk || !sk.clients.length) return;

  APP.presCharts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: { labels: sk.clients, datasets: sk.datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: {
        duration: 1000, easing: 'easeOutQuart',
        delay: function(ctx) { return ctx.dataIndex * 50; }
      },
      layout: { padding: { top: 30, right: 16, bottom: 4 } },
      _stackLabels: true, _unit: def.unit || 'km',
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { boxWidth: 12, boxHeight: 12, padding: 10, font: { size: 11, family: 'JetBrains Mono' }, color: '#475569', usePointStyle: true, pointStyle: 'rect' }
        },
        tooltip: Object.assign({}, TIP, {
          mode: 'index', intersect: false,
          callbacks: {
            title: function(items){ return items[0] ? items[0].label : ''; },
            label: function(ctx){ if(!ctx.raw||ctx.raw===0)return null; return ' '+ctx.dataset.label+' : '+Math.round(ctx.raw).toLocaleString('fr')+' '+(def.unit||'km'); },
            footer: function(items){ var t=items.reduce(function(s,i){return s+(i.raw||0);},0); return 'Total : '+Math.round(t).toLocaleString('fr')+' '+(def.unit||'km'); }
          }
        }),
        datalabels: { display: false }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#334155', font: { size: 13, weight: '600' }, maxRotation: 25 }, grid: GN, border: { display: false } },
        y: { stacked: true, ticks: { color: '#64748B', font: { size: 11 }, maxTicksLimit: 7, callback: function(v){ return fmtV(v)||'0'; } }, grid: GL, border: { display: false } }
      }
    }
  });
}

/* ─── Slide 6 : Risques ────────────────────────────────────── */
function buildPressRisk(d) {
  var sin = d.sinistralite || {};
  var riskColor = sin.riskScore >= 60 ? '#EF4444' : sin.riskScore >= 35 ? '#F59E0B' : '#10B981';
  var riskLabel = sin.riskScore >= 60 ? 'Élevé' : sin.riskScore >= 35 ? 'Modéré' : 'Faible';

  var critCards = (sin.critiques || []).slice(0, 4).map(function(v, i) {
    return '<div class="pa pa-fade-up ps-risk-card">' +
      '<div class="ps-rc-label">' + v.label + ' <span style="color:#94A3B8;font-size:11px">' + v.client + '</span></div>' +
      '<div class="ps-rc-score n-lo">' + v.score.toFixed(1) + '/10</div>' +
      '<div class="ps-rc-detail">' + v.vitMax + ' km/h max · ' + fmtN(v.spdKmInfr) + ' km infr.</div>' +
    '</div>';
  }).join('');

  return '<div class="ps ps-risk">' +
    '<div class="ps-header pa pa-fade-down">' +
      '<div class="ps-h-num" style="background:#EF444418;color:#EF4444">0' + (APP.presSlide+1) + '</div>' +
      '<div>' +
        '<div class="ps-chip" style="margin-bottom:6px;background:#EF444418;color:#EF4444">⚠️ SINISTRALITÉ</div>' +
        '<div class="ps-h-title">Analyse des risques</div>' +
        '<div class="ps-h-sub">' + d.period + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="ps-risk-body">' +
      '<div class="pa pa-fade-up ps-risk-gauge">' +
        '<div class="ps-gauge-ring" style="border-color:' + riskColor + '">' +
          '<div class="ps-gauge-val" style="color:' + riskColor + '">' + sin.riskScore + '%</div>' +
          '<div class="ps-gauge-lbl" style="color:' + riskColor + '">' + riskLabel + '</div>' +
        '</div>' +
        '<p style="margin-top:12px;font-size:13px;color:#64748B;text-align:center">Indice de risque flotte</p>' +
      '</div>' +
      '<div class="ps-risk-metrics">' +
        '<div class="pa pa-fade-up ps-rm">' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#EF4444">🔴</span><span class="ps-rm-lbl">Véhicules critiques (score&lt;4)</span><strong>' + (sin.nCritiques||0) + '</strong></div>' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#F59E0B">🟡</span><span class="ps-rm-lbl">À surveiller (score 4–5)</span><strong>' + (sin.nARisque||0) + '</strong></div>' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#8B5CF6">⚡</span><span class="ps-rm-lbl">Vitesse élevée (&gt;140 km/h)</span><strong>' + (sin.nHautVit||0) + '</strong></div>' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#64748B">⚪</span><span class="ps-rm-lbl">Véhicules inactifs (0 km)</span><strong>' + (sin.nInactifs||0) + '</strong></div>' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#EF4444">📍</span><span class="ps-rm-lbl">Exposition vitesse</span><strong>' + sin.tauxSpdExp + '%</strong></div>' +
          '<div class="ps-rm-row"><span class="ps-rm-ico" style="color:#F59E0B">🌿</span><span class="ps-rm-lbl">Exposition éco-conduite</span><strong>' + sin.tauxEcoExp + '%</strong></div>' +
        '</div>' +
        (critCards ? '<div class="ps-risk-crits">' + critCards + '</div>' : '') +
      '</div>' +
    '</div>' +
    '<div class="pa pa-fade-up ps-context" style="margin-top:12px;border-left:3px solid '+riskColor+';padding-left:12px">' +
      (sin.riskScore >= 60 ? '<strong>Risque eleve</strong> \u2014 intervention immediate requise.' : sin.riskScore >= 35 ? '<strong>Risque modere</strong> \u2014 surveiller les actifs a risque.' : '<strong>Risque faible</strong> \u2014 flotte globalement bien preservee.') +
    '</div>' +
  '</div>';
}

function buildPressMaint(d) {
  var recs=d.maintenanceRecs||[];
  var nD=recs.filter(function(r){return r.urgency==='danger';}).length;
  var nW=recs.filter(function(r){return r.urgency==='warning';}).length;
  var nI=recs.filter(function(r){return r.urgency==='info';}).length;
  var chips='<div class="ps-maint-chips"><div class="ps-maint-chip" style="border-top:4px solid #EF4444"><div class="ps-maint-n" style="color:#EF4444">'+nD+'</div><div class="ps-maint-l">Urgent</div></div><div class="ps-maint-chip" style="border-top:4px solid #F59E0B"><div class="ps-maint-n" style="color:#F59E0B">'+nW+'</div><div class="ps-maint-l">A planifier</div></div><div class="ps-maint-chip" style="border-top:4px solid #3B82F6"><div class="ps-maint-n" style="color:#3B82F6">'+nI+'</div><div class="ps-maint-l">A surveiller</div></div></div>';
  var urgents=recs.filter(function(r){return r.urgency==='danger'||r.urgency==='warning';}).slice(0,5).map(function(r){var col=r.urgency==='danger'?'#EF4444':'#F59E0B';return '<div class="ps-maint-row"><span class="ps-maint-veh">'+r.label+'</span><span class="ps-maint-client">'+r.client+'</span><span class="ps-maint-alert" style="color:'+col+'">'+r.alerts.map(function(a){return a.label;}).join(' / ')+'</span></div>';}).join('');
  var ctx=nD>0?'<strong>'+nD+' actif(s) necessitent une intervention urgente</strong> pour proteger la valeur du portefeuille BOA.':nW>0?'<strong>'+nW+' revision(s) a planifier</strong> dans les prochaines semaines.':'Aucune maintenance urgente. Continuer le suivi preventif.';
  return '<div class="ps ps-maint"><div class="ps-header pa pa-fade-down"><div class="ps-h-num" style="background:rgba(245,158,11,.15);color:#D97706">0'+(APP.presSlide+1)+'</div><div><div class="ps-chip" style="margin-bottom:6px;background:rgba(245,158,11,.12);color:#D97706">MAINTENANCE PREVENTIVE</div><div class="ps-h-title">Statut du parc - preservation des actifs</div><div class="ps-h-sub">'+d.period+' - '+recs.length+' vehicules analyses</div></div></div><div class="ps-maint-body"><div class="pa pa-fade-up">'+chips+'</div>'+(urgents?'<div class="pa pa-fade-up ps-maint-list"><div class="ps-maint-list-ttl">Vehicules prioritaires</div>'+urgents+'</div>':'')+'<div class="pa pa-fade-up ps-context">'+ctx+'</div></div></div>';
}

function buildPressReco(d) {
  var sin=d.sinistralite||{},recs=d.maintenanceRecs||[],actions=[];
  if((sin.nCritiques||0)>0) actions.push({num:'1',color:'#EF4444',title:'Actifs critiques',text:'Analyse technique sur les '+sin.nCritiques+' actif(s) en score critique (< 4/10).'});
  else if((sin.nARisque||0)>0) actions.push({num:'1',color:'#F59E0B',title:'Actifs a surveiller',text:'Renforcer le suivi des '+sin.nARisque+' actif(s) a risque (score 4-5/10).'});
  else actions.push({num:'1',color:'#10B981',title:'Maintien des performances',text:'La flotte est bien preservee. Maintenir les bonnes pratiques.'});
  var nonImmat=(d.tableRows||[]).filter(function(r){return r.nonImmat;});
  if(nonImmat.length>0) actions.push({num:'2',color:'#8B5CF6',title:'Regularisation administrative',text:'Finaliser l’immatriculation des '+nonImmat.length+' vehicule(s) sans plaque valide.'});
  else if((sin.nInactifs||0)>0) actions.push({num:'2',color:'#64748B',title:'Vehicules inactifs',text:sin.nInactifs+' actif(s) sans activite ce mois.'});
  else actions.push({num:'2',color:'#3B82F6',title:'Optimisation parc',text:'Analyser la repartition d’usage entre clients.'});
  var urgMaint=recs.filter(function(r){return r.urgency==='danger';}).length;
  if(urgMaint>0) actions.push({num:'3',color:'#F59E0B',title:'Maintenance urgente',text:urgMaint+' actif(s) a revision complete urgente.'});
  else actions.push({num:'3',color:'#3B82F6',title:'Suivi continu',text:'Poursuivre le reporting mensuel.'});
  actions=actions.slice(0,3);
  var aHTML=actions.map(function(a){return '<div class="pa pa-fade-up ps-reco-action"><div class="ps-reco-num" style="background:'+a.color+'18;color:'+a.color+'">'+a.num+'</div><div class="ps-reco-body"><div class="ps-reco-title">'+a.title+'</div><div class="ps-reco-text">'+a.text+'</div></div></div>';}).join('');
  return '<div class="ps ps-reco-fin"><div class="ps-header pa pa-fade-down"><div class="ps-h-num" style="background:rgba(99,102,241,.15);color:#4F46E5">0'+(APP.presSlide+1)+'</div><div><div class="ps-chip" style="margin-bottom:6px;background:rgba(99,102,241,.12);color:#4F46E5">PLAN D&#39;ACTION</div><div class="ps-h-title">Priorites &amp; Recommandations</div><div class="ps-h-sub">'+d.period+' - Rapport BOA Benin</div></div></div><div class="ps-reco-fin-body">'+aHTML+'</div></div>';
}

/* =================================================================
   FILTRES — client & période
   ================================================================= */

function updateFilterUI() {
  if (!APP.data) return;
  var wrap    = document.getElementById('tb-filters');
  var selC    = document.getElementById('filter-client');
  var selFrom = document.getElementById('filter-from');
  var selTo   = document.getElementById('filter-to');
  var periodWrap = document.getElementById('filter-period-wrap');
  if (!wrap || !selC) return;

  wrap.style.display = 'flex';

  /* ── Filtre client ── */
  var clients = [];
  (APP.data.tableRows || []).forEach(function(r) {
    if (r.client && clients.indexOf(r.client) < 0) clients.push(r.client);
  });
  clients.sort();

  selC.innerHTML = '<option value="">👤 Tous les clients</option>' +
    clients.map(function(c) {
      return '<option value="' + c + '"' + (APP.filterClient === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

  /* ── Filtre période (multi-fichiers seulement) ── */
  if (APP.dataByMonth && APP.dataByMonth.length > 1) {
    periodWrap.style.display = 'flex';
    var periods = APP.dataByMonth.map(function(d) { return d.period; });

    /* Par défaut : du plus ancien au plus récent */
    if (!APP.filterFrom) APP.filterFrom = periods[0];
    if (!APP.filterTo)   APP.filterTo   = periods[periods.length - 1];

    selFrom.innerHTML = periods.map(function(p) {
      return '<option value="' + p + '"' + (APP.filterFrom === p ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
    selTo.innerHTML = periods.map(function(p) {
      return '<option value="' + p + '"' + (APP.filterTo === p ? ' selected' : '') + '>' + p + '</option>';
    }).join('');
  } else {
    periodWrap.style.display = 'none';
    APP.filterFrom = '';
    APP.filterTo   = '';
  }
}

function applyFilters() {
  var selC    = document.getElementById('filter-client');
  var selFrom = document.getElementById('filter-from');
  var selTo   = document.getElementById('filter-to');

  APP.filterClient = selC    ? selC.value    : '';
  APP.filterFrom   = selFrom ? selFrom.value : '';
  APP.filterTo     = selTo   ? selTo.value   : '';

  /* ── Recalcul des données selon les filtres ── */
  var baseData;

  if (APP.dataByMonth && APP.dataByMonth.length > 1 && APP.filterFrom && APP.filterTo) {
    /* Filtrer les mois selon la plage sélectionnée */
    var fromIdx = APP.dataByMonth.findIndex(function(d) { return d.period === APP.filterFrom; });
    var toIdx   = APP.dataByMonth.findIndex(function(d) { return d.period === APP.filterTo;   });
    if (fromIdx < 0) fromIdx = 0;
    if (toIdx   < 0) toIdx   = APP.dataByMonth.length - 1;
    if (fromIdx > toIdx) { var tmp = fromIdx; fromIdx = toIdx; toIdx = tmp; }

    var sliced = APP.dataByMonth.slice(fromIdx, toIdx + 1);
    baseData = sliced[sliced.length - 1]; /* dernière période de la plage */
    /* Recalcul des trends sur la plage */
    if (sliced.length > 1) {
      baseData = Object.assign({}, baseData);
      baseData.trends = buildTrends(sliced);
      baseData.maintenanceRecs = buildMaintenanceRecs(baseData.tableRows, sliced);
    }
  } else {
    baseData = APP.data;
  }

  /* ── Filtre client sur tableRows ── */
  if (APP.filterClient && baseData) {
    var filtered = Object.assign({}, baseData);
    filtered.tableRows = (baseData.tableRows || []).filter(function(r) {
      return r.client === APP.filterClient;
    });
    filtered.vehiclesByClient = (baseData.vehiclesByClient || []).filter(function(g) {
      return g.client === APP.filterClient;
    });
    filtered.maintenanceRecs = buildMaintenanceRecs(filtered.tableRows,
      APP.dataByMonth && APP.dataByMonth.length > 1 ? APP.dataByMonth : []);
    APP.data = filtered;
  } else {
    APP.data = baseData;
  }

  renderReport();
}
