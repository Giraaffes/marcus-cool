import "express-async-errors";
import express from "express";
import axios from "axios";

import cp from "child_process";
import crypto from "crypto";

import approxSearch from "approx-string-match";

import fishData from "./data/stardew_fish.json";


const server = express();

server.post("/github-push", express.raw({type: "*/*"}), (req, res) => {
	let ghSignatureHeader = req.headers["x-hub-signature-256"] as string;
	let githubSignatureStr = (ghSignatureHeader.match(/^sha256=(.+)$/) || [])[1];
	if (!githubSignatureStr) throw Error(`Incorrectly formatted x-hub-signature-256 header: ${ghSignatureHeader}`);
	
	let githubSignature = Buffer.from(githubSignatureStr);
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


function equalNoCase(str1: string, str2: string): boolean {
	return str1.toLowerCase() == str2.toLowerCase();
}

function stringDifference(str1: string, str2: string): number {
	let [ short, long ] = [str1, str2].sort((a, b) => a.length - b.length);
	let matches = approxSearch(short.toLowerCase(), long.toLowerCase(), Infinity).filter(s => 
		s.start == 0 && s.end == short.length
	);
	return matches.length > 0 ? matches[0].errors : Infinity;
}

function getTopMatches(values: string[], query: string, maxErrors: number): {value: string, errors: number}[] {
	return values.map(value => 
		({value, errors: stringDifference(value, query)})
	).filter(m => m.errors <= maxErrors).sort((a, b) => a.errors - b.errors);
}

type Fish = typeof fishData[number];
function formatFish(fish: Fish) {
	let locationStr = fish.locations.join(" & ");
	let timeStr = fish.times.length > 0 ? fish.times.join(" & ") : "anytime";
	let seasonStr = fish.seasons.length > 0 ? `in ${fish.seasons.join(" & ")}` : "in any season";
	let weather = fish.weather.length > 0 ? `only ${fish.weather.join(" or ")}` : "";
	return `${fish.name} (${locationStr}, ${timeStr} ${seasonStr}${weather ? (", " + weather) : ""})`;
}

server.get("/stardew/suggestions", async (req, res) => {
	let query = req.query.q as string;
	let perfectMatch = fishData.find(e => equalNoCase(e.name, query));
	if (perfectMatch) {
		res.send([query, [formatFish(perfectMatch)], [], []])
	} else {
		let topMatches = getTopMatches(fishData.map(e => e.name), query, 3);
		res.send([query, topMatches.map(m => m.value), [], []]);
	}
});

server.get("/stardew/search", async (req, res) => {
	let query = req.query.q as string;
	let perfectMatch = fishData.find(e => equalNoCase(e.name, query));
	if (perfectMatch) {
		res.redirect(perfectMatch.url);
	} else {
		let bestNameMatch = getTopMatches(fishData.map(e => e.name), query, 3)[0];
		if (bestNameMatch) {
			let bestMatch = fishData.find(e => e.name == bestNameMatch.value);
			res.redirect(bestMatch.url);
		} else {
			res.redirect(`https://stardewvalleywiki.com/mediawiki/index.php?search=${encodeURIComponent(query)}`);
		}
	}
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