//EXPRESS
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var uuidBuffer = require('uuid-buffer');
// FOLDER ZA CSS, JS I DRUGE FAJLOVE
app.use(express.static("public"));

//FLASH PORUKE
app.use(require('express-session')({ secret: "Passport do pobede", resave: false, saveUninitialized: false }));
var flash = require('connect-flash'); // za prikaz flash poruka niste ulogovani itd(kad se uradi i logovanje)
app.use(flash());
//  FLASH poruke vidljive svim metodama
app.use((req, res, next) => {
  res.locals.message = req.flash("success");
  res.locals.error = req.flash("error");
  next();

});

// ZA DELETE I PUT METODE
var methodOverride = require('method-override'); // za delete i put http metode
app.use(methodOverride("_method"));

var validator = require('validator');
var bcrypt = require('bcryptjs');

// KONEKTOVANJE SA CASSANDROM

const { Client } = require("cassandra-driver");
const { Console } = require('console');
const client = new Client({
  cloud: {
    secureConnectBundle: "secure-connect-naprednebaze.zip",
  },
  credentials: { username: "stefkos98", password: "QP54R3gvcsmA!V@" },
});
async function run() {

  await client.connect();
}

app.get("/", function (req, res) {
  res.render("home.ejs", { user: req.user });
});

app.post("/", async function (req, res) {
  const povratna = req.body.povratna;
  const polaziste = req.body.polaziste;
  const odrediste = req.body.odrediste;
  const datum1 = req.body.datum1.toString();
  const datum2 = req.body.datum2.toString();
  const brputnika = req.body.brputnika;
  let prevoznik = req.body.prevoznik;
  if (prevoznik == '') prevoznik = undefined;

  var tabela1 = [];
  var tabela2 = [];
  var IDLinije1;
  var IDLinije2 = undefined;
  if (povratna == "NE" && prevoznik == undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");

    const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,imeprevoznika, \"TerminID\" FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
    IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);
    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela1.push(element);
    });
    console.log(tabela1);

  }
  else if (povratna == "NE" && prevoznik != undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");

    const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, \"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "'");
    IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela1.push(element);
    });
    console.log(tabela1);

  }
  else if (povratna == "DA" && prevoznik == undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");

    let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
    IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela1.push(element);
    });
    console.log(tabela1);

    IDLinije2 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

    tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "'");
    IDLinije2 = uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer);

    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela2.push(element);
    });
    console.log(tabela2);
  }
  else {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");

    let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "'");
    IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela1.push(element);
    });
    console.log(tabela1);

    IDLinije2 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

    tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "' AND imeprevoznika='" + prevoznik + "'");
    IDLinije2 = uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer);

    tabela.rows.forEach(async element => {
      element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
      if ((element.mesta - element.popunjena) >= brputnika)
        tabela2.push(element);
    });
    console.log(tabela2);

  }
  
  res.render("rezultat.ejs", { user: req.user, brputnika, polaziste, odrediste, datum1, datum2, prevoznik, povratna, termini1: tabela1, termini2: tabela2, IDLinije1, IDLinije2 });
});
//rezervacija

app.post("/rezervisi/:polaziste/:odrediste/:id/:brputnika/:mesta/:TerminID/:IDLinije1//:datum1//:prevoznik/:vreme/:popunjena", async function (req, res) {

  let popunjena = await client.execute("SELECT brojsedista FROM rbus.\"Sedista\" WHERE \"TerminID\"=" + req.params.TerminID);
  let prazna = [];
  for (let i = 1; i <= req.params.mesta; i++) {
    let t = true;
    popunjena.rows.forEach(element => {
      if (element.brojsedista == i)
        t = false;
    });
    if (t) prazna.push(i);
  }

  res.render("rezervacija.ejs", { user: req.user, prazna, polaziste: req.params.polaziste, odrediste: req.params.odrediste, id: req.params.id, brputnika: req.params.brputnika, mesta: req.params.mesta, TerminID: req.params.TerminID, IDLinije1: req.params.IDLinije1, datum1: req.params.datum1, prevoznik: req.params.prevoznik, vreme: req.params.vreme, popunjena: req.params.popunjena });//IDlinije2:req.params.IDlinije2, datum2:req.params.datum2
});

