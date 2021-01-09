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
const { Console, table } = require('console');
const client = new Client({
  cloud: {
    secureConnectBundle: "secure-connect-naprednebaze.zip",
  },
  credentials: { username: "stefkos98", password: "QP54R3gvcsmA!V@" },
});
async function run() {

  await client.connect();
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
  var IDLinije1 = undefined;
  var IDLinije2 = undefined;
  if (povratna == "NE" && prevoznik == undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
    if (IDLinije1.rows[0] != undefined) {
      const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,imeprevoznika, \"TerminID\" FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
      IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);
      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela1.push(element);
      });
    }
    else {
      req.flash("error", "Nema takve linije!");
      res.redirect('back');

    }
  }
  else if (povratna == "NE" && prevoznik != undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
    if (IDLinije1.rows[0] != undefined) {
      const tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, \"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "'");
      IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela1.push(element);
      });

    }
    else {
      req.flash("error", "Nema takve linije!");
      res.redirect('back');

    }
  }
  else if (povratna == "DA" && prevoznik == undefined) {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
    if (IDLinije1.rows[0] != undefined) {
      let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "'");
      IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela1.push(element);
      });

      IDLinije2 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

      tabela = await client.execute("SELECT mesta, popunjena, vreme, cena, imeprevoznika,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "'");
      IDLinije2 = uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer);

      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela2.push(element);
      });
      if (tabela1.length == 0) tabela2 = [];
      if (tabela2.length == 0) tabela1 = [];
    }
    else {
      req.flash("error", "Nema takve linije!");
      res.redirect('back');

    }
  }
  else {
    IDLinije1 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + polaziste + "' AND cilj='" + odrediste + "'");
    if (IDLinije1.rows[0] != undefined) {
      let tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer) + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "'");
      IDLinije1 = uuidBuffer.toString(IDLinije1.rows[0].LinijaID.buffer);

      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela1.push(element);
      });

      IDLinije2 = await client.execute("SELECT \"LinijaID\" FROM rbus.\"Linija\" WHERE start='" + odrediste + "' AND cilj='" + polaziste + "'");

      tabela = await client.execute("SELECT mesta, popunjena, vreme, cena,\"TerminID\"  FROM rbus.\"Termin\" WHERE \"LinijaID\"=" + uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer) + " AND datum='" + datum2 + "' AND imeprevoznika='" + prevoznik + "'");
      IDLinije2 = uuidBuffer.toString(IDLinije2.rows[0].LinijaID.buffer);

      tabela.rows.forEach(async element => {
        element.TerminID = uuidBuffer.toString(element.TerminID.buffer);
        if ((element.mesta - element.popunjena) >= brputnika)
          tabela2.push(element);
      });
      if (tabela1.length == 0) tabela2 = [];
      if (tabela2.length == 0) tabela1 = [];
    }
    else {
      req.flash("error", "Nema takve linije!");
      res.redirect('back');
    }
  }
  if (IDLinije1 != undefined)
    res.render("rezultat.ejs", { user: req.user, brputnika, polaziste, odrediste, datum1, datum2, prevoznik, povratna, termini1: tabela1, termini2: tabela2, IDLinije1, IDLinije2 });
});
//rezervacija

app.post("/rezervisi/:polaziste/:odrediste/:brputnika/:mesta/:TerminID/:IDLinije1//:datum1//:prevoznik/:vreme/:popunjena", async function (req, res) {
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.user.email + "\'");
  if (postojiemail.rows.length > 0) {
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

    res.render("rezervacija.ejs", { user: req.user, prazna, polaziste: req.params.polaziste, odrediste: req.params.odrediste, id: req.user.id, brputnika: req.params.brputnika, mesta: req.params.mesta, TerminID: req.params.TerminID, IDLinije1: req.params.IDLinije1, datum1: req.params.datum1, prevoznik: req.params.prevoznik, vreme: req.params.vreme, popunjena: req.params.popunjena });
  }
  else {
    req.flash("error", "Ulogujte se kao korisnik da biste rezervisali termin!");
    res.redirect('back');
  }
});

