{
	"translatorID": "8337bbf1-db39-49e3-981a-bb4552ee9a93",
	"label": "_Verfassungsblog",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/verfassungsblog\\.de",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-08-29 22:33:51"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2026 Eric Mann

    ***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
		return 'blogPost';
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'blogPost') {
		var translator = Zotero.loadTranslator("web");
		translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");		// Embedded Metadata
		translator.setDocument(doc);
		translator.setHandler("itemDone", function(obj, item) {
			
			
			// die Einträge werden fälschlich als Zeitschriftenaufsätze erkannt
			item.itemType = "blogPost";
			

			item.complete();
		});
		translator.translate();




	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
