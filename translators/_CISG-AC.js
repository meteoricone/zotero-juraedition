{
	"translatorID": "40f07eec-69e3-4346-910f-44ed74e16a38",
	"label": "_CISG-AC",
	"creator": "Eric Mann",
	"target": "https:\\/\\/cisgac.com\\/opinions\\/cisgac-opinion-no-",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-05 23:40:10"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	return "conferencePaper";
}



async function doWeb(doc, url) {
	// Declara variables
	var item = new Zotero.Item("conferencePaper");
	item.title = "Error";
	let selector = "";
	let title = "";
	let subtitle = "";
	let regex = / /;
	let matches = [];
	let pdfUrl = "";

	// Title
	selector = "h1";
	title = text(doc, selector)
	selector = "h2";
	subtitle = text(doc, selector);
	item.title = title + ": " + subtitle;

	// Short Title
	regex = /cisgac-opinion-no-(\d+)/;
	matches = url.match(regex);
	item.shortTitle = "CISG-AC Opinion No. ##";
	if (matches) {
		item.shortTitle = "CISG-AC Opinion No. " + matches[1];
	}

	// PDF Attachment
	pdfUrl = attr(doc, ".fl-rich-text a", "href", 0);
	item.attachments.push({
		title: "CISG-AC PDF",
		mimeType: "application/pdf",
		url: pdfUrl,
	});

	// User Warning
	let userWarning = 	"<b>Hinweis:</b> <br><br> Beim Abspeichern über CISG-online können noch mehr Metadaten übernommen werden. " 
							+ "Der Translator für CISG-AC direkt ist auch noch work in progress. "
	item.notes.push({ note: userWarning });

	// Finalize item
	item.url = url;
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