app.post("/rezervisi/:polaziste/:odrediste/:brputnika/:mesta/:TerminID/:IDLinije1/:IDLinije2/:datum1/:datum2/:prevoznik/:vreme/:popunjena", async function (req, res) {
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.user.email + "\'");
  if (postojiemail.rows.length > 0) {

    let words1 = req.body.first;
    if (words1 == undefined)
      words1 = req.body.second;
    let words = words1.split(" ");

    let id = req.user.id;
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

    res.render("rezervacija2.ejs", { user: req.user, prazna1, prazna2, polaziste: req.params.polaziste, odrediste: req.params.odrediste, id: req.user.id, brputnika, mesta1, mesta2, TerminID1, TerminID2, IDLinije1, IDLinije2, datum1, datum2, prevoznik1, prevoznik2, vreme1, vreme2, popunjena1, popunjena2 });//IDlinije2:req.params.IDlinije2, datum2:req.params.datum2
  }
  else {
    req.flash("error", "Ulogujte se kao korisnik da biste rezervisali termin!");
    res.redirect('back');
  }
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
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 1, req.body.jedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 2, req.body.dva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 3, req.body.tri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 4, req.body.cetiri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 5, req.body.pet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 6, req.body.sest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 7, req.body.sedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 8, req.body.osam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 9, req.body.devet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 10, req.body.deset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 11, req.body.jedanaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 12, req.body.dvanaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 13, req.body.trinaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 14, req.body.cetrnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 15, req.body.petnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 16, req.body.sesnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 17, req.body.sedamnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 18, req.body.osamnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 19, req.body.devetnaest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 20, req.body.dvadeset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 21, req.body.dvadesetjedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 22, req.body.dvadesetdva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 23, req.body.dvadesettri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 24, req.body.dvadesetcetri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 25, req.body.dvadesetpet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 26, req.body.dvadesetsest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 27, req.body.dvadesetsedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 28, req.body.dvadesetosam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 29, req.body.dvadesetdevet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 30, req.body.trideset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 31, req.body.tridesetjedan, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 32, req.body.tridesetdva, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 33, req.body.tridesettri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 34, req.body.tridesetcetiri, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 35, req.body.tridesetpet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 36, req.body.tridesetsest, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 37, req.body.tridesetsedam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 38, req.body.tridesetosam, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 39, req.body.tridesetdevet, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj1, 40, req.body.cetrdeset, req.params.TerminID1, time, req.params.id, popunjena1, req.params.IDLinije1, req.params.datum1, req.params.prevoznik1, req.params.vreme1);

  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 1, req.body.jedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 2, req.body.dvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 3, req.body.triD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 4, req.body.cetiriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 5, req.body.petD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 6, req.body.sestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 7, req.body.sedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 8, req.body.osamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 9, req.body.devetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 10, req.body.desetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 11, req.body.jedanaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 12, req.body.dvanaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 13, req.body.trinaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 14, req.body.cetrnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 15, req.body.petnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 16, req.body.sesnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 17, req.body.sedamnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 18, req.body.osamnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 19, req.body.devetnaestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 20, req.body.dvadesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 21, req.body.dvadesetjedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 22, req.body.dvadesetdvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 23, req.body.dvadesettriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 24, req.body.dvadesetcetriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 25, req.body.dvadesetpetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 26, req.body.dvadesetsestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 27, req.body.dvadesetsedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 28, req.body.dvadesetosamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 29, req.body.dvadesetdevetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 30, req.body.tridesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 31, req.body.tridesetjedanD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 32, req.body.tridesetdvaD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 33, req.body.tridesettriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 34, req.body.tridesetcetriD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 35, req.body.tridesetpetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 36, req.body.tridesetsestD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 37, req.body.tridesetsedamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 38, req.body.tridesetosamD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 39, req.body.tridesetdevetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);
  blabla(req.params.brputnika, req.params.odrediste, req.params.polaziste, req.params.broj2, 40, req.body.cetrdesetD, req.params.TerminID2, time, req.params.id, popunjena2, req.params.IDLinije2, req.params.datum2, req.params.prevoznik2, req.params.vreme2);

  req.flash("success", "Uspesna rezervacija!");
  res.redirect('/');
});

