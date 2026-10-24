/* ¿Cuánto me toca? — cálculos y lógica de las calculadoras.
   Todo se calcula en el navegador; no se envía ni se guarda ningún dato. */
(function(){
  "use strict";

  // ===== Datos fiscales 2026 (actualizar cada enero/febrero) =====
  // Tarifa mensual de ISR, Anexo 8 RMF 2026: [límite inferior, cuota fija, % sobre excedente]
  var TARIFA = [
    [0.01,0,1.92],[844.60,16.22,6.40],[7168.52,420.95,10.88],[12598.03,1011.68,16.00],
    [14644.65,1339.14,17.92],[17533.65,1856.84,21.36],[35362.84,5665.16,23.52],
    [55736.69,10457.09,30.00],[106410.51,25659.23,32.00],[141880.67,37009.69,34.00],
    [425642.00,133488.54,35.00]
  ];
  var UMA = 117.31;                                   // UMA diaria 2026 (INEGI)
  var SUBSIDIO = 535.65, SUBSIDIO_TOPE = 11492.66;    // Subsidio para el empleo 2026
  var MINIMO = {general:315.04, frontera:440.87};     // Salario mínimo diario 2026
  var IMSS_FIJO = 0.0025 + 0.00375 + 0.00625 + 0.01125; // Cuotas obreras sobre el SBC
  var IMSS_EXC = 0.004;                               // Enfermedad y maternidad, excedente de 3 UMA

  // ===== Donaciones =====
  // Pega tus enlaces. Los que se queden vacíos no aparecen; si todos están vacíos, no se muestra el cuadro.
  var DONAR = [
    {nombre:"Mercado Pago", url:""},
    {nombre:"PayPal",       url:"https://www.paypal.com/paypalme/richyloleado"},
    {nombre:"Ko-fi",        url:""}
  ];

  // ===== Temporadas: mes (1-12) → calculadora destacada en la portada =====
  // Abril (declaración anual) y mayo-junio (PTU) usan sueldo neto hasta que existan esas calculadoras.
  var TEMPORADA = {1:"sueldo",2:"sueldo",3:"sueldo",4:"sueldo",5:"sueldo",6:"sueldo",
                   7:"sueldo",8:"sueldo",9:"sueldo",10:"aguinaldo",11:"aguinaldo",12:"aguinaldo"};

  var CALCS = {
    aguinaldo:{nombre:"Aguinaldo", temporada:"Octubre a diciembre", ruta:"/aguinaldo/",
      h1:"¿Cuánto te toca de aguinaldo?", lead:"Pon tu sueldo y te decimos cuánto recibes ya con el ISR descontado. Por ley se paga antes del 20 de diciembre.",
      meta:{m:12,d:20,txt:"para el 20 de diciembre, fecha límite de pago"}},
    sueldo:{nombre:"Sueldo neto", temporada:"Todo el año", ruta:"/sueldo-neto/",
      h1:"¿Cuánto te llega de tu sueldo?", lead:"De bruto a neto: lo que te quitan de ISR y de IMSS, y lo que de verdad cae en tu cuenta cada quincena."},
    finiquito:{nombre:"Finiquito y liquidación", temporada:"Todo el año", ruta:"/finiquito/",
      h1:"¿Cuánto te deben si renuncias o te despiden?", lead:"Finiquito si renunciaste, liquidación si te despidieron sin causa. Con tus partes proporcionales y el ISR que te van a retener."}
  };

  // ===== Cálculos =====
  function isr(base){
    if (!(base > 0)) return 0;
    var r = TARIFA[0];
    for (var i = 0; i < TARIFA.length; i++){ if (base >= TARIFA[i][0]) r = TARIFA[i]; }
    return r[1] + (base - r[0]) * r[2] / 100;
  }

  function calcSueldo(mensual, zona){
    var diario = mensual / 30;
    var esMinimo = diario <= MINIMO[zona] + 0.005;
    var isrBruto = esMinimo ? 0 : isr(mensual);
    var subsidio = (!esMinimo && mensual <= SUBSIDIO_TOPE) ? Math.min(isrBruto, SUBSIDIO) : 0;
    var isrNeto = isrBruto - subsidio;
    var factor = 1 + 15/365 + (12*0.25)/365;
    var sbc = Math.min(diario * factor, 25 * UMA);
    var imss = esMinimo ? 0 : (sbc * IMSS_FIJO + Math.max(0, sbc - 3 * UMA) * IMSS_EXC) * 30.4;
    return {mensual:mensual, esMinimo:esMinimo, subsidio:subsidio, isr:isrNeto, imss:imss, neto:mensual - isrNeto - imss};
  }

  function calcAguinaldo(mensual, dias, trabajados){
    var diario = mensual / 30;
    var bruto = diario * dias * Math.min(trabajados, 365) / 365;
    var exento = 30 * UMA;
    var gravado = Math.max(0, bruto - exento);
    var base0 = isr(mensual);
    var mensualizado = gravado / 365 * 30.4;            // Método art. 174 RLISR
    var r174 = mensualizado > 0 ? (isr(mensual + mensualizado) - base0) / mensualizado * gravado : 0;
    var r96 = gravado > 0 ? isr(mensual + gravado) - base0 : 0; // Método art. 96 LISR
    return {bruto:bruto, exento:Math.min(bruto, exento), gravado:gravado, r174:r174, r96:r96, neto:bruto - r174};
  }

  // Vacaciones por año de servicio (LFT, reforma 2023)
  function diasVacaciones(anio){ return anio <= 5 ? 10 + 2 * anio : 20 + 2 * Math.ceil((anio - 5) / 5); }

  function calcFiniquito(o){
    var DIA = 86400000;
    if (!o.ingreso || !o.salida || o.salida < o.ingreso) return {error:"La fecha de salida tiene que ser posterior a la de ingreso."};
    var diario = o.mensual / 30;
    var antig = ((o.salida - o.ingreso) / DIA + 1) / 365;
    var completos = Math.floor(antig), fraccion = antig - completos;

    var pendiente = diario * o.pendientes;
    var inicioAnio = new Date(o.salida.getFullYear(), 0, 1);
    var desde = o.ingreso > inicioAnio ? o.ingreso : inicioAnio;
    var diasAnio = Math.min(365, Math.round((o.salida - desde) / DIA) + 1);
    var aguinaldo = diario * o.diasAguinaldo * diasAnio / 365;
    var vacDiasAnio = diasVacaciones(completos + 1);
    var vacDias = Math.max(0, vacDiasAnio * fraccion - o.tomadas);
    var vacaciones = diario * vacDias;
    var prima = vacaciones * 0.25;

    var sdi = diario * (1 + o.diasAguinaldo / 365 + vacDiasAnio * 0.25 / 365);
    var despido = o.motivo === "despido";
    var indem = despido ? sdi * 90 : 0;
    var veinte = (despido && o.veinte) ? sdi * 20 * antig : 0;
    var aplicaPA = despido || antig >= 15;
    var primaAnt = aplicaPA ? Math.min(diario, 2 * MINIMO[o.zona]) * 12 * antig : 0;

    var gravOrd = pendiente + vacaciones + Math.max(0, aguinaldo - 30 * UMA) + Math.max(0, prima - 15 * UMA);
    var isrOrd = isr(gravOrd);
    var separacion = indem + veinte + primaAnt;
    var aniosExentos = Math.max(1, completos + (fraccion > 0.5 ? 1 : 0));
    var exentoSep = 90 * UMA * aniosExentos;
    var gravSep = Math.max(0, separacion - exentoSep);
    var isrSep = o.mensual > 0 ? gravSep * isr(o.mensual) / o.mensual : 0;

    var bruto = pendiente + aguinaldo + vacaciones + prima + separacion;
    return {antig:antig, pendiente:pendiente, diasAnio:diasAnio, aguinaldo:aguinaldo, vacDias:vacDias, vacaciones:vacaciones,
      prima:prima, despido:despido, indem:indem, veinte:veinte, primaAnt:primaAnt, aplicaPA:aplicaPA, separacion:separacion,
      exentoSep:Math.min(separacion, exentoSep), isr:isrOrd + isrSep, bruto:bruto, neto:bruto - isrOrd - isrSep};
  }

  // Exponer los cálculos para pruebas
  window.CuantoMeToca = {isr:isr, calcSueldo:calcSueldo, calcAguinaldo:calcAguinaldo, calcFiniquito:calcFiniquito, diasVacaciones:diasVacaciones};
  if (typeof document === "undefined" || !document.body) return;

  // ===== Interfaz =====
  var money = new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2,maximumFractionDigits:2});
  function $(v){ return money.format(Math.max(0, v)); }
  function el(id){ return document.getElementById(id); }
  function num(id){ var e = el(id); var v = e ? parseFloat(e.value) : 0; return isFinite(v) && v > 0 ? v : 0; }
  function fecha(id){ var v = el(id) && el(id).value; return v ? new Date(v + "T00:00:00") : null; }
  function dec(v){ return v.toLocaleString("es-MX",{maximumFractionDigits:1}); }
  function line(label, value, cls){
    return '<div class="line' + (cls ? " " + cls : "") + '"><span>' + label + '</span><em>' + value + '</em></div>';
  }

  function slipAguinaldo(){
    var r = calcAguinaldo(num("ag-sueldo"), Math.max(15, num("ag-dias")), num("ag-trab") || 365);
    var h = '<div class="slip-head"><h2>Recibo de aguinaldo</h2><span>Estimado ' + new Date().getFullYear() + '</span></div>';
    h += '<h3>Percepciones</h3>' + line("Aguinaldo bruto", $(r.bruto));
    h += line("Parte exenta (30 UMA)", $(r.exento), "note") + line("Parte gravada", $(r.gravado), "note");
    h += '<h3>Deducciones</h3>' + line("ISR retenido", "− " + $(r.r174), "minus");
    h += '<div class="total"><span>Recibes</span><b>' + $(r.neto) + '</b></div>';
    h += '<p class="foot">' + (r.gravado > 0
      ? "Si tu empresa usa el método del artículo 96, la retención sería de " + $(r.r96) + "."
      : "Tu aguinaldo queda completo dentro de la parte exenta, así que no te retienen ISR.") + '</p>';
    return h;
  }

  function slipSueldo(){
    var s = calcSueldo(num("sn-sueldo"), el("sn-zona").value);
    var h = '<div class="slip-head"><h2>Recibo de nómina</h2><span>Mensual · estimado</span></div>';
    h += '<h3>Percepciones</h3>' + line("Sueldo", $(s.mensual)) + '<h3>Deducciones</h3>';
    if (s.esMinimo){
      h += line("ISR", "$0.00", "minus") + line("IMSS", "$0.00", "minus");
      h += line("Ganas el salario mínimo: no se retiene ISR y el patrón paga tu cuota del IMSS.", "", "note");
    } else {
      h += line("ISR", "− " + $(s.isr), "minus");
      if (s.subsidio > 0) h += line("Incluye subsidio para el empleo", "+ " + $(s.subsidio), "note");
      h += line("IMSS", "− " + $(s.imss), "minus");
    }
    h += '<div class="total"><span>Te llega al mes</span><b>' + $(s.neto) + '</b></div>';
    h += '<div class="sub"><span>Por quincena</span><em>' + $(s.neto / 2) + '</em></div>';
    h += '<p class="foot">Sin descuentos de Infonavit, Fonacot ni caja de ahorro.</p>';
    return h;
  }

  function slipFiniquito(){
    var motivo = el("fq-motivo").value;
    el("fq-veinte-wrap").hidden = motivo !== "despido";
    var f = calcFiniquito({mensual:num("fq-sueldo"), ingreso:fecha("fq-ingreso"), salida:fecha("fq-salida"), motivo:motivo,
      pendientes:num("fq-pend"), tomadas:num("fq-tomadas"), diasAguinaldo:Math.max(15, num("fq-dias")),
      zona:el("fq-zona").value, veinte:el("fq-veinte").checked});
    var h = '<div class="slip-head"><h2>' + (motivo === "despido" ? "Recibo de liquidación" : "Recibo de finiquito") + '</h2><span>Estimado</span></div>';
    if (f.error) return h + '<h3>Revisa tus datos</h3>' + line(f.error, "", "warn");
    h += line("Antigüedad", dec(f.antig) + " años", "note");
    h += '<h3>Finiquito</h3>';
    h += line("Días sin pagar", $(f.pendiente));
    h += line("Aguinaldo proporcional (" + f.diasAnio + " días del año)", $(f.aguinaldo));
    h += line("Vacaciones (" + dec(f.vacDias) + " días)", $(f.vacaciones));
    h += line("Prima vacacional (25%)", $(f.prima));
    if (f.despido){
      h += '<h3>Liquidación</h3>' + line("Indemnización (3 meses)", $(f.indem));
      if (f.veinte > 0) h += line("20 días por año", $(f.veinte));
    }
    if (f.aplicaPA){
      if (!f.despido) h += '<h3>Por tus 15 años o más</h3>';
      h += line("Prima de antigüedad (12 días por año)", $(f.primaAnt));
    }
    h += '<h3>Deducciones</h3>' + line("ISR retenido", "− " + $(f.isr), "minus");
    if (f.separacion > 0) h += line("Exento por separación (90 UMA por año)", $(f.exentoSep), "note");
    h += '<div class="total"><span>Te deben pagar</span><b>' + $(f.neto) + '</b></div>';
    h += '<div class="sub"><span>Antes de impuestos</span><em>' + $(f.bruto) + '</em></div>';
    h += '<p class="foot">' + (f.despido
      ? "Si no te pagan, tienes 2 meses desde el despido para reclamar ante el Centro de Conciliación de tu estado."
      : (f.aplicaPA ? "Con 15 años o más también te toca prima de antigüedad aunque renuncies."
                    : "Al renunciar con menos de 15 años no te toca prima de antigüedad ni indemnización.")) + '</p>';
    return h;
  }

  var SLIPS = {aguinaldo:slipAguinaldo, sueldo:slipSueldo, finiquito:slipFiniquito};
  var INPUTS = {aguinaldo:["ag-sueldo","ag-dias","ag-trab"], sueldo:["sn-sueldo","sn-zona"],
    finiquito:["fq-motivo","fq-sueldo","fq-ingreso","fq-salida","fq-pend","fq-tomadas","fq-dias","fq-zona","fq-veinte"]};

  function cuentaRegresiva(meta){
    var box = el("count"); if (!box) return;
    if (!meta){ box.hidden = true; return; }
    var hoy = new Date(); hoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    var n = Math.round((new Date(hoy.getFullYear(), meta.m - 1, meta.d) - hoy) / 86400000);
    if (n < 0){ box.hidden = true; return; }
    el("countN").textContent = n === 0 ? "Hoy" : n;
    el("countT").textContent = n === 0 ? "es la fecha límite" : (n === 1 ? "día " : "días ") + meta.txt;
    box.hidden = false;
  }

  function iniciar(){
    var pagina = document.body.getAttribute("data-calc");
    var clave = pagina === "temporada" ? TEMPORADA[new Date().getMonth() + 1] : pagina;
    var c = CALCS[clave]; if (!c) return;

    if (pagina === "temporada"){
      el("eyebrow").textContent = "De temporada · " + c.temporada;
      el("h1").textContent = c.h1;
      el("lead").textContent = c.lead;
      var link = el("verPagina");
      if (link){ link.href = c.ruta; link.textContent = "Ver la calculadora de " + c.nombre.toLowerCase() + " y sus preguntas frecuentes"; link.hidden = false; }
      document.querySelectorAll("[data-card]").forEach(function(card){
        if (card.getAttribute("data-card") === clave){
          card.querySelector(".chips").insertAdjacentHTML("afterbegin", '<span class="chip hot">De temporada</span>');
          card.parentNode.insertBefore(card, card.parentNode.firstChild);
        }
      });
    }
    cuentaRegresiva(c.meta);

    var form = el("f-" + clave); if (form) form.hidden = false;
    var salida = el("fq-salida");
    if (salida && !salida.value){
      var h = new Date(), p = function(n){ return (n < 10 ? "0" : "") + n; };
      salida.value = h.getFullYear() + "-" + p(h.getMonth() + 1) + "-" + p(h.getDate());
    }
    var donar = DONAR.filter(function(d){ return /^https:\/\//.test(d.url); });
    if (donar.length){
      var cafe = document.createElement("div");
      cafe.className = "cafe";
      cafe.innerHTML = '<p><b>¿Te sirvió?</b> Esta calculadora es gratis y la mantiene un estudiante. Si quieres apoyar, invítame un café ☕</p><div class="cafe-btns"></div>';
      var btns = cafe.querySelector(".cafe-btns");
      donar.forEach(function(d){
        var a = document.createElement("a");
        a.className = "cafe-btn"; a.target = "_blank"; a.rel = "noopener";
        a.href = d.url; a.textContent = d.nombre;
        btns.appendChild(a);
      });
      el("slip").insertAdjacentElement("afterend", cafe);
    }
    var pintar = function(){ el("slip").innerHTML = SLIPS[clave](); };
    INPUTS[clave].forEach(function(id){
      var e = el(id); if (!e) return;
      e.addEventListener("input", pintar); e.addEventListener("change", pintar);
    });
    document.querySelectorAll("form").forEach(function(f){ f.addEventListener("submit", function(ev){ ev.preventDefault(); }); });
    pintar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
