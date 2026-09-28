{
	"translatorID": "d6cdac47-4e26-4de9-ab7e-71e16f6a8d86",
	"label": "_prinz.law",
	"creator": "Eric Mann",
	"target": "^https?://www\\.prinz\\.law\\/static\\/urteile\\/pdf\\/bgh",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-09 13:38:33"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {

	return "case";
}


async function doWeb(doc, url) {
	
		let item = new Zotero.Item("case");
		// https://www.prinz.law/static/urteile/pdf/bgh/VII_ZR_302-69.pdf

		item.title = "##";
		item.authority = "BGH";
		item.jurisdiction = "de";
		item.url = url;


		// Aktenzeichen
		let azRegex = /\/([^\/]+)\.pdf/;
		let match = url.match(azRegex);
		if (match) {
			let az = match[1];
			az = az.replaceAll("_", " ");
			az = az.replaceAll("-", "/");
			// item.notes.push({note: az});

			item.docketNumber = az;

			// #### TODO: dafür jetzt _dejure Metadata callen

			// dejure abfragen
			let azURL = az.replaceAll(" ", "%20").replaceAll("/", "%2F");

			// https://dejure.org/dienste/vernetzung/rechtsprechung?Text=VII%20ZR%20302%2F69&Suche=VII%20ZR%20302%2F69
			let searchURL = "https://dejure.org/dienste/vernetzung/rechtsprechung?Text=" + azURL + "&Suche=" + azURL;
			// item.notes.push({note: searchURL});

			let dejure = await requestDocument(searchURL);
			let urteilszeilen = dejure.querySelectorAll(".urteilszeile");
			// item.notes.push({note: urteilszeilen.length.toString()});

			if (urteilszeilen.length == 0) {
				item.notes.push({note: "Keine Suchtreffer bei dejure: " + searchURL});
			} else if (urteilszeilen.length > 1) {
				item.notes.push({note: "Mehr als ein Suchtreffer bei dejure: " + searchURL});
			} else {
				let urteilszeile = urteilszeilen[0].textContent;
				// item.notes.push({note: urteilszeile});
				let zeileRegex = /, ([\d\.]+) /;
				let zeileMatch = urteilszeile.match(zeileRegex);
				if (zeileMatch) {
					item.date = zeileMatch[1];
				}
				

				item.notes.push({note: "Metadaten (Datum) von: " + searchURL});
			}
			
		}


		item.title = "BGH, " + item.date + " - " + item.docketNumber;

		
		// PDF Attachment
		// passiert automatisch?!
		

		item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
