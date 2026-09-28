{
	"translatorID": "f6ba5fd6-b445-46ec-8980-3b6a084deae0",
	"label": "_Kluwer Arbitration Database",
	"creator": "Eric Mann",
	"target": "https:\\/\\/www(\\.|-1)kluwerarbitration(\\.|-1)com(\\/|-1)",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-22 07:37:36"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024-2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {

	// Homepage, Suchergebnisse etc. direkt ausscheiden
	if (! url.includes('/document/')) {
		return false;
	};

	// Arbitration Cases
	if (url.includes('/document/case/')) {
		return 'case';
	};

	// State Court Decisions
	for (let i = 0; i < 50; i += 1) {
		let table = text(doc, "#accordion td", i);
		if (table == "Court:") {
			return "case";
		};
	};
	
	// Journals
	let kluwerJournals = [	"Arbitraje: Revista de Arbitraje Comercial y de Inversiones",
							"Arbitration International",
							"Arbitration: The International Journal of Arbitration, Mediation and Dispute Management",
							"ASA Bulletin",
							"Asian Dispute Review",
							"Asian International Arbitration Journal",
							"b-Arbitra | Belgian Review of Arbitration",
							"BCDR International Arbitration Review",
							"Commercial Arbitration [Коммерческий Арбитраж]",
							"Dispute Resolution Journal",
							"European Investment Law and Arbitration Review",
							"ICSID Review - Foreign Investment Law Journal",
							"Indian Journal of Arbitration Law",
							"International Commercial Arbitration Review [Вестник Международного Коммерческого Арбитража]",
							"International Journal of Arab Arbitration",
							"Iurgium [previously Spain Arbitration Review]",
							"Journal of International Arbitration",
							"Journal of International Dispute Settlement",
							"Revista Brasileira de Arbitragem",
							"Revista Română de Arbitraj",
							"Revue de l'Arbitrage",
							"SchiedsVZ | German Arbitration Journal",
							"The Resolver",
							"Tijdschrift voor Arbitrage" ];
	let publicationTitle = text(doc, "h5.title");
	let documentTextTab = text(doc, ".cg-tab-inner-content", 1);
	if (documentTextTab != "") {
		documentTextTab = true;
	};
	if (kluwerJournals.includes(publicationTitle) && documentTextTab) {
		return "journalArticle";
	};



	// Monografien, Kommentare, Sammelwerke
	if (text(doc, ".cg-card-container-cg_unique")) {

		metadata = [];

		let labelSelector = ".cg-card-container-cg_unique div.table-label";
		let contentSelector = ".cg-card-container-cg_unique div.table-value";

		let labels = doc.querySelectorAll(labelSelector);
		let values = doc.querySelectorAll(contentSelector);

		for (let i = 0; i < labels.length; i += 1) {
			metadata[labels[i].textContent.replace(/:$/, "")] = values[i].textContent;
		}

		// Monografien (Autor statt Hrsg angegeben) als erstes erkennen
		// -> Kommentare mit (Gesamt-)Autoren werden als Monografien zitiert		// Bsp.: https://www.kluwerarbitration.com/document/TOC-Khodykin-2020
		if (metadata["Author"] || metadata["Authors"]) {						
			return "book";
		} else if (metadata["Editor"] || metadata["Editors"]) {
			// Kommentare
			if (publicationTitle.toLowerCase().includes("commentary")) {			// Bsp.: https://www.kluwerarbitration.com/document/KLI-KA-Commentary_on_CISG-006
				return "encyclopediaArticle";
			};
			// Sonst: Sammelwerk (aber nur, wenn konkretes Dokument offen)
			return "bookSection";													// Bsp. Einzelkapitel: https://www.kluwerarbitration.com/document/KLI-KA-40Under40-2018-006-n
																					// Bsp. Gesamtwertk: https://www.kluwerarbitration.com/document/40%20under%2040%20International%20Arbitration%20(2018)
		}

	};

	Z.monitorDOMChanges(doc.body, { childList: true, subtree: true });				// content-loading is deferred

	return false;
};



async function doWeb(doc, url) {
	let itemType = detectWeb(doc, url);
	if (itemType == "case") {
		saveCase(doc, url);
	};
	if (itemType == "journalArticle") {
		saveJournal(doc, url);
	};
	if (itemType == "encyclopediaArticle") {
		saveCommentary(doc, url);
	};
	if (itemType == "book") {
		saveBook(doc, url);
	};
	if (itemType == "bookSection") {
		saveBookSection(doc, url);
	};
};



