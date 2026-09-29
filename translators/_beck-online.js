{
	"translatorID": "29a53f61-c64e-4bda-bd20-e47119f684c3",
	"label": "_beck-online",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/beck-online\\.beck\\.de\\/(Dokument)?\\?vpath=bibdata",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-29 21:21:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


// global scope
const literaturtypen = {
	"kommentar": 				"encyclopediaArticle",			// Kommentar Standard
	"alteversion kommentar": 	"encyclopediaArticle",			// Kommentar Altauflage
	"handbuch": 				"encyclopediaArticle",			// Handbuch
	"alteversion handbuch":		"encyclopediaArticle",			// Handbuch Altauflage

	"zaufsatz":					"journalArticle",				// Zeitschriftenaufsatz
	"zentb":					"journalArticle",				// wohl Zeitschrift-Entcheidungs-Besprechung	
	"zsonst":					"journalArticle",				// wohl Zeitschrift-Sonstiges (z.B. Vorwort?). // zB. Editorial Brödermann IWRZ 2025, 165

	"zrspr":					"case",							// in Zeitschr. veröffentlichte Rspr.

	// ab hier noch nicht vertieft angesehen
	"zrsprakt":					false,
	"beckrs":					false,

	"zbuchb":					false,							// wohl Zeitschrift-Buch-Besprechung
	"lsk":						false,							// wohl beck Leitsatzkartei
	"zinhaltverz":				false,							// wohl Zeitschrift-Inhaltsverzeichnis
	"buch":						false,							// wohl monografie
	// "festschrift":			false							// im Mapping des "normalen" Translators, aber ausgekommentiert mit Fragezeichen
};


function detectWeb(doc, url) {

	// Return-Value false -> es wird einfach der nächste Translator niedrigerer Prio gecallt
	// dh ich kann bestimmte Literaturgattungen erkennen und sonst false returnen, und dann wird der "offizielle" beck-online translator laufen

	// Haupt-div hat entweder die ID "dokument" oder "trefferliste"
	//als className ist dann der Literaturtyp abrufbar (funktioniert bei Kommentaren aber erst bei den einzelnen §§ korrekt?)
	// etwas uneinheitlich: "zaufsatz" ist wohl klein, "ZENTB" ist wohl groß
	let mainDiv = doc.getElementById("dokument");
	if (mainDiv) {
		if (literaturtypen[mainDiv.className] == "encyclopediaArticle") {
			return 'encyclopediaArticle';
		};
		if (literaturtypen[mainDiv.className.toLowerCase()] == "journalArticle") {
			return 'journalArticle';
		};
		if (literaturtypen[mainDiv.className.toLowerCase()] == "case") {
			return 'case';
		};

	};

	// siehe alten Translator-Code für einen möglichen Umgang mit der Trefferliste der Suchfunktion
	// damit zu arbeiten halte ich aber eigentlich für sinnlos

	// wenn kein unterstützter Literaturtyp: return false -> allgemeinerer Translator versucht Erkennung
	return false;
}


async function doWeb(doc, url) {

	// Haupt-div hat entweder die ID "dokument" oder "trefferliste"
	//als className ist dann der Literaturtyp abrufbar (funktioniert bei Kommentaren aber erst bei den einzelnen §§ korrekt?)
	let mainDiv = doc.getElementById("dokument");
	let beckonlineClass = mainDiv.className.toLowerCase();		// remember: klein / GROSS uneinheitlich
	Z.debug("##" + beckonlineClass);
	if (mainDiv) {
		if (literaturtypen[mainDiv.className] == "encyclopediaArticle") {
			await scrapeCommentary(doc, url);
		};
		if (beckonlineClass == "zaufsatz") {
			await scrapeJournal(doc, url);
		};
		if (beckonlineClass == "zsonst") {		// mal sehen ob das einfach wie ein normaler Aufsatz behandelt werden kann
			await scrapeJournal(doc, url);
		};
		if (beckonlineClass == "zentb") {
			await scrapeEntscheidungsbesprechung(doc, url);
		};
		if (beckonlineClass == "zrspr") {
			await scrapeCase(doc, url);
		};
		
	};
}




async function scrapeCommentary(doc, url) {

	await scrapeCommentaryISBN(doc, url);

	/*
	let citation = text(doc, ".citation");

	if (citation.includes("BeckOK")) {
		// ##todo lul
		await scrapeJournal(doc, url);
	} else {
		await scrapeCommentaryISBN(doc, url);
	};
	*/

};




async function scrapeCommentaryISBN(doc, url) {

	// Allgemeine Hinweise

	// Z.debug("str") prints into the Debug Output Log
	// that can be found in the Browser > Zotero Connector Settings > Advanced (where it is disabled by default)
	// because there is so much going on, printouts need to start with a keyword that can be found using the search function
	// Z.debug('##test');


	// neues Item erstellen
	let item = new Zotero.Item("encyclopediaArticle");
	item.title = "##";

	let devInfo = "[Juraedition]<br><br>";

	// URL / Permalink
	item.url = text(doc, "#docUrl");

	// BeckOK ist Einzelkind
	let beckOK = false;
	if (text(doc, ".citation").includes("BeckOK")) {
		beckOK = true;
	}

	// Altauflage?
	// ##todo: was daraus machen haha
	let altauflage = false;
	if (doc.getElementById("dokument").className.includes("alteversion")) {
		item.version = "Altauflage";
		altauflage = true;
	};


	// Kommentartitel
	// wird weiter unten noch überschrieben / ##todo: Namen wie in "Dreier, GG Kommentar" aus Titel entfernen
	let kommentartitel = ZU.xpathText(doc, '//*[@id="toccontent"]/ul/li/a[2]');

	// BeckOK
	if (beckOK) {
		kommentartitel = ZU.xpathText(doc, '//*[@id="toccontent"]/ul/li/ul/li/a');
	};

	item.originalTitle = kommentartitel;







	// Website-Titel enthält Kurzbezeichnung und Abschnitt/Norm
	let websiteTitle = ZU.xpathText(doc, '//head/title[1]');
	let titleRegex = /(.*?) \| (.*?) - beck-online/;
	let matches = websiteTitle.match(titleRegex);
	let abschnitt = "";																// wird weiter unten nochmal abgerufen 
	// funktioniert generell nicht auf Titelseiten, z.B.: https://beck-online.beck.de/Bcid/Y-400-W-MuekoBGB
	if (matches) {
		item.shortTitle = matches[1];
		abschnitt = matches[2];
		abschnitt = abschnitt.replace(/Rn\. [0-9a-z-\.]*(, \d+[a-z]*)?/, "");		// "Rn. 5.1-13x" bzw. "Rn. 68, 68a" entfernen
		abschnitt = abschnitt.replace("§ ", "§ ");									// Geschütztes Leerzeichen
		abschnitt = abschnitt.replace("Art. ", "Art. ");							// Geschütztes Leerzeichen
		abschnitt = abschnitt.trimEnd();
		item.pages = abschnitt;
	};


	// P: bei HK-BGB steht im Titel stattdessen "Schule, Bürgerliches Gesetzbuch"
	// Bsp.: https://beck-online.beck.de/Bcid/Y-400-W-SchDoeEbeKoBGB-G-BGB-P-439
	// Zitiervorschlag hat aber eigentlich das Problem, dass man Hrsg. und Bearbeiter nicht trennen kann
	// deswegen hier Einzelfallhandling
	let zitiervorschlagOhneAufl = text(doc, "#zitStandard");
	// item.notes.push({note: zitiervorschlagOhneAufl});
	let hkRegex = /(^[^\/]+)/;
	let hkMatch = zitiervorschlagOhneAufl.match(hkRegex);
	if (hkMatch) {
		if (hkMatch[1].startsWith("HK-")) {
			item.shortTitle = hkMatch[1];
		}
	}


	/* 
	Abschnitt bei Handbüchern ist tlw. sketchy

	Bsp.: https://beck-online.beck.de/Bcid/Y-400-W-SchiBunLwoHdbBankR-G-PRIVAGBBANKEN-ANR-12-GL-II-4

	Gespeichert wird nur:
	AGB-Banken 12

	Nötig wäre aber eigentlich:
	Abschn. 1 Kap. 1 § 3 Nr. 12 

	das wird sich allerdings nicht beheben lassen, in der beck-online Zitation besteht
	nämlich das gleiche Probleme

	##todo: Warnung per Note bei Handbüchern hinzufügen??

	*/





	// ISBN

	/*
	Beck bietet in der rechten Spalte einen Link zum gedruckten Werk im Shop an
	Dieser Link löst eine Suche nach der ISBN des gedruckten Werks aus
	Somit ist an dieser Stelle die ISBN der Druckversion des Kommentars zu finden
	*/

	let isbn_link = attr(doc, 'a[title="gedrucktes Werk bestellen"]', 'href');

	if (isbn_link) {

		// Aus dem Link lässt sich mit einer kurzen regex die ISBN herauslösen
		let isbn = isbn_link.match(/query=([\d-]+)/)[1];

		item.ISBN = isbn;
		item.encyclopediaTitle = isbn;

	};





	/*
	// search the ISBN or text over the SRU of K10plus, and take the result it as MARCXML
	// documentation: https://wiki.k10plus.de/display/K10PLUS/SRU
	
	// example url:
	// https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.isb=978-3-406-81022-0&maximumRecords=1
	// Hinweis: mehr als 9 recods scheinen bei isbn query nicht zu gehen...

	über die Textsuche funktioniert der BeckOK erstaunlich gut ...
	// ## todo: BeckOK funktioniert damit jetzt grds, das korrekte Abspeichern der Auflage/Edition muss aber noch programmiert werden !!

	*/

	let sru_url = "";
	let queryISBN = "";

	if (item.ISBN) {
		devInfo += "Ermittelte ISBN:<br>" + item.ISBN + "<br><br>";
		queryISBN = ZU.cleanISBN(item.ISBN);
		sru_url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.isb=" + queryISBN + "&maximumRecords=9";
	} else {
		devInfo += "Keine ISBN ermittelt. Kommentartitel:<br>" + kommentartitel + "<br><br>";
		// ## todo / wip, wie viele Records? Wie besten Treffer bekommen?
		let searchTerm = kommentartitel;
		//searchTerm = searchTerm.replace(" ", "+").replace(",", "");
		searchTerm = searchTerm
			.replace(/\u200B/g, "")			// remove zero-width space (zB BeckOK Arbeitsrecht nach den Slashes)
			.replace(/\//g, " ")			// replace slashes with whitespace
			.replace(/,/g, "")				// remove ,
			.replace(/Hrsg\. /g, "")		// remove "Hrsg. " (zB bei BeckOK Arbeitsrecht im Titel)
			.replace(/ /g, "%20");			// uri encode whitespace
		sru_url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=" + searchTerm + "&maximumRecords=1";   
	};
	// Z.debug("##" + sru_url);
	// item.notes.push({note: sru_url});
	devInfo += "SRU URL:<br>" + sru_url + "<br><br>";


	let sru_result = await requestText(sru_url);
	// Z.debug("##" + sru_result);


	let parser = new DOMParser();
	xml = parser.parseFromString(sru_result, "application/xml");

	// ZU.xpath requires a namespace or it will throw an error
	// https://www.zotero.org/support/dev/translators/coding#:~:text=Evaluates%20the%20specified%20XPath%20on%20the%20DOM%20element%20or%20array%20of%20DOM%20elements%20given%2C%20with%20the%20optionally%20specified%20namespaces.%20If%20present%2C%20the%20third%20argument%20should%20be%20object%20whose%20keys%20represent%20namespace%20prefixes%2C%20and%20whose%20values%20represent%20their%20URIs
	// (however, docs may be wrong here - ZU.xpath might return empty arrays, not null)
	let namespace = {
		"marc": "http://www.loc.gov/MARC21/slim"
	};

	// ZU.xpath seems to return empty arrays (not null) if there is no match
	// therefore, always check for .length


	// Kommentartitel 
	let title = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="a"]', namespace);
	if (title.length) {
		title = title[0].textContent;
		// Z.debug("##" + title);
		item.originalTitle = title;
	};

	// Untertitel
	// let subtitle = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="b"]', namespace);
	let subtitle = ZU.xpath(xml, '(//marc:record)[1]//marc:datafield[@tag="245"]/marc:subfield[@code="b"]', namespace);		// ##wip wegen MüKo Band 2, wie unten nur auf ersten Treffer verlassen
	// an dieser Stelle ist das Problem wohl, dass bei manchen Einträgen der Bandtitel in den Untertitel geschrieben wurde -> eigentlich kann der Kommentare mit dem Bsp Ellenberger/Bunte verallgemeinert werden
	// oder überlegen, ob man generell nur einen Treffer abgreift -- wobei: die anderen sind später für die Namen nützlich, hier oben kann flexibel ja nur der ertse Record genommen werden
	if (subtitle.length) {
		item.originalTitle = item.originalTitle + ": " + subtitle[0].textContent;
	};


	// ##todo: datafield 245 $c wäre eigentlich statement of responsibility (Namen wie auf Titelseite)
	// funktioniert das beim MüKo? -- ja, da scheinen die Hrsg des Gesamtwerks aufgelistet zu sein
	// (aber halt mit allen Titeln etc)



	/* Band / Bandtitel nimmt einen Hops, wenn auch nur ein Eintrag falsch ist
	Bsp: Ellenberger/Bunte -> beck-online ISBN verweist auf Gesamtwerk, aber ein
	Treffer in K10plus hat da "Band 2" als Bandtitel eingetragen
	-> hier sich doch nur auf den ersten Treffer verlassen, also Band(titel)
	nur aus allererstem Record übernehmen
	*/

	// Band
	// let volume_no = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="n"]', namespace);
	let volume_no = ZU.xpath(xml, '(//marc:record)[1]//marc:datafield[@tag="245"]/marc:subfield[@code="n"]', namespace);
	if (volume_no.length) {
		item.volume = volume_no[0].textContent;
		// auf Zahl kürzen
		item.volume = item.volume.replace(/^(Bd. |Band )/, "");
	};

	// Bandtitel
	let volumeTitle = ZU.xpath(xml, '(//marc:record)[1]//marc:datafield[@tag="245"]/marc:subfield[@code="p"]', namespace);
	if (volumeTitle.length) {
		volumeTitle = volumeTitle[0].textContent;
		// MüKo-Sonderbehandlung
		volumeTitle = volumeTitle.replace(/\s*\/\s*Redakteur[\s\S]*$/, "");
		item.volumeTitle = volumeTitle;
	};

	// Auflage
	let edition = ZU.xpath(xml, '//marc:datafield[@tag="250"]/marc:subfield[@code="a"]', namespace);
	if (edition.length) {
		item.edition = edition[0].textContent;
		// auf Zahl kürzen
		let auflagenRegex = /^(\d+)\./;
		let auflagenMatch = item.edition.match(auflagenRegex);
		if (auflagenMatch) {
			item.edition = auflagenMatch[1];
		}
	};

	// Erscheinungsort
	let place = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="a"]', namespace);
	if (place.length) {
		item.place = place[0].textContent;
		// Z.debug("##" + place[0].textContent);
	};

	// Verlag
	let publisher = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="b"]', namespace);
	if (publisher.length) {
		item.publisher = publisher[0].textContent;
	};

	// Jahr / Datum 
	let date = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="c"]', namespace);
	if (date.length) {
		item.date = date[0].textContent;
	};





	// ## wip: Korrekturen beim BeckOK
	if (beckOK) {
		// item.notes.push({note: "beckOK erkannt :D"});
		let zitation = text(doc, "td:has(span.citation)");
		// item.notes.push({note: zitation});
		let beckOKRegex = /BeckOK\D+(\d+)\. EditionStand:.(\d{2}\.\d{2}\.\d{4})/;
		let beckOKmatch = zitation.match(beckOKRegex);
		if (beckOKmatch) {
			// item.notes.push({note: ":D"});
			item.edition = beckOKmatch[1];
			item.date = beckOKmatch[2];
			item.submitted = item.date;			// ##todo: Marker für Online-Kommentar?
		} else {
			// item.notes.push({note: ":/"});
		}
	}






	// K10plus PPN (Pica Production Number)
	let ppn = ZU.xpath(xml, '//marc:controlfield[@tag="001"]', namespace);
	if (ppn.length) {
		ppn = ppn[0].textContent;
	};
	// item.notes.push({note: "PPN: " + ppn});







	/* 
	an die K10plus Suchtreffer hängen wir noch ganz billig den DNB Eintrag für die ISBN an
	bei MüKos fügen wir vorher noch die Namen vom Gesamtwerk ein 
	alles patchen wir einfach ganz billig in ein großes xml-doc zusammen  (•᷄- •᷅ ;)
	*/
	
	// Create a brand new document to hold them
	const combinedXml = document.implementation.createDocument(null, "root");
	const root = combinedXml.documentElement;







	
	/* 
	bei den MüKos besteht das Problem, dass die Hrsg. - nach denen zitiert wird - nur beim Gesamtwerk vermerkt sind
	-> deswegen muss hier eine Sonderbehandlung eingefügt werden, wobei in die kumulierte Namensliste zunächst die
	Hrsg. des Gesamtwerks eingefügt werden müssen

	##todo: allerdings wird der Redakteur des jeweiligen Bandes nicht zitiert, manche Datenquellen führen diese aber als Hrsg. auf
	##todo: es kann aber auch nicht einfach die letzte Person gestrichen werdne, weil zB Claudia Schubert Hrsg. und Redakteurin des 1. Bandes ist ...
	*/

	// betrifft nur - aber dafür wohl alle - MüKos !
	let personsMueko = {};
	if (item.shortTitle.includes("MüKo") && ppn) {
	
		// Übergeordneten Eintrag ermitteln (später für MüKo gebraucht)
		let famUrl = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.1049=" + ppn + "+and+pica.1045=rel-bt+and+pica.1001=b&maximumRecords=20&recordSchema=marcxml";
		let famSruRes = await requestText(famUrl);
		famXml = parser.parseFromString(famSruRes, "application/xml");
		devInfo += "Müko-Sondercall:<br>" + famUrl + "<br><br>";

		// 1. Record ist der Band, das Gesamtwerk ist erst der 2. Record
		// also 1. Record einfach entfernen, 2. Record haben wir später aus der ersten SRU-Abfrage
		let firstRecord = famXml.querySelector("record"); 
		if (firstRecord) {
			firstRecord.remove();
		};

		let node0 = combinedXml.importNode(famXml.documentElement, true);
		root.appendChild(node0);


		// ## wip
		
		const combinedXmlMueko = document.implementation.createDocument(null, "root");
		const rootMueko = combinedXmlMueko.documentElement;
		// rootMueko.appendChild(node0);
		rootMueko.appendChild(node0.cloneNode(true));										// if not cloned, then it's actually removed from the other doc!
		personsMueko = await mapPersons(combinedXmlMueko);
		// devInfo += "Personendaten Müko:<br>" + JSON.stringify(personsMueko) + "<br><br>";
		
	};








	// Import the K10plus elements
	// 'true' means a deep copy (including all children)
	const node1 = combinedXml.importNode(xml.documentElement, true);
	root.appendChild(node1);






	// an die K10plus Suchtreffer hängen wir jetzt noch ganz billig den DNB Eintrag für die ISBN an
	// zB bei Sachs GG 10. Aufl. sind in der DNB nämlich alle (!) Bearbeiter mit Vor- und Nachnamen vermerkt

	// ?query=isbn= wäre hier möglich, ISBN geht aber auch einfach als normale Query
	// P: liefert aber nicht immer genau einen Treffer, zB bei 978-3-406-74430-3 = Bunte/Ellenberger, Bankrechts-Handbuch -> deswegen Begrenzung
	// zwar sonst mehr Namen, aber dann könnten sich auch Hrsg. von Altauflagen einschleichen!
	// Bsp Bunte/Ellenberger: https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=978-3-406-74430-3&recordSchema=MARC21-xml&maximumRecords=1

	// ## todo: what to do if no isbn provided??
	// dürfte wohl BeckOK und BeckOGK betreffen, die sind im DNB Katalog leider sowieso nur ganz vereinzelt nachgewiesen, also kann man sich das hier sparen
	if (queryISBN) {
		let dnbSruUrl = "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=" + queryISBN + "&recordSchema=MARC21-xml&maximumRecords=1";
		//item.notes.push({note: dnbSruUrl});
		devInfo += "DNB-URL:<br>" + dnbSruUrl + "<br><br>";

		let dnbResult = await requestText(dnbSruUrl);
		dnbXml = new DOMParser().parseFromString(dnbResult, "application/xml");



		// Import the DNB element
		// 'true' means a deep copy (including all children)
		const node2 = combinedXml.importNode(dnbXml.documentElement, true);

		// Append them both to the new root
		root.appendChild(node2);
	};




	// Jetzt werden aus allen Records die Namen gezogen

	// wenn bei K10plus SRU-Query mehr als 1 Record + Treffer bei DNB
	// querySelectorAll wählt Namen dann aus allen Records aus
	// Reihenfolge richtet sich danach, wann das erste mal aufgetaucht (dann als key hinzugefügt)
	// Rolle richtet sich nach der "highest-priority" Rolle (siehe tempPersons -> persons) aus allen Records
	// Bsp: bei Ellenberger/Bunte ist die Rollenverteilung beim ersten Treffer zuverlässiger!

	let persons = await mapPersons(combinedXml);

	// Z.debug(persons);
	// item.notes.push({note: JSON.stringify(persons)});
	// devInfo += "Personendaten:<br>" + JSON.stringify(persons) + "<br><br>";






	// Personen zum Zotero-Item hinzufügen
	Object.entries(persons).map(([key, val]) => {
		item.creators.push(ZU.cleanAuthor(key, val, true));
	});




	/*

	// ##todo: das ist noch nicht ausgereift

	// Müko - Redakteuer loswerden (in Hrsg. der Reihe umwandeln) -- ##todo: die Rolle gibt es eigentlich aber auch, wie abstimmen??
	if (personsMueko) {

		const editorKeysA = Object.keys(personsMueko).filter(k => personsMueko[k] === "editor");
		// devInfo += "Personen-Keys-Müko:<br>" + JSON.stringify(editorKeysA) + "<br><br>";
		const editorKeysB = Object.keys(persons).filter(k => persons[k] === "editor");
		// devInfo += "Personen-Keys-allg:<br>" + JSON.stringify(editorKeysB) + "<br><br>";

		const nurInB = editorKeysB.filter(k => !editorKeysA.includes(k));

		// devInfo += "Redakteure?:<br>" + JSON.stringify(nurInB) + "<br><br>";

		// loop in loop ist eigentlich nicht effizient, aber es wird wohl nur einen key (Redakteur) geben
		for (const key of nurInB) {
			Object.values(item.creators).forEach(creator => {
				let nameKomplett = creator.lastName + ", " + creator.firstName;
				// devInfo += nameKomplett + "<br>";
				if (nameKomplett == key) {
					devInfo += "Wohl nur Redakteur*in -> als Hrsg. d. Reihe markiert -> wenn korrekt, ganz löschen, da Redakteur*in nicht zitiert wird:<br>" + key + "<br><br>";
					// folgende Zeile überschreibt dann die creator-Art, was hier (anders als unten) ja gerade gewollt ist
					creator["creatorType"] = "seriesEditor";
				};
			});
		};

	};

	*/


	/*
	// item.creators.push(ZU.cleanAuthor("Eric Mann", "seriesEditor", true));
	let blablaitem = new Zotero.Item("case");
	blablaitem.title = "##";
	blablaitem.creators.push(ZU.cleanAuthor("Eric Mann", "composer", true));
	blablaitem.complete();


	// wenn die Rolle irgendein Unsinn ist, wird auf das Default bei der Eintragungsart zurückgefallen
	// wenn es die Rolle eigentlich gibt - wie "composer" bei "audioRecording" - aber nicht bei der Eintragungsart, wird der Name leider nicht ins Extra-Feld geschrieben,
	// sondern ebenfalls auf das Default der Eintragungsart zurückgefallen ...
	*/

	// Bearbeiter ermitteln
	let bearbeiter = text(doc, ".autor");

	if (bearbeiter) {
		let bearbeiters = bearbeiter.split("/");
		let bearbeiterCollection = [];
		for (let i = 0; i < bearbeiters.length; i++) {
			let b = bearbeiters[i];
			let isCommaSeperated = false;
			Object.values(item.creators).forEach(creator => {
				// "P. Kirchstein" includes "Kirchstein", aber nicht andersrum -> deswegen ist das if .includes() so rum geschrieben :)
				if (b.includes(creator.lastName)) {
					// folgende Zeile funktioniert nicht, weil z.B. Hrsg. damit überschrieben wird (Bsp: Ingrid Schmidt (Hrsg) kommentiert im Erfurter auch Art. 1 GG)
					// creator["creatorType"] = "author";

					// stattdessen schreiben wir bei einem Match noch den Erstnamen dazu und speichern die Rolle dann nochmal separat
					// Anm.: das arr ist so kompliziert aufgebaut, damit weiter unten die Reihenfolge stimmt 
					b = creator.lastName + ", " + creator.firstName;
					isCommaSeperated = true;

					/* ##todo:
					Funktionsweise bisher ist gefährlich, wenn mehrere gleiche Nachnamen mit einem Werk verbunden sind
					(kommentiert zB nicht Ansgar Staudinger in Julius v. Staudingers Kommentar?)
					-> ##todo: bei einem etwaigen 2. Match den Vornamen doch wieder entfernen bzw wieder zum ursprünglichen aus beck-online
					übernommenen Wert zurückkehren
					*/



				};
			});
			bearbeiterCollection.push(ZU.cleanAuthor(b, "author", isCommaSeperated));	
			// das müsste jetzt erledigt sein:
			//##todo: hier bug eingebaut für Fälle in denen "P. Kirchhof" oder "Stephan Lorenz" noch nicht mit vorhandenen Personen gematched wurden, da in diesen Fällen keine Trennung per Komma lol
			// ich erinnere mich leider gerade nicht mehr daran, welche Kommentare das betraf
		};
		// Bearbeiter sollen in der Namensliste ganz oben stehen;
		// davon abgesehen muss die Reihenfolge natürlich beibehalten werden
		item.creators = [...bearbeiterCollection, ...item.creators];
	};


	// Bloße "contributor" löschen (unnötiger clutter)
	// ## deaktivieren, sobald meine "Sammel-Idee" getestet wird ...
	// ##todo : Überlegen, wie Ferrari gehandelt wird und ob man da nicht die Autoren als Contributor behält...
	// ##todo: Überlegen, was mit Kommentaren wie Koch, AktG oder Stern/Sachs ist, wo die Autoren alles allein/gemeinsam verantworten
	item.creators = item.creators.filter(c => c["creatorType"] !== "contributor");
















	// ##Datenbasis speichern test (##todo: ans Ende verschieben, nachde tatsächlich eine DB ange
	// rufen wurde oder eben gerade nicht)
	item.libraryCatalog = "beck-online, K10plus, DNB";










	// PDF-Download
	let pdfUrl = url;
	pdfUrl = pdfUrl
		//.replace("https://beck-online.beck.de/", "https://beck-online.beck.de/Print/CurrentDoc")
		.replace(/https:\/\/beck-online\.beck\.de\/(Dokument)?/, "https://beck-online.beck.de/Print/CurrentDoc")	// sometimes with, sometimes without /Dokument/
		.replace(/#.*$/, "")																						// remove fragment identifier (anything after # in the URL)
		.replace(/&anchor=.*$/, "")
		.replace(/%2F/g, "%5C")
		.replace(/%2e/g, ".")
		+ "&printdialogmode=CurrentChapter&actionname=Index&gesamtversionpath=&timezone=Europe%2FBerlin&exportFormat=pdf";

	//item.notes.push({note: pdfUrl});
	devInfo += "Generierter Download-Link:<br>" + pdfUrl + "<br><br>";

	item.attachments.push({
		title: 'PDF',
		mimeType: "application/pdf",
		url: pdfUrl

	});













	// Anzeige- & Suchtitel (!) in Zotero zusammenbasteln
	item.title = item.shortTitle + " | " + abschnitt + " (" + item.originalTitle + ")";
	if (altauflage) {
		item.title = item.shortTitle + " | " + abschnitt + " (" + item.date + ")"+ " (" + item.originalTitle + ")";
	}


	// ## todo: was als Tracker, wenn keine ISBN -- v.a. da Fälle, wo grds. ISBN vorhanden wäre, zB Titelseite des MüKo (auch wenn eig. nicht zitierbar)?!?
	// item.encyclopediaTitle = isbn;



	// Report speichern
	item.notes.push({note: devInfo});



	item.complete();


};







