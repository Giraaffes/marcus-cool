import "express-async-errors";
import * as express from "express";

import * as cp from "child_process";
import * as crypto from "crypto";


const server = express();

server.post("/github-push", express.raw({type: "*/*"}), (req, res) => {
	console.log(process.env.WEBHOOK_SECRET);

	let ghSignatureHeader = req.headers["X-Hub-Signature-256"] as string;
	let githubSignatureStr = (ghSignatureHeader.match(/^sha256=(.+)$/) || [])[1];
	if (!githubSignatureStr) throw Error(`Incorrectly formatted X-Hub-Signature-256 header: ${ghSignatureHeader}`);
	
	let githubSignature = Buffer.from(githubSignatureStr);
	let signature1 = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET).update(req.body).digest();
	let signature2 = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET).update(req.body.toString()).digest();
	console.log(`${githubSignature}\n${signature1}\n${signature2}`);

	let areEqual1 = crypto.timingSafeEqual(signature1, githubSignature);
	let areEqual2 = crypto.timingSafeEqual(signature2, githubSignature);
	console.log(areEqual1, areEqual2);

	res.sendStatus(200);

	//if (req.headers["x-github-hook-id"] != "489728820") return;
	//res.status(200).end();

	//cp.exec("git pull", (error, stdout, stderr) => {
	//	console.log(stdout);
	//	process.exit();
	//});
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