app.put("/rezervisi/:polaziste/:odrediste/:broj/:id/:brputnika/:mesta/:TerminID/:IDLinije1/:datum1/:prevoznik/:vreme/:popunjena", async function (req, res) {

  var datetime = new Date();
  var time = datetime.getHours() + ":" + datetime.getMinutes();

  let popunjena = parseInt(req.params.popunjena);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 1, req.body.jedan, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 2, req.body.dva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 3, req.body.tri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 4, req.body.cetiri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 5, req.body.pet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 6, req.body.sest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 7, req.body.sedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 8, req.body.osam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 9, req.body.devet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 10, req.body.deset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 11, req.body.jedanaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 12, req.body.dvanaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 13, req.body.trinaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 14, req.body.cetrnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 15, req.body.petnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 16, req.body.sesnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 17, req.body.sedamnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 18, req.body.osamnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 19, req.body.devetnaest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 20, req.body.dvadeset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 21, req.body.dvadesetjedan, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 22, req.body.dvadesetdva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 23, req.body.dvadesettri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 24, req.body.dvadesetcetri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 25, req.body.dvadesetpet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 26, req.body.dvadesetsest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 27, req.body.dvadesetsedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 28, req.body.dvadesetosam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 29, req.body.dvadesetdevet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 30, req.body.trideset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 31, req.body.tridesetjedan, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 32, req.body.tridesetdva, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 33, req.body.tridesettri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 34, req.body.tridesetcetri, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 35, req.body.tridesetpet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 36, req.body.tridesetsest, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 37, req.body.tridesetsedam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 38, req.body.tridesetosam, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 39, req.body.tridesetdevet, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);
  blabla(req.params.brputnika, req.params.polaziste, req.params.odrediste, req.params.broj, 40, req.body.cetrdeset, req.params.TerminID, time, req.params.id, popunjena, req.params.IDLinije1, req.params.datum1, req.params.prevoznik, req.params.vreme);

  req.flash("success", "Uspesna rezervacija!");
  res.redirect('/');
});

async function blabla(brputnika, polaziste, odrediste, broj, br, vrednost, TerminID, time, id, popunjena, IDLinije1, datum1, prevoznik, vreme) {

  if (broj >= br && vrednost != undefined) {
    let uuid = create_UUID();
    await client.execute("INSERT INTO rbus.\"Rezervacija\" (\"resID\",\"TerminID\", vremerez,\"userID\",\"brojsedista\",\"LinijaID\", datum, imeprevoznika) VALUES (" + uuid + "," + TerminID + ",'" + time + "'," + id + "," + vrednost + "," + IDLinije1 + ",'" + datum1 + "','" + prevoznik + "')");
    await client.execute("INSERT INTO rbus.\"Sedista\" (\"TerminID\",\"brojsedista\") VALUES (" + TerminID + "," + vrednost + ")");
    popunjena = popunjena + brputnika;
    await client.execute("UPDATE rbus.\"Termin\" SET popunjena=" + popunjena + " WHERE \"LinijaID\"=" + IDLinije1 + " AND datum='" + datum1 + "' AND imeprevoznika='" + prevoznik + "' AND \"TerminID\"=" + TerminID + " AND vreme='" + vreme + "'");
    await client.execute("INSERT INTO rbus.\"TerminRezervacija\" (\"TerminID\", \"userID\", \"resID\") VALUES (" + TerminID + "," + id + "," + uuid + ")");
  }
}

function create_UUID() {
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}


