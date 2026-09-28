{
	"translatorID": "e482fb1b-ee0c-4d10-9e6b-30e8099e190e",
	"label": "_Jusmundi",
	"creator": "Eric Mann",
	"target": "^https:\\/\\/jusmundi\\.com\\/(fr|en)\\/document\\/decision\\/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-10-27 17:03:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/decision/')) {
		return 'case';
	}
	return false;
}


async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "case") {
		saveCase(doc, url);
	};
};


function saveCase(doc, url) {
	// Declara variables
	var item = new Zotero.Item("case");
	item.title = "ERROR";
	let activeDoc = text(doc, ".listofdoc-level.relative.active");
	let matches = [];
	let extras = "";
	let seat = "";

	// Title
	item.title = attr(doc, ".metadata-title__h1", "data-copyreftitre");

	// Short Title (without indication of legal form)
	item.shortTitle = text(doc, ".metadata-title__h1");

	// Date
	let regexDate = /\d{1,2}\s[A-z]{3}\s\d{4}$/;
	matches = activeDoc.match(regexDate);
	if (matches) {
		item.date = matches[0];
	};

	// Genre
	let regexGenre = /^[A-Za-z\s]+/;
	matches = activeDoc.match(regexGenre);
	if (matches) {
		extras += "genre: " + matches[0].trim() + "\n";  // for some reasons matches[0] is followed by a lot of whitespace -> trim
	};

	// Ascertain whether the active document is a decision by an arbitral tribunal or state court
	let arbitralAward = "unsure";
	let stateCourtList = ["Judgment", "High Court of Justice", "United States District Court", ];
	let arbitralTribunalList = ["Award", "Decision on Jurisdiction", "Preliminary Ruling", ];
	for (let text of arbitralTribunalList) {
		if (activeDoc.includes(text)) {
			arbitralAward = "true";
		};
	};
	for (let text of stateCourtList) {
		if (activeDoc.includes(text)) {
			arbitralAward = "false";
		};
	};
	if (arbitralAward == "unsure") {
		// todo: ## create warning shown to user
		arbitralAward = "true";
	};
	
	
	// Data specific to arbitral decision
	if (arbitralAward == "true") {
			// First make sure that the csl-variable event-place contains info -> distinguish arbitral award from state court decision
			seat = "Unknown Seat of the Arbitration";
			extras += "jurisdiction: arb.cls\n";

			// Case Number
			let regexCaseNumber = /Case No\.(.+)/;
			let caseNumber = attr(doc, ".metadata-title__h1", "data-copyrefnum");
			matches = caseNumber.match(regexCaseNumber);
			if (matches) {
				caseNumber = matches[1];
			};
			item.docketNumber = caseNumber;

			// Iterate over tabular info
			let nodes = doc.querySelectorAll(".metadata-group__info");
			for (let node of nodes) {
				let left_column = text(node, ".metadata-group__info > dt");
				let right_column = text(node, ".metadata-group__info > dd");

				// Institution Name
				if (left_column == "Institution:") {
					item.court = right_column;
					// Shorten Name for Citation
					let regexInstitution = /^(.+?)\(/;
					matches = right_column.match(regexInstitution);
					if (matches) {
						extras += "original-publisher: " + matches[1] + "\n";
					};


				// Seat of Arbitration
				} else if (left_column == "Seat of arbitration:") {
					seat = right_column + " (Seat of the Arbitration)";
				};
			};

			// Add Seat to extras
			extras += "event-place: " + seat + "\n";
	};
	

	// Data specific to state court decision
	if (arbitralAward == "false") {
			let court = "Unknown Court";
			let citation = "";
			let regexCourt = /of the ([A-z\s\[\]\d]+)/;

			matches = activeDoc.match(regexCourt);
			if (matches) {
				court = matches[1];
			};

			let regexCitation = /\[\d+\] [A-z]+ \d+/;
			matches = court.match(regexCitation);
			if (matches) {
				citation = matches[0];
			};
			court = court.replace(citation, "");

			item.court = court;
			item.reporter = citation;
	};


	// Save all parties in seperate field
	extras += "original-title: " + attr(doc, ".metadata-title__h1", "data-copyreftitre") + "\n";

	// PDF Attachments
	let originalPdfUrl = attr(doc, ".btn_tabpdf", "href");
	let jusmundiPdfUrl = attr(doc, 'a[data-original-title="Jus Mundi PDF"]', "href");
	if (activeDoc == "") {
		pdfTitle = "Title not retrieved";
	};
	item.attachments.push({
		title: activeDoc + " (Original PDF)",
		mimeType: "application/pdf",
		url: originalPdfUrl
	});
	item.attachments.push({
		title: activeDoc + " (Jus Mundi PDF)",
		mimeType: "application/pdf",
		url: jusmundiPdfUrl
	});

	// Note (User Warning)
	let jusmundiDocs = doc.querySelectorAll(".listofdoc-level");
	jusmundiDocs = jusmundiDocs.length;
	if (jusmundiDocs > 1) {
		let pdfReminder = `<b>Nur ausgewählte Entscheidung gespeichert!</b> <br><br> Auf Jus Mundi sind insgesamt ${jusmundiDocs} zum Fall gehörige Dokumente verfügbar.`;
		item.notes.push({ note: pdfReminder });
		item.history = `${jusmundiDocs} documents in total`;
	};

	// Finalize item
	item.url = url;
	item.extra = extras;
	item.complete();
}










/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://jusmundi.com/en/document/decision/en-deutsche-ruckversicherung-ag-v-caja-nacional-de-ahorro-y-seguros-argentine-national-treasury-and-reinsurance-national-institute-opinion-and-order-of-the-united-states-district-court-for-the-southern-district-of-new-york-wednesday-1st-august-2007#decision_11315",
		"items": [
			{
				"itemType": "case",
				"caseName": "Deutsche Rückversicherung AG v. Caja Nacional de Ahorro y Seguros, Argentine National Treasury and Reinsurance National Institute",
				"creators": [],
				"dateDecided": "1 Aug 2007",
				"extra": "genre: Opinion and Order of the United States District Court for the Southern District of New York\noriginal-title: Deutsche Rückversicherung AG v. Caja Nacional de Ahorro y Seguros, Argentine National Treasury and Reinsurance National Institute",
				"shortTitle": "Deutsche Rück v. Caja",
				"url": "https://jusmundi.com/en/document/decision/en-deutsche-ruckversicherung-ag-v-caja-nacional-de-ahorro-y-seguros-argentine-national-treasury-and-reinsurance-national-institute-opinion-and-order-of-the-united-states-district-court-for-the-southern-district-of-new-york-wednesday-1st-august-2007#decision_11315",
				"attachments": [
					{
						"title": "Opinion and Order of the United States District Court for the Southern District of New York\n                                 - 1 Aug 2007 (Original PDF)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Opinion and Order of the United States District Court for the Southern District of New York\n                                 - 1 Aug 2007 (Jus Mundi PDF)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<b>Nur ausgewähltes Doc wird gespeichert!</b> <br><br> Auf Jus Mundi können noch mehr zum Fall gehörige Dokumente verfügbar sein."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jusmundi.com/en/document/decision/en-beijing-urban-construction-group-co-ltd-v-republic-of-yemen-decision-on-jurisdiction-wednesday-31st-may-2017",
		"items": [
			{
				"itemType": "case",
				"caseName": "Beijing Urban Construction Group Co. Ltd. v. Republic of Yemen",
				"creators": [],
				"dateDecided": "31 May 2017",
				"court": "ICSID (International Centre for Settlement of Investment Disputes)",
				"docketNumber": "ICSID Case No. ARB/14/30",
				"extra": "genre: Decision on Jurisdiction\nevent-place: Washington D.C. (Seat of the Arbitration)\noriginal-title: Beijing Urban Construction Group Co. Ltd. v. Republic of Yemen",
				"shortTitle": "Beijing Urban Construction v. Yemen",
				"url": "https://jusmundi.com/en/document/decision/en-beijing-urban-construction-group-co-ltd-v-republic-of-yemen-decision-on-jurisdiction-wednesday-31st-may-2017",
				"attachments": [
					{
						"title": "Decision on Jurisdiction\n                                 - 31 May 2017 (Original PDF)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Decision on Jurisdiction\n                                 - 31 May 2017 (Jus Mundi PDF)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<b>Nur ausgewähltes Doc wird gespeichert!</b> <br><br> Auf Jus Mundi können noch mehr zum Fall gehörige Dokumente verfügbar sein."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://jusmundi.com/en/document/decision/en-nvf-rwk-and-klb-v-nwa-and-fsy-judgment-of-the-high-court-of-justice-of-england-and-wales-2021-ewhc-2666-friday-8th-october-2021#decision_18023",
		"items": [
			{
				"itemType": "case",
				"caseName": "NVF, RWK and KLB v. NWA and FSY",
				"creators": [],
				"dateDecided": "8 Oct 2021",
				"extra": "genre: Judgment of the High Court of Justice of England and Wales [\noriginal-title: NVF, RWK and KLB v. NWA and FSY",
				"url": "https://jusmundi.com/en/document/decision/en-nvf-rwk-and-klb-v-nwa-and-fsy-judgment-of-the-high-court-of-justice-of-england-and-wales-2021-ewhc-2666-friday-8th-october-2021#decision_18023",
				"attachments": [
					{
						"title": "Judgment of the High Court of Justice of England and Wales [2021] EWHC 2666\n                                 - 8 Oct 2021 (Original PDF)",
						"mimeType": "application/pdf"
					},
					{
						"title": "Judgment of the High Court of Justice of England and Wales [2021] EWHC 2666\n                                 - 8 Oct 2021 (Jus Mundi PDF)",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [
					{
						"note": "<b>Nur ausgewähltes Doc wird gespeichert!</b> <br><br> Auf Jus Mundi können noch mehr zum Fall gehörige Dokumente verfügbar sein."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