app.post("/rezervisi/:polaziste/:odrediste/:id/:brputnika/:mesta/:TerminID/:IDLinije1/:IDLinije2/:datum1/:datum2/:prevoznik/:vreme/:popunjena", async function (req, res) {

  let words1 = req.body.first;
  if(words1==undefined)
    words1=req.body.second;
  let words =words1.split(" ");

  let id = req.params.id;
  let brputnika = req.params.brputnika;
  let mesta1 = words[0];
  let mesta2 = req.params.mesta;
  let TerminID1 = words[1];
  let TerminID2 = req.params.TerminID;
  let IDLinije1 = req.params.IDLinije1;
  let IDLinije2 = req.params.IDLinije2;
  let datum1 = req.params.datum1;
  let datum2 = req.params.datum2;
  let prevoznik1 = words[2];
  let prevoznik2 = req.params.prevoznik;
  let vreme1 = words[3];
  let vreme2 = req.params.vreme;
  let popunjena1 = words[4];
  let popunjena2 = req.params.popunjena;

  let popunjena = await client.execute("SELECT brojsedista FROM rbus.\"Sedista\" WHERE \"TerminID\"=" + TerminID1);
  let prazna1 = [];
  for (let i = 1; i <= mesta1; i++) {
    let t = true;
    popunjena.rows.forEach(element => {
      if (element.brojsedista == i)
        t = false;
    });
    if (t) prazna1.push(i);
  }
  popunjena = await client.execute("SELECT brojsedista FROM rbus.\"Sedista\" WHERE \"TerminID\"=" + TerminID2);
  let prazna2 = [];
  for (let i = 1; i <= mesta2; i++) {
    let t = true;
    popunjena.rows.forEach(element => {
      if (element.brojsedista == i)
        t = false;
    });
    if (t) prazna2.push(i);
  }

  res.render("rezervacija2.ejs", { user: req.user, prazna1, prazna2, polaziste: req.params.polaziste, odrediste: req.params.odrediste, id, brputnika, mesta1, mesta2, TerminID1, TerminID2, IDLinije1, IDLinije2, datum1, datum2, prevoznik1, prevoznik2, vreme1, vreme2, popunjena1, popunjena2 });//IDlinije2:req.params.IDlinije2, datum2:req.params.datum2
});

app.post("/rezervisi/:brputnika/:mesta/:TerminID", async function (req, res) {
  req.flash("error", "Ulogujte se da biste rezervisali termin!");
  res.redirect('back');
});

app.put("/rezervisi2/:polaziste/:odrediste/:broj1/:broj2/:id/:brputnika/:mesta1/:mesta2/:TerminID1/:TerminID2/:IDLinije1/:IDLinije2/:datum1/:datum2/:prevoznik1/:prevoznik2/:vreme1/:vreme2/:popunjena1/:popunjena2", async function (req, res) {
  var datetime = new Date();
  var time = datetime.getHours() + ":" + datetime.getMinutes();

  let popunjena1 = parseInt(req.params.popunjena1);
  
  let popunjena2 = parseInt(req.params.popunjena2);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 1, req.body.jedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 2, req.body.dva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 3, req.body.tri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 4, req.body.cetiri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 5, req.body.pet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 6, req.body.sest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 7, req.body.sedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 8, req.body.osam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 9, req.body.devet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 10, req.body.deset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 11, req.body.jedanaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 12, req.body.dvanaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 13, req.body.trinaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 14, req.body.cetrnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 15, req.body.petnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 16, req.body.sesnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 17, req.body.sedamnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 18, req.body.osamnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 19, req.body.devetnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 20, req.body.dvadeset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 21, req.body.dvadesetjedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 22, req.body.dvadesetdva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 23, req.body.dvadesettri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 24, req.body.dvadesetcetri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 25, req.body.dvadesetpet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 26, req.body.dvadesetsest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 27, req.body.dvadesetsedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 28, req.body.dvadesetosam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 29, req.body.dvadesetdevet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 30, req.body.trideset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 31, req.body.tridesetjedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 32, req.body.tridesetdva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 33, req.body.tridesettri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 34, req.body.tridesetcetiri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 35, req.body.tridesetpet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 36, req.body.tridesetsest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 37, req.body.tridesetsedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 38, req.body.tridesetosam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 39, req.body.tridesetdevet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj1, 40, req.body.cetrdeset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);

  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 1, req.body.jedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 2, req.body.dvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 3, req.body.triD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 4, req.body.cetiriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 5, req.body.petD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 6, req.body.sestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 7, req.body.sedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 8, req.body.osamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 9, req.body.devetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 10, req.body.desetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 11, req.body.jedanaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 12, req.body.dvanaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 13, req.body.trinaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 14, req.body.cetrnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 15, req.body.petnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 16, req.body.sesnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 17, req.body.sedamnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 18, req.body.osamnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 19, req.body.devetnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 20, req.body.dvadesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 21, req.body.dvadesetjedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 22, req.body.dvadesetdvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 23, req.body.dvadesettriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 24, req.body.dvadesetcetriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 25, req.body.dvadesetpetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 26, req.body.dvadesetsestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 27, req.body.dvadesetsedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 28, req.body.dvadesetosamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 29, req.body.dvadesetdevetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 30, req.body.tridesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 31, req.body.tridesetjedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 32, req.body.tridesetdvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 33, req.body.tridesettriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 34, req.body.tridesetcetriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 35, req.body.tridesetpetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 36, req.body.tridesetsestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 37, req.body.tridesetsedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 38, req.body.tridesetosamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 39, req.body.tridesetdevetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.odrediste, req.params.polaziste, req.params.broj2, 40, req.body.cetrdesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);

  req.flash("success", "Uspesna rezervacija!");
  res.redirect('/');
});

