{
	"translatorID": "61119bc7-5c75-4fec-85e2-616396061bf5",
	"label": "_Bundestagsdrucksachen",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/dserver\\.bundestag\\.de",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-08 11:01:59"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	// TODO: adjust the logic here
	return "bill";
}


async function doWeb(doc, url) {

	if (url.includes("/btd/")) {
		let item = new Zotero.Item("bill");
		// https://dserver.bundestag.de/btd/14/060/1406040.pdf
		// https://dserver.bundestag.de/btd/14/068/1406857.pdf
		// https://dserver.bundestag.de/btd/16/017/1601780.pdf
		// https://dserver.bundestag.de/btd/07/009/0700910.pdf

		let regex = /\/(\d+)\.pdf/;
		let matches = url.match(regex);
		let nummer = matches[1];
		item.title = "BT-Drs. " + nummer
			.replace(/^(.{2})/, '$1/')			// insert slash
			.replace(/^0/, '')					// remove leading 0s
			.replace(/\/0+/, "/");				// replace 0s after slash

		item.jurisdiction = "de";

		item.billNumber = item.title;

		item.url = url;

		// PDF Attachment
		item.attachments.push({
			title: "PDF",
			mimeType: "application/pdf",
			url: url,
		});

		item.complete();

	} else {
		let item = new Zotero.Item("bill");
		item.title = "## url noch nicht supported";
		item.complete();
	}



}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
