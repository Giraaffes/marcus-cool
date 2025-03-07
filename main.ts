import "express-async-errors";
import express from "express";

const server = express();

// Webhook push

import cp from "child_process";
import crypto from "crypto";

server.post("/github-push", express.raw({type: "*/*"}), (req, res) => {
	let ghSignatureHeader = req.headers["x-hub-signature-256"] as string;
	let ghSignatureStr = (ghSignatureHeader.match(/^sha256=(.+)$/) || [])[1];
	if (!ghSignatureStr) throw Error(`Incorrectly formatted x-hub-signature-256 header: ${ghSignatureHeader}`);
	
	let githubSignature = Buffer.from(ghSignatureStr);
	let signature = Buffer.from(
		crypto.createHmac("sha256", process.env.WEBHOOK_SECRET).update(req.body).digest("hex")
	);
	let areEqual = githubSignature.length == signature.length && crypto.timingSafeEqual(signature, githubSignature);
	if (!areEqual) return;

	res.sendStatus(200);
	cp.exec("git pull", (error, stdout, stderr) => {
		console.log(stdout);
		process.exit();
	});
});

// SDV wiki search engine

import approxSearch from "approx-string-match";

import fishData from "./json/stardew_fish.json";

function topWordStartMatches(values: string[], query: string): string[] {
	let matchEntries = values.map(value => 
		({value, wordIndex: value.split(/\s+/).findIndex(w => 
			w.toLowerCase().startsWith(query.toLowerCase())
		)})
	).filter(m => m.wordIndex != -1).sort((a, b) => 
		// https://stackoverflow.com/a/50580263/26806091
		a.wordIndex - b.wordIndex || a.value.length - b.value.length || a.value.localeCompare(b.value)
	);
	return matchEntries.map(e => e.value);
}

function stringDifference(str1: string, str2: string): number {
	let [ short, long ] = [str1, str2].sort((a, b) => a.length - b.length);
	let matches = approxSearch(short.toLowerCase(), long.toLowerCase(), Infinity).filter(s => 
		s.start == 0 && s.end == short.length
	);
	return matches.length > 0 ? matches[0].errors : Infinity;
}

function topApproxMatches(values: string[], query: string, maxErrors: number): string[] {
	let matchEntries = values.map(value => 
		({value, errors: stringDifference(value, query)})
	).filter(m => m.errors <= maxErrors).sort((a, b) => 
		// https://stackoverflow.com/a/50580263/26806091
		a.errors - b.errors || a.value.length - b.value.length || a.value.localeCompare(b.value)
	);
	return matchEntries.map(e => e.value);
}

//type matchLevel = "perfect" | "beginning" | "approx" | "none";
type matchLevel = "beginning" | "approx" | "none";
function topMatches(values: string[], query: string, maxErrors: number): {level: matchLevel, matches: string[]} {
	//let perfectMatch = values.find(v => v.toLowerCase() == query.toLowerCase());
	//if (perfectMatch) return {level: "perfect", matches: [perfectMatch]};

	let wordStartMatches = topWordStartMatches(values, query);
	if (wordStartMatches.length > 0) return {level: "beginning", matches: wordStartMatches};

	let approxMatches = topApproxMatches(values, query, maxErrors);
	if (approxMatches) return {level: "approx", matches: approxMatches};

	return {level: "none", matches: []};
}

type Fish = typeof fishData[number];
function formatFish(fish: Fish) {
	let locationStr = fish.locations.join(" & ");
	let timeStr = fish.times.length > 0 ? fish.times.join(" & ") : "anytime";
	let seasonStr = fish.seasons.length > 0 ? `in ${fish.seasons.join(" & ")}` : "in any season";
	let weatherStr = fish.weather.length > 0 ? `only ${fish.weather.join(" or ")}` : "";
	return `${fish.name} (${locationStr}, ${timeStr} ${seasonStr}${weatherStr ? (", " + weatherStr) : ""})`;
}

server.get("/stardew/suggestions", async (req, res) => {
	let query = req.query.q as string;
	let fishNames = fishData.map(e => e.name);
	let matchResult = topMatches(fishNames, query, 3);

	let suggestions = matchResult.matches.slice(0, 10);
	if (suggestions[0].toLowerCase() == query.toLowerCase()) {
		let fish = fishData.find(e => e.name == suggestions[0]);
		suggestions[0] = formatFish(fish);
	}

	res.send([query, suggestions, [], []]);
});

server.get("/stardew/search", async (req, res) => {
	let query = req.query.q as string;
	query = query.replace(/\(.+\)/, "").trim();

	let fishNames = fishData.map(e => e.name);
	let matchResult = topMatches(fishNames, query, 3);

	if (matchResult.level != "none") { // todo make it so approx match results should only be chosen if error <= 1 or something
		let fish = fishData.find(e => e.name == matchResult.matches[0]);
		res.redirect(fish.url);
	} else {
		res.redirect(`https://stardewvalleywiki.com/mediawiki/index.php?search=${encodeURIComponent(query)}`);
	}
});

// Server routing

server.get("/erdethultimedag", (req, res) => {
	// this messes up with the way express.static() works
	res.sendFile(`/static/erdethultimedag/index.html`, { root: import.meta.dirname });
});

server.use(express.static("static", {
	setHeaders: res => res.set("access-control-allow-origin", "*"),
	extensions: ["html"],
	fallthrough: false
}));

server.use(((err, req, res, next) => {
	if (err.status == 404) {
		res.status(404).send("<title>404</title>404: Denne side findes ikke").end();
	} else {
		let timeStr = (new Date()).toLocaleString("da-DK", {timeZone: "Europe/Copenhagen"});
		console.error(timeStr, req.url, err);
	
		res.status(500).send("<title>Fejl</title>Beklager, der opstod en fejl...").end();
	}
}) as express.ErrorRequestHandler);

server.listen(7000, "127.0.0.1", () => {
	console.log("Ready");
});