{
	"translatorID": "445d522c-5cdf-4ab9-98bf-080274eda2ea",
	"label": "_Juris v2",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/www\\.juris\\.de\\/r3\\/document",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-21 07:29:42"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/



// global scope
const doktypen = {
	"Urteil": 							"case",
	"Urt.":					 			"case",
	"Beschluss": 						"case",
	"Beschl.":							"case",
	"Entscheidung":						"case",
	"Anhängiges Verfahren":				"case",
	"Erledigtes anhängiges Verfahren":	"case",
	"EuGH-Vorlage":						"case",
	"Nichtannahmebeschluss":			"case",
	"Äußerung":							"case",				// z.B. https://www.juris.de/perma?d=NJRE001638826

	"Aufsatz":							"journalArticle",

	// noch nicht weiter angeschaut:
	"Monographie":						"book",
	"Dissertation, Monographie":		"book",
	"Sammelwerk":						"book",				// Juris weist nicht die einzelnen Kapitel, sondern das Gesamtwerk nach
	"Kongressbericht":					"conferencePaper",
	"Textausgabe, Kongressbericht":		"conferencePaper",
	"Kongressvortrag":					"conferencePaper",
	"Kongressvortrag, Aufsatz":			"conferencePaper",
	"Gesetz":							"statute",			// danach kann man allerdings nicht per "Typ:Gesetz" suchen xD
};


function detectWeb(doc, url) {



	const metadata = {};
	const labelCells = doc.querySelectorAll('[class~="TD30"]');


	if (!labelCells) {
		Z.monitorDOMChanges(doc.body, { childList: true, subtree: true });				// content-loading is deferred
		return false;
	}


	for (const labelCell of labelCells) {
		const valueCell = labelCell.nextElementSibling;
		if (!valueCell) continue;

		const key = labelCell.textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
		const value = valueCell.textContent.trim();
		metadata[key] = value;
	}

	if (doktypen[metadata["Dokumenttyp"]] == "case") {
		return "case";
	} else if (doktypen[metadata["Dokumenttyp"]] == "journalArticle") {
		return "journalArticle";
	}

	
	// Idee vom "offiziellen" Juris Translator
	if (metadata["Werk"] && metadata["Zitiervorschlag"]) {
		return 'encyclopediaArticle';
	}
	

	return false;
}



async function doWeb(doc, url) {

	// ggf kürzen, indem detectWeb gecallt wird xD

	const metadata = {};
	const labelCells = doc.querySelectorAll('[class~="TD30"]');

	for (const labelCell of labelCells) {
		const valueCell = labelCell.nextElementSibling;
		if (!valueCell) continue;
		const key = labelCell.textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
		const value = valueCell.textContent.trim();
		metadata[key] = value;
	}

	if (doktypen[metadata["Dokumenttyp"]] == "case") {
		await scrapeCase(doc, url);
	} else if (doktypen[metadata["Dokumenttyp"]] == "journalArticle") {
		await scrapeJournal(doc, url);
	}


	// Idee vom "offiziellen" Juris Translator
	if (metadata.Werk && metadata.Zitiervorschlag) {
		await scrapeCommentary(doc, url);
	}



	return false;
}

async function scrapeCase(doc, url) {
	let item = new Zotero.Item('case');
	item.title = "##";

	// Permalink
	item.url = text(doc, ".break-uri");

	// Metadaten aus Tabelle lesen
	const metadata = {};
	const labelCells = doc.querySelectorAll('[class~="TD30"]');
	for (const labelCell of labelCells) {
		const valueCell = labelCell.nextElementSibling;
		if (!valueCell) continue;
		const key = labelCell.textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
		const value = valueCell.textContent.trim();
		metadata[key] = value;
	}

	// Gericht
	item.authority = metadata["Gericht"];
	// ##todo: cleanup

	// Jurisdiction raten xD
	// https://github.com/juris-m/legal-resource-registry
	if (/^Eu/.test(item.authority)) {
		item.jurisdiction = "eu.int";
	} else if (item.authority == "EGMR") {
		item.jurisdiction = "coe.int"; 			// Council of Europe = Europarat
	} else {
		item.jurisdiction = "de";
	}

	// Datum
	item.date = metadata["Entscheidungsdatum"];

	// Az
	item.docketNumber = metadata["Aktenzeichen"];

	// Titel zusammenbasteln
	item.title = item.authority + ", " + item.date + " – " + item.docketNumber;

	// Entscheidungsart
	item.genre = metadata["Dokumenttyp"];
	// ##todo: cleanup

	// Fundstellen abspeichern
	// zB mit Zotero Actions & Tags müsste es dann auch möglich sein, später noch aus Notizen diese gezielt
	// (insb. nach Prio) automatisch in die entsprechenden Metadaten-Felder zu füllen
	let fundstellenZeilen = ZU.xpathText(doc, "//div[contains(@class, 'docLayoutMinMax')][h3='Fundstellen']/following-sibling::div[1]//text()");

	if (fundstellenZeilen) {
		// item.notes.push({note: fundstellenZeilen});
		fundstellenZeilen = fundstellenZeilen.split(",  "); // Komma, Leerzeichen, geschütztes Leerzeichen

		let fundstellenNote = "<h3>Fundstellen</h3>";
		for (let i = 0; i < fundstellenZeilen.length; i++) {
			fundstellenNote = fundstellenNote + fundstellenZeilen[i].replace(/^\u00A0/, "").replace(/^, ?/, "") + "<br>";
		};
		item.notes.push({note: fundstellenNote});

		for (let i = 0; i < fundstellenZeilen.length; i++) {

			// Prio: AP im Arbeitsrecht -> Feld Archiv
			if (fundstellenZeilen[i].startsWith("AP ")) {
				let fundAP = fundstellenZeilen[i];
				let regexAP = /([^(]+)\(*/;
				let matches = fundAP.match(regexAP);
				if (matches) {
					item.archive = matches[1];
				};
			};

			// Prio: NZA im Arbeitsrecht -> Feld Reporter etc.
			if (fundstellenZeilen[i].startsWith("NZA ")) {
				let fundNZA = fundstellenZeilen[i];
				let regexNZA = /(\d\d\d\d), *([0-9-]+)/;
				let matches = fundNZA.match(regexNZA);
				if (matches) {
					item.reporter = "NZA";
					item.reporterVolume = matches[1];
					item.firstPage = matches[2];
				};
			};
		};
	};

	// Verfahrensgang
	// Bsp: https://www.juris.de/perma?d=NJRE001511660 (Metall auf Metall, 09.07.2026 hat noch "anhängig BGH...")
	let history = "<h3>Verfahrensgang</h3>";
	let entscheidungen = ZU.xpath(doc, "//h3[normalize-space(.)='Verfahrensgang']/parent::div/following-sibling::div[1]/a");
	for (let entscheidung of entscheidungen) {
		let text = entscheidung.textContent;
		text = text.trim();
		if (!text) continue;
		// if (history) history += "<br>";
		history += text + "<br>";
	}
	if (history.includes("nachgehend") || history.includes("anhängig")) {
		item.history = "Nachgehende Entscheidung(en) vorhanden!";
	}
	item.notes.push({note: history});


	// PDF-Download
	let pdfURL = ZU.xpathText(doc, '//a[contains(@class, "button--pdf")]/@href');
	pdfURL = "https://www.juris.de" + pdfURL;
	item.attachments.push({
		title: "Juris PDF",
		mimeType: "application/pdf",
		url: pdfURL
	});




	// Item abspeichern
	item.complete();
}



async function scrapeJournal(doc, url) {
	let item = new Zotero.Item('journalArticle');

	// Permalink
	item.url = text(doc, ".break-uri");

	// Titel
	item.title = ZU.xpathText(doc, "//div[@class='docLayoutTitel']/h3").trim();
	if (item.title == "") {
		item.title = ZU.xpathText(doc, "//div[@class='docLayoutTitel']/h4");				// Bsp.: AG 2026, 655-662 - h3 ist nur Leerzeile, daher ist auch das if-Statement nötig, weil h3 irgendwas returned
	}
	if (!item.title) {
		item.title = "##";
	}


	// der "offizielle" Juris Translator hat da noch andere Varianten?

	// Name der Zeitschrift
	// Idee vom "offiziellen" Juris Translator übernommen
	item.publicationTitle = ZU.xpathText(doc, '(//table//img[contains(@alt,"Abkürzung Fundstelle")]/@title)[1]');


	// Metadaten aus Tabelle lesen
	const metadata = {};
	const labelCells = doc.querySelectorAll('[class~="TD30"]');
	for (const labelCell of labelCells) {
		const valueCell = labelCell.nextElementSibling;
		if (!valueCell) continue;
		const key = labelCell.textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
		const value = valueCell.textContent.trim();
		metadata[key] = value;
	}


	// Fundstelle auswerten
	// ArbRB 2026, 54-57
	let fundstellenRegex = /(.+) (\d{4}), (\d+-\d+)/;
	let fundstellenMatch = metadata["Fundstelle"].match(fundstellenRegex);
	if (fundstellenMatch) {
		item.journalAbbreviation = fundstellenMatch[1];
		item.date = fundstellenMatch[2];
		item.pages = fundstellenMatch[3];
	}


	// Autoren
	let autoren = metadata["Autor"].split(", ");
	if (autoren) {
		for (let autor of autoren) {
			item.creators.push(ZU.cleanAuthor(autor, 'author', false));
		}
	}






	// PDF-Download
	let pdfURL = ZU.xpathText(doc, '//a[contains(@class, "button--pdf")]/@href');
	pdfURL = "https://www.juris.de" + pdfURL;
	item.attachments.push({
		title: "Juris PDF",
		mimeType: "application/pdf",
		url: pdfURL
	});




	// Item abspeichern
	item.complete();
}





async function scrapeCommentary(doc, url) {
	let item = new Zotero.Item('encyclopediaArticle');
	item.title = "##";


	// Metadaten aus Tabelle lesen
	const metadata = {};
	const labelCells = doc.querySelectorAll('[class~="TD30"]');
	for (const labelCell of labelCells) {
		const valueCell = labelCell.nextElementSibling;
		if (!valueCell) continue;
		const key = labelCell.textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
		const value = valueCell.textContent.trim();
		metadata[key] = value;
	}




	/*
	- Zitiervorschlag: Ulber in: Erman BGB, Kommentar, 17. Auflage 2023, § 275 BGB
	- Websitetitel:    juris - § 275 Ausschluss der Leistungspflicht | Kommentierung | § 275 Ausschluss der Leistungspflicht; VII. Befreiung wegen groben Missverhältnisses von ... | Ulber | Erman BGB, Kommentar

	- Zitiervorschlag: Staudinger/​Caspers (2025) Vorbemerkungen zu §§ 275–278
	- Websitetitel:    juris - Vorbemerkungen zu §§ 275–278 | Kommentierung | Vorbemerkungen zu §§ 275–278; Inhalt | Caspers | Staudinger, BGB
	- URL: 				https://www.juris.de/r3/document/samson-sdg288STAUD2025BGBV027502

	- Zitiervorschlag:	Staudinger/​Caspers (2025) BGB § 275
	- Websitetitel:		"""juris - § 275 \n Ausschluss der Leistungspflicht | Norm | Norm: § 275 \n Ausschluss der Leistungspflicht | Caspers | Staudinger, BGB"""
	- URL: 				https://www.juris.de/r3/document/samson-sdg288STAUD2025BGBK027501

	- Zitiervorschlag: 	Stögmüller in: Schuster/Grützmacher, IT-Recht Kommentar, 2. Auflage, 10/2025, § 275 BGB
	- Websitetitel:		juris - § 275 Ausschluss der Leistungspflicht | Kommentierung | § 275 Ausschluss der Leistungspflicht | Stögmüller | Schuster/Grützmacher, IT-Recht Kommentar
	- URL				https://www.juris.de/r3/document/sps-OVS-K-ITRECHT-D0155

	- Zitiervorschlag:	Seichter in: Herberger/Martinek/Rüßmann/Weth/Würdinger, jurisPK-BGB, 11. Aufl., § 275 BGB (Stand: 01.03.2026)
	- Websitetitel:		juris - § 275 BGB | Kommentierung | § 275 BGB Ausschluss der Leistungspflicht | Seichter | jurisPK-BGB Band 2 (11. Aufl 2026)
	- URL:				https://www.juris.de/r3/document/jpk-BGBPK2KSR0038

	*/






	let websiteTitle = ZU.xpathText(doc, '//head/title[1]');		// ##todo: wird das noch verwendet?

	let zitiervorschlag = metadata.Zitiervorschlag;
	zitiervorschlag = zitiervorschlag.split(/[(),]/);
	zitiervorschlag.forEach((z, index) => {
		if (z.includes("§")) {								// ## todo: wäre neben Paragraphen noch um "Art." oÄ zu ergänzen
			item.pages = z;
		}
	});
	// ## todo: bei allen Kommentaren außer Staudinger ist es falsch herum, also "§ 275 BGB" statt "BGB § 275"




	
	
	let kurztitel = metadata.Werk;
	if (kurztitel) {
		let regex = /[^,\s]+/;						// sollte führen zu: Erman, Staudinger, jurisPK-BGB, Schuster/​Grützmacher
		let matches = kurztitel.match(regex);
		if (matches) {
			item.shortTitle = matches[0];
		}
	}
	

	// ## jedenfalls beim Staudinger gibt es das nicht (mehr?)
	var isbn = metadata.Bestellnummer;
	if (isbn) {
		item.ISBN = isbn.replace('ISBN', '').trim();
	}




	// aber der genaue  Band?
	// .toc__entryTitle


	let suchtitel = text(doc, ".toc__entryTitle");
	item.notes.push({note: suchtitel});
	item.encyclopediaTitle = suchtitel;





	let translator = Zotero.loadTranslator("search");
	translator.setTranslator("f49689b1-9438-406b-a82c-60745dd8755b"); // _K10plus+DNB
	translator.setSearch(item);
	translator.setHandler("itemDone", function (translate, newItem) {
		// item.url = "https://www.google.com";


		// ##todo: dafür einen Auto-Loop coden?
		newItem.shortTitle = item.shortTitle;
		newItem.pages = item.pages;




		// Titel zusammensetzen wie bei _beck-online
		newItem.title = `${newItem.shortTitle} | ${newItem.pages} (${newItem.originalTitle})`;

		// CSL-M container tracking via ISBN
		newItem.encyclopediaTitle = newItem.ISBN;









		// Bearbeiter ermitteln
		let bearbeiter = metadata.Autor;

		if (bearbeiter) {
			let bearbeiters = bearbeiter.split("/");
			let bearbeiterCollection = [];
			for (let i = 0; i < bearbeiters.length; i++) {
				let b = bearbeiters[i];
				let isCommaSeperated = false;
				Object.values(newItem.creators).forEach(creator => {
					// "P. Kirchstein" includes "Kirchstein", aber nicht andersrum -> deswegen ist das if .includes() so rum geschrieben :)
					if (b.includes(creator.lastName)) {
						// folgende Zeile funktioniert nicht, weil z.B. Hrsg. damit überschrieben wird (Bsp: Ingrid Schmidt (Hrsg) kommentiert im Erfurter auch Art. 1 GG)
						// creator["creatorType"] = "author";

						// stattdessen schreiben wir bei einem Match noch den Erstnamen dazu und speichern die Rolle dann nochmal separat
						b = creator.lastName + ", " + creator.firstName;
						isCommaSeperated = true;

						// ##todo:
						// Funktionsweise bisher ist gefährlich, wenn mehrere gleiche Nachnamen mit einem Werk verbunden sind
						// (kommentiert zB nicht Ansgar Staudinger in Julius v. Staudingers Kommentar?)
						// -> ##todo: bei einem etwaigen 2. Match den Vornamen doch wieder entfernen bzw wieder zum ursprünglichen aus beck-online
						// übernommenen Wert zurückkehren
						



					};
				});
				bearbeiterCollection.push(ZU.cleanAuthor(b, "author", isCommaSeperated));	
				// das müsste jetzt erledigt sein:
				//##todo: hier bug eingebaut für Fälle in denen "P. Kirchhof" oder "Stephan Lorenz" noch nicht mit vorhandenen Personen gematched wurden, da in diesen Fällen keine Trennung per Komma lol
				// ich erinnere mich leider gerade nicht mehr daran, welche Kommentare das betraf
			};
			// Bearbeiter sollen in der Namensliste ganz oben stehen;
			// davon abgesehen muss die Reihenfolge natürlich beibehalten werden
			newItem.creators = [...bearbeiterCollection, ...newItem.creators];
		};


		// Bloße "contributor" löschen (unnötiger clutter)
		// ## deaktivieren, sobald meine "Sammel-Idee" getestet wird ...
		// ##todo : Überlegen, wie Ferrari gehandelt wird und ob man da nicht die Autoren als Contributor behält...
		// ##todo: Überlegen, was mit Kommentaren wie Koch, AktG oder Stern/Sachs ist, wo die Autoren alles allein/gemeinsam verantworten
		newItem.creators = newItem.creators.filter(c => c["creatorType"] !== "contributor");







		// ################# todo!!
		var editorString = metadata.Herausgeber || metadata.Gesamtherausgeber;
		if (editorString) {
			var editors = ZU.trimInternal(editorString).split("/");
			for (let i = 0; i < editors.length; i++) {
				newItem.creators.push(ZU.cleanAuthor(editors[i], 'editor', false));
			}
		}








		// PDF-Download
		// ACHTUNG: nach endless scroll steht kein PDF-Link mehr zur Verfügung!
		let pdfURL = ZU.xpathText(doc, '//a[contains(@class, "button--pdf")]/@href');
		pdfURL = "https://www.juris.de" + pdfURL;
		// nach endless scroll kommt nur noch "/r3" raus

		if (pdfURL && pdfURL !== "/r3") {
			newItem.attachments.push({
				title: "Juris PDF",
				mimeType: "application/pdf",
				url: pdfURL
			});
		}
		if (pdfURL == "/r3") {
			// das ist nach Kommentaren mit endless scroll
			newItem.attachments.push({
				title: "Kein PDF Link bei Kommentaren nach 'endless scroll'.",
				mimeType: "application/pdf",
				url: ""										// leere URL sorgt für sofortige Fehlermeldung
			});
		}



		// Permalink
		// bei Kommentaren fehlt (wegen endless scroll?) der übliche Link
		// URL-Zeile:   https://www.juris.de/r3/document/ samson-sdg292STAUD2025BGBV06110509
		// Mailversand: https://www.juris.de/perma?d= samson-sdg292STAUD2025BGBV06110507
		let perma = url.replace("https://www.juris.de/r3/document/", "https://www.juris.de/perma?d=");
		newItem.url = perma;






		newItem.complete();
	});
	// Z.debug("##################### will now call .translate()");
	translator.translate();











}








// :D

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
