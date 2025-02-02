import "express-async-errors";
import * as express from "express";

import axios from "axios";

import * as cp from "child_process";
import * as crypto from "crypto";


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

server.get("/stardew_search", async (req, res) => {
	let suggestions = (await axios.get(
		`https://stardewvalleywiki.com/mediawiki/api.php?action=opensearch&format=json&formatversion=2&search=${req.query.q}`
	)).data;
	res.send(suggestions);
});

server.use(express.static("files", {
	setHeaders: res => res.set("access-control-allow-origin", "*"),
	extensions: ["html"],
	fallthrough: false
}));

server.use(((err, req, res) => {
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