async function scrapeBeckOK(doc, url) {
	// ## Platzhalter



	// Kommentartitel
	// wird weiter unten noch überschrieben / ##todo: Namen wie in "Dreier, GG Kommentar" aus Titel entfernen
	let kommentartitel = ZU.xpathText(doc, '//*[@id="toccontent"]/ul/li/a[2]');

	// ## BeckOK
	if (!kommentartitel) {
		kommentartitel = ZU.xpathText(doc, '//*[@id="toccontent"]/ul/li/ul/li/a');
	};









	return false; 
};








async function mapPersons(combinedXml) {

	let tempPersons = {};

	let nameDatafields = combinedXml.querySelectorAll('datafield[tag="100"], datafield[tag="700"]');

	nameDatafields.forEach(field => {
		let nameSubfield = field.querySelector('subfield[code="a"]');
		let name = nameSubfield.textContent;

		// DNB kennzeichnet Namenspartikel "von" mit U+0098	START OF STRING und U+009C	STRING TERMINATOR
		// die Logik ist Zotero aber unbekannt
		name = name.replace(/\u0098/g, '');
		name = name.replace(/\u009C/g, '');

		// DNB nimmt außerdem für ä, ö, ü die Kombination a, o, u + U+0308	COMBINING DIAERESIS
		// das führt aber zu unerkannten Dopplungen mit Einträgen aus K10plus, bei denen das nicht so ist
		name = name.replace(/a\u0308/g, 'ä');
		name = name.replace(/o\u0308/g, 'ö');
		name = name.replace(/u\u0308/g, 'ü');

		let typeSubfields = field.querySelectorAll('subfield[code="e"]');					// eigentlich wäre subfield 4 präziser, aber die DNB hat zB bei Sachs, GG den Begründer nicht als "fon" sondern als "oth", damit ist das useless
		let roles = [];
		typeSubfields.forEach(type => {
			roles.push(type.textContent);
		});

		if (!tempPersons[name]) {
			tempPersons[name] = [];
		};

		// Spread the 'roles' array to push each individual item (so we don't get arrays in an array, but one arr of strings)
		tempPersons[name].push(...roles);

	});


	// Z.debug("##");
	// Z.debug(tempPersons);
	// item.notes.push({note: JSON.stringify(tempPersons)});

	let persons = Object.fromEntries(
		Object.entries(tempPersons).map(([key, arr]) => {
			if (arr.some(item => item.includes("Begründer"))) return [key, "translator"];	   // K10plus "BegründerIn eines Werks"
			if (arr.some(item => item.includes("Begründer"))) return [key, "translator"];		// DNB: "Begründer" aber Achtung: das ü = U+0075	LATIN SMALL LETTER U + 	U+0308	COMBINING DIAERESIS !
			if (arr.some(item => item.includes("Herausgeber"))) return [key, "editor"];		   // K10plus "HerausgeberIn", DNB "Herausgeber"
			return [key, "contributor"];
		})
	);

	return persons;

};












