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
	"lastUpdated": "2026-09-14 22:27:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	let xpath = "//button[normalize-space(.)='DOI-Kapitellink kopieren']/@data-clipboard-copy-content-param";
	let doi = ZU.xpathText(doc, xpath);
	if (!doi) return false;
	return "journalArticle";
}
 
async function doWeb(doc, url) {

	let xpath = "//button[normalize-space(.)='DOI-Kapitellink kopieren']/@data-clipboard-copy-content-param";
	let doi = ZU.xpathText(doc, xpath);
	if (!doi) return;
 
	let translation = Zotero.loadTranslator("search");
	translation.setSearch({ itemType: "journalArticle", DOI: doi });
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
