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
	"lastUpdated": "2026-10-23 10:18:23"
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



		// Titel
		let title = text(doc, "h2");
		item.title = title;

		// Metadaten aus dem Titel
		let docketNumber = "";
		let regex = /BGH (\d StR \d+\/\d+) - (\S+) vom (\d+\. \S+ \d+)/;
		let match = title.match(regex);
		if (match) {
			item.court = "BGH";
			item.jurisdiction = "de";
			docketNumber = match[1];
			item.docketNumber = docketNumber;
			item.extra = "Genre: " + match[2];
			item.date = match[3];
		}



		// PDF-Download
		const href = doc.querySelector('a[title="Entscheidung als PDF-Datei herunterladen..."]')?.href ?? null;
		if (href) {
			item.attachments.push({
				title: "PDF",
				mimeType: "application/pdf",
				url: href
			});
		}



		if (docketNumber) {
			// ## wip
			let search = Zotero.loadTranslator("search");
			search.setTranslator("65cf08cc-3a48-4ed9-8e92-ef9f510d4367");	// _dejure.org Metadata
			search.setSearch({ itemType: "case", docketNumber: docketNumber});							// üblich ist wohl Skelett-Objekt statt Zotero.Item-Objekt
			search.setHandler("itemDone", (obj, dejureItem) => {

				// Push all attachments, not tested yet
				for (let att of (dejureItem.attachments || [])) {
				 	item.attachments.push(Object.assign({}, att));
				}

				// Push all notes
				for (let note of (dejureItem.notes || [])) {
					item.notes.push(typeof note === "string" ? { note } : Object.assign({}, note));
				}

				if (dejureItem.shortTitle && !item.shortTitle) {
					item.shortTitle = dejureItem.shortTitle;
				}

				if (dejureItem.history) {
					item.history = dejureItem.history;
				}

				item.notes.push({note: "Metadaten ergänzt mit:<br>" + dejureItem.url + "<br>(" + new Date().toLocaleDateString("de-DE") + ")"});
		
			});
			await search.translate();
		}



		item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
