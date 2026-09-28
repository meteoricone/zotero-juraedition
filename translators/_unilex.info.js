{
	"translatorID": "c0b35821-4de6-4417-8469-793f837b4f9b",
	"label": "_unilex.info",
	"creator": "Eric Mann",
	"target": "https:\\/\\/w*\\.?unilex\\.info\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-14 22:53:29"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/case/')) {
		return 'case';
	}
	return false;
}


async function doWeb(doc, url) {
	var item = new Zotero.Item("case");
	item.title = "ERROR";
	var extras = "";

	for (let i = 0; i < 50; i++) {
		let left_column = text(doc, ".dl-horizontal > dt", i);
		let right_column = text(doc, ".dl-horizontal > dd", i);

		// Case Name
		if (left_column == "Parties:") {
			item.title = right_column;
		}

		// Court
		else if (left_column == "Court:") {
			item.court = right_column;
		}

		// Date
		else if (left_column == "Date:") {
			item.date = formatDate(right_column);
		}

		// Docket Number
		else if (left_column == "Number:") {
			item.docketNumber = right_column;
		}

		// Jurisdiction
		else if (left_column == "Country:") {
			let jurisdiction = right_column;
			extras += "jurisdiction: " + jurisdiction + "\n";
		}
	};

	// URL
	item.url = url;

	// Attachments
	// ##todo: Man kann generell keine neuen/anderen HTML-Seiten abspeichern, deswegen funktioniert das nicht:
	/*item.attachments.push(
		{
			title: "HTML Snapshot",
			mimeType: "text/html",
			url: "https://www.unilex.info/cisg/case/121#abstract",   // Diese Unterseite zu öffnen und zu speichern klappt leider nicht.
			snapshot: true,
		}
	) */

	// Finalize item
	item.extra = extras;
	item.complete();
}


function formatDate(d) {
	d = d.replace("-01-", " Jan ");
	d = d.replace("-02-", " Feb ");
	d = d.replace("-03-", " Mar ");
	d = d.replace("-04-", " Apr ");
	d = d.replace("-05-", " May ");
	d = d.replace("-06-", " Jun ");
	d = d.replace("-07-", " Jul ");
	d = d.replace("-08-", " Aug ");
	d = d.replace("-09-", " Sep ");
	d = d.replace("-10-", " Oct ");
	d = d.replace("-11-", " Nov ");
	d = d.replace("-12-", " Dec ");
	return d;
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