app.put("/rezervisi/:polaziste/:odrediste/:broj/:id/:brputnika/:mesta/:TerminID/:IDLinije1/:datum1/:prevoznik/:vreme/:popunjena", async function (req, res) {

  var datetime = new Date();
  var time = datetime.getHours() + ":" + datetime.getMinutes();

  let popunjena = parseInt(req.params.popunjena);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 1, req.body.jedan, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 2, req.body.dva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 3, req.body.tri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 4, req.body.cetiri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 5, req.body.pet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 6, req.body.sest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 7, req.body.sedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 8, req.body.osam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 9, req.body.devet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 10, req.body.deset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 11, req.body.jedanaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 12, req.body.dvanaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 13, req.body.trinaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 14, req.body.cetrnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 15, req.body.petnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 16, req.body.sesnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 17, req.body.sedamnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 18, req.body.osamnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 19, req.body.devetnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 20, req.body.dvadeset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 21, req.body.dvadesetjedan, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 22, req.body.dvadesetdva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 23, req.body.dvadesettri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 24, req.body.dvadesetcetri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 25, req.body.dvadesetpet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 26, req.body.dvadesetsest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 27, req.body.dvadesetsedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 28, req.body.dvadesetosam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 29, req.body.dvadesetdevet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 30, req.body.trideset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 31, req.body.tridesettri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 32, req.body.tridesetdva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 33, req.body.tridesettri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 34, req.body.tridesetcetri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 35, req.body.tridesetpet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 36, req.body.tridesetsest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 37, req.body.tridesetsedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 38, req.body.tridesetosam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 39, req.body.tridesetdevet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.polaziste, req.params.odrediste, req.params.broj, 40, req.body.cetrdeset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);

  req.flash("success", "Uspesna rezervacija!");
  res.redirect('/');
});

async function blabla(polaziste, odrediste, broj, br, vrednost, TerminID, time, id, popunjena, IDLinije1, datum1, prevoznik, vreme) {

  if (broj >= br && vrednost != undefined) {
    let uuid=create_UUID();
    await client.execute("INSERT INTO rbus.\"Rezervacija\" (\"resID\",\"TerminID\", vremerez,\"userID\",\"brojsedista\",\"LinijaID\", datum, imeprevoznika) VALUES ("+uuid +","+ TerminID + ",'" + time + "'," + id + "," + vrednost + ","+ IDLinije1+",'"+datum1+"','"+prevoznik+"')");
    await client.execute("INSERT INTO rbus.\"Sedista\" (\"TerminID\",\"brojsedista\") VALUES (" + TerminID + "," + vrednost + ")");
    popunjena = popunjena + 1;
    await client.execute("UPDATE rbus.\"Termin\" SET popunjena=" + popunjena + " WHERE \"LinijaID\"=" + IDLinije1 + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "' AND \"TerminID\"=" + TerminID + " AND vreme='" + vreme + "'");
    await client.execute("INSERT INTO rbus.\"TerminRezervacija\" (\"TerminID\", \"userID\", \"resID\") VALUES ("+TerminID+","+id+","+uuid+")");
  }
}

function create_UUID(){
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (dt + Math.random()*16)%16 | 0;
      dt = Math.floor(dt/16);
      return (c=='x' ? r :(r&0x3|0x8)).toString(16);
  });
  return uuid;
}
// PASSPORT LOGIN

// PASSPORT VERZIJA
var passport = require('passport');
var localStrategy = require('passport-local');
app.use(passport.initialize());
app.use(passport.session());
// PASSPORT SERIJALIZACIJA I DESERIJALIZACIJA USERA
passport.serializeUser(function (user, done) {
  return done(null, user);
});
passport.deserializeUser(function (user, done) {
  if (user != null)
    return done(null, user);
});
passport.use('autoprevozniklocal', new localStrategy({ usernameField: 'email' }, async function (username, password, done) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'" + username + "\'");
  for (var i = 0; i < rs.rows.length; i++) {
    if (rs.rows[i].email != username) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const t = await bcrypt.compare(password, rs.rows[i].password);
    if (!t) return done(null, false, { message: 'Incorrect password' });
    return done(null, rs.rows[i]);
  }
  return done(null, false, { message: 'Incorrect username.' });
}));
passport.use('korisniklocal', new localStrategy({ usernameField: 'email' }, async function (username, password, done) {
  const rs = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + username + "\'");
  for (var i = 0; i < rs.rows.length; i++) {
    if (rs.rows[i].email != username) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const t = await bcrypt.compare(password, rs.rows[i].password);
    if (!t) return done(null, false, { message: 'Incorrect password' });
    return done(null, rs.rows[i]);
  }
  return done(null, false, { message: 'Incorrect username.' });
}));
//LOGIN

