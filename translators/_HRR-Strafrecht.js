{
	"translatorID": "b3685f78-e8a4-432f-8c2d-a5a9f50b3981",
	"label": "_HRR-Strafrecht",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/www\\.hrr-strafrecht\\.de\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-15 07:47:55"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (doc.querySelector('.section-entscheidungen') !== null) {
		return "case";
	}
	return false;
}


async function doWeb(doc, url) {
		let item = new Zotero.Item("case");
		item.title = "##";
		item.url = url;



		// Titel -- ##todo: die Metadaten sauber in den Feldern aufnehmen
		item.title = text(doc, "h2");



		// PDF-Download
		const href = doc.querySelector('a[title="Entscheidung als PDF-Datei herunterladen..."]')?.href ?? null;
		if (href) {
			item.attachments.push({
				title: "PDF",
				mimeType: "application/pdf",
				url: href
			});
		}




		item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
