{
	"translatorID": "e348ddef-4f94-452d-a3c5-af0553062d52",
	"label": "_wolterskluwer-online",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/research\\.wolterskluwer-online\\.de\\/document",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-23 15:11:40"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {

	/*
	let literaturtyp = ZU.xpathText(doc, "(//span[@slot='breadcrumbItemLink'])[2]");
	if (literaturtyp == "Rechtsprechung") {
		return "case";
	}
	return false;
	*/

	let literaturtyp = ZU.xpathText(doc, "(//span[@slot='breadcrumbItemLink'])[2]");	// this only loads if the page is wide enough
	if (!literaturtyp) {
		let publicationTitle = text(doc, ".publication-title");
		if (publicationTitle.includes("BGHZ")) {										// backup for the BGHZ
			literaturtyp = "Rechtsprechung";
		} else if (publicationTitle.includes("Kommentar")) {							// backup e.g. for Prütting u.a., BGB - Kommentar
			literaturtyp = "Kommentare";
		}
	}

	if (!literaturtyp) {
		Z.monitorDOMChanges(doc.body, { childList: true, subtree: true });				// content-loading is deferred
		return false;
	}

	literaturtyp = literaturtyp.trim();													// wahrscheinlich gar nicht nötig
	if (literaturtyp == "Rechtsprechung") {
		return "case";
	} else if (literaturtyp == "Kommentare") {
		return "encyclopediaArticle";
	}

	return false;
}


async function doWeb(doc, url) {
	let typ = detectWeb(doc, url);
	if (typ == "case") {
		return await doCase(doc, url);
	} else if (typ == "encyclopediaArticle") {
		return await doCommentary(doc, url);
	}
	return false;
}





async function doCommentary(doc, url) {

	let item = new Zotero.Item("encyclopediaArticle");
	item.title = "##";

	let titel = text(doc, ".document-title");
	if (titel) {
		item.title = titel;
	}

	item.url = url;








	// ## wip

	const metadata = {};
	const labelCells = doc.querySelectorAll('.bibliography-item-label');
	const valueCells = doc.querySelectorAll('.bibliography-item-value');

	// P: wenn Bibliographie ausgeklappt ist, ist das erste "Label" die Überschrift ("Bibliographie")
	// wenn aber nicht, dann nicht ...

	if (labelCells[0].textContent.trim().replace(/:$/, "") == "Bibliographie") {
		for (let i = 1; i < labelCells.length; i++) {								// bei 1 statt 0 starten
			const label = labelCells[i].textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
			const value = valueCells[i-1].textContent.trim();						// dann immer um 1 verschoben
			metadata[label] = value;
		}
	} else {
		for (let i = 0; i < labelCells.length; i++) {								// sonst wie erwartet bei 0 starten
			const label = labelCells[i].textContent.trim().replace(/:$/, "");		// Doppelpunkt am Ende entfernen
			const value = valueCells[i].textContent.trim();							// dann nicht verschoben
			metadata[label] = value;
		}
	}



	let devInfo = "";
	for (const key in metadata) {
		devInfo += (`${key}: ${metadata[key]}<br><br>`);
	}
	// item.notes.push({note: devInfo});

	// ## wip - bisher nur Prütting

	// Kommentartitel
	item.originalTitle = metadata["Titel"];

	// Herausgeber
	let herausgebers = metadata["Herausgeber"].split("; ");
	if (herausgebers) {
		for (let herausgeber of herausgebers) {
			item.creators.push(ZU.cleanAuthor(herausgeber, 'editor', false));
		}
	}

	// Auflage
	let auflRegex = /(\d+)\. Auflage (\d+)/;
	let auflMatch = metadata["Auflage"].match(auflRegex);
	if (auflMatch) {
		item.edition = auflMatch[1];
		item.date = auflMatch[2];
	}

	// Abschnitt/Norm
	// ## todo: Art. auch tauschen
	let abschnitt = metadata["Vorschrift"];
	abschnitt = abschnitt.replace("§ ", "§ ");									// Geschütztes Leerzeichen
	abschnitt = abschnitt.replace("Art. ", "Art. ");							// Geschütztes Leerzeichen
	abschnitt = abschnitt.trimEnd();
	let tauschRegex = /(^§\xa0\S+) (.+)/;
	let tauschMatch = abschnitt.match(tauschRegex);
	if (tauschMatch) {
		// item.notes.push({note: ":)"});
		abschnitt = tauschMatch[2] + " " + tauschMatch[1];
	} else {
		// item.notes.push({note: ":/"});
	}
	item.pages = abschnitt;

	// Bearbeiter 
	// ## todo: ist das wirklich der Bearbeiter oder ein bait?
	let autoren = metadata["Autor"].split("; ");
	if (autoren) {
		for (let autor of autoren) {
			item.creators.push(ZU.cleanAuthor(autor, 'author', false));
		}
	}

	// Verlag
	item.publisher = metadata["Verlag"];





	// ## wip 
	// P: Das ist leider nirgendwo auf der Seite vermerkt ... 
	if (metadata["Herausgeber"] == "Prütting; Wegen; Weinreich") {
		item.shortTitle = "PWW";
	}






	// Anzeige- & Suchtitel (!) in Zotero zusammenbasteln
	item.title = item.shortTitle + " | " + abschnitt + " (" + item.originalTitle + ")";


	// CSL-M Tracking zusammenbauen
	item.encyclopediaTitle = item.shortTitle + " - " + item.date;



	// PDF-Download läuft nicht einfach über Link (über POST statt über GET)
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});

	item.complete();

	return true;

}