// PROFIL ZA KORISNIKA I PREVOZNIKA
app.get("/profile", async function (req, res) {
  var postojiemail = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\" WHERE email=\'" + req.user.email + "\'");
  if (postojiemail.rows.length > 0) {
    var linijebaza = await client.execute(`SELECT * FROM rbus."Linija"`);
    // console.log(uuidBuffer.toString(postojiemail.rows[0].AutoprevoznikID.buffer));
    var rs = await client.execute(`SELECT * FROM rbus."Termin"`);
    var linije = [];
    var termini = [];

    // ZA PROVERU DA LI JE DATI TERMIN VEC PROSAO
    var today = new Date();
    var x = today.getMonth() + 1;
    if (x < 10) x = "0" + x;
    var y = today.getDate();
    var z = today.getHours();
    var q = today.getMinutes();
    if (z < 10) z = "0" + z;
    if (q < 10) q = "0" + q;
    var time = z + ":" + q;
    if (y < 10)
      y = "0" + y;
    var date = today.getFullYear() + '-' + x + '-' + y;

    for (var i = 0; i < rs.rows.length; i++) {
      if (rs.rows[i].AutoprevoznikID == req.user.AutoprevoznikID) {
        if (rs.rows[i].datum > date || (rs.rows[i].datum == date && rs.rows[i].vreme >= time)) {
          var indeks = linije.indexOf(uuidBuffer.toString(rs.rows[i].LinijaID.buffer));
          if (indeks == -1) {
            linije.push(uuidBuffer.toString(rs.rows[i].LinijaID.buffer));
            termini.push([]);
            termini[termini.length - 1].push(rs.rows[i]);
          }
          else {
            termini[indeks].push(rs.rows[i]);
          }
        }
      }
    }
    for (var i = 0; i < linijebaza.rows.length; i++) {
      var indeks = linije.indexOf(uuidBuffer.toString(linijebaza.rows[i].LinijaID.buffer));
      if (indeks != -1) {
        linije[indeks] = linijebaza.rows[i];
      }
    }
    res.render("profile_prevoznik.ejs", { user: req.user, linije: linije, termini: termini });
  }
  else {
    postojiemail = await client.execute("SELECT * FROM rbus.\"Korisnik\" WHERE email=\'" + req.user.email + "\'");
    if (postojiemail.rows.length > 0) {
      var termini = [];
      var rezervacije = await client.execute(`SELECT * FROM rbus."Rezervacija" WHERE "userID"=${req.user.id}`);
      for (var i = 0; i < rezervacije.rows.length; i++) {
        var termin = await client.execute(`SELECT * FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rezervacije.rows[i].LinijaID.buffer)} AND datum='${rezervacije.rows[i].datum}' AND imeprevoznika='${rezervacije.rows[i].imeprevoznika}' AND "TerminID"=${rezervacije.rows[i].TerminID}`);
        termini.push(termin.rows);
      }
      res.render("profile_korisnik.ejs", { user: req.user, rezervacije: rezervacije.rows, termini: termini });
    }
    else {
      req.flash("error", "Ulogovani korisnik ne postoji u bazi");
      res.redirect("/", { user: req.user, termini: null });
    }
  }
})
// BRISANJE POLASKA
app.delete("/profile/prevoznik/:termin", async function (req, res) {
  var terminparse = JSON.parse(req.params.termin);
  // brisanje termina
  await client.execute(`DELETE FROM rbus."Termin" WHERE "LinijaID"=${terminparse.LinijaID} AND "datum"='${terminparse.datum}' AND imeprevoznika='${terminparse.imeprevoznika}' AND "TerminID"=${terminparse.TerminID} `);
  var IDresuser = await client.execute(`SELECT * FROM rbus."TerminRezervacija" WHERE "TerminID"=${terminparse.TerminID}`);
  // brisanje rezervacija
  for (var i = 0; i < IDresuser.rows.length; i++) {
    await client.execute(`DELETE FROM rbus."Rezervacija" WHERE "userID"=${uuidBuffer.toString(IDresuser.rows[i].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[i].resID.buffer)} AND "TerminID"=${terminparse.TerminID}`);
    // brisanjte terminrezervacija
    await client.execute(`DELETE FROM rbus."TerminRezervacija" WHERE "TerminID"=${terminparse.TerminID} AND  "userID"=${uuidBuffer.toString(IDresuser.rows[i].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[i].resID.buffer)}`);
  }
  // brisanje sedista
  var sedista = await client.execute(`SELECT * FROM rbus."Sedista" WHERE "TerminID"=${terminparse.TerminID}`);
  for (var i = 0; i < sedista.rows.length; i++) {
    await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${terminparse.TerminID} AND brojsedista=${sedista.rows[i].brojsedista}`);
  }


  req.flash("success", "Termin je uspesno obrisan");
  res.redirect("/profile");
})
// PROMENA PODATAKA O PREVOZNIKU
app.put("/profile/prevoznik/edit/:email", async function (req, res) {
  var x = req.params.email;
  var prevoznik = await client.execute(`SELECT * FROM rbus."Autoprevoznik" WHERE email='${x}'`);

  const t = await bcrypt.compare(req.body.password, prevoznik.rows[0].password);
  if (!t) {
    req.flash("error", "Uneli ste pogresnu sifru. Podaci nisu promenjeni!");
    res.redirect("/profile");
  }
  else {
    if (req.body.password2 != "") {
      var newpassword = await bcrypt.hash(req.body.password2, 8);
    }
    else {
      newpassword = prevoznik.rows[0].password;
    }
    await client.execute(`UPDATE rbus."Autoprevoznik" SET password='${newpassword}',telefon='${req.body.telefon}' WHERE email='${x}' AND "AutoprevoznikID"=${uuidBuffer.toString(prevoznik.rows[0].AutoprevoznikID.buffer)}`);
    var user = await client.execute(`SELECT * FROM rbus."Autoprevoznik" WHERE email='${req.params.email}'`);
    req.login(user.rows[0], function (err) {
      if (err) return next(err);
    });
    req.flash("success", "Uspesno ste izmenili podatke!");
    res.redirect("/profile");
  }
});
//PROMENA PODATAKA O KORISNIKU
app.put("/profile/korisnik/edit/:email", async function (req, res) {
  var x = req.params.email;
  var prevoznik = await client.execute(`SELECT * FROM rbus."Korisnik" WHERE email='${x}'`);

  const t = await bcrypt.compare(req.body.password, prevoznik.rows[0].password);
  if (!t) {
    req.flash("error", "Uneli ste pogresnu sifru. Podaci nisu promenjeni!");
    res.redirect("/profile");
  }
  else {
    if (req.body.password2 != "") {
      var newpassword = await bcrypt.hash(req.body.password2, 8);
    }
    else {
      newpassword = prevoznik.rows[0].password;
    }
    await client.execute(`UPDATE rbus."Korisnik" SET password='${newpassword}',phone='${req.body.phone}',name='${req.body.name}' WHERE email='${x}' AND id=${uuidBuffer.toString(prevoznik.rows[0].id.buffer)}`);
    var user = await client.execute(`SELECT * FROM rbus."Korisnik" WHERE email='${req.params.email}'`);
    req.login(user.rows[0], function (err) {
      if (err) return next(err);
    });
    req.flash("success", "Uspesno ste izmenili podatke!");
    res.redirect("/profile");
  }
});
// BRISANJE PROFILA KORISNIKA
app.delete("/profile/korisnik/:email", async function (req, res) {
  await client.execute(`DELETE FROM rbus."Korisnik" WHERE email='${req.params.email}' and id=${req.user.id}`);
  req.logout();
  req.flash("success", "Uspesno ste obrisali nalog :(")
  res.redirect("/");
});

// BRISANJE PROFILA PREVOZNIKA PROVERITI DA LI RADI
app.delete("/profile/prevoznik/:email", async function (req, res) {
  await client.execute(`DELETE FROM rbus."Autoprevoznik" WHERE email='${req.params.email}' and "AutoprevoznikID"=${req.user.id}`);
  var rs = await client.execute(`SELECT * FROM rbus."Termin"`);
  //brisanje termina
  for (var i = 0; i < rs.rows.length; i++) {
    if ((uuidBuffer.toString(rs.rows[i].AutoprevoznikID)) == req.user.AutoprevoznikID) {
      await client.execute(`DELETE FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[i].LinijaID)} AND datum='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[i].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)} AND vreme='${rs.rows[i].vreme}`);

      var IDresuser = await client.execute(`SELECT * FROM rbus."TerminRezervacija" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
      // brisanje rezervacija
      for (var j = 0; i < IDresuser.rows.length; j++) {
        await client.execute(`DELETE FROM rbus."Rezervacija" WHERE "userID"=${uuidBuffer.toString(IDresuser.rows[j].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[j].resID.buffer)} AND "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
        // brisanjte terminrezervacija
        await client.execute(`DELETE FROM rbus."TerminRezervacija" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)} AND  "userID"=${uuidBuffer.toString(IDresuser.rows[j].userID.buffer)} AND "resID"=${uuidBuffer.toString(IDresuser.rows[j].resID.buffer)}`);
      }
      // brisanje sedista
      var sedista = await client.execute(`SELECT * FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[i].TerminID)}`);
      for (var j = 0; i < sedista.rows.length; j++) {
        await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[j].TerminID)} AND brojsedista=${sedista.rows[j].brojsedista}`);
      }

    }
  }
  req.logout();
  req.flash("success", "Uspesno ste obrisali nalog :(")
  res.redirect("/");
});
//  STRANICA ZA DODAVANJE POLASKA
app.get("/profile/prevoznik/dodajpolazak", async function (req, res) {

  res.render("addpolazak.ejs", { user: req.user });
})
// DODAVANJE POLASKA
app.post("/profile/prevoznik/dodajpolazak", async function (req, res) {
  var rs = await client.execute(`SELECT * FROM rbus."Linija" WHERE start='${req.body.polaziste}' AND cilj='${req.body.odrediste}'`);
  if (rs.rows.length == 0) {
    await client.execute(`INSERT INTO rbus."Linija" ("LinijaID",start,cilj) VALUES (uuid(),'${req.body.polaziste}','${req.body.odrediste}')`);
    await client.execute(`INSERT INTO rbus."Linija" ("LinijaID",cilj,start) VALUES (uuid(),'${req.body.polaziste}','${req.body.odrediste}')`);
    rs = await client.execute(`SELECT * FROM rbus."Linija" WHERE start='${req.body.polaziste}' AND cilj='${req.body.odrediste}'`);
  }
  var today = new Date();
  var x = today.getMonth() + 1;
  if (x < 10) x = "0" + x;
  var y = today.getDate();
  if (y < 10)
    y = "0" + y;
  var date = today.getFullYear() + '-' + x + '-' + y;
  if (req.body.datum < date) {
    req.flash("error", "Datum mora biti danasnji ili u buducnosti");
    res.redirect("/profile/prevoznik/dodajpolazak");
  }
  else {
    await client.execute(`INSERT INTO rbus."Termin" ("TerminID",imeprevoznika,"AutoprevoznikID","LinijaID",mesta,popunjena,vreme,cena,datum,start,cilj) VALUES
    (uuid(),'${req.user.naziv}',${req.user.AutoprevoznikID},${rs.rows[0].LinijaID},${req.body.mesta},0,'${req.body.vreme}',${req.body.cena},'${req.body.datum}','${req.body.polaziste}','${req.body.odrediste}')`);
    req.flash("success", "Uspesno ste dodali novi polazak");
  }
  res.redirect("/profile");
})
//BRISANJE REZERVACIJE
app.delete("/profile/korisnik/:email/:resid", async (req, res) => {
  var rs = await client.execute(`SELECT * from rbus."Rezervacija" WHERE "userID"=${req.user.id} AND "resID"=${req.params.resid}`);
  var sediste = rs.rows[0].brojsedista;
  await client.execute(`DELETE from rbus."Rezervacija" WHERE "userID"=${req.user.id} AND "resID"=${req.params.resid} and "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)}`);
  rs = await client.execute(`SELECT * FROM rbus."Termin" WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[0].LinijaID.buffer)} AND "datum"='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[0].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)}`);

  // brisanjte terminrezervacija
  await client.execute(`DELETE FROM rbus."TerminRezervacija" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)} AND  "userID"=${req.user.id} AND "resID"=${req.params.resid}`);


  // OSLOBADJANJE SEDISTA
  await client.execute(`DELETE FROM rbus."Sedista" WHERE "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)} AND brojsedista=${sediste}`);
  var novibroj = rs.rows[0].popunjena - 1;
  if (novibroj < 0) {
    novibroj = 12;
  }
  await client.execute(`UPDATE rbus."Termin" SET popunjena=${parseInt(novibroj)} WHERE "LinijaID"=${uuidBuffer.toString(rs.rows[0].LinijaID.buffer)} AND "datum"='${rs.rows[0].datum}' AND imeprevoznika='${rs.rows[0].imeprevoznika}' AND "TerminID"=${uuidBuffer.toString(rs.rows[0].TerminID.buffer)} AND vreme='${rs.rows[0].vreme}'`);
  req.flash("success", "Uspesno obrisana rezervacija");
  res.redirect("/profile");
})


app.get("/", function (req, res) {
  res.render("home.ejs", { user: req.user });
});

app.get("/autoprevoznici", async function (req, res) {
  const rs = await client.execute("SELECT * FROM rbus.\"Autoprevoznik\"");
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