function saveBookSection(doc, url) {
	// Declare variables
	var item = new Zotero.Item("bookSection");
	item.title = "ERROR";
	var extras = "";


	// Get Document Information
	let selector = "#accordion tr td";
	let bibRef = "";
	let matches = [];
	for (let i = 0; i < 10; i += 2) {
		let left_column = text(doc, selector, i);
		let right_column = text(doc, selector, i + 1);
		if (left_column == "Bibliographic Reference:") {
			bibRef = right_column;
		} else if (left_column == "Author:" || left_column == "Authors:") {
			let authors = right_column;
			authors = authors.split(",");
			authors.forEach(author => item.creators.push(ZU.cleanAuthor(author, 'author', false)));
		};
	};

	// Title
	let regexTitle = /,\s'(.+?)',\sin/;
	matches = bibRef.match(regexTitle);
	if (matches) {
		item.title = matches[1];
	};

	// Pages
	matches = [];
	let regexPages = /pp\.\s(\d+\s-\s\d+)/;
	matches = bibRef.match(regexPages);
	if (matches) {
		item.pages = matches[1];
	};

	// Title of the Book
	item.bookTitle = text(doc, "h5.title");	

	// Publication Info: Editors + Date + ISBN + Publisher
	selector = ".cg-card-container-cg_unique tr td";
	for (let i = 0; i < 10; i += 2) {
		let left_column = text(doc, selector, i);
		let right_column = text(doc, selector, i + 1);
		if (left_column == "Editor:" || left_column == "Editors:") {
			let editors = right_column;
			editors = editors.split(",");
			editors.forEach(editor => item.creators.push(ZU.cleanAuthor(editor, 'editor', false)));
		} else if (left_column == "Publication date:") {
			item.date = right_column;
		} else if (left_column == "ISBN:") {
			item.ISBN = right_column;
		} else if (left_column == "Publisher:") {
			item.publisher = right_column;
		};
	}; 

	// URL
	item.url = url;

	

	// User Warning
	let documentTextTab = text(doc, ".cg-tab-inner-content", 1);
	if (!documentTextTab) {
		let userWarning = 	"<b>Achtung Sammelband!</b> <br><br> Das vorliegende Werk scheint ein Sammelband zu sein. " 
							+ "In diesem Fall wird jeweils das Kapitel mit seinem eigenen Namen und konkreten Autor zitiert. "
							+ "Ausgewählt wurde beim Abspeichern aber das Gesamtwerk ohne konkretes Kapitel.";
		item.notes.push({ note: userWarning });
		item.title = text(doc, "h5.title");
	};


	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});
	

	// Finalize item
	item.extra = extras;
	item.complete();
};



function saveCommentary(doc, url) {
	// Declare variables
	var item = new Zotero.Item("encyclopediaArticle");
	item.title = "ERROR";
	var extras = "";
	let title = "";

	// Title
	title = text(doc, "h5.title");	
	item.title = title;

	// Publication Info: Editors + Date + ISBN + Publisher
	let selector = ".cg-card-container-cg_unique tr td";
	for (let i = 0; i < 10; i += 2) {
		let left_column = text(doc, selector, i);
		let right_column = text(doc, selector, i + 1);
		if (left_column == "Editor:" || left_column == "Editors:") {
			let editors = right_column;
			editors = editors.split(",");
			editors.forEach(editor => item.creators.push(ZU.cleanAuthor(editor, 'editor', false)));
		} else if (left_column == "Publication date:") {
			item.date = right_column;
		} else if (left_column == "ISBN:") {
			item.ISBN = right_column;
		} else if (left_column == "Publisher:") {
			item.publisher = right_column;
		};
	};

	// Document Info : Authors
	selector = ".cg-accordion-item-element td";
	let konkreterNachweis = false;
	if (text(doc, selector)) {
		konkreterNachweis = true;
	};

	if(konkreterNachweis) {

		// Authors
		for (let i = 0; i < 10; i += 2) {
			let left_column = text(doc, selector, i);
			let right_column = text(doc, selector, i + 1);
			if (left_column == "Author:" || left_column == "Authors:") {
				let authors = right_column;
				authors = authors.split(",");
				authors.forEach(author => item.creators.push(ZU.cleanAuthor(author, 'author', false)));
			};
		};

		// Title of the Provision -> save as shortTitle
		selector = ".wk-h1";
		let provisionTitle = text(doc, selector);
		provisionTitle = provisionTitle.replace(/ \[.+?\]/, "");
		provisionTitle = provisionTitle.replace(/Article /, "Art. ");

		let legalSource = "";
		if (title.includes("CISG")) {
			legalSource = "CISG"
		} else {
			legalSource = "##";
		}

		item.shortTitle = legalSource + " " + provisionTitle;

		// Sort-Name
		let creators = item.creators;
		let blablabla = "";
		for (let creator of creators) {
			if (creator["creatorType"] == "editor") {
				blablabla += creator["lastName"] + "/";
			};
		};
		blablabla = blablabla.replace(/\/$/, "");
		blablabla = "[" + blablabla + "] ";
		let sortTitle = blablabla + item.shortTitle;
		item.title = sortTitle;

	};


	// ## TODO ##
	// Edition?
	// Place?
	// Volume?

	// URL
	item.url = url;

	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});

	// Finalize item
	item.extra = extras;
	item.complete();
};


