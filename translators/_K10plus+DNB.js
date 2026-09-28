{
	"translatorID": "f49689b1-9438-406b-a82c-60745dd8755b",
	"label": "_K10plus+DNB",
	"creator": "Eric Mann",
	"target": "",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 1000,
	"inRepository": true,
	"translatorType": 8,
	"lastUpdated": "2026-05-11 12:31:18"
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




async function doSearch(item) {



	// ## todo: wenn ich das als eigene Funktion code kommt immer
	// "no items returned from any translator"
	if (item.itemType == "encyclopediaArticle") {

		/// ##### aahhhh await geht nur in async function lul

		Z.debug("################### doSearch() called");				// errors werden danach im logging output angezeigt
		var newItem = new Zotero.Item(item.itemType);
		newItem.title = item.title;



		// #### !! wird abgerufen
		let kommentartitel = item.encyclopediaTitle;


		// #### !! wird abgerufen
		if (!item.shortTitle) {
			item.shortTitle = "##";
		}





		// search the ISBN or text over the SRU of K10plus, and take the result it as MARCXML
		// documentation: https://wiki.k10plus.de/display/K10PLUS/SRU
		
		// example url:
		// https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.isb=978-3-406-81022-0&maximumRecords=1
		// hinweis: mehr als 9 recods scheinen bei isbn query nicht zu gehen?



		// ##todo: wie viele Records und was passiert dann?

		/* #### SRU Query bei K10plus für den Staudinger
		- Handling von §§ 255 - 304
			- Suchanfrage per GUI im OPAC: wird zu "255304"
			- §§%20255–304 in der URL Query ist aber kein Problem
		- Begriff "Buch" in der Suchanfrage reduziert auf 0 Treffer ... ?
		- Begriff "2" in der Suchanfrage reduziert auf 0 Treffer ... ?
			- zwar kommen in der Ausgangsquery "Staudinger BGB Buch 2 Recht der Schuldverhältnisse §§ 255 - 304" vier alte Staudinger raus
			- wenn man dann "Buch 2" wegnimmt kommen insg. 12 Staudinger raus, von denen der erste der neueste ist
		- "recht der schuldverhältnisse" ist kein Problem
		- "Neubearbeitung 2025" (aus juris "Werksstand") scheint auch kein Problem zu sein

		*/


		let sru_url = "";
		let queryISBN = "";
		if (item.ISBN) {
			queryISBN = ZU.cleanISBN(item.ISBN);
			sru_url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.isb=" + queryISBN + "&maximumRecords=9";
		} else {
			// ###### todo / wip, wie viele Records? Wie besten Treffer bekommen?
			let searchTerm = kommentartitel;
			//searchTerm = searchTerm.replace(" ", "+").replace(",", "");
			searchTerm = searchTerm
				.replace(/\u200B/g, "")			// remove zero-width space (zB BeckOK Arbeitsrecht nach den Slashes)
				.replace(/\//g, " ")			// replace slashes with whitespace
				.replace(/,/g, "")				// remove ,
				.replace(/Hrsg\. /g, "");		// remove "Hrsg. " (zB bei BeckOK Arbeitsrecht im Titel)
				//.replace(/ /g, "%20");			// uri encode whitespace
			searchTerm = searchTerm.replace(/\./g, "");		// der Punkt wird nicht URI-encoded, führt aber zu einem Error
			searchTerm = searchTerm.replace("–", " - ");	// Sonst keine treffer für Staudinger
			searchTerm = searchTerm.replace(/Buch \d+/g, ""); // ##wip
			searchTerm = encodeURIComponent(searchTerm);	// ##
			sru_url = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=" + searchTerm + "&maximumRecords=1";   
		};
		// Z.debug("##" + sru_url);
		newItem.notes.push({note: sru_url});

		// ##### todo: BeckOK funktioniert damit jetzt grds, das korrekte Abspeichern der Auflage/Edition muss aber noch programmiert werden !!



		let sru_result = await requestText(sru_url);
		// Z.debug("##" + sru_result);


		let parser = new DOMParser();
		xml = parser.parseFromString(sru_result, "application/xml");

		// ZU.xpath requires a namespace or it will throw an error
		// https://www.zotero.org/support/dev/translators/coding#:~:text=Evaluates%20the%20specified%20XPath%20on%20the%20DOM%20element%20or%20array%20of%20DOM%20elements%20given%2C%20with%20the%20optionally%20specified%20namespaces.%20If%20present%2C%20the%20third%20argument%20should%20be%20object%20whose%20keys%20represent%20namespace%20prefixes%2C%20and%20whose%20values%20represent%20their%20URIs
		// (however, docs may be wrong here - ZU.xpath might return empty arrays, not null)
		let namespace = {
			"marc": "http://www.loc.gov/MARC21/slim"
		};

		// ZU.xpath seems to return empty arrays (not null) if there is no match
		// therefore, check for .length


		// Kommentartitel 
		let title = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="a"]', namespace);
		if (title.length) {
			title = title[0].textContent;
			// Z.debug("##" + title);
			newItem.originalTitle = title;
		};

		// Untertitel
		let subtitle = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="b"]', namespace);
		if (subtitle.length) {
			newItem.originalTitle = newItem.originalTitle + ": " + subtitle[0].textContent;
		};


		// ##todo: datafield 245 $c wäre eigentlich statement of responsibility (Namen wie auf Titelseite)
		// funktioniert das beim MüKo? -- ja, da scheinen die Hrsg des Gesamtwerks aufgelistet zu sein
		// (aber halt mit allen Titeln etc)



		/* Band / Bandtitel nimmt einen Hops, wenn auch nur ein Eintrag falsch ist
		Bsp: Ellenberger/Bunte -> beck-online ISBN verweist auf Gesamtwerk, aber ein
		Treffer in K10plus hat da "Band 2" als Bandtitel eingetragen
		-> hier sich doch nur auf den ersten Treffer verlassen, also Band(titel)
		nur aus allererstem Record übernehmen
		*/

		// Band
		// let volume_no = ZU.xpath(xml, '//marc:datafield[@tag="245"]/marc:subfield[@code="n"]', namespace);
		let volume_no = ZU.xpath(xml, '(//marc:record)[1]//marc:datafield[@tag="245"]/marc:subfield[@code="n"]', namespace);
		if (volume_no.length) {
			newItem.volume = volume_no[0].textContent;
		};

		/* Bandtitel ist zB beim Staudinger einfach in mehreren p-Subfeldern gespeichert
		-> die ersten beiden Felder aus dem ersten Record auslesen und zusammenfügen
		*/

		// Bandtitel
		let volumeTitle = ZU.xpath(xml, '(//marc:record)[1]//marc:datafield[@tag="245"]/marc:subfield[@code="p"]', namespace);
		if (volumeTitle.length) {
			newItem.volumeTitle = volumeTitle[0].textContent;
			if (volumeTitle.length > 1) {
				newItem.volumeTitle += ": " + volumeTitle[1].textContent;
			};
		};

		// Auflage
		let edition = ZU.xpath(xml, '//marc:datafield[@tag="250"]/marc:subfield[@code="a"]', namespace);
		if (edition.length) {
			newItem.edition = edition[0].textContent;
		};

		// Erscheinungsort
		let place = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="a"]', namespace);
		if (place.length) {
			newItem.place = place[0].textContent;
			// Z.debug("##" + place[0].textContent);
		};

		// Verlag
		let publisher = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="b"]', namespace);
		if (publisher.length) {
			newItem.publisher = publisher[0].textContent;
		};

		// Jahr / Datum 
		let date = ZU.xpath(xml, '//marc:datafield[@tag="264"]/marc:subfield[@code="c"]', namespace);
		if (date.length) {
			newItem.date = date[0].textContent;
		};

		// ISBN (falls die Ursprungssuche nicht schon über ISBN, sondern Kommentartitel lief)
		if (!item.ISBN) {
			let isbnField = ZU.xpath(xml, '//marc:datafield[@tag="020"]/marc:subfield[@code="a"]', namespace);
			if (isbnField.length) {
				newItem.ISBN = isbnField[0].textContent;
			}
		};

		// K10plus PPN (Pica Production Number) (für Debuggin)
		let ppn = ZU.xpath(xml, '//marc:controlfield[@tag="001"]', namespace);
		if (ppn.length) {
			ppn = ppn[0].textContent;
		};
		newItem.notes.push({note: "PPN: " + ppn});







		/* 
		an die K10plus Suchtreffer hängen wir noch ganz billig den DNB Eintrag für die ISBN an
		bei MüKos fügen wir vorher noch die Namen vom Gesamtwerk ein 
		alles patchen wir einfach ganz billig in ein großes xml-doc zusammen  (•᷄- •᷅ ;)
		*/
		
		// Create a brand new document to hold them
		const combinedXml = document.implementation.createDocument(null, "root");
		const root = combinedXml.documentElement;







		
		/* 
		bei den MüKos besteht das Problem, dass die Hrsg. - nach denen zitiert wird - nur beim Gesamtwerk vermerkt sind
		-> deswegen muss hier eine Sonderbehandlung eingefügt werden, wobei in die kumulierte Namensliste zunächst die
		Hrsg. des Gesamtwerks eingefügt werden müssen

		##todo: MüKo BGB Band 2/3: Wolfgang Krüger als Hrsg abgespeichert (da Redakteur), ist das richtig so?
		*/

		// betrifft nur - aber dafür wohl alle - MüKos !
		if (item.shortTitle.includes("MüKo") && ppn) {
		
			// Übergeordneten Eintrag ermitteln (später für MüKo gebraucht)
			let famUrl = "https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&query=pica.1049=" + ppn + "+and+pica.1045=rel-bt+and+pica.1001=b&maximumRecords=20&recordSchema=marcxml";
			let famSruRes = await requestText(famUrl);
			famXml = parser.parseFromString(famSruRes, "application/xml");

			// 1. Record ist der Band, das Gesamtwerk ist erst der 2. Record
			// also 1. Record einfach entfernen, 2. Record haben wir später aus der ersten SRU-Abfrage
			let firstRecord = famXml.querySelector("record"); 
			if (firstRecord) {
				firstRecord.remove();
			};

			let node0 = combinedXml.importNode(famXml.documentElement, true);
			root.appendChild(node0);
		};








		// Import the K10plus elements
		// 'true' means a deep copy (including all children)
		const node1 = combinedXml.importNode(xml.documentElement, true);
		root.appendChild(node1);






		// an die K10plus Suchtreffer hängen wir jetzt noch ganz billig den DNB Eintrag für die ISBN an
		// zB bei Sachs GG 10. Aufl. sind in der DNB nämlich alle (!) Bearbeiter mit Vor- und Nachnamen vermerkt

		// ?query=isbn= wäre hier möglich, ISBN geht aber auch einfach als normale Query
		// P: liefert aber nicht immer genau einen Treffer, zB bei 978-3-406-74430-3 = Bunte/Ellenberger, Bankrechts-Handbuch -> deswegen Begrenzung
		// zwar sonst mehr Namen, aber dann könnten sich auch Hrsg. von Altauflagen einschleichen!
		// Bsp Bunte/Ellenberger: https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=978-3-406-74430-3&recordSchema=MARC21-xml&maximumRecords=1

		// ## todo: what to do if no isbn provided??
		// dürfte wohl BeckOK und BeckOGK betreffen, die sind im DNB Katalog leider sowieso nur ganz vereinzelt nachgewiesen, also kann man sich das hier sparen
		if (queryISBN) {
			let dnbSruUrl = "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=" + queryISBN + "&recordSchema=MARC21-xml&maximumRecords=1";
			newItem.notes.push({note: dnbSruUrl});

			let dnbResult = await requestText(dnbSruUrl);
			dnbXml = new DOMParser().parseFromString(dnbResult, "application/xml");



			// Import the DNB element
			// 'true' means a deep copy (including all children)
			const node2 = combinedXml.importNode(dnbXml.documentElement, true);

			// Append them both to the new root
			root.appendChild(node2);
		};




		// Jetzt werden aus allen Records die Namen gezogen

		// wenn bei K10plus SRU-Query mehr als 1 Record + Treffer bei DNB
		// querySelectorAll wählt Namen dann aus allen Records aus
		// Reihenfolge richtet sich danach, wann das erste mal aufgetaucht (dann als key hinzugefügt)
		// Rolle richtet sich nach der "highest-priority" Rolle (siehe tempPersons -> persons) aus allen Records
		// Bsp: bei Ellenberger/Bunte ist die Rollenverteilung beim ersten Treffer zuverlässiger!

		let tempPersons = {};

		let nameDatafields = combinedXml.querySelectorAll('datafield[tag="100"], datafield[tag="700"]');

		nameDatafields.forEach(field => {
			let nameSubfield = field.querySelector('subfield[code="a"]');
			let name = nameSubfield.textContent;

			// DNB kennzeichnet Namenspartikel "von" mit U+0098	START OF STRING und U+009C	STRING TERMINATOR
			// die Logik ist Zotero aber unbekannt
			name = name.replace(/\u0098/g, '');
			name = name.replace(/\u009C/g, '');

			// DNB nimmt außerdem für ä, ö, ü die Kombination a, o, u + U+0308	COMBINING DIAERESIS
			// das führt aber zu unerkannten Dopplungen mit Einträgen aus K10plus, bei denen das nicht so ist
			name = name.replace(/a\u0308/g, 'ä');
			name = name.replace(/o\u0308/g, 'ö');
			name = name.replace(/u\u0308/g, 'ü');

			let typeSubfields = field.querySelectorAll('subfield[code="e"]');					// eigentlich wäre subfield 4 präziser, aber die DNB hat zB bei Sachs, GG den Begründer nicht als "fon" sondern als "oth", damit ist das useless
			let roles = [];
			typeSubfields.forEach(type => {
				roles.push(type.textContent);
			});

			if (!tempPersons[name]) {
				tempPersons[name] = [];
			};

			// Spread the 'roles' array to push each individual item (so we don't get arrays in an array, but one arr of strings)
			tempPersons[name].push(...roles);

		});


		// Z.debug("##");
		// Z.debug(tempPersons);
		// item.notes.push({note: JSON.stringify(tempPersons)});

		let persons = Object.fromEntries(
			Object.entries(tempPersons).map(([key, arr]) => {
				if (arr.some(item => item.includes("Begründer"))) return [key, "translator"];	   // K10plus "BegründerIn eines Werks"
				if (arr.some(item => item.includes("Begründer"))) return [key, "translator"];		// DNB: "Begründer" aber Achtung: das ü = U+0075	LATIN SMALL LETTER U + 	U+0308	COMBINING DIAERESIS !
				if (arr.some(item => item.includes("Herausgeber"))) return [key, "editor"];		   // K10plus "HerausgeberIn", DNB "Herausgeber"
				return [key, "contributor"];
			})
		);

		// Z.debug(persons);
		// item.notes.push({note: JSON.stringify(persons)});

		Object.entries(persons).map(([key, val]) => {
			newItem.creators.push(ZU.cleanAuthor(key, val, true));
		});









		// newItem.notes.push({note: "##ida ist toll"});
		newItem.complete();
		// item.complete();
	}
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

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