async function scrapeJournal(doc, url) {
	Z.debug("## function called")

	// neues Item erstellen
	let item = new Zotero.Item("journalArticle");
	item.title = "##";

	// URL / Permalink
	item.url = text(doc, "#docUrl");

	let devInfo = "[Juraedition]<br><br>";

	let datenbasis = "beck-online";



	// ##todo: Zeitschriftenabkürzung aus beck-online ermitteln!!

	// ##todo: Überlegen, wie Fortsetzungen gehandelt werden sollen
	// Bsp: Sonntagsruhe zwischen Verfassungsgebot und Kommerzialisierung / Prof. Dr. Matthias Knauff, Gewerbearchiv; 62(2016), 6, Seite 217-223


	


	// ##wip
	let beckTitel = "";

	beckTitel = text(doc, "span.titel");

	/*
	Der Selector span.titel ist trotz diverser Probleme die einfachtse Lösung.
	Denn es ist das das einzige Element, dass verlässlich da ist, der Rest scheint ja nach Zeitschrift unterschiedlich zusammengebaut.

	https://beck-online.beck.de/?vpath=bibdata%2Fzeits%2FZHR%2F2023%2Fcont%2FZHR%2e2023%2eH0203%2egl2%2ehtm
	-> bei allen Aufsätzen dieser Ausgabe am Ende aus Vesehen "Inhalt" angefügt xD

	https://beck-online.beck.de/Bcid/Y-300-Z-ZHR-B-2023-S-392-N-1
	-> noch ein zweiter Autor fälschlich mit drin xD

	Einfachster Workaround bei Fehlern: Rechtsklick -> Inspect Element -> Selbst bearbeiten und den Translator dann mit korrtem Input callen xD
	wird bei 0 Treffern auch in die Report-Notiz geschrieben, s.u.

	*/



	// debugging
	Z.debug("## beckTitel ist " + beckTitel);
	//item.notes.push({note: beckTitel});
	devInfo += "Beck-Titel:<br>" + beckTitel + "<br><br>";

	beckTitel = beckTitel.replaceAll("/", "+");
	beckTitel = beckTitel.replaceAll(": ", "+");
	beckTitel = beckTitel.replaceAll(", ", "+");
	beckTitel = beckTitel.replaceAll("- ", "+");
	beckTitel = beckTitel.replaceAll(" – ", "+");	// scheint gar nicht nötig zu sein
	beckTitel = beckTitel.replaceAll("?", "");		// scheint gar nicht nötig zu sein
	beckTitel = beckTitel.replaceAll(" ", "+");


	// https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.mat=article+and+cisg+im+schiedsverfahren&maximumRecords=10
	let sruURL = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.mat=article+and+" + beckTitel + "&maximumRecords=1";
	// auf 1 Treffer limitiert, zB 2 bei 
	// "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.mat=article+and+Schneider+Assimilation+und+Integration+eine+Begriffsanalyse+aus+der+Perspektive+der+Rechtswissenschaft&maximumRecords=1"
	// -> dann Problem, dass Autorin doppelt abgespeichert wird, da anders als bei Kommentaren kein Dopplungs-Handling (dort werden ja bewusst möglichst alle Treffer aggregiert)

	// opac-de-627 müsste https://opac.k10plus.de entsprechen; dort sind auch Aufsätze nachgewiesen - zu wahrscheinlicher Ursache siehe https://de.wikipedia.org/wiki/Unselbständige_Literatur



	devInfo += "SRU URL:<br>" + sruURL + "<br><br>";



	// ## todo: check einfügen: was wenn gar keine Ergebnisse ? zumindest erstmal warnung ausgeben?!?!?
	// erstmal nicht kritisch, weil die Sachen unten immer auf .length checken und dann eben einfach nichts finden xD




	let sruResults = await requestText(sruURL);
	xml = new DOMParser().parseFromString(sruResults, "application/xml");

	// ZU.xpath requires a namespace or it will throw an error
	// https://www.zotero.org/support/dev/translators/coding#:~:text=Evaluates%20the%20specified%20XPath%20on%20the%20DOM%20element%20or%20array%20of%20DOM%20elements%20given%2C%20with%20the%20optionally%20specified%20namespaces.%20If%20present%2C%20the%20third%20argument%20should%20be%20object%20whose%20keys%20represent%20namespace%20prefixes%2C%20and%20whose%20values%20represent%20their%20URIs
	// (however, docs may be wrong here - ZU.xpath might return empty arrays, not null)
	let namespace = {
		"marc": "http://www.loc.gov/MARC21/slim"
	};

	// ## wip: Check, ob überhaupt Ergebnisse geladen wurden
	let noOfRecs = ZU.xpathText(xml, '//*[local-name()="numberOfRecords"]');
	devInfo += "Trefferanzahl (abgerufen wird aber nur der erste):<br>" + noOfRecs + "<br><br>";

	if (noOfRecs > 0) {
		datenbasis += ", K10plus";
	} else {
		devInfo += "Den Beck-Titel zuerst prüfen und bei Fehlern in der beck-online-Seite über Rechtsklick -> Element untersuchen selbst korrigieren!<br><br>";
		devInfo += "Keine Treffer in K10plus -- im Translator Code ist schon eine mögliche StabiKat-Anfrage als Backup-Versuch angelegt!<br><br>"
	};




	// STABIKAT ALSO EXPOSESS MARXML DIRECTLY!
	// https://stabikat.de/Record/1857950690/Export?style=MARCXML
	// note that this is case-sensitiv: style needs to be lowercase, MARCXML needs to be uppercase

	// man könnte überlegen, den Stabikat noch zu versuchen, wenn k10plus scheitert 
	// allerdings wird das wohl in den seltensten Fällen helfen, da die Daten wohl vor allem von k10plus kommen xD
	// https://blog.sbb.berlin/stabikat-neu/

	/*
	let stabiUrl = "";
	stabiURL = 'https://stabikat.de/Search/Results?limit=0&lookfor='       +        beckTitel       +        '&type=AllFields&filter%5B%5D=~format%3A"Article"';
	devInfo += "StabiKat URL:<br>" + stabiURL + "<br><br>";
	let stabiResults = await requestText(stabiURL);
	let stabiXML = new DOMParser().parseFromString(stabiResults, "text/html");
	let stabiRecord = stabiXML.querySelector("a.title.getFull");
	if (stabiRecord) {
		stabiRecord = stabiRecord.href;
		// /Record/1015532837?sid=11684406"; bei elektr. Ress. tlw. auch JST12345; sid ist wohl session oder search ID, wird nicht gebraucht
		let idRegex = /Record\/(.+)\?sid/;
		let idMatches = stabiRecord.match(idRegex);
		let recordID = idMatches[1];
		let stabiMarcURL = `https://stabikat.de/Record/${recordID}/Export?style=MARCXML`;
		devInfo += stabiMarcURL + "<br><br>";
		let stabiMarc = await requestText(stabiMarcURL);
		stabiXML = new DOMParser().parseFromString(stabiMarc, "application/xml");
		// Aufsatztitel
		let stabiTitel = ZU.xpath(stabiXML, '//marc:datafield[@tag="245"]/marc:subfield[@code="a"]', namespace);
		if (stabiTitel.length) {
			stabiTitel = stabiTitel[0].textContent;
			devInfo += "Erster Stabi-Treffer:<br>" + stabiTitel + "<br><br>";
		};
	};
	*/







	// ZU.xpath seems to return empty arrays (not null) if there is no match
	// therefore, check for .length

	// Aufsatztitel
	let title = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="a"]', namespace);
	if (title.length) {
		title = title[0].textContent;
		item.title = title;
	};

	// Untertitel
	let subtitle = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="b"]', namespace);
	if (subtitle.length) {
		subtitle = subtitle[0].textContent;
		item.title = item.title + ": " + subtitle;
	};

	// Zeitschriftentitel
	let journalTitle = ZU.xpath(xml, '//marc:datafield[@tag="773"]/marc:subfield[@code="t"]', namespace);
	if (journalTitle.length) {
		journalTitle = journalTitle[0].textContent;
		item.publicationTitle = journalTitle;
	};


	// Ort und Verlag
	let placeAndPublisher = ZU.xpath(xml, '//marc:datafield[@tag="773"]/marc:subfield[@code="d"]', namespace);
	if (placeAndPublisher.length) {
		// this regex likely will need a lot of updating, if it works at all
		let ppRegex = /(.+) : (.+), /;
		let ppMatches = placeAndPublisher[0].textContent.match(ppRegex);
		item.place = ppMatches[1];
		item.publisher = ppMatches[2];
	};

	// Vol, Year, Issue, Pages
	let codeG = ZU.xpath(xml, '//marc:datafield[@tag="773"]/marc:subfield[@code="g"]', namespace);
	// item.notes.push({note: codeG[0].textContent});

	let volume = "";
	let year = "";
	let issue = "";
	let pages = "";

	if (codeG.length) {
		codeG.forEach(item => {
			item = item.textContent;
			let matches = [];
			let volumeRegex = /volume:(\d+)/;
			matches = item.match(volumeRegex);
			if (matches) {
				volume = matches[1];
			};
			let yearRegex = /year:(\d+)/;
			matches = item.match(yearRegex);
			if (matches) {
				year = matches[1];
			};
			let issueRegex = /number:(\d+)/;
			matches = item.match(issueRegex);
			if (matches) {
				issue = matches[1];
			};
			let pagesRegex = /pages:([\d-]+)/;
			matches = item.match(pagesRegex);
			if (matches) {
				pages = matches[1];
			}
		});
	};
	item.volume = volume;
	item.date = year;
	item.issue = issue;
	item.pages = pages;




	// Autoren
	let nameDatafields = xml.querySelectorAll('datafield[tag="100"], datafield[tag="700"]');
	nameDatafields.forEach(field => {
		let nameSubfield = field.querySelector('subfield[code="a"]');
		let name = nameSubfield.textContent;
		// ##todo: wir assumen jetzt erstmal, dass alle aufgezählten Personen Autoren sind...
		item.creators.push(ZU.cleanAuthor(name, "author", true));
	});






	
	// ##todo: work in progress - Zeitschriften-Abkürzung
	let zsabk = "##";
	let zsabkSelector = "";
	devInfo += "Zeitschriftenabkürzung wird derzeit versucht zu ermitteln:<br><br>";

	zsabkSelector = "#toccontent > ul > li > a:nth-child(2)";
	zsabk = text(doc, zsabkSelector);
	devInfo += zsabkSelector + "<br>" + zsabk + "<br><br>";
	// bei ZUR steht dort aber z.B. "Zeitschrift für Umweltrecht (ZUR)"

	zsabkSelector = ".citation";
	zsabk = text(doc, zsabkSelector);
	devInfo += zsabkSelector + "<br>" + zsabk + "<br><br>";
	// "ZUR 2026, 214"
	// "ZHR 187 (2023), 392"
	// "NJW 2026, 2137"

	// item.journalAbbreviation = zsabk;











	// Sonderfall: ZRP (Zeitschrift für Rechtspolitik) ist ebenfalls über JSTOR verfügbar
	// Vorteil ist, dass das PDF  hier gegenüber dem beck-online-PDF deutlich schöner ist :)
	// der Link lässt sich über Stabikat ermitteln
	// (alternativ möglich wäre Google Scholar)

	if(item.publicationTitle == "Zeitschrift für Rechtspolitik") {

		//item.notes.push({note: "Stabikat Abfrage für JSTOR-Link wird gestartet."});
		devInfo += "Stabikat Abfrage für JSTOR-Link wird gestartet.<br><br>";

		let stabiURL2 = "";
		stabiURL2 = 'https://stabikat.de/Search/Results?limit=0&lookfor='       +        beckTitel       +        '&type=AllFields&filter%5B%5D=~format%3A"electronic+Article"';
		let stabiResults2 = await requestText(stabiURL2);
		stabiXML2 = new DOMParser().parseFromString(stabiResults2, "text/html");
		let stabiRecord2 = stabiXML2.querySelector("a.title.getFull");
		if (stabiRecord2) {
			stabiRecord2 = stabiRecord2.href;
			// item.notes.push({note: stabiRecord});
			// gets sth like chrome-extension://ekhagklcjbdpajgpjgmbionohlpdbjgc/Record/JST133658171?sid=10790975

			let recordRegex2 = /Record\/(JST\d+)\?sid/;
			let recordMatches2 = stabiRecord2.match(recordRegex2);
			let recordNumber2 = recordMatches2[1];
			// item.notes.push({note: recordNumber2});
			// https://stabikat.de/Record/JST133658171/Export?style=BibTeX

			let stabiData2 = stabiXML2.querySelector(".availabilityItem").getAttribute("data-full");
			// base64 encoded data blob
			stabiData2 = atob(stabiData2);
			// item.notes.push({note: stabiData2});

			let jstorRegex = /jstor\.org\\\/stable\\\/(\d+)/;
			let jstorMatches = stabiData2.match(jstorRegex);
			let jstorURL = "https://www.jstor.org/stable/" + jstorMatches[1];
			let jstorPDFURL = "https://www.jstor.org/stable/pdf/" + jstorMatches[1] + ".pdf";
			// item.notes.push({note: jstorURL});
			// item.notes.push({note: jstorPDFURL});
			// https://www.jstor.org/stable/pdf/26536978.pdf
			
			item.attachments.push({
				title: "JSTOR PDF",
				mimeType: "application/pdf",
				url: jstorPDFURL,
			});

			// wenn nicht im Uninetz: Weiterleitung auf Preview-Seite, Download fails silently
			// wenn im Uninetz / VPN: Weiterleitung auf T&Cs Seite, z.B. https://www.jstor.org/tc/accept?origin=%2Fstable%2Fpdf%2F26536978.pdf&is_image=False

			let jstorDescription = `JSTOR-PDF verfügbar.
			Die ZRP ist auch über JSTOR im paginierten Format verfügbar. Der Download setzt Zugang über eine Institution und Zustimmung zu den Terms & Conditions voraus.
			Beim ersten Zugriff ist daher ein manueller Abruf und Zustimmung zu den T&Cs nötig.
			Dazu folgenden Link aufrufen: <a href="` + jstorPDFURL + "\">" + jstorPDFURL + `</a>`;

			item.notes.push({note: jstorDescription});
		} else {
			//item.notes.push({note: "Stabikat hat nicht funktioniert (kein match für selector a.title.getFull)"});
			devInfo += "Stabikat-Abfrage für JSTOR-Link hat nicht funktioniert - bei aktuellen Aufsätzen an moving wall denken!<br><br>";
		};
	};







	// PDF-URL selbst zusammenbasteln
	let pdfUrl = url;
	pdfUrl = pdfUrl
		.replace(/https:\/\/beck-online\.beck\.de\/(Dokument)?/, "https://beck-online.beck.de/Print/CurrentMagazine")	// Unterschied zu Kommentaren beachten: CurrentMagazin statt CurrentDoc
		.replace(/#.*$/, "")																							// remove fragment identifier (anything after # in the URL)
		.replace(/&anchor=.*$/, "")																						// remove anchor (anything after &anchor)
		.replace(/%2F/g, "%5C")																							// Schrägstrich durch Backslash ersetzen
		.replace(/%2e/g, ".")																							// Prozent-Encoding für einfache Punkte (.) entfernen
		+ "&printdialogmode=CurrentDoc&actionname=Index&gesamtversionpath=&timezone=Europe%2FBerlin&exportFormat=pdf&options=WithLinks";
	// item.notes.push({note: "##wip, current draft: " + pdfUrl});
	devInfo += "Download-Link:<br>" +  pdfUrl + "<br><br>";

	// Download PDF
	item.attachments.push({
		title: "PDF",
		mimeType: "application/pdf",
		url: pdfUrl,
	});





	// Datenbasis speichern
	item.libraryCatalog = datenbasis;

	// Report speichern
	item.notes.push({note: devInfo});

	// Item fertigstellen
	item.complete();
};












