import "express-async-errors";
import * as express from "express";

import { exec } from "child_process";


const server = express();

console.log(Object.keys(process.env).join(", "));

//server.post("/github-push", (req, res) => {
//	if (!req.headers["x-github-hook-id"] == "489728820") return;
//	res.status(200).end();

//	exec("git pull", (error, stdout, stderr) => {
//		console.log(stdout);
//		process.exit();
//	});
//});

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