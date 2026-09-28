{
	"translatorID": "7450c9d1-8ad4-425f-bf4c-fc9553391a37",
	"label": "_Bundesgerichtshof",
	"creator": "Eric Mann",
	"target": "^https?://www\\.bundesgerichtshof\\.de/SharedDocs/Entscheidungen",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-08 12:42:22"
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
		// https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/Zivilsenate/V_ZS/2003/V_ZR__77-03.pdf?__blob=publicationFile

		item.title = "BGH ##";
		item.authority = "BGH";
		item.jurisdiction = "de";
		item.url = url;


		// ## wip -- get more info
		let azRegex = /\/([^\/]+)\.pdf/;
		let match = url.match(azRegex);
		if (match) {
			let az = match[1];
			az = az.replaceAll("_", "+");
			// item.notes.push({note: az});


			let searchURL = "https://www.bundesgerichtshof.de/SiteGlobals/Forms/Suche/EntscheidungssucheBGH_Formular.html?Aktenzeichen=true&templateQueryString="
							+ az;
			item.notes.push({note: "Metadaten über: " + searchURL});
			let articleDoc = await requestDocument(searchURL);

			//let content = articleDoc.querySelector("#content");
			// Zotero.debug(content ? content.innerHTML.slice(0, 10000) : "kein #content vorhanden");	

			let selector = "";
			selector =  "#content .searchresult td:nth-child(2)";
			let datum = text(articleDoc, selector);
			item.date = datum;
			selector =  "#content .searchresult td:nth-child(3)";
			let az2 = text(articleDoc, selector);
			if (!az2) {
				az2 = "##";
			}
			item.docketNumber = az2;

			item.title = "BGH, " + datum + " - " + az2;
		}



		
		// PDF Attachment
		// passiert automatisch?!
		/*
		item.attachments.push({
			title: "PDF vom BGH",
			mimeType: "application/pdf",
			url: url
		});
		*/
		

		item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