async function doCase(doc, url) {


	let item = new Zotero.Item("case");
	item.title = "##";

	let titel = text(doc, ".document-title");
	if (titel) {
		item.title = titel;
	}



	// ## todo: Metadatensammlung wie bei Kommentaren / wie bei Juris bauen

	//funktioniert nur bei der BGHZ ...
	let gericht = ZU.xpathText(doc, "//p[contains(@class, 'bibliography-item-label') and normalize-space()='Gericht:']/following-sibling::div[1]");
	if (gericht) {
		item.authority = gericht;
		// ## auch jurisdiction
		if (gericht.includes("BGH")) {
			item.jurisdiction = "de";
		} else {
			item.jurisdiction = "##";
		}
	}
	let datum = ZU.xpathText(doc, "//p[contains(@class, 'bibliography-item-label') and normalize-space()='Datum:']/following-sibling::div[1]");
	if (datum) {
		item.date = datum;
	}
	let az = ZU.xpathText(doc, "//p[contains(@class, 'bibliography-item-label') and normalize-space()='Aktenzeichen:']/following-sibling::div[1]");
	if (az) {
		item.docketNumber = az;
	}
	let entscheidungsform = ZU.xpathText(doc, "//p[contains(@class, 'bibliography-item-label') and normalize-space()='Entscheidungsform:']/following-sibling::div[1]");
	if (entscheidungsform) {
		item.extra = "Genre: " + entscheidungsform;
	}
	let werktitel = ZU.xpathText(doc, "//p[contains(@class, 'bibliography-item-label') and normalize-space()='Werktitel:']/following-sibling::div[1]");
	if (werktitel) {
		item.reporter = werktitel;
	}





	// BGH erkennen und Metadaten übernehmen
	// titel basiert auf text(doc, ".document-title");
	// genau zwischen den Ziffern sind tlw Zeilenumbrüche von wolterskluwer eingefügt
	// daher das besondere regex und das spätere Cleanup
	let regexBGHZ = /Entscheidungen des Bundesgerichtshofes in Zivilsachen (\d*).*\(S\D*(\d*\D*\d*)/s;
	let matches = titel.match(regexBGHZ);
	if (matches) {
		item.reporter = "BGHZ";
		item.volume = matches[1];
		item.pages = matches[2].replace(/\s+/g, "");	// remove whitespace
	};




	let titelNeu = item.authority + ", " + item.date + " - " + item.docketNumber;
	item.title = titelNeu;




	item.url = url;


	// PDF-Download läuft nicht einfach über Link (über POST statt über GET)
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});

	item.complete();

	return true;

}





// :)

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
