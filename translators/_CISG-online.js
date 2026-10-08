{
	"translatorID": "e34aebfe-d128-4e2c-ae64-42a8a8505967",
	"label": "_CISG-online",
	"creator": "Eric Mann",
	"target": "^https?://cisg-online\\.org/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-08 20:04:12"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.includes("search-for-cases?caseId=")) {
		return "case";
	} else if (url.includes("/files/ac_op/")) {
		return "conferencePaper";
	} else if (url.includes("/bibliography")) {
		return "multiple";
	} else if (url.includes("/cisg-ac-opinions")) {
		return "multiple";
	};
	return false;
};


async function doWeb (doc, url) {
	let detectedType = detectWeb(doc, url);
	if (detectedType == "case") {
		saveCase(doc, url);
	} else if (detectedType == "conferencePaper") {
		saveSingleAcOp(doc, url);
	} else if (detectedType == "multiple") {
		saveMultiple(doc, url);
	};
};


function saveMultiple(doc, url) {
	if (url.includes("bibliography")) {
		saveBibliography(doc, url);
	} else if (url.includes("cisg-ac-opinions")) {
		saveMultipleAcOps(doc, url);
	}
};

// ## todo
// for how saving multiple items works, see the function saveBibliography (just below this function)
function saveMultipleAcOps(doc, url) {
	var entries = {};
	for (let i = 0; i < 100; i++) {
		let entry = text(doc, ".row.hover", i);		// css selector
		if (entry) {
			entries[i] = entry;
		} else {
			break;
		};
	};

	Zotero.selectItems(entries, function (items) {
		if (items) {
			let allKeys = Object.keys(items);
			saveOpinions(items, allKeys);
		};
	});

	function saveOpinions(items, keys) {
		// iterate over all selected entries
		for (let key of keys) {
			// Declare variables
			let item = new Zotero.Item("conferencePaper");
			item.title = "ERROR";
			let matches = [];
			let reference = items[key];
			let extras = "";

			// Number
			let regexNumber = /No\. (\d+)/;
			let number = 0;
			matches = reference.match(regexNumber);
			if (matches) {
				number = matches[1];
			};
			item.title = "CISG Advisory Council Opinion No. " + number.toString();						// will be replaced by the code block just below
			item.shortTitle = "CISG-AC Opinion No. " + number.toString();

			// (Sub)Title	
			let regexTitle = /[‘']([\s\S]+?)[’'‘] \(/;													// dot cannot be used as the title might include a line break
			let title = "##";
			matches = reference.match(regexTitle);
			if (matches) {
				title = matches[1];
			};
			item.title = "CISG Advisory Council Opinion No. " + number.toString() + ": " + title;

			// Rapporteur
			let regexRapporteurs = /\(Rapporteurs*: (.+?)\)/;
			matches = reference.match(regexRapporteurs);
			if (matches) {
				let rapporteurs = matches[1];
				rapporteurs = rapporteurs.split(/ and |, /);
				for (let rapporteur of rapporteurs) {
					rapporteur = ZU.cleanAuthor(rapporteur, "author", false);
					extras += "compiler: " + rapporteur["lastName"] + " || " + rapporteur["firstName"] + "\n";
				};
			}

			// Place
			let regexPlace = /meeting in ([^]+?) (on|in) /;
			matches = reference.match(regexPlace);
			if (matches) {
				item.place = matches[1];
			};

			// Date  ## mimial todo for op no 5 
			let regexDate = / ([\d\- and]*?) *(January|February|March|April|May|June|July|August|September|October|November|December|Winter|Spring|Summer|Autumn)* *(\d{4})/;
			matches = reference.match(regexDate);
			if (matches) {
				item.date = matches[1] + " " + matches[2] + " " + matches[3];
			};

			// PDF
			let activeNode = doc.querySelectorAll(".row.hover")[i];
			let pdfUrl = attr(activeNode, "a", "href");
			item.attachments.push({
				title: "CISG-online PDF",
				mimeType: "application/pdf",
				url: pdfUrl,
			});

			// Finalize item
			item.url = url;
			item.extra = extras;
			item.abstractNote = reference;
			item.complete();
		};
	};

};



// ## todo
function saveBibliography(doc, url) {



	var entries = {};                                   // create javascript object
	for (let i = 0; i < 5000; i++) {					// cisg-online boasts over 4400 entries - this is the theoretical max of entries on the page
		let entry = text(doc, ".is-content", i);
		if (entry) {
			entries[i] = entry;							// add iterator i as a property and the entry text as the value
		} else {
			break;										// break the loop after all entries are added, so it doesn't have to run 5000 times
		};
	};

	// Zotero.selectItems takes on object as first arguments -> this will be shown to user
	// all selected items will be passed as one object to the function passed as second argument
	Zotero.selectItems(entries, function (items) {		// this defines an anonymous callback function as the second argument
		if (items) {
			let allKeys = Object.keys(items);			// save all the properties (-> selected iterators, supra) into an array
			saveBibEntries(items, allKeys);					// pass the selected entries as one object and all properties as a second argument
		};
	});

	function saveBibEntries(items, keys) {
		// iterate over all selected entries
		for (let key of keys) {
			let entry = items[key];
			if (entry.includes(" (eds.),")) {
				saveBookSection(entry, key);
			} else if (entry.match(/\d+[^,']+\(\d{4}\)/)) {		// regex for Journals, matches: ""... 26 Law Rev. (L.R.) (2026) ...""
				saveJournalArticle(entry, key);
			} else {
				// ## todo: other types
				saveFallback(entry, key);
			};
		};
	};




	function saveBookSection(entry, iterator) {
		// Declare variables
		let item = new Zotero.Item("bookSection");
		item.title = "ERROR";
		let matches = [];
		let contentNode = doc.querySelectorAll(".is-content")[iterator];

		// Authors
		let regexAuthors = /^(.+?), '/;
		matches = entry.match(regexAuthors);
		if (matches) {
			let authors = matches[1];
			authors = authors.split(/, | & /);
			authors.forEach(author => item.creators.push(ZU.cleanAuthor(author, 'author', false)));
		};

		// Title
		let regexTitle = /, '(.+?)', /;
		matches = entry.match(regexTitle);
		if (matches) {
			let title = matches[1];
			item.title = title;
		};

		// Editors
		let regexEditors = /in: (.+?) \(eds*\.\)/;
		matches = entry.match(regexEditors);
		if (matches) {
			let editors = matches[1];
			editors = editors.split(/, | & /);
			editors.forEach(editor => item.creators.push(ZU.cleanAuthor(editor, 'editor', false)));
		};

		// Book Title
		item.bookTitle = text(contentNode, "i");

		// Place, Publisher, Date, Pages
		// ## might be saver to split these into individual regexes
		let regexBibRef = /, ([^:]+): ([^:]+?) \((\d{4})\), ([\d\–]+)/;
		matches = entry.match(regexBibRef);
		if (matches) {
			item.place = matches[1];
			item.publisher = matches[2];
			item.date = matches[3];
			item.pages = matches[4];
		};

		// PDF Attachment
		let pdfUrl = attr(contentNode, "a", "href");	// if there is no link, this will simply return an empty string
		item.attachments.push({
			title: "CISG-online PDF",
			mimeType: "application/pdf",
			url: pdfUrl,								// if the string is empty, nothing happens
		});
		
		// Finalize item
		item.extra = entry;
		item.url = url;
		item.complete();
	};



	function saveJournalArticle(entry, iterator) {
		let item = new Zotero.Item("journalArticle");

		// ##todo: parse entry

		// PDF Attachment
		let contentNode = doc.querySelectorAll(".is-content")[iterator];
		let pdfUrl = attr(contentNode, "a", "href");	// if there is no link, this will simply return an empty string
		item.attachments.push({
			title: "CISG-online PDF",
			mimeType: "application/pdf",
			url: pdfUrl,								// if the string is empty, nothing happens
		});

		// Finalize
		item.title = entry;
		item.url = url;
		item.complete();
	}

	//  ## todo: other types
	function saveFallback(entry, iterator) {
		let item = new Zotero.Item("document");

		// PDF Attachment
		let contentNode = doc.querySelectorAll(".is-content")[iterator];
		let pdfUrl = attr(contentNode, "a", "href");	// if there is no link, this will simply return an empty string
		item.attachments.push({
			title: "CISG-online PDF",
			mimeType: "application/pdf",
			url: pdfUrl,								// if the string is empty, nothing happens
		});

		// Finalize
		item.title = entry;
		item.url = url;
		item.complete();
	}

};


function saveCase(doc, url) {
	// Declare variables
	var newItem = new Zotero.Item("case");
	var extras = "";
	var jurisdiction = "";
	var seat = "";
	var caseName = "";

	// Iterate over tabular info
	for (let i = 0; i < 50; i++) {
		let left_column = text(doc, "div.col-xs-12.col-lg-4", i);
		let right_column = text(doc, "div.col-xs-12.col-lg-8", i);

		// Reporter + Number
		if (left_column == "CISG-online number") {
			newItem.reporter = "CISG-online";
			newItem.reporterVolume = right_column;

		// Title (Case Name)
		} else if (left_column == "Case name") {
			caseName = right_column;
			caseName = caseName.replace(" case ", " case ");	// non-breaking whitespace: Used car_case_III
			caseName = caseName.replace(" case", " case");
			newItem.caseName = caseName;
			newItem.shortTitle = cleanParties(caseName);

		// Jurisdiction
		} else if (left_column == "Jurisdiction") {
			//newItem.jurisdiction = jurisdictionDictionary(right_column)[0]; // no need to fall back to extras (altough it might be smarter to do so for uniformity); see also under "Arbitration"
			extras += "jurisdiction: " + jurisdictionDictionary(right_column)[0] + "\n";
			jurisdiction = right_column;

		// (State) Court
		} else if (left_column == "Court") {
			extras += "genre: Court Decision" + "\n";
			newItem.court = right_column;
			//newItem.rights = shortenCourt(right_column, jurisdiction);
			extras += "original-publisher: " + shortenCourt(right_column, jurisdiction) + "\n";

		// Arbitration
		} else if (left_column == "Arbitral Tribunal") {
			extras += "genre: Arbitral Award" + "\n";
			newItem.jurisdiction = "arb.cls";
			newItem.court = right_column;
			extras += "original-publisher: " + shortenInstitution(right_column) + "\n";
			seat = "Unknown Seat of the Arbitration"; // start with unknown in case the seat is not in the table

		// Seat of the Arbitration
		} else if (left_column == "Seat of the arbitration") {  // may not be indicated
			seat = right_column + " (Seat of the Arbitration)";

		// Date
		} else if (left_column == "Date of decision") {
			newItem.dateDecided = right_column;

		// Docket No.
		} else if (left_column == "Case nr./docket nr.") {
			newItem.docketNumber = right_column;

		// PDFs
		} else if (left_column == "Abstract of decision" || left_column == "Full text of decision" || left_column == "Translation of decision" ) {
			let node_text = doc.querySelectorAll("div.col-xs-12.col-lg-8")[i].innerHTML;
			let regex = /href="(.+?)"/;
			let matches = node_text.match(regex);
			if (matches[1]) {
				let pdf_url_ending = matches[1];
				let pdf_url_full = "https://cisg-online.org" + pdf_url_ending;
				newItem.attachments.push({
					title: left_column + " PDF",
					mimeType: "application/pdf",
					url: pdf_url_full
				});
			} else {
				newItem.abstractNote = "Beim Importieren einer PDF-Datei ist ein Fehler aufgetreten."
			};

		};
	};

	// Iterate over Claimants
	var claimants = "";
	for (let i = 0; i < 20; i++) {
		left_column = text(doc, 'div[data-is-content="claimants"] div.col-xs-12.col-lg-4', i);
		right_column = text(doc, 'div[data-is-content="claimants"] div.col-xs-12.col-lg-8', i);
		if (left_column == "Name") {
			if (claimants != "") {
				claimants += ", ";
			}
			claimants += right_column;
		};
	};
	if (claimants == "") {
		claimants = "Claimant not indicated";
	};

	// Iterate over Respondents
	let respondents = "";
	for (let i = 0; i < 20; i++) {
		left_column = text(doc, 'div[data-is-content="respondants"] div.col-xs-12.col-lg-4', i);  // die Bezeichnung im Code der Website ist falsch: statt "Respondent" (wie auch auf der Website sichtbar) "respondant"
		right_column = text(doc, 'div[data-is-content="respondants"] div.col-xs-12.col-lg-8', i);
		if (left_column == "Name") {
			if (respondents != "") {
				respondents += ", ";
			}
			respondents += right_column;
		};
	};
	if (respondents == "") {
		respondents = "Respondent not indicated";
	};

	// Combine Claimants and Respondents into Parties
	let parties = claimants + " v. " + respondents;
	if (parties == "Claimant not indicated v. Respondent not indicated") {
		parties = "Parties not indicated";
	};
	extras += "original-title: " + parties + "\n";

	// Get Case History
	let history = "";
	let row = "";
	let finalDecisionNumber = 0;
	let presentDecisionNumber = "";
	for (let i = 0; i < 20; i++) {
		row = text(doc, 'div[data-is-content="history"] div.row', i);
		if (row != "") {
			finalDecisionNumber = i + 1;
		};
		if (row.includes("Present decision")) {
			presentDecisionNumber = i + 1;
		};
	};
	if (presentDecisionNumber > 1) {
		history += `${presentDecisionNumber - 1} previous decision`;
		if (presentDecisionNumber > 2) {
			history += "s";
		};
	}
	if (finalDecisionNumber > presentDecisionNumber) {
		if (history != "") {
			history += " and ";
		};
		history += `${finalDecisionNumber - presentDecisionNumber} following decision`;
		if (finalDecisionNumber - presentDecisionNumber > 1) {
			history += "s";
		};
	};
	newItem.history = history;


	// Finalize item
	if (seat) {
		extras += "event-place: " + seat + "\n";  // seat is added here because its content may change during scraping
	};
	newItem.extra = extras;
	newItem.url = url;
	newItem.complete();
};


// CISG Advisory Council Opinions
function saveSingleAcOp(doc, url) {
	// Declare variables
	var item = new Zotero.Item("conferencePaper");

	// Get title
	let regex = /(\d+)/;
	let number = url.match(regex);
	if (!number) {
		number = "ERROR";
	} else {
		number = number[0];
	};
	item.title = "CISG-AC Opinion No " + number;

	// URL
	item.url = url;

	// PDF
	item.attachments.push({
		title: "CISG-AC Opinion No " + number + " PDF",
		mimeType: "application/pdf",
		url: url,
	});

	// User Info
	let userInfo = 	"NOTE: More metadata will be available if you save the opinion from the overview page under " + 
					"<a href='https://cisg-online.org/cisg-ac-opinions'>https://cisg-online.org/cisg-ac-opinions</a>.";
	item.notes.push({note: userInfo});

	// Finalize item
	item.complete();
}


function shortenInstitution(institution) {
	let regexAbbr = /\(([A-Z\-\/]+)\)/;
	let regexEngl = /\(([A-Za-z \-]+)\)/;
	if (institution.match(regexAbbr)) {
		return institution.match(regexAbbr)[1];
	} else if (institution.match(regexEngl)) {
		return institution.match(regexEngl)[1];
	}
	return institution;
};


function shortenCourt(court, jurisdiction) {
	if (jurisdiction == "") {
		return "";
	};

	jurisdiction = jurisdictionDictionary(jurisdiction)[1];
	let regex = /\((.+?)\)/;
	let matches = court.match(regex);
	if (matches) {
		court = matches[1];
	};

	if (! court.startsWith(jurisdiction)) {
		court = jurisdiction + " " + court;
		// Es lässt sich leider nicht so einfach erkennen, ob das letzte Wort ein Ortsname ist oder nicht
		//court = court.replace (/\s[A-Za-z\-]+$/, "");
	};

	return court;
};


function cleanParties(parties) {
	const rechtsformen = [	" AG",
							" B.V.",
							" Co. Ltd.",
							" Corp.",
							" d.d.",
							" EPE",
							" EP",
							" GmbH",
							", Inc.",
							" Inc.",
							" LLC",
							" Ltd.",
							" N.V.",
							" NV",
							" OOO",
							" Pty Limited",
							" Pty Ltd",
							" Ltd",
							" S.a.r.l.",
							", SA",
							" SA",
							", S.A.",
							" S.A.",
							", S.L.",
							" S.L.",
							" S.r.l.",
							" Srl",
							" UES", ];

	// cisg-online adds "et al." if there are multiple parties -> this has to be removed first
	parties = parties.replace(" et al.", "");
	
	// regex -> nur vor " v." und am Ende matchen
	rechtsformen.forEach(rechtsform => parties = parties.replace(new RegExp(rechtsform + " v\.", "g"), " v."));
	rechtsformen.forEach(rechtsform => parties = parties.replace(new RegExp(rechtsform + "$", "g"), ""));

	// diese Zusätze werden ebenfalls gestrichen
	const zusaetze = [	" Corporation",
						" Enterprises",
						" Group",
						" Holdings",
						" Ins.",				// Ins. Corp.
						" Internationale",
						" Services",
						" Technologies", ];
	zusaetze.forEach(zusatz => parties = parties.replace(new RegExp(zusatz + " v\.", "g"), " v."));
	zusaetze.forEach(zusatz => parties = parties.replace(new RegExp(zusatz + "$", "g"), ""));


	const staatlicheBezeichnungen = [	"Attorney-General of ",
										"Republic of "];
	// hier muss - anders als oben - am Anfang gestrichen werden
	staatlicheBezeichnungen.forEach(bezeichnung => parties = parties.replace(new RegExp(" v\. " + bezeichnung, "g"), " v. "));
	staatlicheBezeichnungen.forEach(bezeichnung => parties = parties.replace(new RegExp("^" + bezeichnung, "g"), ""));

	parties = parties.replace(" v. ", " v. ");

	return parties;
};



function jurisdictionDictionary(country) {
	// https://github.com/Juris-M/legal-resource-registry/
	const dictionary = {	"Australia":	["au", "Australian"],
							"Austria":		["at", "Austrian"],
							"Belgium":		["be", "Belgian"],
							"Canada":		["ca", "Canadian"],
							"China":		["cn", "Chinese"],
							"France":		["fr", "French"],
							"Germany":		["de", "German"],
							"Greece":		["gr", "Greek"],
							"Italy":		["it", "Italian"],
							"Lithuania":	["lt", "Lithuanian"],
							"Netherlands":	["nl", "Dutch"],
							"Poland":		["pl", "Polish"],
							"Spain":		["es", "Spanish"],
							"Switzerland":	["ch", "Swiss"],
							"USA":			["us", "US"], };
	let arr = dictionary[country];
	if (arr == undefined) {
		arr = ["##" + country + "##", "##" + country + "##"];
	};
	return arr;
};












// :D

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=14817",
		"items": [
			{
				"itemType": "case",
				"caseName": "Inter Rao UES et al. v. CELEC EP",
				"creators": [],
				"dateDecided": "29 May 2023",
				"court": "Centro de Arbitraje y Mediación de la Cámara de Comercio de Santiago (CAM Santiago) (Santiago Arbitration and Mediation Centre)",
				"docketNumber": "3568-18",
				"extra": "genre: Arbitral Award\noriginal-title: Inter Rao, Sociedad Anónima Abierta Inter Rao Ues v. Empresa Pública Estratégica Corporación Eléctrica del Ecuador CELEC E.P.\nevent-place: Santiago de Chile (Seat of the Arbitration)",
				"reporter": "CISG-online",
				"reporterVolume": "6903",
				"shortTitle": "Inter Rao UES et al. v. CELEC",
				"url": "https://cisg-online.org/search-for-cases?caseId=14817",
				"attachments": [
					{
						"title": "Abstract of decision PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Full text of decision PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://cisg-online.org/search-for-cases?caseId=11376",
		"items": [
			{
				"itemType": "case",
				"caseName": "Electronic electricity meters case",
				"creators": [],
				"dateDecided": "28 May 2019",
				"court": "Bundesgericht/Tribunal fédéral (Swiss Federal Supreme Court)",
				"docketNumber": "4A_543/2018",
				"extra": "genre: Court Decision\nkeyword: Swiss Federal Supreme Court\noriginal-title: IWB Industrielle Werke Basel v. Iskraemeco, Iskraemeco Schweiz",
				"reporter": "CISG-online",
				"reporterVolume": "4463",
				"url": "https://cisg-online.org/search-for-cases?caseId=11376",
				"attachments": [
					{
						"title": "Abstract of decision PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Full text of decision PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