function saveBook(doc, url) {
	// Declare variables
	var item = new Zotero.Item("book");
	item.title = "ERROR";

	// Title
	item.title = text(doc, "h5.title");	

	// Publication Info: Author + Date + ISBN + Publisher
	let selector = ".cg-card-container-cg_unique tr td";
	for (let i = 0; i < 10; i += 2) {
		let left_column = text(doc, selector, i);
		let right_column = text(doc, selector, i + 1);
		if (left_column == "Author:" || left_column == "Authors:") {
			let authors = right_column;
			authors = authors.split(",");
			authors.forEach(author => item.creators.push(ZU.cleanAuthor(author, 'author', false)));
		} else if (left_column == "Publication date:") {
			item.date = right_column;
		} else if (left_column == "ISBN:") {
			item.ISBN = right_column;
		} else if (left_column == "Publisher:") {
			item.publisher = right_column;
		};
	};

	// ## TODO ##
	// Edition?
	// Place?
	
	// URL
	item.url = url;

	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});

	// Finalize item
	item.complete();
};



function saveJournal(doc, url) {
	// Define variables
	var item = new Zotero.Item("journalArticle");
	item.title = "ERROR";
	var extras = "";

	// Title
	item.title = text(doc, ".wk-h1");

	// Authors
	let authors = text(doc, "#document-content > p");
	authors = authors.split(";");
	authors.forEach(author => item.creators.push(ZU.cleanAuthor(author, 'author', false)));

	// Publication
	item.publicationTitle = text(doc, "h5.title");

	// Date
	let selector = "#accordion tr td";
	let bibRef = "";
	let matches = [];
	for (let i = 0; i < 10; i += 2) {
		let left_column = text(doc, selector, i);
		let right_column = text(doc, selector, i + 1);
		if (left_column == "Publication date:") {
			item.date = right_column;
		} else if (left_column == "Bibliographic Reference:") {
			bibRef = right_column;
		};
	};

	// Volume
	let regexVolume = /Volume\s(\d+)/;
	matches = bibRef.match(regexVolume);
	if (matches) {
		item.volume = matches[1];
	};

	// Issue
	matches = [];
	let regexIssue = /Issue\s(\d+)/;
	matches = bibRef.match(regexIssue);
	if (matches) {
		item.issue = matches[1];
	};

	// Pages
	matches = [];
	let regexPages = /pp\.\s(\d+\s-\s\d+)/;
	matches = bibRef.match(regexPages);
	if (matches) {
		item.pages = matches[1];
	};

	// Journal Abbr


	// DOI


	// ISSN


	// Short Title


	// URL
	let itemUrl = url;
	let regexUrl = /document\/.+/;
	matches = itemUrl.match(regexUrl);
	item.url = "https://www.kluwerarbitration.com/" + matches[0];


	// Extra

	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});


	// Finalize item
	item.extra = extras;
	item.complete();
};



function saveCase(doc, url) {
	let stateCourt = false;
	// State court decision?
	for (let i = 0; i < 20; i += 1) {
		let table = text(doc, "#accordion td", i);
		if (table == "Court:") {
			stateCourt = true;
		};
	};
	if (stateCourt) {
		saveCourt(doc, url);
	} else {
		saveAward(doc, url);
	};
};


// ## todo
function saveCourt(doc, url) {
	// Declare variables
	var item = new Zotero.Item("case");
	var extra = "Tranlating state court decisions from Kluwer Arbitration is work in progress!";
	item.title = "ERROR";
	let matches = [];


	// Title ## todo
	let title = text(doc, ".wk-h1");
	if (title) {
		item.title = title;
	}

	// Iterate over tabular data
	for (let i = 0; i < 50; i += 2) {
		let left_column = text(doc, "#accordion td", i);
		let right_column = text(doc, "#accordion td", i + 1);

		// Court
		if (left_column == "Court:") {
			item.court = right_column;

		// Date
		} else if (left_column == "Case date:") {
			item.date = right_column;
		};
	};
	
	// URL
	let itemUrl = url;
	let regex = /document\/.+/;
	matches = itemUrl.match(regex);
	item.url = "https://www.kluwerarbitration.com/" + matches[0];

	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});
	

	// Finalize item
	item.extra = extra;
	item.complete();
};