app.get("/login", function (req, res) {
  if (req.user != undefined) {
    req.flash("error", "Vec ste ulogovani");
    res.redirect("/");
  }
  else res.render('login.ejs', { user: req.user });
});
app.post('/login', passport.authenticate(["autoprevozniklocal", "korisniklocal"], { successRedirect: "/", failureRedirect: "/login" }), (req, res) => { });

app.get('/logout', (req, res) => { req.logout(); req.flash("success", "Uspesna odjava"); res.redirect('/') });

app.get("/register", (req, res) => {
  if (req.user != undefined) {
    req.flash("error", "Vec ste ulogovani");
    res.redirect("/");
  }
  res.render("registration.ejs", { user: req.user });
});

app.post("/register", async function (req, res) {
  if (req.user != undefined) {
    req.flash("error", "Vec ste ulogovani");
    res.redirect("/");
  }
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.body.email + "\'");
  if (postojiemail.rows.length > 0)
    postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'" + req.body.email + "\'");
  var postojiusername = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'" + req.body.username + "\'");
  if (postojiusername.rows.length > 0)
    postojiusername = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.body.username + "\'");
  if (!validator.isEmail(req.body.email) || postojiemail.rows.length > 0) {

    req.flash("error", "Email nije validan!");
    res.redirect("/register");
  }
  else {

    if (postojiusername.rows.length > 0) {
      req.flash("error", "Vec postoji korisnik sa tim username-om, izaberite drugi!");
      res.redirect("/register");
    }
    else {
      var pattern = /^06\d{7,8}$/;
      if (pattern.test(req.body.telefon) == false) {
        req.flash("error", "Pogresan format telefona!");
        res.redirect("/register");
      }
      else {
        if (req.body.tip == 'korisnik') {
          await client.execute(`INSERT INTO rbus.\"Korisnik\" (id,username,password,name,phone,email) VALUES (uuid(),\'${req.body.username}\',\'${await bcrypt.hash(req.body.password, 8)}\',\'${req.body.name}\',\'${req.body.telefon}\',\'${req.body.email}\')`);
        }
        else {
          await client.execute(`INSERT INTO rbus.\"Autoprevoznik\" (\"AutoprevoznikID\",username,password,email,naziv,telefon) VALUES (uuid(),\'${req.body.username}\',\'${await bcrypt.hash(req.body.password, 8)}\',\'${req.body.email}\',\'${req.body.name}\',\'${req.body.telefon}\')`);

        }
        req.flash("success", "Uspesna registracija, sada se mozete ulogovati!");
        res.redirect("/");
      }
    }
  }
});

app.get("/profile", async function (req, res) {
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'" + req.user.email + "\'");
  if (postojiemail.rows.length > 0) {
    res.render("profile_prevoznik.ejs", { user: req.user, termini: null });
  }
  else {
    postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.user.email + "\'");
    if (postojiemail.rows.length > 0) {
      res.render("profile_korisnik.ejs", { user: req.user, termini: null });
    }
    else {
      req.flash("error", "Ulogovani korisnik ne postoji u bazi");
      res.redirect("/", { user: req.user, termini: null });
    }
  }
})

app.put("/profile/korisnik/:email", async function (req, res) {

});
app.delete("/profile/korisnik/edit/:email", async function (req, res) {

});

app.put("/profile/korisnik/:email", async function (req, res) {

});
app.delete("/profile/korisnik/edit/:email", async function (req, res) {

});

app.get("/", function (req, res) {
  res.render("home.ejs", { user: req.user });
});

app.get("/autoprevoznici", async function (req, res) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\"");
  console.log(rs.rows.length);
  res.render("autoprevoznici.ejs", { user: req.user, prevoznici: rs.rows });
});
// STARTOVANJE SERVERA
app.listen(3000, async function () {
  console.log("Listening on port 3000");

  run();
});
// GASENJE APP

process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
  if (exitCode || exitCode === 0) {
    console.log("Goodbye");
  }
  await client.shutdown();
  process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
