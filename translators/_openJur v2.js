{
	"translatorID": "5bc97c9d-04fb-4d0b-8c40-8ff1c6dada37",
	"label": "_openJur v2",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/openjur\\.de\\/u\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-17 07:35:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	return 'case';
}


async function doWeb(doc, url) {
	let item = new Zotero.Item("case");
	item.title = "##";

	// openJur provides metadata as json
	let id = url.match(/\/u\/(.+)\.html/)[1];
	let data = await requestJSON(`https://openjur.de/u/${id}.bib`);
	item.docketNumber = data.reference;
	item.authority = data.court;
	item.originalPublisher = data.court_altname;
	item.date = data.date;
	item.url = data.url;

	// Entscheidungsart
	let genre = data.doctype;
	if (genre == "Urteil") {genre = "Urt."};
	if (genre == "Beschluss") {genre = "Beschl."};
	item.extra = `Genre: ${genre}`;

	// Jurisdiction (CSL-M support)
	// https://github.com/Juris-M/legal-resource-registry/tree/master/src

	// international: 
	// arb.cls [absoluter Sonderfall, da überhaupt keine Jurisdiction existiert]
	// au.int -> African Union (African Court on human and People's Rights)
	// coe.int -> Council of Europe (Commission on / Court of Human Rights)
	// comesa.int -> Common Market for Eastern and Southern Africa (Court of Justice)
	// ec.int -> European Community (legal resource registry does not list courts)
	// eea.int -> European Economic Area (Court of Justice of the European Free Trade Agreement)
	// eec.int -> European Economic Community (legal resource registry does not list courts)
	// eu.int -> European Union (...)
	// icc.int -> International Criminal Court
	// imf.int -> International Monetary Fund
	// ln.int -> League of Nations
	// oas.int -> Organization of American States
	// sai.int -> Comunidad Andina (Court of Justice of the Andean Community)
	// sica.int -> sistema de la Integración Centroamericana (Corte Centroamericana de Justicia)
	// un.int -> United Nations (...)
	// wbg.int -> Word Bank Group
	// wto.int -> Word Trade Organization

	// entspricht Logik in meinem beck-online Translator
	if (/^Eu/.test(item.authority)) {
		item.jurisdiction = "eu.int";				// erfasst EuGH und EuG
	} else if (item.authority == "EGMR") {
		item.jurisdiction = "coe.int";
	} else {
		item.jurisdiction = "de";
	}

	// Schlagwort - machmal gibt es auch Titel: https://openjur.de/u/2544622.html
	let kurztitel = ZU.xpathText(doc, "//div[div[1][text()='Titel']]/div[2]");
	if (kurztitel) {
		item.shortTitle = kurztitel;
	};

	// Verfahrensgang
	// ##todo: Abfrage über dejure Vernetzungsdienst?

	// Titel nach dem üblichen Schema zusammenbasteln
	item.title = item.authority + ", " + item.date + " – " + item.docketNumber;

	// PDF
	item.attachments.push({
		title: 'openJur PDF',
		mimeType: "application/pdf",	// ohne diese Angabe scheinbar kein PDF-Symbol beim Speichern
		url: `/u/${id}.ppdf`

	});

	item.complete();
}











// :)

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