function saveAward(doc, url) {
	// Define Variables
	var item = new Zotero.Item("case");
	item.title = "ERROR";
	var extras = "";
	var matches = [];

	// Case Name
	item.title = text(doc, ".case-title");

	// Jurisdiction
	extras += "jurisdiction: arb.cls\n";

	// Date + Genre
	let activeNode = doc.querySelectorAll('div[tree-item="tree-item"]:has( .cg-is-selected )')[1];
	let activeDocs = text(activeNode, ".cg-tree-node-label");
	let regexInfo = /(\d+ [a-zA-Z]+ \d+)([a-zA-Z \-]+)/;
	matches = activeDocs.match(regexInfo);
	if (matches) {
		item.date = matches[1];
		extras += "genre: " + matches[2] + "\n";
	};
	// Make sure the item is saved as arbitral award
	extras += "event-place: Unknown Seat of Arbitration\n"; // ## todo

	// Court

	// Date Decided

	// Docket Number
	item.docketNumber = text(doc, ".case-id");

	// Reporter

	// Reporter Volume

	// First Page

	// History

	// Language

	// Short Title

	// URL
	let itemUrl = url;
	let regex = /document\/case\/.+/;
	matches = itemUrl.match(regex);
	item.url = "https://www.kluwerarbitration.com/" + matches[0];

	// Extra: Jurisdiction, Genre

	// Abstract

	// Attachments
	//let e = doc.querySelector('svg[icon-name="download-line"]');
	//item.extra = e.innerHTML;
	//e.click();                    // Zotero lässt das nicht zu

	// PDF-Download läuft nicht einfach über Link
	item.attachments.push({
		title: 'Kein automatischer PDF-Download möglich!',
		mimeType: "application/pdf",
		url: ``
	});

	// Finalize item
	item.extra = extras;
	item.complete();
};

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/TOC-Harbst-2015",
		"items": [
			{
				"itemType": "book",
				"title": "A Counsel's Guide to Examining and Preparing Witnesses in International Arbitration",
				"creators": [
					{
						"firstName": "Ragnar",
						"lastName": "Harbst",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"ISBN": "9789041166111",
				"libraryCatalog": "_Kluwer Arbitration Database v2024-10-27",
				"publisher": "Kluwer Law International",
				"url": "https://www.kluwerarbitration.com/document/TOC-Harbst-2015",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<b>PDFs bitte manuell abspeichern!</b> <br><br> Bei kluwerarbitration.com ist ein automatisches Herunterladen von PDFs leider nicht möglich."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/TOC_Holtzmann_2006",
		"items": [
			{
				"itemType": "book",
				"title": "A Guide to the 2006 Amendments to the UNCITRAL Model Law on International Commercial Arbitration: Legislative History and Commentary",
				"creators": [
					{
						"firstName": "Howard M.",
						"lastName": "Holtzmann",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph",
						"lastName": "Neuhaus",
						"creatorType": "author"
					},
					{
						"firstName": "Edda",
						"lastName": "Kristjansdottir",
						"creatorType": "author"
					},
					{
						"firstName": "Thomas",
						"lastName": "Walsh",
						"creatorType": "author"
					}
				],
				"date": "2015",
				"ISBN": "9789041162380",
				"libraryCatalog": "_Kluwer Arbitration Database v2024-10-27",
				"publisher": "Kluwer Law International",
				"shortTitle": "A Guide to the 2006 Amendments to the UNCITRAL Model Law on International Commercial Arbitration",
				"url": "https://www.kluwerarbitration.com/document/TOC_Holtzmann_2006",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<b>PDFs bitte manuell abspeichern!</b> <br><br> Bei kluwerarbitration.com ist ein automatisches Herunterladen von PDFs leider nicht möglich."
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.kluwerarbitration.com/document/TOC-Keller-2023",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "EU Investment Protection Law: Article-by-Article Commentary",
				"creators": [
					{
						"firstName": "Moritz",
						"lastName": "Keller",
						"creatorType": "editor"
					}
				],
				"date": "2023",
				"ISBN": "9783406743948",
				"libraryCatalog": "_Kluwer Arbitration Database v2024-10-27",
				"publisher": "Verlag C.H. Beck oHG",
				"shortTitle": "EU Investment Protection Law",
				"url": "https://www.kluwerarbitration.com/document/TOC-Keller-2023",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<b>PDFs bitte manuell abspeichern!</b> <br><br> Bei kluwerarbitration.com ist ein automatisches Herunterladen von PDFs leider nicht möglich."
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
