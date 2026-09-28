{
	"translatorID": "0c005619-2eb8-4741-90ce-4f0ebede4850",
	"label": "_Kluwer Arbitration Blog",
	"creator": "Eric Mann",
	"target": "^https:\\/\\/legalblogs\\.wolterskluwer\\.com\\/arbitration-blog",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-09-14 22:45:14"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Eric Mann

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/^https:\/\/legalblogs\.wolterskluwer\.com\/arbitration-blog\/./)) {
		return "blogPost";
	}
	return false;
};

async function doWeb(doc, url) {
	let item = new Zotero.Item("blogPost");

	// Title / Titel
	let title = text(doc, ".cg3-page-title");
	if (title == "") {
		title = "ERROR";
	};
	item.title = title;

	// Authors / Autoren
	for (let i = 0; i < 10; i++) {
		let author = text(doc, ".cg3-authors-name-cstm a", i);
		if (!(author.startsWith("(") && author.endsWith(")"))) {				// Law Firms in Klammern nicht übernehmen
			item.creators.push(ZU.cleanAuthor(author, 'author', false));
		}
	};
	

	// Blog Title / Titel des Blogs
	item.blogTitle = "Kluwer Arbitration Blog";

	// Website Type / Art der Website
	// No idea what's supposed to go here...

	// Date / Datum
	let date = text(doc, ".cg3-article-date-cstm");
	item.date = date;

	// URL / URL 
	item.url = url;

	// Extra / Extra
	// No need identified so far.

	// PDF wird erst auf Klick generiert...
	item.attachments.push({
		title: "Kein automatischer PDF-Download!",
		mimeType: "application/pdf",
		url: ""
	});

	// Finish up
	item.complete();
};

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
