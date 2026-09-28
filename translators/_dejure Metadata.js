{
	"translatorID": "65cf08cc-3a48-4ed9-8e92-ef9f510d4367",
	"label": "_dejure Metadata",
	"creator": "Eric Mann",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 500,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2026-09-15 07:34:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectSearch(item) {
	/*
	Apparently, detectSearch() is not called/tested for when the search
	translator is called directly by another translator. Therefore,
	this can always simply return false to avoid accidentally being
	used as a "real" seach translator (despite the low priortiy).
	*/
	return false;
}


/*
The function doSearch() takes an item as an argument;
however, is must create a new Zotero.Item() and ends with newItem.complete();
calling .complete() on the input item results in erros;
return newItem also results in errors.

Even though .complete() is called, the item is not 
immediately saved to the library. Instead, it is passed
back to the translator that called the search translator,
where it can be handled using:

	translator.setHandler("itemDone", function (translate, item) {
		item.url = "https://www.google.com";
		item.complete();
	});

*/



async function doSearch(item) {

	var dejureItem = new Zotero.Item(item.itemType);
	dejureItem.title = "##";


	if (item.reporter) {
		dejureItem.reporter = item.reporter;

		// ##todo

		// Fundstelle
		let reporterURL = "https://dejure.org/dienste/vernetzung/rechtsprechung?Text=" + encodeURIComponent(item.reporter) + "&Suche=" + encodeURIComponent(item.reporter);
		// dejureItem.notes.push({note: reporterURL});
		
		// Aktenzeichen
		// let azURL = az.replaceAll(" ", "%20").replaceAll("/", "%2F");
		// let searchURL = "https://dejure.org/dienste/vernetzung/rechtsprechung?Text=" + azURL + "&Suche=" + azURL;
		// https://dejure.org/dienste/vernetzung/rechtsprechung?Text=VII%20ZR%20302%2F69&Suche=VII%20ZR%20302%2F69
		// item.notes.push({note: searchURL});

		


		let searchURL = reporterURL;

		let dejure = await requestDocument(searchURL);
		let urteilszeilen = dejure.querySelectorAll(".urteilszeile");
		// dejureItem.notes.push({note: urteilszeilen.length.toString()});


		
		if (urteilszeilen.length == 0) {
			dejureItem.notes.push({note: "Keine Suchtreffer bei dejure: " + searchURL});
		} else if (urteilszeilen.length > 1) {
			dejureItem.notes.push({note: "Mehr als ein Suchtreffer bei dejure: " + searchURL});
		} else {
			let urteilszeile = urteilszeilen[0].textContent;
			// item.notes.push({note: urteilszeile});
			let zeileRegex = /(.+), ([\d\.]+) - (.+)/;
			let zeileMatch = urteilszeile.match(zeileRegex);
			if (zeileMatch) {
				dejureItem.authority = zeileMatch[1];
				dejureItem.date = zeileMatch[2];
				dejureItem.docketNumber = zeileMatch[3];
			}

			// Verfahrensgang
			// ##todo bei zB Metall auf Metall sehen, ob nach vorgehende und nachgehende Entscheidungen trennen kann
			// ##todo: das insgesamt dann vernünftig abspeichern
			let xpath = "//h4[normalize-space()='Verfahrensgang']/following-sibling::*[1][self::ul]/li";
			let verfahrensgang = ZU.xpath(dejure, xpath);
			if (verfahrensgang.length) {
				for (let v of verfahrensgang) {
					v = v.textContent;
					//dejureItem.notes.push({note: v});
					dejureItem.history += v + "; ";
				}
			}


			dejureItem.shortTitle = text(dejure, 'p[style*="font-weight:bold" i]');
			
			dejureItem.title = dejureItem.authority + ", " + dejureItem.date + " – " + dejureItem.docketNumber;

			dejureItem.notes.push({note: "Metadaten von:<br>" + searchURL + "<br>(" + new Date().toLocaleDateString("de-DE") + ")"});
		}
		
	}
	

	dejureItem.complete();

}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
