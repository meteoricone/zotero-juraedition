{
	"translatorID": "67b7ca2f-49e7-4761-bee5-1412b407ebe7",
	"label": "_DFR",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/www\\.servat\\.unibe\\.ch\\/dfr\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-15 07:27:56"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {

	return "case";
}


async function doWeb(doc, url) {
	let item = new Zotero.Item("case");
	item.title = "##";
	item.url = url;

	// Titelzeile
	let title = text(doc, "b");		// erster Fettdruck xD
	item.title = title;

	// Download HTML
	// das funktioniert nicht, weil man keine andere HTML Seite - sondern nur die aktuell im Tab geöffnete - als HTML Snapshot speichern kann
	/*
	let downloadURL = "";
	let downloadRegex = /dfr\/(.+)\.html/;
	let downloadMatch = url.match(downloadRegex);
	if (downloadMatch) {
		let dfrID = downloadMatch[1];
		downloadURL = "https://www.servat.unibe.ch/tools/DfrInfo?Command=ShowPrintVersion&Name=" + dfrID;
	}
	*/



	// Fundstelle
	let fundstelle =  [];
	let reporter = "";
	let shortTitle = "";
	let bhgstRegex = /(BGHSt \d+. \d+) - (.+)/;
	fundstelle = title.match(bhgstRegex);
	if (fundstelle) {
		reporter = fundstelle[1];
		shortTitle = fundstelle [2];
	}




	// ## wip
	let search = Zotero.loadTranslator("search");
	search.setTranslator("65cf08cc-3a48-4ed9-8e92-ef9f510d4367");	// _dejure.org Metadata
	search.setSearch({ itemType: "case", reporter: reporter});							// üblich ist wohl Skelett-Objekt statt Zotero.Item-Objekt
	search.setHandler("itemDone", (obj, dejureItem) => {
		dejureItem.url = url;          // eigene Felder überschreiben
		

		if (!dejureItem.shortTitle) {
			dejureItem.shortTitle = shortTitle;
		}

		
		dejureItem.attachments.push({
			title: "Snapshot",
			document: doc,
			snapshot: true,
			mimeType: "text/html"
		});


		dejureItem.attachments.push({
			title: "DFR bietet kein PDF an!",
			mimeType: "application/pdf",
			url: ""
		});
		



		dejureItem.complete();
	});
	await search.translate();



	// item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.servat.unibe.ch/dfr/bs037106.html",
		"items": [
			{
				"itemType": "case",
				"caseName": "##",
				"creators": [],
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
