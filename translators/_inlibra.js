{
	"translatorID": "f9a688b4-1c1d-4195-8260-5d3c763fe4c6",
	"label": "_Inlibra",
	"creator": "Eric Mann",
	"target": "^https?:\\/\\/www\\.inlibra\\.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-16 10:12:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (journalDOI(doc, url)) return "journalArticle";
	if (bookDOI(doc, url)) return "book";
	return false;
}

function journalDOI(doc, url) {
	let xpath = "//button[normalize-space(.)='DOI-Kapitellink kopieren']/@data-clipboard-copy-content-param";
	let doi = ZU.xpathText(doc, xpath);
	return doi || false;
};

function bookDOI(doc, url) {
	let xpath1 = "//dt[normalize-space(.)='ISBN-Online']";
	let book = ZU.xpathText(doc, xpath1);
	let doi = "";
	if (book) {
		let xpath2 = "//button[contains(., 'DOI')]/@data-clipboard-copy-content-param";
		doi = ZU.xpathText(doc, xpath2);
	}
	return doi || false;
}
 
async function doWeb(doc, url) {

	let doi = "";
	doi = journalDOI(doc, url);
	if (!doi) doi = bookDOI(doc, url);
	if (!doi) return false;

	let type = detectWeb(doc, url);
	if (!type) return false;
 
	let translation = Zotero.loadTranslator("search");
	translation.setSearch({ itemType: type, DOI: doi });
	translation.setTranslator("b28d0d42-8549-4c6d-83fc-8382874a5cb9");	// DOI Content Negotiation
 

	translation.setHandler("itemDone", function (obj, item) {

		// PDF-Download
		let xpath = "//a[normalize-space(.)='Download Kapitel (PDF)']/@href";
		let pdfURL = ZU.xpathText(doc, xpath);
		// item.notes.push({note: pdfURL});
		item.attachments.push({
			title: 'PDF',
			mimeType: "application/pdf",
			url: pdfURL
		});

		item.complete();
	});
 

	translation.setHandler("error", function (obj, err) {
		Z.debug("DOI lookup failed: " + err);
	});


	await translation.translate();
	
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