async function scrapeCase(doc, url) {

	// neues Item erstellen
	let item = new Zotero.Item("case");
	item.title = "##";

	// URL / Permalink
	item.url = text(doc, "#docUrl");


	// Gericht
	let beckTitel = text(doc, ".titel");
	// item.title = beckTitel;
	item.authority = beckTitel.split(':')[0];
	if (!item.authority) {
		item.authority = text(doc, ".gericht");
	}

	// Jurisdiction
	// https://github.com/juris-m/legal-resource-registry
	if (/^Eu/.test(item.authority)) {
		item.jurisdiction = "eu.int";
	} else if (item.authority == "EGMR") {
		item.jurisdiction = "coe.int"; 			// Council of Europe = Europarat
	} else {
		item.jurisdiction = "de";
	}

	// Entscheidungsart
	let entscheidungsart = text(doc, ".etyp");
	item.genre = entscheidungsart;			// ## todo: das funktioniert nicht
	item.extra = "Genre: " + entscheidungsart;

	// Datum
	item.date = text(doc, ".edat");
	if (!item.date) {
		item.date = text(doc, ".datum");
	}
	item.date = item.date.replaceAll('-', '.');		// manchmal Bindestriche statt Punkte

	// Akzenzeichen
	item.docketNumber = text(doc, ".az");

	// Zeitschrift, Band, Seite
	let zitation = text(doc, ".citation");
	// NJW 1992, 2691
	let regex1 = /([A-z]+) (\d+), (\d+)/;
	let matches = [];
	matches = zitation.match(regex1);
	if (matches) {
		item.reporter = matches[1];
		item.volume = matches[2];
		item.pages = matches[3];
	};
	
	// letzte Seite ergänzen
	let seiten = doc.querySelectorAll(".pg");
	if (seiten.length) {
		let letzteSeite = seiten[seiten.length - 1].textContent.trim();
		// item.notes.push({note: letzteSeite});
		if (item.pages || item.pages != letzteSeite) {
			item.pages += "-" + letzteSeite;
		}
	}


	// Verfahrensgang
	// Bsp.: https://beck-online.beck.de/Bcid/Y-300-Z-GRUR-B-2022-S-1217-N-1 (Metall auf Metall)

	let instanzenText = "<h2>Verfahrensgang</h2>";

	let xpathVorinstanzen = `//a[normalize-space()="Vorinstanzen"]
/parent::div
/parent::li
/following-sibling::li[1]
//li[contains(concat(" ", normalize-space(@class), " "), " instanzen ")]`;

	let vorinstanzen = ZU.xpath(doc, xpathVorinstanzen);
	if (vorinstanzen.length) {
		instanzenText += "<h3>Vorinstanzen</h3>";
		for (let i of vorinstanzen) {
			instanzenText += i.textContent + "<br>";
		}
	} else {
		// item.notes.push({note: "Vorinstanzen hat nicht funktioniert."});
	}


	let xpathNachinstanzen = `//a[normalize-space()="Nachinstanzen"]/
parent::div
/parent::li
/following-sibling::li[1]
//li[contains(concat(" ", normalize-space(@class), " "), " instanzen ")]`;

	let nachinstanzen = ZU.xpath(doc, xpathNachinstanzen);
	if (nachinstanzen.length) {
		item.history = "Nachgehende Entscheidung(en) vorhanden!";
		instanzenText += "<h3>Nachinstanzen</h3>";
		for (let n of nachinstanzen) {
			instanzenText += n.textContent + "<br>";
		}
	} else {
		// item.notes.push({note: "Nachinstanzen hat nicht funktioniert."});
	}

	if (instanzenText != "<h2>Verfahrensgang</h2>") {
		item.notes.push({note: instanzenText});
	}




	// Titel zusammenbauen
	item.title = item.authority + ", " + item.date + " - " + item.docketNumber;

	// PDF-Download
	let pdfUrl = url;
	pdfUrl = pdfUrl
		.replace(/https:\/\/beck-online\.beck\.de\/(Dokument)?/, "https://beck-online.beck.de/Print/CurrentMagazine")	// Unterschied zu Kommentaren beachten: CurrentMagazin statt CurrentDoc
		.replace(/#.*$/, "")																							// remove fragment identifier (anything after # in the URL)
		.replace(/&anchor=.*$/, "")																						// remove anchor (anything after &anchor)
		.replace(/%2F/g, "%5C")																							// Schrägstrich durch Backslash ersetzen
		.replace(/%2e/g, ".")																							// Prozent-Encoding für einfache Punkte (.) entfernen
		+ "&printdialogmode=CurrentDoc&actionname=Index&gesamtversionpath=&timezone=Europe%2FBerlin&exportFormat=pdf&options=WithLinks";
	// item.notes.push({note: "Download-Link:<br>" +  pdfUrl + "<br><br>"});
	item.attachments.push({
		title: "PDF",
		mimeType: "application/pdf",
		url: pdfUrl,
	});


	// Fertigstellen
	item.complete();
};























async function scrapeEntscheidungsbesprechung(doc, url) {
	/*
	unklar, ob man sich hier auf K10plus verlassen kann
	eigentlich müsste es viel unwahrscheinlicher sein 
	## -> testen!
	aber: LMK 2011, 314413 ist zB vorhanden (LMK hätte ich für mit am abwegigsten gehalten)
	insofern versuche ich das erstmal wie einen normalen Aufsatz zu behandeln lol
	*/
	Z.debug("## scrapeEntscheidungsbesprechung called");
	await scrapeJournal(doc, url);
	return true;
};





async function scrape(doc, url = doc.location.href) {
	// TODO: implement or add a scrape function template

}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
