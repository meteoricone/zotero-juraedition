{
	"translatorID": "4fce02b0-aa89-4352-aea6-224294fb34e1",
	"label": "_Mohr Siebeck",
	"creator": "Eric Mann",
	"target": "^https?://www\\.mohrsiebeck\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-05-08 09:30:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	// TODO: adjust the logic here
	if (url.includes('/buch/')) {
		return 'book';
	}
	return false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'book') {
		// from https://github.com/zotero/translators/blob/9f70efa6d286b72b8f46b76c57900150b411d578/AMS%20Journals.js#L63
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");		// Embedded Metadata
		translator.setDocument(doc);
		translator.setHandler("itemDone", function(obj, item) {
			
			
			// Monographien werden fälschlich als Sammelwerk erkannt
			item.itemType = "book";
			let kurztitel = item.title;
			let untertitel = item.publicationTitle;
			// item.notes.push({note: kurztitel + untertitel});
			item.shortTitle = kurztitel;
			if (untertitel) {
				item.title = kurztitel + ": " + untertitel;
			};
			item.publicationTitle = "";

			// dummen Fehler fixen
			if (item.publisher = "Mohr Siebeck GmbH &amp; Co. KG") {item.publisher = "Mohr Siebeck GmbH & Co. KG"};


			// Schriftenreihe xpath: //a[@title="Zur Schriftenreihe"]/text()
			let schriftenreihe = ZU.xpathText(doc, '//a[@title="Zur Schriftenreihe"]');
			schriftenreihe = schriftenreihe.trim().replace(/\s+/g, ' '); // trim internally as well
			item.series = schriftenreihe;

			// ## weiß noch nicht was ich damit mache
			item.notes.push({note: "MohrSiebeck eBücher sind eine sog. Sekundärausgabe/unveränderte E-Book-Ausgabe mit Datum der Digitialisierung; eigentlich will man ja aber das ursprüngliche Datum haben."});


			item.complete();
		});
		translator.translate();




	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
