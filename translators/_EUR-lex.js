{
	"translatorID": "abc4ce80-e6b7-4597-9791-c86421efd0de",
	"label": "_EUR-lex",
	"creator": "Eric Mann",
	"target": "^https:\\/\\/eur-lex\\.europa\\.eu\\/legal-content\\/.{2}\\/TXT\\/\\?uri=CELEX",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-24 22:31:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	const docString = new XMLSerializer().serializeToString(doc.documentElement);
	if (docString.includes("ECLI:EU:")) return "case";
	return false;
}


async function doWeb(doc, url) {

	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("bf053edc-a8c3-458c-93db-6d04ead2e636");		// "official" EUR-lex
	translator.setDocument(doc);
	translator.setHandler("itemDone", function(obj, item) {

		// URL cleanen
		item.url = item.url.replace(/&qid=\d+$/, "");

		// Az. cleanen
		item.docketNumber = item.docketNumber.replace("Rechtssache ", "");

		// ECLI
		let ecliRegex = /ECLI:EU:.:\d{4}:[0-9]+/;
		const docString = new XMLSerializer().serializeToString(doc.documentElement);
		let ecliMatch = docString.match(ecliRegex);
		if (ecliMatch) {
			item.DOI = ecliMatch[0];
		}

		// Entscheidungsart
		let titel = text(doc, "#title");
		// item.notes.push({note: titel});
		let genreRegex = /^(Urteil) des (Gerichtshofes) vom /;
		let genreMatches = titel.match(genreRegex);
		if (genreMatches) {
			// item.genre = genreMatches[1];						// das funktioniert nicht
			item.extra = "Genre: " + genreMatches[1];
		}

		// Offizielle Sammlung
		let panel = text(doc, "#PP1Contents");
		// item.notes.push({note: panel});
		let sammlungRegex = /(Sammlung der Rechtsprechung) (\d{4}) (\S+)/;
		let sammlungMatch = panel.match(sammlungRegex);
		if (sammlungMatch) {
			item.reporter = sammlungMatch[1];
			item.volume = sammlungMatch[2];
			item.pages = sammlungMatch[3];
		}


		// HTML-Snapshot loswerden, aber PDF behalten
		var behalten = [];
		for (var i = 0; i < item.attachments.length; i++) {
			var anhang = item.attachments[i];
			if (anhang.mimeType != "text/html") {
				behalten.push(anhang);
			}
		}
		item.attachments = behalten;

		// Unnötige Stichworte aus der Zusammenfassung löschen
		item.abstractNote = "";


		// Jurisdiction

		// ## todo: 
		// ec.int -> European Community (legal resource registry does not list courts)
		// eea.int -> European Economic Area (Court of Justice of the European Free Trade Agreement)
		// eec.int -> European Economic Community (legal resource registry does not list courts)
		// eu.int -> European Union (...)

		item.jurisdiction = "eu.int";

		// ## Parteien speichern
		item.originalTitle = item.caseName;

		// Titel in das übliche Schema bringen
		// statt dem üblichen item.authority muss item.court verwendet werden, weil das bei Setzung (hier durch den gecallten Translator) wohl vorrangig ist
		// und statt dem üblichen item.date muss item.dateDecided genommen werden
		let datum = item.dateDecided
			.replace(" January ", ".01.")
			.replace(" February ", ".02.")
			.replace(" March ", ".03.")
			.replace(" April ", ".04.")
			.replace(" May ", ".05.")
			.replace(" June ", ".06.")
			.replace(" July ", ".07.")
			.replace(" August ", ".08.")
			.replace(" September ", ".09.")
			.replace(" October ", ".10.")
			.replace(" November ", ".11.")
			.replace(" December ", ".12.");
		item.caseName = item.court + ", " + datum + " – " + item.docketNumber;

		item.complete();
	});
	translator.translate();

}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
