import "express-async-errors";

import express from "express";
const server = express();

import { exec } from "child_process";

import { google as gApis, Auth as gAuthLib } from "googleapis";


server.post("/github-push", (req, res) => {
	if (!req.headers["x-github-hook-id"] == "489728820") return;
	res.status(200).end();

	exec("git pull", (error, stdout, stderr) => {
		console.log(stdout);
		process.exit();
	});
});

server.use(express.static("files", {
	setHeaders: res => res.set("access-control-allow-origin", "*"),
	extensions: ["html"],
	fallthrough: false
}));

server.use((err, req, res, next) => {
	if (err.status == 404) {
		res.status(404).send("<title>404</title>404: Denne side findes ikke").end();
	} else {
		let timeStr = (new Date()).toLocaleString({timeZone: "Europe/Copenhagen"});
		console.error(timeStr, req.url, err);
	
		res.status(500).send("<title>Fejl</title>Beklager, der opstod en fejl...").end();
	}
});


// const googleAuth = await (new gAuthLib.GoogleAuth({
// 	keyFile: "./service-account.json",
// 	scopes: ["https://www.googleapis.com/auth/drive"]
// })).getClient();
// console.log("logged in");

// const docs = await gApis.docs({version: "v1", auth: googleAuth});
// console.log("docs initialized");

// const drive = await gApis.drive({version: "v3", auth: googleAuth});
// console.log("drive initalized");

// console.log(await drive.permissions.create({
// 	fileId: "1ubF6TGBBe5aT4PZsKv1KlF2HW5yuOKWOxEPkMU6OHCo", 
// 	requestBody: {type: "anyone", role: "writer"}
// }));
// console.log(await docs.documents.get({documentId: "1ubF6TGBBe5aT4PZsKv1KlF2HW5yuOKWOxEPkMU6OHCo"}));
// console.log(await docsClient.documents.create({title: "test document"}));
// console.log("document created");

//process.stdin.resume();

server.listen(7000, "127.0.0.1", () => {
	console.log("Ready");
});