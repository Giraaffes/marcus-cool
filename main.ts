import "express-async-errors";
import express from "express";

import axios from "axios";

import cp from "child_process";
import crypto from "crypto";

import fish from "./data/stardew_fish.json"


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

server.use(express.static("static", {
	setHeaders: res => res.set("access-control-allow-origin", "*"),
	extensions: ["html"],
	fallthrough: false
}));


//type OpenSearchSuggestions = [string, string[], string[], string[]]
server.get("/stardew/search", async (req, res) => {
	let query = req.query.q as string;
	let matchedFish = fish.filter(e => e.name.startsWith(query.toLowerCase()));
	res.send([
		query, matchedFish.map(e => e.name), [], []
	]);
});


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